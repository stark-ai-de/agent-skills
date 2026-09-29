import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import { runBoundedCommand } from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/subprocess.mjs";

function capture(chunks, { stream = "stdout", maxBytes = 1024, code = 0 } = {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 1;
  child.exitCode = null;
  child.signalCode = null;
  const close = (exitCode, signal = null) => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.exitCode = exitCode;
    child.signalCode = signal;
    child.emit("close", exitCode, signal);
  };
  child.kill = (signal) => {
    queueMicrotask(() => close(null, signal));
    return true;
  };
  return runBoundedCommand(
    "synthetic-child",
    [],
    { maxBytes, timeoutMs: 1000 },
    {
      spawn: () => {
        void (async () => {
          for (const chunk of chunks) {
            await setImmediate();
            if (child.exitCode !== null || child.signalCode !== null) return;
            child[stream].emit("data", chunk);
          }
          close(code);
        })();
        return child;
      },
    },
  );
}

for (const stream of ["stdout", "stderr"]) {
  for (const value of ["plain ASCII", "ä", "東京", "🌍", "aä東🌍z"]) {
    test(`${stream} preserves split UTF-8 at the exact raw-byte limit: ${value}`, async () => {
      const bytes = Buffer.from(value);
      const chunks = [...bytes].map((byte) => Buffer.from([byte]));
      const result = await capture(chunks, { stream, maxBytes: bytes.length });
      assert.equal(result[stream], value);
    });
  }
  test(`${stream} still rejects a real raw-byte overflow`, async () => {
    await assert.rejects(capture([Buffer.from("ab"), Buffer.from("c")], { stream, maxBytes: 2 }), {
      code: "command_failed",
    });
  });
  test(`${stream} preserves whitespace trimming and ignores empty chunks`, async () => {
    const result = await capture([Buffer.alloc(0), Buffer.from("  ä\n")], { stream });
    assert.equal(result[stream], "ä");
  });
}

test("nonzero exit diagnostics decode stderr with the same UTF-8 boundary", async () => {
  const bytes = Buffer.from("ä-東京-🌍");
  await assert.rejects(
    capture(
      [...bytes].map((byte) => Buffer.from([byte])),
      { stream: "stderr", code: 7 },
    ),
    (error) =>
      error.code === "command_failed" &&
      error.details.code === 7 &&
      error.details.stderr === "ä-東京-🌍",
  );
});
