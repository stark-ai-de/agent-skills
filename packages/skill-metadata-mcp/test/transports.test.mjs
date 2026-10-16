import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { handler } from "../src/http.mjs";
import { validateSkillMetadata } from "../src/core.mjs";
const input = { frontmatter: "name: sample\ndescription: A test", directory_name: "sample" };
const init = {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "metadata-contract-test", version: "1.0.0" },
};
async function rpc(method, params = {}, id = 1, version = "2025-06-18") {
  const response = await handler(
    new Request("https://example.test/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": version,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
  );
  assert.equal(response.status, 200, await response.clone().text());
  const text = await response.text();
  return JSON.parse(
    text.startsWith("data:") || text.startsWith("event:")
      ? text
          .split("\n")
          .find((line) => line.startsWith("data:"))
          .slice(5)
          .trim()
      : text,
  );
}
test("stateless HTTP supports initialization, schemas and both tools", async () => {
  assert.equal(
    (await rpc("initialize", init)).result.serverInfo.name,
    "stark-ai-metadata-validator",
  );
  const list = (await rpc("tools/list")).result.tools;
  assert.deepEqual(list.map((t) => t.name).sort(), [
    "validate_plugin_manifest",
    "validate_skill_metadata",
  ]);
  for (const tool of list) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.openWorldHint, false);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.ok(tool.inputSchema);
    assert.ok(tool.outputSchema);
  }
  const value = (await rpc("tools/call", { name: "validate_skill_metadata", arguments: input }))
    .result;
  assert.deepEqual(value.structuredContent, validateSkillMetadata(input));
  assert.deepEqual(JSON.parse(value.content[0].text), value.structuredContent);
  const invalid = (
    await rpc("tools/call", {
      name: "validate_plugin_manifest",
      arguments: { format: "openai-native", manifest_json: "{}" },
    })
  ).result;
  assert.equal(invalid.structuredContent.valid, false);
  const badArgs = await rpc("tools/call", {
    name: "validate_skill_metadata",
    arguments: { url: "https://example.test" },
  });
  assert.ok(badArgs.error || badArgs.result?.isError);
});
test("2025 Streamable HTTP versions negotiate independently", async () => {
  for (const version of ["2025-03-26", "2025-11-25"]) {
    const response = await rpc("initialize", { ...init, protocolVersion: version }, 1, version);
    assert.equal(response.result.protocolVersion, version);
  }
});
test("HTTP routing, streaming size guard, no caching and legacy session methods", async () => {
  assert.equal(
    (
      await handler(
        new Request("https://example.test/mcp", {
          method: "GET",
          headers: { "mcp-protocol-version": "2025-06-18" },
        }),
      )
    ).status,
    405,
  );
  assert.equal(
    (
      await handler(
        new Request("https://example.test/mcp", {
          method: "DELETE",
          headers: { "mcp-protocol-version": "2025-06-18" },
        }),
      )
    ).status,
    405,
  );
  const large = new Request("https://example.test/mcp", {
    method: "POST",
    body: "x".repeat(131073),
  });
  assert.equal((await handler(large)).status, 413);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(131073));
      controller.close();
    },
  });
  assert.equal(
    (
      await handler(
        new Request("https://example.test/mcp", { method: "POST", body: stream, duplex: "half" }),
      )
    ).status,
    413,
  );
  assert.equal((await handler(new Request("https://example.test/unknown"))).status, 404);
  const health = await handler(new Request("https://example.test/health"));
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("cache-control"), "no-store");
  const deep = new Request("https://example.test/mcp", {
    method: "POST",
    body: '{"x":'.repeat(30) + "0" + "}".repeat(30),
  });
  assert.equal((await handler(deep)).status, 400);
  const old = process.env.OPENAI_APPS_CHALLENGE;
  try {
    delete process.env.OPENAI_APPS_CHALLENGE;
    assert.equal(
      (await handler(new Request("https://example.test/.well-known/openai-apps-challenge"))).status,
      404,
    );
    process.env.OPENAI_APPS_CHALLENGE = "test-challenge\n";
    assert.equal(
      await (
        await handler(new Request("https://example.test/.well-known/openai-apps-challenge"))
      ).text(),
      "test-challenge\n",
    );
  } finally {
    if (old === undefined) delete process.env.OPENAI_APPS_CHALLENGE;
    else process.env.OPENAI_APPS_CHALLENGE = old;
  }
});
test(
  "stdio process uses the same validator without startup downloads",
  { timeout: 10000 },
  async () => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL("../src/stdio.mjs", import.meta.url))],
      { cwd: "/tmp", stdio: ["pipe", "pipe", "pipe"] },
    );
    let buffer = "";
    let errors = "";
    const waiting = new Map();
    let id = 0;
    child.stderr.on("data", (chunk) => {
      errors += chunk;
    });
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      while (buffer.includes("\n")) {
        const end = buffer.indexOf("\n");
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        const message = JSON.parse(line);
        const resolve = waiting.get(message.id);
        if (resolve) {
          waiting.delete(message.id);
          resolve(message);
        }
      }
    });
    const call = (method, params) =>
      new Promise((resolve, reject) => {
        const number = ++id;
        const timer = setTimeout(
          () => reject(new Error(`stdio timeout: ${method}; ${errors}`)),
          4000,
        );
        waiting.set(number, (message) => {
          clearTimeout(timer);
          resolve(message);
        });
        child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: number, method, params }) + "\n");
      });
    try {
      assert.equal(
        (await call("initialize", init)).result.serverInfo.name,
        "stark-ai-metadata-validator",
      );
      child.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n",
      );
      assert.equal((await call("tools/list", {})).result.tools.length, 2);
      assert.deepEqual(
        (await call("tools/call", { name: "validate_skill_metadata", arguments: input })).result
          .structuredContent,
        validateSkillMetadata(input),
      );
      assert.equal(errors, "");
    } finally {
      child.stdin.end();
      child.kill();
    }
  },
);
