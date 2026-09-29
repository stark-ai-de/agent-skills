import crypto from "node:crypto";
import fs from "node:fs";
import {
  CLAUDE_E2E_CASES,
  CODEX_E2E_CASES,
  EVIDENCE_SCHEMA_VERSION,
  GATEWAY_ALIAS,
  GATEWAY_HOST,
  GATEWAY_PORT,
  GATEWAY_PROBES,
  MAX_HTTP_BYTES,
  NETWORK_TIMEOUT_MS,
  PROVIDER_BASE_URL,
  PROVIDER_PROBES,
} from "./constants.mjs";
import { SetupError, invariant } from "./errors.mjs";
import { inspectPath, readJson, redactText } from "./files.mjs";
import { assertWslSameEnvironmentPath, captureVersion } from "./hosts.mjs";
import { immutableProcessBindingDigest } from "./state.mjs";

const requestCleanups = new WeakMap();
// Bounded per request, including reasoning tokens before visible output.
const PROBE_OUTPUT_TOKENS = 1024;

function requireUnexhaustedOutput(body, label) {
  const exhausted =
    body?.choices?.some?.((choice) => choice?.finish_reason === "length") ||
    body?.incomplete_details?.reason === "max_output_tokens" ||
    body?.stop_reason === "max_tokens";
  invariant(
    !exhausted,
    "probe_output_exhausted",
    `${label} exhausted the bounded output-token budget. This result is inconclusive, not evidence that the capability is unsupported.`,
  );
}

async function releaseResponse(response) {
  const cleanup = requestCleanups.get(response);
  requestCleanups.delete(response);
  if (!cleanup) return;
  cleanup?.();
  try {
    if (response.body && !response.body.locked) await response.body.cancel();
  } catch {
    // Cleanup must not replace the probe result or its original failure.
  }
}

export function assertProxyIndependentTransport(context = {}) {
  const execArgv = context.execArgv ?? process.execArgv;
  const env = context.env ?? process.env;
  const nodeOptions = String(env.NODE_OPTIONS ?? "");
  const envSwitch = String(env.NODE_USE_ENV_PROXY ?? "").toLowerCase();
  const enabled =
    execArgv.some((argument) => String(argument).toLowerCase().includes("use-env-proxy")) ||
    nodeOptions.toLowerCase().includes("use-env-proxy") ||
    (envSwitch.length > 0 && !["0", "false"].includes(envSwitch));
  invariant(
    !enabled,
    "environment_proxy_enabled",
    "Credential-bearing probes refuse Node environment-proxy mode; run with direct transport",
  );
}

function endpoint(baseUrl, route) {
  return `${baseUrl.replace(/\/$/, "")}/${route.replace(/^\//, "")}`;
}

async function readBoundedBody(response, maxBytes = MAX_HTTP_BYTES) {
  const chunks = [];
  let bytes = 0;
  try {
    invariant(response.body, "http_body_missing", "HTTP response has no body");
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
      invariant(
        bytes <= maxBytes,
        "http_body_too_large",
        `HTTP response exceeded ${maxBytes} bytes`,
      );
      chunks.push(Buffer.from(chunk));
    }
  } catch (error) {
    if (error.name === "AbortError") {
      throw new SetupError("network_timeout", "HTTP response body timed out");
    }
    throw error;
  } finally {
    await releaseResponse(response);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function request(url, options = {}) {
  if (!options.fetchImpl) assertProxyIndependentTransport();
  const fetchImpl = options.fetchImpl ?? fetch;
  await options.beforeRequest?.({ method: options.method ?? "GET", url });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? NETWORK_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([controller.signal, options.signal])
    : controller.signal;
  try {
    const response = await fetchImpl(url, {
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal,
      redirect: "error",
    });
    requestCleanups.set(response, () => clearTimeout(timer));
    return response;
  } catch (error) {
    clearTimeout(timer);
    if (error.name === "AbortError")
      throw new SetupError("network_timeout", `Request timed out: ${url}`);
    throw new SetupError("network_request_failed", `Request failed: ${url}`, {
      reason: error.message,
    });
  } finally {
    if (controller.signal.aborted) clearTimeout(timer);
  }
}

async function requestJson(url, options = {}) {
  const response = await request(url, options);
  const text = await readBoundedBody(response, options.maxBytes);
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new SetupError("invalid_http_json", `Endpoint returned invalid JSON: ${url}`, {
        status: response.status,
      });
    }
  }
  return { status: response.status, ok: response.ok, body };
}

function bearerHeaders(credential, extra = {}) {
  return {
    Authorization: `Bearer ${credential}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function requireOk(result, label) {
  invariant(result.ok, "probe_http_error", `${label} returned HTTP ${result.status}`, {
    status: result.status,
  });
  return result.body;
}

async function captureProbe(name, operation, secrets, options = {}) {
  const startedAt = new Date().toISOString();
  try {
    const details = await operation();
    return { name, status: "verified", startedAt, details };
  } catch (error) {
    if (options.propagateError?.(error)) throw error;
    return {
      name,
      status: "failed",
      startedAt,
      error: {
        code: error.code ?? "probe_failed",
        message: redactText(error.message, secrets),
      },
    };
  }
}

async function modelsProbe(baseUrl, credential, options) {
  const result = await requestJson(endpoint(baseUrl, "/models"), {
    beforeRequest: options.beforeRequest,
    headers: bearerHeaders(credential),
    fetchImpl: options.fetchImpl,
  });
  const body = requireOk(result, "model discovery");
  const models = body?.data;
  invariant(
    Array.isArray(models),
    "models_shape_invalid",
    "Model discovery did not return a data array",
  );
  const ids = [
    ...new Set(
      models.map((model) => model?.id).filter((id) => typeof id === "string" && id.length > 0),
    ),
  ].sort();
  invariant(ids.length > 0, "models_empty", "Model discovery returned no usable model IDs");
  if (options.requiredModel) {
    invariant(
      ids.includes(options.requiredModel),
      "gateway_alias_missing",
      `Gateway model discovery did not expose the required alias: ${options.requiredModel}`,
    );
  }
  return { count: ids.length, models: ids };
}

async function providerTextProbe(baseUrl, credential, model, options) {
  const result = await requestJson(endpoint(baseUrl, "/chat/completions"), {
    method: "POST",
    headers: bearerHeaders(credential),
    body: {
      model,
      messages: [{ role: "user", content: "Reply with exactly HETZNER_PROBE_OK." }],
      max_tokens: PROBE_OUTPUT_TOKENS,
      temperature: 0,
    },
    fetchImpl: options.fetchImpl,
  });
  const body = requireOk(result, "provider text probe");
  requireUnexhaustedOutput(body, "provider text probe");
  invariant(
    typeof body?.choices?.[0]?.message?.content === "string" &&
      body.choices[0].message.content.trim().length > 0,
    "provider_text_shape_invalid",
    "Provider text response has no assistant content",
  );
  return { httpStatus: result.status, responseShape: "chat-completion" };
}

async function providerStreamProbe(baseUrl, credential, model, options) {
  const response = await request(endpoint(baseUrl, "/chat/completions"), {
    method: "POST",
    headers: bearerHeaders(credential),
    body: {
      model,
      messages: [{ role: "user", content: "Reply with exactly STREAM_OK." }],
      max_tokens: 32,
      stream: true,
      temperature: 0,
    },
    fetchImpl: options.fetchImpl,
  });
  try {
    invariant(response.ok, "probe_http_error", `Provider stream returned HTTP ${response.status}`);
    const text = await readBoundedBody(response);
    const events = text
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    invariant(events.length > 0, "stream_missing", "Provider returned no SSE data events");
    invariant(
      events.some((event) => event === "[DONE]"),
      "stream_incomplete",
      "Provider stream did not terminate with [DONE]",
    );
    return { httpStatus: response.status, eventCount: events.length };
  } finally {
    await releaseResponse(response);
  }
}

async function providerToolLoopProbe(baseUrl, credential, model, options) {
  const messages = [{ role: "user", content: "Call report_probe with value HETZNER_TOOL_OK." }];
  const first = await requestJson(endpoint(baseUrl, "/chat/completions"), {
    method: "POST",
    headers: bearerHeaders(credential),
    body: {
      model,
      messages,
      max_tokens: PROBE_OUTPUT_TOKENS,
      temperature: 0,
      tool_choice: "required",
      tools: [
        {
          type: "function",
          function: {
            name: "report_probe",
            description: "Return a bounded compatibility probe value.",
            parameters: {
              type: "object",
              additionalProperties: false,
              properties: { value: { type: "string" } },
              required: ["value"],
            },
          },
        },
      ],
    },
    fetchImpl: options.fetchImpl,
  });
  const firstBody = requireOk(first, "provider tool-call probe");
  requireUnexhaustedOutput(firstBody, "provider tool-call probe");
  const assistant = firstBody?.choices?.[0]?.message;
  const call = assistant?.tool_calls?.[0];
  invariant(
    call?.function?.name === "report_probe",
    "tool_call_missing",
    "Provider did not return the required function call",
  );
  let args;
  try {
    args = JSON.parse(call.function.arguments);
  } catch {
    throw new SetupError("tool_arguments_invalid", "Provider returned invalid function arguments");
  }
  invariant(
    typeof args?.value === "string",
    "tool_arguments_invalid",
    "Provider function arguments omitted value",
  );

  const second = await requestJson(endpoint(baseUrl, "/chat/completions"), {
    method: "POST",
    headers: bearerHeaders(credential),
    body: {
      model,
      messages: [
        ...messages,
        assistant,
        { role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: true }) },
      ],
      max_tokens: PROBE_OUTPUT_TOKENS,
      temperature: 0,
    },
    fetchImpl: options.fetchImpl,
  });
  const secondBody = requireOk(second, "provider tool-result probe");
  requireUnexhaustedOutput(secondBody, "provider tool-result probe");
  invariant(
    typeof secondBody?.choices?.[0]?.message?.content === "string" &&
      secondBody.choices[0].message.content.trim().length > 0,
    "tool_result_loop_missing",
    "Provider did not complete the tool-result loop",
  );
  return { callName: call.function.name, resultLoop: true };
}

async function providerCancellationProbe(baseUrl, credential, model, options) {
  const controller = new AbortController();
  const response = await request(endpoint(baseUrl, "/chat/completions"), {
    method: "POST",
    headers: bearerHeaders(credential),
    body: {
      model,
      messages: [{ role: "user", content: "Count slowly from one to one hundred." }],
      max_tokens: 256,
      stream: true,
    },
    signal: controller.signal,
    fetchImpl: options.fetchImpl,
  });
  let reader = null;
  try {
    invariant(
      response.ok && response.body,
      "cancellation_stream_missing",
      "Cancellation probe did not open a stream",
    );
    reader = response.body.getReader();
    const first = await reader.read();
    invariant(
      !first.done,
      "cancellation_stream_empty",
      "Cancellation probe stream ended before cancellation",
    );
    controller.abort();
    let abortObserved = false;
    try {
      await reader.read();
    } catch (error) {
      if (error.name !== "AbortError") throw error;
      abortObserved = true;
    }
    invariant(
      abortObserved,
      "cancellation_not_propagated",
      "Provider stream did not surface the requested cancellation",
    );
  } finally {
    try {
      await reader?.cancel();
    } catch {
      // An aborted stream may reject cancellation; response cleanup still runs.
    }
    await releaseResponse(response);
  }
  return { abortedAfterFirstChunk: true };
}

async function providerErrorProbe(baseUrl, credential, options) {
  const result = await requestJson(endpoint(baseUrl, "/chat/completions"), {
    method: "POST",
    headers: bearerHeaders(credential),
    body: {
      model: `invalid-probe-${crypto.randomUUID()}`,
      messages: [{ role: "user", content: "error probe" }],
      max_tokens: 1,
    },
    fetchImpl: options.fetchImpl,
  });
  invariant(
    result.status >= 400 && result.status < 500,
    "error_mapping_invalid",
    `Invalid model returned HTTP ${result.status}`,
  );
  return { httpStatus: result.status, mappedAsClientError: true };
}

export async function runProviderCheck({ credential, model, probes, fetchImpl, now = Date.now() }) {
  invariant(
    credential,
    "provider_credential_required",
    "Provider check requires the selected provider credential",
  );
  const selected = [...new Set(probes ?? [])];
  invariant(selected.length > 0, "probes_required", "Select at least one provider probe");
  for (const probe of selected) {
    invariant(
      PROVIDER_PROBES.includes(probe),
      "probe_unsupported",
      `Unsupported provider probe: ${probe}`,
    );
  }
  if (selected.some((probe) => probe !== "models")) {
    invariant(model, "model_required", "Non-discovery provider probes require a model");
  }

  const operations = {
    models: () => modelsProbe(PROVIDER_BASE_URL, credential, { fetchImpl }),
    text: () => providerTextProbe(PROVIDER_BASE_URL, credential, model, { fetchImpl }),
    stream: () => providerStreamProbe(PROVIDER_BASE_URL, credential, model, { fetchImpl }),
    "tool-loop": () => providerToolLoopProbe(PROVIDER_BASE_URL, credential, model, { fetchImpl }),
    cancellation: () =>
      providerCancellationProbe(PROVIDER_BASE_URL, credential, model, { fetchImpl }),
    errors: () => providerErrorProbe(PROVIDER_BASE_URL, credential, { fetchImpl }),
  };
  const results = [];
  for (const probe of selected) {
    results.push(await captureProbe(probe, operations[probe], [credential]));
  }
  const models = results.find((result) => result.name === "models" && result.status === "verified")
    ?.details?.models;
  const allVerified = results.every((result) => result.status === "verified");
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    kind:
      selected.length === 1 && selected[0] === "models"
        ? "hetzner-inference-provider-discovery"
        : "hetzner-inference-provider-check",
    observedAt: new Date(now).toISOString(),
    provider: {
      baseUrl: PROVIDER_BASE_URL,
      model: model ?? null,
      models: models ?? [],
      results,
      state: !allVerified
        ? "blocked"
        : selected.includes("tool-loop")
          ? "tools_verified"
          : selected.some((probe) => ["models", "text", "stream", "cancellation"].includes(probe))
            ? "transport_verified"
            : "verification_required",
    },
  };
}

async function gatewayResponsesText(baseUrl, credential, options) {
  const result = await requestJson(endpoint(baseUrl, "/v1/responses"), {
    beforeRequest: options.beforeRequest,
    method: "POST",
    headers: bearerHeaders(credential),
    body: {
      model: GATEWAY_ALIAS,
      input: "Reply with exactly RESPONSES_OK.",
      max_output_tokens: PROBE_OUTPUT_TOKENS,
    },
    fetchImpl: options.fetchImpl,
  });
  const body = requireOk(result, "gateway Responses text probe");
  requireUnexhaustedOutput(body, "gateway Responses text probe");
  invariant(
    body?.id &&
      Array.isArray(body?.output) &&
      body.output.some(
        (item) =>
          item?.type === "message" &&
          item.role === "assistant" &&
          item.content?.some(
            (content) =>
              content?.type === "output_text" &&
              typeof content.text === "string" &&
              content.text.trim().length > 0,
          ),
      ),
    "responses_shape_invalid",
    "Gateway returned an invalid Responses payload",
  );
  return { httpStatus: result.status, responseIdPresent: true };
}

async function gatewayResponsesToolLoop(baseUrl, credential, options) {
  const tools = [
    {
      type: "function",
      name: "report_probe",
      description: "Return a bounded compatibility probe value.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { value: { type: "string" } },
        required: ["value"],
      },
    },
  ];
  const input = [{ role: "user", content: "Call report_probe with value RESPONSES_TOOL_OK." }];
  const first = await requestJson(endpoint(baseUrl, "/v1/responses"), {
    beforeRequest: options.beforeRequest,
    method: "POST",
    headers: bearerHeaders(credential),
    body: {
      model: GATEWAY_ALIAS,
      input,
      store: false,
      max_output_tokens: PROBE_OUTPUT_TOKENS,
      tool_choice: "required",
      tools,
    },
    fetchImpl: options.fetchImpl,
  });
  const body = requireOk(first, "gateway Responses tool-call probe");
  requireUnexhaustedOutput(body, "gateway Responses tool-call probe");
  const call = body?.output?.find((item) => item?.type === "function_call");
  invariant(
    call?.name === "report_probe" && call.call_id,
    "responses_tool_call_missing",
    "Gateway did not return a Responses function call",
  );
  let callArguments;
  try {
    callArguments = JSON.parse(call.arguments);
  } catch {
    throw new SetupError(
      "responses_tool_arguments_invalid",
      "Gateway returned invalid Responses function arguments",
    );
  }
  invariant(
    typeof callArguments?.value === "string",
    "responses_tool_arguments_invalid",
    "Gateway Responses function arguments omitted value",
  );
  const second = await requestJson(endpoint(baseUrl, "/v1/responses"), {
    beforeRequest: options.beforeRequest,
    method: "POST",
    headers: bearerHeaders(credential),
    body: {
      model: GATEWAY_ALIAS,
      store: false,
      max_output_tokens: PROBE_OUTPUT_TOKENS,
      tools,
      input: [
        ...input,
        call,
        {
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({ ok: true }),
        },
      ],
    },
    fetchImpl: options.fetchImpl,
  });
  const secondBody = requireOk(second, "gateway Responses tool-result probe");
  requireUnexhaustedOutput(secondBody, "gateway Responses tool-result probe");
  invariant(
    Array.isArray(secondBody?.output) &&
      secondBody.output.some(
        (item) =>
          item?.type === "message" &&
          item.role === "assistant" &&
          item.content?.some(
            (content) =>
              content?.type === "output_text" &&
              typeof content.text === "string" &&
              content.text.trim().length > 0,
          ),
      ),
    "responses_tool_result_missing",
    "Gateway did not complete the Responses tool-result loop",
  );
  return { callName: call.name, resultLoop: true };
}

async function gatewayMessagesText(baseUrl, credential, options) {
  const result = await requestJson(endpoint(baseUrl, "/v1/messages"), {
    beforeRequest: options.beforeRequest,
    method: "POST",
    headers: bearerHeaders(credential, { "anthropic-version": "2023-06-01" }),
    body: {
      model: GATEWAY_ALIAS,
      max_tokens: PROBE_OUTPUT_TOKENS,
      messages: [{ role: "user", content: "Reply with exactly MESSAGES_OK." }],
    },
    fetchImpl: options.fetchImpl,
  });
  const body = requireOk(result, "gateway Messages text probe");
  requireUnexhaustedOutput(body, "gateway Messages text probe");
  invariant(
    body?.type === "message" &&
      Array.isArray(body?.content) &&
      body.content.some(
        (item) =>
          item?.type === "text" && typeof item.text === "string" && item.text.trim().length > 0,
      ),
    "messages_shape_invalid",
    "Gateway returned an invalid Messages payload",
  );
  return { httpStatus: result.status, messageShape: true };
}

async function gatewayMessagesToolLoop(baseUrl, credential, options) {
  const messages = [{ role: "user", content: "Call report_probe with value MESSAGES_TOOL_OK." }];
  const tools = [
    {
      name: "report_probe",
      description: "Return a bounded compatibility probe value.",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: { value: { type: "string" } },
        required: ["value"],
      },
    },
  ];
  const first = await requestJson(endpoint(baseUrl, "/v1/messages"), {
    beforeRequest: options.beforeRequest,
    method: "POST",
    headers: bearerHeaders(credential, { "anthropic-version": "2023-06-01" }),
    body: {
      model: GATEWAY_ALIAS,
      max_tokens: PROBE_OUTPUT_TOKENS,
      messages,
      tools,
      tool_choice: { type: "any" },
    },
    fetchImpl: options.fetchImpl,
  });
  const body = requireOk(first, "gateway Messages tool-call probe");
  requireUnexhaustedOutput(body, "gateway Messages tool-call probe");
  const call = body?.content?.find((item) => item?.type === "tool_use");
  invariant(
    call?.name === "report_probe" && call.id && typeof call.input?.value === "string",
    "messages_tool_call_missing",
    "Gateway did not return a Messages tool call",
  );
  const second = await requestJson(endpoint(baseUrl, "/v1/messages"), {
    beforeRequest: options.beforeRequest,
    method: "POST",
    headers: bearerHeaders(credential, { "anthropic-version": "2023-06-01" }),
    body: {
      model: GATEWAY_ALIAS,
      max_tokens: PROBE_OUTPUT_TOKENS,
      tools,
      messages: [
        ...messages,
        { role: "assistant", content: body.content },
        {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: call.id, content: JSON.stringify({ ok: true }) },
          ],
        },
      ],
    },
    fetchImpl: options.fetchImpl,
  });
  const secondBody = requireOk(second, "gateway Messages tool-result probe");
  requireUnexhaustedOutput(secondBody, "gateway Messages tool-result probe");
  invariant(
    Array.isArray(secondBody?.content) &&
      secondBody.content.some(
        (item) =>
          item?.type === "text" && typeof item.text === "string" && item.text.trim().length > 0,
      ),
    "messages_tool_result_missing",
    "Gateway did not complete the Messages tool-result loop",
  );
  return { callName: call.name, resultLoop: true };
}

async function gatewayInvalidKey(baseUrl, credential, options) {
  const result = await requestJson(endpoint(baseUrl, "/v1/models"), {
    beforeRequest: options.beforeRequest,
    headers: bearerHeaders(`sk-invalid-${crypto.randomUUID()}`),
    fetchImpl: options.fetchImpl,
  });
  const noDatabaseRejection =
    result.status === 400 &&
    result.body?.error?.type === "no_db_connection" &&
    String(result.body?.error?.code) === "400";
  invariant(
    result.status === 401 || result.status === 403 || noDatabaseRejection,
    "gateway_auth_not_enforced",
    `Invalid gateway key returned HTTP ${result.status} without a recognized authentication rejection`,
  );
  // A rejection alone may come from a broken or misrouted service. The same
  // endpoint must also accept the selected credential and expose our alias.
  // In master-key-only LiteLLM, a random virtual key additionally produces the
  // specific no_db_connection response because no virtual-key DB exists.
  await modelsProbe(`${baseUrl}/v1`, credential, { ...options, requiredModel: GATEWAY_ALIAS });
  return {
    httpStatus: result.status,
    rejected: true,
    validCredentialControl: true,
    ...(noDatabaseRejection ? { rejectionType: "no_db_connection" } : {}),
  };
}

export async function runGatewayCheck({
  beforeRequest = async () => {},
  credential,
  probes,
  fetchImpl,
  now = Date.now(),
  baseUrl,
}) {
  invariant(
    credential,
    "gateway_credential_required",
    "Gateway check requires the selected local credential",
  );
  const selected = [...new Set(probes ?? [])];
  invariant(selected.length > 0, "probes_required", "Select at least one gateway probe");
  for (const probe of selected) {
    invariant(
      GATEWAY_PROBES.includes(probe),
      "probe_unsupported",
      `Unsupported gateway probe: ${probe}`,
    );
  }
  const target = baseUrl ?? `http://${GATEWAY_HOST}:${GATEWAY_PORT}`;
  invariant(
    target === `http://${GATEWAY_HOST}:${GATEWAY_PORT}` || fetchImpl,
    "gateway_endpoint_blocked",
    "Gateway checks permit only the reviewed loopback endpoint",
  );
  const operations = {
    models: () =>
      modelsProbe(`${target}/v1`, credential, {
        beforeRequest,
        fetchImpl,
        requiredModel: GATEWAY_ALIAS,
      }),
    "responses-text": () => gatewayResponsesText(target, credential, { beforeRequest, fetchImpl }),
    "responses-tool-loop": () =>
      gatewayResponsesToolLoop(target, credential, { beforeRequest, fetchImpl }),
    "messages-text": () => gatewayMessagesText(target, credential, { beforeRequest, fetchImpl }),
    "messages-tool-loop": () =>
      gatewayMessagesToolLoop(target, credential, { beforeRequest, fetchImpl }),
    "invalid-key": () => gatewayInvalidKey(target, credential, { beforeRequest, fetchImpl }),
  };
  const results = [];
  for (const probe of selected) {
    results.push(
      await captureProbe(probe, operations[probe], [credential], {
        propagateError: (error) => error?.code === "process_binding_changed_during_check",
      }),
    );
  }
  const allVerified = results.every((result) => result.status === "verified");
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    kind: "hetzner-inference-gateway-check",
    observedAt: new Date(now).toISOString(),
    gateway: {
      baseUrl: target,
      results,
      state: !allVerified
        ? "blocked"
        : selected.some((probe) => probe.endsWith("tool-loop"))
          ? "tools_verified"
          : selected.some((probe) => probe !== "invalid-key")
            ? "transport_verified"
            : "verification_required",
    },
  };
}

export async function validateClientEvidence(
  file,
  component,
  manifest,
  now = Date.now(),
  host = null,
  dependencies = {},
) {
  const evidence = await readJson(file, {
    invalidCode: "client_evidence_json_invalid",
    shapeCode: "client_evidence_json_shape_invalid",
    tooLargeCode: "client_evidence_json_too_large",
    unsafeCode: "client_evidence_source_invalid",
  });
  const exactKeys = (value, expected) =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
  invariant(
    exactKeys(evidence, [
      "cases",
      "component",
      "configurationInvalidatedAt",
      "disposableWorkspace",
      "executable",
      "executableSha256",
      "gatewayConfigSha256",
      "hiddenRouting",
      "host",
      "kind",
      "model",
      "observedAt",
      "processBindingDigest",
      "schemaVersion",
      "source",
      "version",
    ]) &&
      evidence.schemaVersion === EVIDENCE_SCHEMA_VERSION &&
      evidence.kind === "hetzner-inference-client-e2e",
    "client_evidence_invalid",
    "Unsupported client evidence schema",
  );
  invariant(
    evidence.component === component,
    "client_evidence_wrong_component",
    "Client evidence belongs to another component",
  );
  invariant(
    component === "codex" || component === "claude-code",
    "client_evidence_component_unsupported",
    "Only Codex and Claude Code have a client E2E evidence contract",
  );
  invariant(
    manifest.clients.includes(component),
    "client_not_configured",
    `${component} is not configured by this installation`,
  );
  const observedAt = Date.parse(evidence.observedAt);
  invariant(
    Number.isFinite(observedAt) && observedAt <= now,
    "client_evidence_invalid_time",
    "Client evidence time is invalid",
  );
  invariant(
    evidence.disposableWorkspace === true,
    "client_evidence_not_disposable",
    "Client E2E proof must use a disposable repository",
  );
  invariant(
    evidence.hiddenRouting === false,
    "client_evidence_hidden_routing",
    "Client E2E proof must rule out hidden routing",
  );
  invariant(
    evidence.source === "automated" || evidence.source === "manual",
    "client_evidence_source_invalid",
    "Client E2E evidence must be labeled automated or manual",
  );
  invariant(
    evidence.model === manifest.model &&
      evidence.gatewayConfigSha256 ===
        manifest.artifacts.find((artifact) => artifact.role === "gateway-config")?.sha256 &&
      evidence.configurationInvalidatedAt === manifest.evidence.invalidatedAt &&
      observedAt >= Date.parse(manifest.evidence.invalidatedAt),
    "client_evidence_stale",
    "Client evidence predates or does not match the installed configuration",
  );
  invariant(
    evidence.processBindingDigest === immutableProcessBindingDigest(manifest.process),
    "client_evidence_process_changed",
    "Client evidence belongs to a different owned gateway process",
  );
  const expectedExecutable = manifest.executables[component];
  invariant(
    expectedExecutable?.path &&
      evidence.executable === expectedExecutable.path &&
      evidence.version === expectedExecutable.version &&
      evidence.executableSha256 === expectedExecutable.sha256,
    "client_evidence_executable_changed",
    "Client evidence does not match the planned executable path, version, and content",
  );
  let currentExecutable;
  await dependencies.beforeExecutableVerification?.();
  assertWslSameEnvironmentPath(expectedExecutable.path, host, `${component} executable`);
  try {
    currentExecutable = fs.realpathSync.native(expectedExecutable.path);
  } catch {
    throw new SetupError(
      "client_evidence_executable_changed",
      "Client executable recorded by the evidence is no longer available",
    );
  }
  assertWslSameEnvironmentPath(currentExecutable, host, `${component} executable`);
  const currentObservation = await inspectPath(currentExecutable);
  assertWslSameEnvironmentPath(currentExecutable, host, `${component} executable`);
  const currentVersion = await captureVersion(currentExecutable);
  invariant(
    currentExecutable === expectedExecutable.path &&
      currentObservation.sha256 === expectedExecutable.sha256 &&
      currentVersion === expectedExecutable.version,
    "client_evidence_executable_changed",
    "Client executable path, content, or version changed after evidence was recorded",
  );
  invariant(
    exactKeys(evidence.host, [
      "configRoot",
      "crossBoundary",
      "kind",
      "platform",
      "stateRoot",
      "wslDistribution",
    ]) &&
      evidence.host.kind === manifest.host.kind &&
      evidence.host?.platform === manifest.host.platform &&
      evidence.host?.configRoot === manifest.host.configRoot &&
      evidence.host?.stateRoot === manifest.host.stateRoot &&
      evidence.host?.wslDistribution === manifest.host.wslDistribution &&
      evidence.host?.crossBoundary === manifest.host.crossBoundary,
    "client_evidence_host_changed",
    "Client evidence belongs to another host boundary",
  );
  const required = component === "codex" ? CODEX_E2E_CASES : CLAUDE_E2E_CASES;
  const evidenceCases = Array.isArray(evidence.cases) ? evidence.cases : [];
  invariant(
    evidenceCases.every(
      (item) =>
        exactKeys(item, ["name", "status"]) &&
        typeof item.name === "string" &&
        item.status === "verified",
    ),
    "client_evidence_invalid",
    "Client evidence cases have missing or unknown fields",
  );
  const cases = new Map(evidenceCases.map((item) => [item.name, item.status]));
  invariant(
    cases.size === evidenceCases.length,
    "client_evidence_duplicate_case",
    "Client E2E evidence contains duplicate case names",
  );
  const missing = required.filter((name) => cases.get(name) !== "verified");
  invariant(
    missing.length === 0,
    "client_evidence_incomplete",
    "Client E2E evidence is incomplete",
    { missing },
  );
  return {
    component,
    state: "client_e2e_verified",
    observedAt: evidence.observedAt,
    source: evidence.source,
    executable: evidence.executable,
    version: evidence.version,
  };
}
