#!/usr/bin/env node
const defaultTimeoutMs = 60000;

function printHelp() {
  console.log(`Usage: node probe-openai-compatible-endpoint.mjs [options]

Checks an OpenAI-compatible /v1 endpoint by listing models and running one chat completion.

Options:
  --base-url <url>    Base URL, default SKILLOPT_OPENAI_BASE_URL or OPENAI_BASE_URL
  --api-key <token>   Bearer token, default SKILLOPT_OPENAI_API_KEY or OPENAI_API_KEY
  --model <name>      Model to call, default SKILLOPT_TARGET_MODEL or SKILLOPT_OPTIMIZER_MODEL
  --timeout-ms <ms>   Request timeout, default 60000
  --json
  --help`);
}

function parseArgs(argv) {
  const args = {
    baseUrl:
      process.env.SKILLOPT_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || "",
    apiKey:
      process.env.SKILLOPT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
    model:
      process.env.SKILLOPT_TARGET_MODEL ||
      process.env.SKILLOPT_OPTIMIZER_MODEL ||
      "",
    timeoutMs: defaultTimeoutMs,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--base-url") args.baseUrl = argv[++index];
    else if (arg === "--api-key") args.apiKey = argv[++index];
    else if (arg === "--model") args.model = argv[++index];
    else if (arg === "--timeout-ms") args.timeoutMs = Number(argv[++index]);
    else if (arg === "--json") args.json = true;
    else fail(`Unknown argument: ${arg}`);
  }
  if (!args.baseUrl) fail("--base-url or SKILLOPT_OPENAI_BASE_URL is required");
  if (!args.model) fail("--model or SKILLOPT_TARGET_MODEL is required");
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs <= 0) {
    fail("--timeout-ms must be a positive integer");
  }
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function isSensitiveQueryKey(key) {
  const normalized = String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return (
    [
      "apikey",
      "accesskey",
      "accesstoken",
      "authorization",
      "auth",
      "credential",
      "password",
      "passwd",
      "secret",
      "signature",
      "sig",
      "token",
    ].includes(normalized) ||
    /(accesstoken|securitytoken|credential|password|secret|signature)$/.test(
      normalized,
    )
  );
}

function sanitizeDisplayUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.username = "";
    url.password = "";
    for (const key of [...url.searchParams.keys()]) {
      if (isSensitiveQueryKey(key)) url.searchParams.set(key, "[redacted]");
    }
    if (url.hash) url.hash = "#redacted";
    return url.toString();
  } catch {
    return String(value || "")
      .replace(/(https?:\/\/)[^/\s@]+@/gi, "$1[redacted]@")
      .replace(
        /([?&](?:api[_-]?key|access[_-]?token|auth|credential|password|passwd|secret|signature|sig|token)=)[^&#\s]*/gi,
        "$1[redacted]",
      );
  }
}

function sensitiveUrlValues(value) {
  try {
    const url = new URL(String(value || ""));
    const values = [url.username, url.password];
    for (const [key, queryValue] of url.searchParams.entries()) {
      if (isSensitiveQueryKey(key)) values.push(queryValue);
    }
    if (url.hash) values.push(url.hash.slice(1));
    return values.filter(Boolean);
  } catch {
    return [];
  }
}

function redact(text, sensitiveValues = []) {
  let output = String(text || "");
  for (const value of sensitiveValues.filter(Boolean)) {
    output = output.replaceAll(String(value), "[redacted]");
    output = output.replaceAll(
      encodeURIComponent(String(value)),
      "%5Bredacted%5D",
    );
  }
  return output
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => sanitizeDisplayUrl(url))
    .replace(/(https?:\/\/)[^/\s@]+@/gi, "$1[redacted]@")
    .replace(
      /([?&](?:api[_-]?key|access[_-]?token|auth|credential|password|passwd|secret|signature|sig|token)=)[^&#\s]*/gi,
      "$1[redacted]",
    )
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted-token]")
    .replace(/[A-Za-z0-9+/=._-]{48,}/g, "[redacted-long-token]");
}

function sanitizePayload(payload, sensitiveValues) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return null;
  if (payload.error && typeof payload.error === "object") {
    return {
      error: {
        type: redact(payload.error.type, sensitiveValues),
        code: redact(payload.error.code, sensitiveValues),
        message: redact(payload.error.message, sensitiveValues),
      },
    };
  }
  return {
    object: typeof payload.object === "string" ? payload.object : null,
    model_count: Array.isArray(payload.data) ? payload.data.length : null,
    choices_count: Array.isArray(payload.choices)
      ? payload.choices.length
      : null,
    assistant_content_present:
      typeof payload.choices?.[0]?.message?.content === "string",
  };
}

function assistantContent(payload) {
  return typeof payload?.choices?.[0]?.message?.content === "string"
    ? payload.choices[0].message.content
    : "";
}

async function requestJson(args, method, path, body = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);
  const headers = { accept: "application/json" };
  if (args.apiKey) headers.authorization = `Bearer ${args.apiKey}`;
  if (body) headers["content-type"] = "application/json";
  try {
    const response = await fetch(`${args.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = {
        error: {
          message: redact(text, args.sensitiveValues).slice(0, 1000),
          type: "non_json_response",
        },
      };
    }
    return {
      ok: response.ok,
      status: response.status,
      payload: sanitizePayload(payload, args.sensitiveValues),
      assistantContent: assistantContent(payload),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  args.sensitiveValues = [
    ...sensitiveUrlValues(args.baseUrl),
    args.apiKey,
  ].filter(Boolean);
  const result = {
    ok: false,
    base_url: sanitizeDisplayUrl(args.baseUrl),
    model: args.model,
    auth_present: Boolean(args.apiKey),
    models: null,
    chat: null,
  };

  try {
    result.models = await requestJson(args, "GET", "/models");
    const chatBody = {
      model: args.model,
      messages: [
        {
          role: "user",
          content: "Reply with exactly SKILLOPT_ENDPOINT_READY.",
        },
      ],
      temperature: 0,
      max_tokens: 16,
    };
    result.chat = await requestJson(
      args,
      "POST",
      "/chat/completions",
      chatBody,
    );
    const content = result.chat.assistantContent || "";
    delete result.models.assistantContent;
    delete result.chat.assistantContent;
    result.ok =
      result.models.ok &&
      result.chat.ok &&
      typeof content === "string" &&
      content.includes("SKILLOPT_ENDPOINT_READY");
  } catch (error) {
    result.error = redact(
      error instanceof Error ? error.message : String(error),
      args.sensitiveValues,
    );
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `OpenAI-compatible endpoint probe: ${result.ok ? "ready" : "blocked"}`,
    );
    console.log(`Base URL: ${result.base_url}`);
    console.log(`Model: ${result.model}`);
    console.log(`Auth present: ${result.auth_present ? "yes" : "no"}`);
    if (result.models)
      console.log(`Models request: HTTP ${result.models.status}`);
    if (result.chat) console.log(`Chat request: HTTP ${result.chat.status}`);
    if (result.error) console.log(`Error: ${result.error}`);
  }
  process.exit(result.ok ? 0 : 1);
}

main();
