import assert from "node:assert/strict";
import test from "node:test";
import {
  runGatewayCheck,
  runProviderCheck,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/probes.mjs";

const CREDENTIAL = "fixture-probe-credential";
const value = JSON.stringify({ value: "PROBE_OK" });
const protocols = [
  {
    name: "provider Chat Completions",
    scope: "provider",
    text: "text",
    tools: "tool-loop",
    budget: "max_tokens",
    run: (probes, fetchImpl) =>
      runProviderCheck({
        credential: CREDENTIAL,
        model: "fixture-reasoning-model",
        probes,
        fetchImpl,
      }),
    complete: () => ({
      choices: [{ finish_reason: "stop", message: { role: "assistant", content: "PROBE_OK" } }],
    }),
    call: () => ({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call-probe",
                type: "function",
                function: { name: "report_probe", arguments: value },
              },
            ],
          },
        },
      ],
    }),
    exhausted: () => ({
      choices: [
        {
          finish_reason: "length",
          message: {
            role: "assistant",
            content: "partial",
            reasoning_content: "unfinished reasoning",
          },
        },
      ],
    }),
    continuation: (body) => {
      assert.equal(body.messages[1].tool_calls[0].id, "call-probe");
      assert.equal(body.messages[2].role, "tool");
      assert.equal(body.messages[2].tool_call_id, "call-probe");
    },
  },
  {
    name: "gateway Responses",
    scope: "gateway",
    text: "responses-text",
    tools: "responses-tool-loop",
    budget: "max_output_tokens",
    run: (probes, fetchImpl) => runGatewayCheck({ credential: CREDENTIAL, probes, fetchImpl }),
    complete: () => ({
      id: "resp-complete",
      status: "completed",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "PROBE_OK" }],
        },
      ],
    }),
    call: () => ({
      id: "resp-call",
      status: "completed",
      output: [
        { type: "function_call", name: "report_probe", call_id: "call-probe", arguments: value },
      ],
    }),
    exhausted: () => ({
      id: "resp-partial",
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [
        { type: "message", role: "assistant", content: [{ type: "output_text", text: "partial" }] },
      ],
    }),
    continuation: (body) => {
      assert.equal(Object.hasOwn(body, "previous_response_id"), false);
      assert.equal(body.store, false);
      assert.deepEqual(body.input[0], {
        role: "user",
        content: "Call report_probe with value RESPONSES_TOOL_OK.",
      });
      assert.deepEqual(body.input[1], {
        type: "function_call",
        name: "report_probe",
        call_id: "call-probe",
        arguments: value,
      });
      assert.equal(body.input[2].type, "function_call_output");
      assert.equal(body.input[2].call_id, "call-probe");
    },
  },
  {
    name: "gateway Messages",
    scope: "gateway",
    text: "messages-text",
    tools: "messages-tool-loop",
    budget: "max_tokens",
    run: (probes, fetchImpl) => runGatewayCheck({ credential: CREDENTIAL, probes, fetchImpl }),
    complete: () => ({
      type: "message",
      role: "assistant",
      stop_reason: "end_turn",
      content: [{ type: "text", text: "PROBE_OK" }],
    }),
    call: () => ({
      type: "message",
      role: "assistant",
      stop_reason: "tool_use",
      content: [
        { type: "tool_use", id: "call-probe", name: "report_probe", input: { value: "PROBE_OK" } },
      ],
    }),
    exhausted: () => ({
      type: "message",
      role: "assistant",
      stop_reason: "max_tokens",
      content: [{ type: "text", text: "partial" }],
    }),
    continuation: (body) => {
      assert.equal(body.messages[1].content[0].id, "call-probe");
      assert.equal(body.messages[2].content[0].type, "tool_result");
      assert.equal(body.messages[2].content[0].tool_use_id, "call-probe");
    },
  },
];

function responses(sequence) {
  const requests = [];
  const fetchImpl = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    assert.equal(options.redirect, "error");
    assert.ok(sequence.length, "Probe made an unexpected additional request");
    return new Response(JSON.stringify(sequence.shift()), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetchImpl, requests };
}

for (const protocol of protocols) {
  test(`${protocol.name}: text and both tool stages use a finite reasoning-aware budget and preserve continuation`, async () => {
    const mock = responses([protocol.complete(), protocol.call(), protocol.complete()]);
    const evidence = await protocol.run([protocol.text, protocol.tools], mock.fetchImpl);
    assert.equal(evidence[protocol.scope].state, "tools_verified");
    assert.deepEqual(
      evidence[protocol.scope].results.map((result) => result.status),
      ["verified", "verified"],
    );
    assert.equal(mock.requests.length, 3);
    for (const request of mock.requests) {
      assert.equal(request[protocol.budget], 1024);
      assert.equal(Object.hasOwn(request, "thinking"), false);
      assert.equal(Object.hasOwn(request, "enable_thinking"), false);
    }
    protocol.continuation(mock.requests[2]);
    if (protocol.scope === "gateway" && protocol.tools === "responses-tool-loop") {
      assert.deepEqual(mock.requests[2].tools, mock.requests[1].tools);
      assert.equal(mock.requests[2].tools[0].name, "report_probe");
    }
  });

  for (const stage of ["text", "tool-call", "tool-result"]) {
    test(`${protocol.name}: ${stage} budget exhaustion is inconclusive even with partial visible content`, async () => {
      const sequence =
        stage === "tool-result" ? [protocol.call(), protocol.exhausted()] : [protocol.exhausted()];
      const mock = responses(sequence);
      const evidence = await protocol.run(
        [stage === "text" ? protocol.text : protocol.tools],
        mock.fetchImpl,
      );
      const result = evidence[protocol.scope].results[0];
      assert.equal(result.status, "failed");
      assert.equal(result.error.code, "probe_output_exhausted");
      assert.match(result.error.message, /inconclusive/);
      assert.match(result.error.message, /not evidence that the capability is unsupported/);
      assert.equal(evidence[protocol.scope].state, "blocked");
      assert.equal(mock.requests.length, stage === "tool-result" ? 2 : 1);
      assert.equal(JSON.stringify(evidence).includes(CREDENTIAL), false);
    });
  }
}

test("provider streaming remains a transport claim when reasoning consumes the small stream budget", async () => {
  let body;
  const evidence = await runProviderCheck({
    credential: CREDENTIAL,
    model: "fixture-reasoning-model",
    probes: ["stream"],
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return new Response(
        'data: {"choices":[{"delta":{"reasoning_content":"reasoning"},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n',
        { headers: { "content-type": "text/event-stream" } },
      );
    },
  });
  assert.equal(body.max_tokens, 32);
  assert.equal(evidence.provider.state, "transport_verified");
  assert.equal(evidence.provider.results[0].details.eventCount, 2);
  assert.equal(evidence.provider.results[0].details.resultLoop, undefined);
});

test("empty completed provider text does not establish usable assistant output", async () => {
  const mock = responses([{ choices: [{ finish_reason: "stop", message: { content: "   " } }] }]);
  const evidence = await runProviderCheck({
    credential: CREDENTIAL,
    model: "fixture-model",
    probes: ["text"],
    fetchImpl: mock.fetchImpl,
  });
  assert.equal(evidence.provider.results[0].status, "failed");
  assert.equal(evidence.provider.results[0].error.code, "provider_text_shape_invalid");
});

test("Responses tool loop works against a stateless gateway without stored response IDs", async () => {
  let requests = 0;
  const protocol = protocols.find((item) => item.name === "gateway Responses");
  const evidence = await protocol.run([protocol.tools], async (_url, options) => {
    requests += 1;
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    if (body.previous_response_id || !Array.isArray(body.input)) {
      return new Response(
        JSON.stringify({ error: { type: "no_db_connection", code: "400", param: null } }),
        { status: 400 },
      );
    }
    if (requests === 1) return Response.json(protocol.call());
    protocol.continuation(body);
    assert.deepEqual(JSON.parse(body.input[2].output), { ok: true });
    return Response.json(protocol.complete());
  });
  assert.equal(requests, 2);
  assert.equal(evidence.gateway.state, "tools_verified");
});

async function invalidKeyFixture({
  invalidStatus,
  invalidBody,
  validStatus = 200,
  validBody = { data: [{ id: "hetzner-default" }] },
}) {
  const calls = [];
  const evidence = await runGatewayCheck({
    credential: CREDENTIAL,
    probes: ["invalid-key"],
    fetchImpl: async (url, options) => {
      assert.equal(new URL(url).pathname, "/v1/models");
      const valid = options.headers.Authorization === `Bearer ${CREDENTIAL}`;
      calls.push(valid ? "valid" : "invalid");
      return Response.json(valid ? validBody : invalidBody, {
        status: valid ? validStatus : invalidStatus,
      });
    },
  });
  return { evidence, calls };
}

test("LiteLLM's specific database-free invalid-key rejection needs a successful credential control", async () => {
  const { evidence, calls } = await invalidKeyFixture({
    invalidStatus: 400,
    invalidBody: {
      error: { type: "no_db_connection", message: "No connected db.", code: "400", param: null },
    },
  });
  assert.deepEqual(calls, ["invalid", "valid"]);
  assert.equal(evidence.gateway.results[0].status, "verified");
  assert.deepEqual(evidence.gateway.results[0].details, {
    httpStatus: 400,
    rejected: true,
    rejectionType: "no_db_connection",
    validCredentialControl: true,
  });
});

for (const invalidBody of [
  { error: { type: "bad_request" } },
  { error: { type: "no_db_connection", code: "500" } },
  { error: { type: "no_db_connection" } },
  { detail: "no_db_connection" },
  { error: { message: "no_db_connection" } },
]) {
  test(`arbitrary HTTP 400 is not authentication evidence: ${JSON.stringify(invalidBody)}`, async () => {
    const { evidence, calls } = await invalidKeyFixture({ invalidStatus: 400, invalidBody });
    assert.deepEqual(calls, ["invalid"]);
    assert.equal(evidence.gateway.results[0].error.code, "gateway_auth_not_enforced");
  });
}

for (const control of [
  {
    validStatus: 400,
    validBody: { error: { type: "no_db_connection", code: "400", param: null } },
  },
  { validBody: { data: [{ id: "unrelated-model" }] } },
]) {
  test(`database-free rejection fails when the valid-credential control does not establish access: ${JSON.stringify(control)}`, async () => {
    const { evidence, calls } = await invalidKeyFixture({
      invalidStatus: 400,
      invalidBody: { error: { type: "no_db_connection", code: "400", param: null } },
      ...control,
    });
    assert.deepEqual(calls, ["invalid", "valid"]);
    assert.equal(evidence.gateway.results[0].status, "failed");
    assert.equal(evidence.gateway.state, "blocked");
    assert.equal(evidence.gateway.results[0].details, undefined);
  });
}

for (const status of [200, 401, 403, 500]) {
  test(`invalid-key HTTP ${status} preserves strict recognized status handling`, async () => {
    const { evidence, calls } = await invalidKeyFixture({
      invalidStatus: status,
      invalidBody: { error: { type: "no_db_connection", code: "400", param: null } },
    });
    assert.deepEqual(calls, [401, 403].includes(status) ? ["invalid", "valid"] : ["invalid"]);
    assert.equal(
      evidence.gateway.results[0].status,
      [401, 403].includes(status) ? "verified" : "failed",
    );
  });
}

for (const status of [401, 403]) {
  test(`HTTP ${status} rejection is not a pass when the selected real credential also fails`, async () => {
    const { evidence, calls } = await invalidKeyFixture({
      invalidStatus: status,
      invalidBody: { error: { type: "authentication_error" } },
      validStatus: status,
      validBody: { error: { type: "authentication_error" } },
    });
    assert.deepEqual(calls, ["invalid", "valid"]);
    assert.equal(evidence.gateway.results[0].status, "failed");
    assert.equal(evidence.gateway.results[0].details, undefined);
  });
}

test("text probes do not add dummy tool definitions to work around provider validation", async () => {
  for (const protocol of protocols) {
    const mock = responses([protocol.complete()]);
    await protocol.run([protocol.text], mock.fetchImpl);
    assert.equal(Object.hasOwn(mock.requests[0], "tools"), false);
  }
});
