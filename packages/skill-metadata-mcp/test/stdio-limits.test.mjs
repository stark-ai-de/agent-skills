import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { LIMITS } from "../src/core.mjs";

const entry = fileURLToPath(new URL("../src/stdio.mjs", import.meta.url));
async function start(t) {
  const child = spawn(process.execPath, [entry], { stdio: ["pipe", "pipe", "pipe"] });
  const closed = once(child, "close");
  let output = "",
    errors = "",
    partial = "";
  const waiting = new Map();
  const messages = [];
  child.stdin.on("error", () => {});
  child.stderr.on("data", (chunk) => {
    errors += chunk;
  });
  child.stdout.on("data", (chunk) => {
    output += chunk;
    partial += chunk;
    let newline;
    while ((newline = partial.indexOf("\n")) !== -1) {
      const message = JSON.parse(partial.slice(0, newline));
      partial = partial.slice(newline + 1);
      messages.push(message);
      waiting.get(message.id)?.(message);
      waiting.delete(message.id);
    }
  });
  const receive = (id) => new Promise((resolve) => waiting.set(id, resolve));
  t.after(async () => {
    child.kill();
    await closed;
  });
  const ready = receive(0);
  child.stdin.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "stdio-limit-test", version: "1.0.0" },
      },
    }) + "\n",
  );
  assert.ok((await ready).result.serverInfo);
  child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
  return { child, closed, receive, messages, output: () => output, errors: () => errors };
}
function request(id, bytes, name = "sample") {
  const message = {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: "validate_skill_metadata",
      arguments: { frontmatter: `name: ${name}\ndescription: Example`, directory_name: name },
      _meta: { padding: "" },
    },
  };
  const padding = bytes - Buffer.byteLength(JSON.stringify(message));
  assert.ok(padding >= 0);
  message.params._meta.padding = "x".repeat(padding);
  const frame = Buffer.from(JSON.stringify(message));
  assert.equal(frame.length, bytes);
  return frame;
}

test(
  "stdio accepts exactly 128 KiB and coalesced individually bounded requests",
  { timeout: 10000 },
  async (t) => {
    const client = await start(t);
    const reply = client.receive(1);
    client.child.stdin.write(Buffer.concat([request(1, LIMITS.requestBytes), Buffer.from("\n")]));
    assert.equal((await reply).result.structuredContent.valid, true);
    const second = client.receive(2),
      third = client.receive(3);
    client.child.stdin.write(
      Buffer.concat([request(2, 70000), Buffer.from("\n"), request(3, 70000), Buffer.from("\n")]),
    );
    assert.equal((await second).result.structuredContent.valid, true);
    assert.equal((await third).result.structuredContent.valid, true);
    const manifest = client.receive(4);
    client.child.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "validate_plugin_manifest",
          arguments: {
            format: "openai-native",
            manifest_json: JSON.stringify({ name: "example", version: "1.0.0" }),
          },
        },
      }) + "\n",
    );
    assert.equal((await manifest).result.structuredContent.valid, true);
    assert.equal(client.errors(), "");
  },
);

test(
  "stdio preserves fragmented UTF-8 and accepts 64 supplementary Unicode codepoints",
  { timeout: 10000 },
  async (t) => {
    const client = await start(t);
    const frame = request(1, 1000, "café");
    const split = frame.indexOf(Buffer.from("é")) + 1;
    const reply = client.receive(1);
    client.child.stdin.write(frame.subarray(0, split));
    await new Promise((resolve) => setTimeout(resolve, 20));
    client.child.stdin.write(Buffer.concat([frame.subarray(split), Buffer.from("\n")]));
    assert.equal((await reply).result.structuredContent.valid, true);
    const unicode = client.receive(2);
    client.child.stdin.write(Buffer.concat([request(2, 2000, "𐐨".repeat(64)), Buffer.from("\n")]));
    assert.equal((await unicode).result.structuredContent.valid, true);
  },
);

for (const [bytes, complete] of [
  [131073, true],
  [140208, true],
  [131073, false],
]) {
  test(
    `stdio closes on ${bytes}-byte ${complete ? "complete" : "incomplete"} input without calling a tool`,
    { timeout: 10000 },
    async (t) => {
      const client = await start(t);
      const frame = request(1, bytes);
      client.child.stdin.write(frame.subarray(0, 50000));
      client.child.stdin.write(frame.subarray(50000, 100000));
      client.child.stdin.write(
        Buffer.concat([frame.subarray(100000), Buffer.from(complete ? "\n" : "")]),
      );
      const [code] = await client.closed;
      assert.equal(code, 1);
      assert.equal(
        client.messages.some((message) => message.id === 1),
        false,
      );
      assert.equal(client.errors(), "MCP input exceeds 128 KiB\n");
      assert.equal(client.output().includes("padding"), false);
    },
  );
}
