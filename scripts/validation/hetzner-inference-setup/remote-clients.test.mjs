import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runRemoteClients } from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/remote-clients.mjs";

const cli = fileURLToPath(
  new URL(
    "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/configure-remote-clients.mjs",
    import.meta.url,
  ),
);
const native = process.platform !== "win32";

function fixture(t) {
  const root = fs.realpathSync.native(
    fs.mkdtempSync(path.join(os.tmpdir(), "hetzner-client-test-")),
  );
  fs.chmodSync(root, 0o700);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const executable = path.join(root, "fake-client");
  fs.writeFileSync(
    executable,
    `#!${process.execPath}\nimport fs from "node:fs";\nfs.writeFileSync(process.env.TEST_CAPTURE, JSON.stringify({args:process.argv.slice(2), env:Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(ANTHROPIC_|OPENAI_|CLAUDE_CODE_|HETZNER_GATEWAY_|TEST_INFERENCE|CODEX_HOME|UNRELATED)/.test(key)))}));\n`,
    { mode: 0o700 },
  );
  const outputDir = path.join(root, "launchers");
  const defaults = {
    outputDir,
    inferenceUrl: "https://gateway.example.test/team/inference/v1/",
    alias: "hetzner-test",
    clients: "codex,claude-code,cursor",
    inferenceKeyEnv: "TEST_INFERENCE",
    codexExecutable: executable,
    claudeExecutable: executable,
  };
  const planFile = path.join(root, "plan.json");
  const capture = path.join(root, "capture.json");
  return {
    root,
    outputDir,
    defaults,
    executable,
    planFile,
    capture,
    async plan(extra = {}) {
      return runRemoteClients("plan", { ...defaults, ...extra });
    },
    async apply(plan, command = "apply") {
      fs.writeFileSync(planFile, JSON.stringify(plan));
      return runRemoteClients(command, { plan: planFile, approve: plan.id });
    },
    launch(client, args = [], env = {}, cwd = root) {
      const result = spawnSync(
        process.execPath,
        [path.join(outputDir, `hetzner-${client}.mjs`), ...args],
        {
          cwd,
          encoding: "utf8",
          env: {
            ...process.env,
            HOME: root,
            CLAUDE_CONFIG_DIR: path.join(root, "claude"),
            TEST_CAPTURE: capture,
            TEST_INFERENCE: "synthetic-client-token",
            ...env,
          },
        },
      );
      assert.ifError(result.error);
      return result;
    },
  };
}

function rehash(plan) {
  const sorted = (value) =>
    Array.isArray(value)
      ? value.map(sorted)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, sorted(value[key])]),
          )
        : value;
  const { id: _id, ...body } = plan;
  return {
    ...body,
    id: crypto
      .createHash("sha256")
      .update(`${JSON.stringify(sorted(body), null, 2)}\n`)
      .digest("hex"),
  };
}

test(
  "plan and apply do not read credentials or contact the target",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    const missing = path.join(f.root, "not-created-key");
    const plan = await f.plan({ inferenceKeyEnv: undefined, inferenceKeyFile: missing });
    assert.equal(fs.existsSync(f.outputDir), false);
    assert.equal(plan.configuration.keyRef.path, missing);
    assert.equal((await f.apply(plan)).status, "configured");
    assert.equal(fs.existsSync(missing), false);
    assert.equal(fs.existsSync(f.capture), false);
    assert.equal(f.launch("codex").status, 1);
  },
);

test(
  "Codex launcher isolates auth and provider namespace, and forwards argv literally",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    await f.apply(await f.plan());
    const forwarded = ["exec", "a prompt with spaces; $()", "--json"];
    const result = f.launch("codex", forwarded, {
      OPENAI_API_KEY: "other-token",
      ANTHROPIC_AUTH_TOKEN: "other-auth",
      CODEX_HOME: f.root,
      UNRELATED_SETTING: "kept",
    });
    assert.equal(result.status, 0, result.stderr);
    const captured = JSON.parse(fs.readFileSync(f.capture));
    assert.deepEqual(captured.args.slice(-forwarded.length), forwarded);
    assert.equal(captured.env.HETZNER_GATEWAY_API_KEY, "synthetic-client-token");
    assert.equal(captured.env.OPENAI_API_KEY, undefined);
    assert.equal(captured.env.TEST_INFERENCE, undefined);
    assert.equal(captured.env.ANTHROPIC_AUTH_TOKEN, undefined);
    assert.equal(captured.env.CODEX_HOME, f.root);
    assert.equal(captured.env.UNRELATED_SETTING, "kept");
    assert.ok(captured.args.includes('model="hetzner-test"'));
    const selected = captured.args.find((arg) => arg.startsWith("model_provider="));
    assert.match(selected, /^model_provider="hetzner_remote_[a-f0-9]{12}"$/u);
    const providerId = selected.slice('model_provider="'.length, -1);
    const provider = captured.args.find((arg) => arg.startsWith(`model_providers.${providerId}=`));
    assert.match(provider, /base_url = "https:\/\/gateway.example.test\/team\/inference\/v1"/u);
    assert.match(provider, /wire_api = "responses"/u);
    assert.match(provider, /env_key = "HETZNER_GATEWAY_API_KEY"/u);
    assert.equal(JSON.stringify(captured.args).includes("synthetic-client-token"), false);
    for (const file of fs.readdirSync(f.outputDir))
      assert.equal(
        fs.readFileSync(path.join(f.outputDir, file), "utf8").includes("synthetic-client-token"),
        false,
      );
  },
);

test(
  "Claude preserves path prefix and clears competing auth and provider switches",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    await f.apply(await f.plan());
    const result = f.launch("claude-code", ["--print", "hello"], {
      ANTHROPIC_API_KEY: "old",
      CLAUDE_CODE_OAUTH_TOKEN: "old",
      CLAUDE_CODE_USE_BEDROCK: "1",
      CLAUDE_CODE_USE_VERTEX: "1",
    });
    assert.equal(result.status, 0, result.stderr);
    const { args, env } = JSON.parse(fs.readFileSync(f.capture));
    assert.deepEqual(args, ["--print", "hello"]);
    assert.equal(env.ANTHROPIC_BASE_URL, "https://gateway.example.test/team/inference");
    assert.equal(env.ANTHROPIC_AUTH_TOKEN, "synthetic-client-token");
    assert.equal(env.ANTHROPIC_API_KEY, undefined);
    assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, undefined);
    assert.equal(env.CLAUDE_CODE_USE_BEDROCK, undefined);
    assert.equal(env.CLAUDE_CODE_USE_VERTEX, undefined);
    assert.equal(env.ANTHROPIC_DEFAULT_HAIKU_MODEL, "hetzner-test");
  },
);

test(
  "Claude refuses settings-file auth overrides while preserving unrelated settings",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    await f.apply(await f.plan());
    const settings = path.join(f.root, "claude", "settings.json");
    fs.mkdirSync(path.dirname(settings));
    fs.writeFileSync(settings, JSON.stringify({ permissions: { allow: [] } }));
    assert.equal(f.launch("claude-code").status, 0);
    fs.writeFileSync(
      settings,
      JSON.stringify({ env: { ANTHROPIC_AUTH_TOKEN: "synthetic-competing-secret" } }),
    );
    const bytes = fs.readFileSync(settings);
    fs.unlinkSync(f.capture);
    const failed = f.launch("claude-code");
    assert.equal(failed.status, 1);
    assert.equal(failed.stderr.includes("synthetic-competing-secret"), false);
    assert.equal(fs.existsSync(f.capture), false);
    assert.deepEqual(fs.readFileSync(settings), bytes);
    fs.writeFileSync(settings, JSON.stringify({ permissions: { allow: [] } }));
    for (const args of [["--settings", "{}"], ["--settings={}"], ["--setting-sources", "user"]]) {
      assert.equal(f.launch("claude-code", args).status, 1);
      assert.equal(fs.existsSync(f.capture), false);
    }
  },
);

test(
  "file credentials are consumed only at launch and unsafe modes fail closed",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    const key = path.join(f.root, "inference-key");
    const plan = await f.plan({ inferenceKeyEnv: undefined, inferenceKeyFile: key });
    await f.apply(plan);
    fs.writeFileSync(key, "synthetic-file-token", { mode: 0o600 });
    assert.equal(f.launch("codex").status, 0);
    assert.equal(
      JSON.parse(fs.readFileSync(f.capture)).env.HETZNER_GATEWAY_API_KEY,
      "synthetic-file-token",
    );
    fs.chmodSync(key, 0o644);
    assert.equal(f.launch("codex").status, 1);
    fs.chmodSync(key, 0o600);
    for (const ending of ["\n", "\r\n"]) {
      fs.writeFileSync(key, `synthetic-file-token${ending}`);
      assert.equal(f.launch("codex").status, 0);
      assert.equal(
        JSON.parse(fs.readFileSync(f.capture)).env.HETZNER_GATEWAY_API_KEY,
        "synthetic-file-token",
      );
    }
    fs.writeFileSync(key, "synthetic-file-token\n\n");
    assert.equal(f.launch("codex").status, 1);
  },
);

test(
  "Claude managed settings fragments are inspected without touching unrelated settings",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    await f.apply(await f.plan());
    const { conflictingClaudeSettings } = await import(
      pathToFileURL(path.join(f.outputDir, "hetzner-claude-code.mjs"))
    );
    const managed = path.join(f.root, "managed");
    const fragments = path.join(managed, "managed-settings.d");
    fs.mkdirSync(fragments, { recursive: true });
    const options = {
      args: [],
      configDir: path.join(f.root, "claude"),
      cwd: f.root,
      managedDirectory: managed,
    };
    const file = path.join(fragments, "gateway.json");
    const bad = JSON.stringify({ env: { ANTHROPIC_BASE_URL: "https://other.example.test" } });
    fs.writeFileSync(file, JSON.stringify({ permissions: { allow: [] } }));
    fs.writeFileSync(path.join(fragments, ".hidden.json"), bad);
    fs.writeFileSync(path.join(fragments, "ignored.txt"), bad);
    assert.doesNotThrow(() => conflictingClaudeSettings(options));
    fs.writeFileSync(file, bad);
    assert.throws(() => conflictingClaudeSettings(options), /override gateway routing/u);
    assert.equal(fs.readFileSync(file, "utf8"), bad);
  },
);

test(
  "malformed credential refs and unsafe URL variants fail without mutation",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    for (const change of [
      { inferenceKeyEnv: "literal=value" },
      { inferenceKeyEnv: "bad\nname" },
      { inferenceKeyEnv: undefined },
      { inferenceKeyFile: path.join(f.root, "key") },
      { inferenceKeyEnv: undefined, inferenceKeyFile: "relative/key" },
      { inferenceKeyEnv: undefined, inferenceKeyFile: path.join(f.outputDir, "key") },
      { inferenceUrl: "http://gateway.example.test/v1" },
      { inferenceUrl: "https://user:pass@gateway.example.test/v1" },
      { inferenceUrl: "https://gateway.example.test/v1?key=value" },
      { inferenceUrl: "https://gateway.example.test/v1#fragment" },
      { inferenceUrl: "https://gateway.example.test/v1/messages" },
      { clients: "claude" },
      { clients: "codex,codex" },
      { alias: "bad alias" },
    ])
      await assert.rejects(f.plan(change));
    assert.equal(fs.existsSync(f.outputDir), false);
  },
);

test("Cursor-only guidance needs no keys, executable, or output directory", async () => {
  const result = await runRemoteClients("plan", {
    clients: "cursor",
    alias: "hetzner-test",
    inferenceUrl: "https://gateway.example.test/prefix",
  });
  assert.equal(result.kind, "guided");
  assert.equal(result.credentialReads, false);
  assert.equal(result.configurationWrites, false);
  assert.ok(
    result.steps.includes(
      "Set the OpenAI base URL override to https://gateway.example.test/prefix.",
    ),
  );
});

test("custom inference paths remain exact for Codex and Cursor", { skip: !native }, async (t) => {
  const f = fixture(t);
  const url = "https://gateway.example.test/custom-openai";
  const plan = await f.plan({ inferenceUrl: url, clients: "codex,cursor" });
  assert.equal(plan.configuration.inferenceUrl, url);
  assert.equal(plan.configuration.anthropicBaseUrl, url);
  await f.apply(plan);
  assert.equal(f.launch("codex").status, 0);
  assert.ok(
    JSON.parse(fs.readFileSync(f.capture)).args.some((arg) => arg.includes(`base_url = "${url}"`)),
  );
  assert.ok(plan.guidance.includes(`Set the OpenAI base URL override to ${url}.`));
});

test(
  "Claude custom bases require a manual Messages-base handoff before any mutation",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    for (const inferenceUrl of [
      "https://gateway.example.test/custom-openai",
      "https://gateway.example.test",
      "https://gateway.example.test/prefix/v11",
    ])
      await assert.rejects(f.plan({ inferenceUrl }), /Configure the exact Messages base manually/u);
    assert.equal(fs.existsSync(f.outputDir), false);
    assert.equal(fs.existsSync(f.capture), false);
    const plan = await f.plan({
      inferenceUrl: "https://gateway.example.test/prefix/v1/",
      clients: "claude-code",
    });
    assert.equal(plan.configuration.anthropicBaseUrl, "https://gateway.example.test/prefix");
    assert.equal(plan.configuration.inferenceUrl, "https://gateway.example.test/prefix/v1");
  },
);

test(
  "explicit approval, tampered plans, and expired plans are rejected",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    const plan = await f.plan();
    fs.writeFileSync(f.planFile, JSON.stringify(plan));
    await assert.rejects(
      runRemoteClients("apply", { plan: f.planFile, approve: "wrong" }),
      /approval/u,
    );
    await assert.rejects(
      f.apply({ ...plan, configuration: { ...plan.configuration, alias: "changed" } }),
      /digest/u,
    );
    const expired = rehash({
      ...plan,
      createdAt: Date.now() - 16 * 60000,
      expiresAt: Date.now() - 60000,
    });
    await assert.rejects(f.apply(expired), /expired/u);
    assert.equal(fs.existsSync(f.outputDir), false);
  },
);

test(
  "unowned paths, symlinks, and changes since planning are preserved",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    const plan = await f.plan();
    fs.mkdirSync(f.outputDir, { mode: 0o700 });
    await assert.rejects(f.apply(plan), /changed/u);
    const foreign = path.join(f.outputDir, "hetzner-codex.mjs");
    fs.writeFileSync(foreign, "foreign", { mode: 0o600 });
    await assert.rejects(f.plan(), /Unowned/u);
    assert.equal(fs.readFileSync(foreign, "utf8"), "foreign");
    fs.unlinkSync(foreign);
    fs.rmdirSync(f.outputDir);
    fs.symlinkSync(f.root, f.outputDir);
    await assert.rejects(f.plan(), /redirected/u);
  },
);

test("identical re-plan is idempotent and drift blocks rollback", { skip: !native }, async (t) => {
  const f = fixture(t);
  const initial = await f.plan();
  await f.apply(initial);
  assert.equal((await f.apply(initial)).status, "unchanged");
  const before = fs.statSync(path.join(f.outputDir, "hetzner-codex.mjs")).mtimeMs;
  assert.equal((await f.apply(await f.plan())).status, "unchanged");
  assert.equal(fs.statSync(path.join(f.outputDir, "hetzner-codex.mjs")).mtimeMs, before);
  const rollback = await runRemoteClients("plan", {
    outputDir: f.outputDir,
    operation: "rollback",
  });
  fs.appendFileSync(path.join(f.outputDir, "hetzner-codex.mjs"), "\n// changed by user\n");
  await assert.rejects(f.apply(rollback, "rollback"), /drifted/u);
  assert.match(
    fs.readFileSync(path.join(f.outputDir, "hetzner-codex.mjs"), "utf8"),
    /changed by user/u,
  );
});

test(
  "rollback removes only receipt-owned files and preserves credentials and unrelated files",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    const key = path.join(f.root, "key");
    fs.writeFileSync(key, "synthetic-kept-key", { mode: 0o600 });
    await f.apply(await f.plan({ inferenceKeyEnv: undefined, inferenceKeyFile: key }));
    fs.writeFileSync(path.join(f.outputDir, "unrelated.txt"), "keep me");
    const plan = await runRemoteClients("plan", { outputDir: f.outputDir, operation: "rollback" });
    assert.equal((await f.apply(plan, "rollback")).status, "rolled-back");
    assert.equal((await f.apply(plan, "rollback")).status, "unchanged");
    assert.deepEqual(fs.readdirSync(f.outputDir), ["unrelated.txt"]);
    assert.equal(fs.readFileSync(key, "utf8"), "synthetic-kept-key");
    const again = await runRemoteClients("plan", { outputDir: f.outputDir, operation: "rollback" });
    assert.equal((await f.apply(again, "rollback")).status, "unchanged");
  },
);

test("client executable replacement invalidates plan and launch", { skip: !native }, async (t) => {
  const f = fixture(t);
  const plan = await f.plan();
  fs.appendFileSync(f.executable, "\n// replacement\n");
  await assert.rejects(f.apply(plan), /executable/u);
  await f.apply(await f.plan());
  fs.appendFileSync(f.executable, "\n// another replacement\n");
  assert.equal(f.launch("codex").status, 1);
  assert.equal(fs.existsSync(f.capture), false);
});

test(
  "literal dollar substitutions in paths survive generated JavaScript",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    const key = path.join(f.root, "key-$&-$`-$'");
    fs.writeFileSync(key, "synthetic-dollar-key", { mode: 0o600 });
    await f.apply(await f.plan({ inferenceKeyEnv: undefined, inferenceKeyFile: key }));
    assert.equal(f.launch("codex").status, 0);
  },
);

test("CLI rejects duplicate/unknown flags and emits valid plan JSON", { skip: !native }, (t) => {
  const f = fixture(t);
  const duplicate = spawnSync(
    process.execPath,
    [cli, "plan", "--clients", "cursor", "--clients", "codex"],
    { encoding: "utf8" },
  );
  assert.ifError(duplicate.error);
  assert.equal(duplicate.status, 1);
  const unknown = spawnSync(
    process.execPath,
    [cli, "plan", "--literal-key", "synthetic-never-print"],
    { encoding: "utf8" },
  );
  assert.ifError(unknown.error);
  assert.equal(unknown.status, 1);
  assert.equal(unknown.stderr.includes("synthetic-never-print"), false);
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "plan",
      "--clients",
      "codex",
      "--output-dir",
      f.outputDir,
      "--inference-url",
      "http://127.0.0.1:4000",
      "--alias",
      "test",
      "--inference-key-env",
      "TEST_INFERENCE",
      "--codex-executable",
      f.executable,
    ],
    { encoding: "utf8" },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).configuration.inferenceUrl, "http://127.0.0.1:4000");
});

test(
  "rollback resumes after unlink failure using immutable ownership",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    await f.apply(await f.plan());
    const receiptFile = path.join(f.outputDir, ".hetzner-remote-clients.json");
    const receiptBytes = fs.readFileSync(receiptFile);
    const plan = await runRemoteClients("plan", { outputDir: f.outputDir, operation: "rollback" });
    const target = path.join(f.outputDir, "hetzner-claude-code.mjs");
    const unlink = fs.unlinkSync;
    const fault = t.mock.method(fs, "unlinkSync", (file) => {
      if (file === target)
        throw Object.assign(new Error("synthetic unlink failure"), { code: "EIO" });
      return unlink(file);
    });
    await assert.rejects(f.apply(plan, "rollback"), /synthetic unlink failure/u);
    fault.mock.restore();
    assert.equal(fs.existsSync(path.join(f.outputDir, "remote-protected-file.mjs")), false);
    assert.deepEqual(fs.readFileSync(receiptFile), receiptBytes);
    await assert.rejects(f.plan());
    const original = fs.readFileSync(target);
    fs.appendFileSync(target, "\n// user change\n");
    await assert.rejects(f.apply(plan, "rollback"), /drifted/u);
    fs.writeFileSync(target, original);
    assert.equal((await f.apply(plan, "rollback")).status, "rolled-back");
    assert.deepEqual(fs.readdirSync(f.outputDir), []);
  },
);

test(
  "a new rollback plan can recover an interrupted earlier rollback",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    await f.apply(await f.plan());
    const receiptFile = path.join(f.outputDir, ".hetzner-remote-clients.json");
    const plan = await runRemoteClients("plan", { outputDir: f.outputDir, operation: "rollback" });
    const unlink = fs.unlinkSync;
    const fault = t.mock.method(fs, "unlinkSync", (file) => {
      if (file === receiptFile) throw new Error("synthetic final unlink failure");
      return unlink(file);
    });
    await assert.rejects(f.apply(plan, "rollback"), /synthetic final unlink/u);
    fault.mock.restore();
    assert.deepEqual(fs.readdirSync(f.outputDir), [".hetzner-remote-clients.json"]);
    const recovery = await runRemoteClients("plan", {
      outputDir: f.outputDir,
      operation: "rollback",
    });
    assert.equal(recovery.expected.receipt.missingArtifacts.length, 3);
    assert.equal((await f.apply(recovery, "rollback")).status, "rolled-back");
  },
);

test(
  "WSL validates cwd and all client state namespaces, including nested mounts and aliases",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    await f.apply(await f.plan());
    const { assertClientBoundaries, clientPathEnvironment } = await import(
      pathToFileURL(path.join(f.outputDir, "hetzner-codex.mjs"))
    );
    const windows = path.join(f.root, "windows");
    fs.mkdirSync(windows);
    const source = {
      HOME: f.root,
      PATH: path.dirname(process.execPath),
      TMPDIR: path.join(f.root, "temp"),
    };
    Object.defineProperty(source, "TEST_INFERENCE", {
      get() {
        throw new Error("credential read before boundary check");
      },
    });
    const environment = clientPathEnvironment(source);
    const mountInfo = `1 0 0:1 / / rw - ext4 /dev/root rw\n2 1 0:2 / ${windows} rw - drvfs C: rw\n`;
    const wslBoundaryOptions = { platform: "linux", isWsl: true, mountInfo };
    const options = { cwd: path.join(f.root, "workspace"), wslBoundaryOptions };
    assert.doesNotThrow(() => assertClientBoundaries(environment, options));
    for (const key of [
      "HOME",
      "CODEX_HOME",
      "CLAUDE_CONFIG_DIR",
      "XDG_CONFIG_HOME",
      "XDG_DATA_HOME",
      "XDG_CACHE_HOME",
      "XDG_STATE_HOME",
      "XDG_RUNTIME_DIR",
      "TMPDIR",
      "TMP",
      "TEMP",
      "PATH",
    ])
      assert.throws(
        () => assertClientBoundaries({ ...environment, [key]: windows }, options),
        /WSL/u,
        key,
      );
    assert.throws(() => assertClientBoundaries(environment, { ...options, cwd: windows }), /WSL/u);
    const alias = path.join(f.root, "windows-alias");
    fs.symlinkSync(windows, alias);
    assert.throws(
      () => assertClientBoundaries({ ...environment, CODEX_HOME: alias }, options),
      /WSL/u,
    );
    const nested = {
      ...wslBoundaryOptions,
      mountInfo: mountInfo + `3 1 0:3 / ${f.root}/.codex/nested rw - drvfs D: rw\n`,
    };
    assert.throws(
      () => assertClientBoundaries(environment, { ...options, wslBoundaryOptions: nested }),
      /Windows-mounted/u,
    );
    for (const value of ["", "relative", `${path.dirname(process.execPath)}${path.delimiter}`])
      assert.throws(() => assertClientBoundaries({ ...environment, PATH: value }, options));
  },
);

test(
  "launcher checks WSL state paths before opening an inference credential",
  { skip: process.platform !== "linux" },
  async (t) => {
    const f = fixture(t);
    const key = path.join(f.root, "key");
    fs.writeFileSync(key, "synthetic-never-read", { mode: 0o600 });
    await f.apply(await f.plan({ inferenceKeyEnv: undefined, inferenceKeyFile: key }));
    const windows = path.join(f.root, "windows");
    fs.mkdirSync(windows);
    const marker = path.join(f.root, "secret-read");
    const preload = path.join(f.root, "synthetic-mounts.mjs");
    const mountInfo = `1 0 0:1 / / rw - ext4 /dev/root rw\n2 1 0:2 / ${windows} rw - drvfs C: rw\n`;
    fs.writeFileSync(
      preload,
      `import fs from "node:fs";
const read = fs.readFileSync; const open = fs.openSync;
fs.readFileSync = function(file, ...args) { return file === "/proc/self/mountinfo" ? ${JSON.stringify(mountInfo)} : read.call(this, file, ...args); };
fs.openSync = function(file, ...args) { if (file === ${JSON.stringify(key)}) fs.writeFileSync(${JSON.stringify(marker)}, "opened"); return open.call(this, file, ...args); };
`,
    );
    const cwd = path.join(f.root, "workspace");
    fs.mkdirSync(cwd);
    const result = f.launch(
      "codex",
      [],
      { WSL_INTEROP: "synthetic", CODEX_HOME: windows, NODE_OPTIONS: `--import=${preload}` },
      cwd,
    );
    assert.equal(result.status, 1);
    assert.equal(fs.existsSync(marker), false);
    assert.equal(fs.existsSync(f.capture), false);
    assert.equal(result.stderr.includes("synthetic-never-read"), false);
    fs.writeFileSync(
      preload,
      `import fs from "node:fs";
const read = fs.readFileSync; const open = fs.openSync; let opened = false;
fs.readFileSync = function(file, ...args) { return file === "/proc/self/mountinfo" ? (opened ? ${JSON.stringify(mountInfo)} : "1 0 0:1 / / rw - ext4 /dev/root rw\\n") : read.call(this, file, ...args); };
fs.openSync = function(file, ...args) { if (file === ${JSON.stringify(key)}) { opened = true; fs.writeFileSync(${JSON.stringify(marker)}, "opened"); } return open.call(this, file, ...args); };
`,
    );
    const changed = f.launch(
      "codex",
      [],
      { WSL_INTEROP: "synthetic", CODEX_HOME: windows, NODE_OPTIONS: `--import=${preload}` },
      cwd,
    );
    assert.equal(changed.status, 1);
    assert.equal(fs.readFileSync(marker, "utf8"), "opened");
    assert.equal(fs.existsSync(f.capture), false);
  },
);

test(
  "concurrent mutation lock is preserved and blocks installation",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    const plan = await f.plan();
    const hash = crypto.createHash("sha256").update(f.outputDir).digest("hex").slice(0, 20);
    const lock = path.join(f.root, `.hetzner-clients-${hash}.lock`);
    fs.writeFileSync(lock, "foreign lock", { mode: 0o600 });
    await assert.rejects(f.apply(plan), /Another writer/u);
    assert.equal(fs.readFileSync(lock, "utf8"), "foreign lock");
    assert.equal(fs.existsSync(f.outputDir), false);
  },
);

test(
  "malformed runtime environment credentials fail without revealing the value",
  { skip: !native },
  async (t) => {
    const f = fixture(t);
    await f.apply(await f.plan());
    for (const secret of ["", "synthetic-first\nsynthetic-second", "bad secret"]) {
      const result = f.launch("codex", [], { TEST_INFERENCE: secret });
      assert.equal(result.status, 1);
      assert.equal(result.stderr.includes("synthetic-first"), false);
    }
    assert.equal(fs.existsSync(f.capture), false);
  },
);

test("native host changes invalidate approved plans", { skip: !native }, async (t) => {
  const f = fixture(t);
  const plan = await f.plan();
  const altered = rehash({ ...plan, host: { ...plan.host, arch: "different" } });
  await assert.rejects(f.apply(altered), /native host/u);
});
