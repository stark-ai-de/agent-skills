import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { manualCommand } from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/manual.mjs";
const cli = fileURLToPath(
  new URL(
    "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/setup-hetzner-inference.mjs",
    import.meta.url,
  ),
);

for (const target of ["local", "remote"]) {
  test(`manual ${target} produces a complete unverified guide without key access`, () => {
    const guide = manualCommand("setup", { target, clients: "codex,claude-code,cursor" });
    assert.equal(guide.credentialsRead, false);
    assert.equal(guide.mutating, false);
    assert.equal(guide.state, "verification_required");
    assert.deepEqual(
      guide.steps.map((step) => step.number),
      guide.steps.map((_, index) => index + 1),
    );
    assert.ok(guide.steps.every((step) => step.expected));
    assert.equal(guide.modelConfig.litellm_params.use_chat_completions_api, true);
    assert.equal(guide.clientGuidance.length, 3);
  });
  test(`manual ${target} CLI works with unusable executables and nonexistent key source`, () => {
    const result = spawnSync(
      process.execPath,
      [cli, "plan", "--target", target, "--mode", "manual"],
      {
        encoding: "utf8",
        env: { PATH: "", HETZNER_INFERENCE_API_KEY: "never-read-this-credential" },
        timeout: 10000,
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /never-read-this-credential/);
    const data = JSON.parse(result.stdout);
    assert.equal(data.mode, "manual");
    assert.equal(data.target, target);
  });
}

test("manual mode rejects credential options and lifecycle mutations before access", () => {
  for (const option of [
    "provider-key-file",
    "management-key-file",
    "inference-key-env",
    "approve",
  ]) {
    assert.throws(
      () => manualCommand("plan", { [option]: "never-echo-this" }),
      (error) => !error.message.includes("never-echo-this"),
    );
  }
  for (const command of ["apply", "start", "stop", "rollback"])
    assert.throws(() => manualCommand(command), /does not execute/);
});
test("manual URLs do not echo embedded secrets and reject insecure remote transport", () => {
  for (const value of [
    "https://user:password@example.com",
    "https://example.com?token=secret",
    "http://example.com",
    "file:///secret",
  ]) {
    assert.throws(
      () => manualCommand("plan", { target: "remote", "management-url": value }),
      (error) => !error.message.includes(value),
    );
  }
});
test("manual Windows guide uses executable private-input launcher; client secrets stay separate", () => {
  const guide = manualCommand("plan", { platform: "win32", clients: "codex" });
  assert.ok(
    guide.steps.some((step) => step.command?.includes("Scripts\\python.exe start-hetzner.py")),
  );
  assert.ok(!guide.steps.some((step) => step.command?.includes("litellm.exe --config")));
  const remote = manualCommand("plan", { target: "remote", clients: "cursor" });
  assert.equal(remote.clientGuidance[0].credential, "separate remote inference key");
});
