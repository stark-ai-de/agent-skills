import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { remoteCommand } from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/remote.mjs";

const keyName = "HETZNER_TEST_PARTIAL_INFERENCE";
const key = "synthetic-inference-credential";
process.env[keyName] = key;

async function fixture(t, body, status = 200) {
  const server = createServer((request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${key}`);
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return {
    "inference-url": `http://127.0.0.1:${server.address().port}/prefix/v1`,
    "inference-key-env": keyName,
    "approve-network": "inference",
  };
}

for (const content of ["", "O", "OK", key]) {
  test(`remote inference rejects exhausted output even with visible text: ${content.length}`, async (t) => {
    const options = await fixture(t, {
      choices: [{ message: { content }, finish_reason: "length" }],
    });
    const result = await remoteCommand("check", options);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "inference_budget_exhausted");
    assert.equal(result.proof, undefined);
    assert.equal(JSON.stringify(result).includes(key), false);
  });
}

for (const body of [
  {},
  { choices: [] },
  { choices: [null] },
  { choices: "invalid" },
  { choices: [{ message: { content: "" }, finish_reason: "stop" }] },
]) {
  test(`remote inference rejects invalid or empty output: ${JSON.stringify(body)}`, async (t) => {
    const result = await remoteCommand("check", await fixture(t, body));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "inference_invalid");
  });
}

test("remote inference preserves successful complete text and separate client claims", async (t) => {
  const result = await remoteCommand(
    "check",
    await fixture(t, {
      choices: [{ message: { content: "OK" }, finish_reason: "stop" }],
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.proof.inference, "passed");
  for (const component of ["clients", "streaming", "tools", "providerDirect"])
    assert.equal(result.proof[component], "not-tested");
});

test("remote HTTP failure remains redacted and is not inference success", async (t) => {
  const result = await remoteCommand("check", await fixture(t, { error: key }, 502));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "gateway_http_error");
  assert.equal(JSON.stringify(result).includes(key), false);
});

test("remote CLI exits unsuccessfully for partial length-limited text", async (t) => {
  const options = await fixture(t, {
    choices: [{ message: { content: "O" }, finish_reason: "length" }],
  });
  const cli = fileURLToPath(
    new URL(
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/manage-remote-hetzner.mjs",
      import.meta.url,
    ),
  );
  const args = [
    cli,
    "check",
    ...Object.entries(options).flatMap(([name, value]) => [`--${name}`, value]),
  ];
  await assert.rejects(promisify(execFile)(process.execPath, args, { timeout: 5000 }), (error) => {
    const result = JSON.parse(error.stdout);
    return error.code === 1 && result.error.code === "inference_budget_exhausted";
  });
});
