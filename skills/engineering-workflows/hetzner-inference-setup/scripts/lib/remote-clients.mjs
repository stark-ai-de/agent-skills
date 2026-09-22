import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertCurrentWslPath,
  assertNoRedirects,
  inspectCurrentUserDirectoryBoundary,
  secureAndVerifyCurrentUserFile,
  secureCurrentUserDirectory,
  verifyCurrentUserFileAsync,
} from "../../assets/templates/protected-file.mjs";

const RECEIPT = ".hetzner-remote-clients.json";
const PROTECTION = "remote-protected-file.mjs";
const CLIENT_FILES = { codex: "hetzner-codex.mjs", "claude-code": "hetzner-claude-code.mjs" };
const MANAGED = new Set([RECEIPT, PROTECTION, ...Object.values(CLIENT_FILES)]);
const TTL = 15 * 60 * 1000;
const TEMPLATE = new URL("../../assets/templates/remote-client-launcher.mjs", import.meta.url);
const PROTECTION_SOURCE = new URL("../../assets/templates/protected-file.mjs", import.meta.url);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function json(value) {
  return `${JSON.stringify(canonical(value), null, 2)}\n`;
}

function host() {
  return {
    platform: process.platform,
    arch: process.arch,
    wsl: process.env.WSL_DISTRO_NAME || null,
  };
}

function absolute(value, label) {
  requireCondition(
    typeof value === "string" && path.isAbsolute(value) && !/[\0\r\n]/u.test(value),
    `${label} must be an absolute native path`,
  );
  const resolved = path.resolve(value);
  requireCondition(resolved !== path.parse(resolved).root, `${label} cannot be a filesystem root`);
  if (process.platform === "win32")
    requireCondition(!resolved.startsWith("\\\\"), `${label} cannot be a UNC path`);
  assertCurrentWslPath(resolved, label);
  return resolved;
}

function lstat(target) {
  try {
    return fs.lstatSync(target, { bigint: true });
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function stamp(stat) {
  return Object.fromEntries(
    ["dev", "ino", "birthtimeNs", "mtimeNs", "size"].map((key) => [key, String(stat[key])]),
  );
}

function executable(value, label) {
  const requested = absolute(value, label);
  const resolved = fs.realpathSync.native(requested);
  assertCurrentWslPath(resolved, label);
  const stat = fs.statSync(resolved, { bigint: true });
  requireCondition(stat.isFile(), `${label} must be a regular executable`);
  if (process.platform === "win32")
    requireCondition(
      /\.exe$/iu.test(resolved),
      `${label} must be a native .exe, not a command script`,
    );
  else {
    requireCondition(
      !/\.(?:exe|cmd|bat)$/iu.test(resolved),
      `${label} must belong to the current native host`,
    );
    fs.accessSync(resolved, fs.constants.X_OK);
  }
  return { path: resolved, stamp: stamp(stat) };
}

function normalizeUrl(value) {
  requireCondition(
    typeof value === "string" && !/[\s\\]/u.test(value),
    "Inference URL must be an absolute HTTPS base URL",
  );
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Inference URL must be an absolute HTTPS base URL");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  requireCondition(
    url.protocol === "https:" || (url.protocol === "http:" && loopback),
    "Remote credentials require HTTPS; HTTP is allowed only on loopback",
  );
  requireCondition(
    !url.username && !url.password && !url.search && !url.hash,
    "Inference URL must not contain credentials, query parameters, or a fragment",
  );
  requireCondition(
    !/%(?:2f|5c|2e)/iu.test(url.pathname),
    "Inference URL has an ambiguous encoded path",
  );
  const basePath = url.pathname.replace(/\/+$/u, "");
  requireCondition(
    !/\/(?:responses|messages|chat\/completions|models)$/u.test(basePath),
    "Use the inference base URL rather than an API operation URL",
  );
  url.pathname = basePath || "/";
  const inferenceUrl = url.href.replace(/\/$/u, "");
  url.pathname = basePath.replace(/\/v1$/u, "") || "/";
  return { inferenceUrl, anthropicBaseUrl: url.href.replace(/\/$/u, "") };
}

function settings(options) {
  const clients = Array.isArray(options.clients)
    ? options.clients
    : String(options.clients || "").split(",");
  requireCondition(
    clients.length > 0 &&
      clients.every((client) => ["codex", "claude-code", "cursor"].includes(client)) &&
      new Set(clients).size === clients.length,
    "Choose distinct clients from codex,claude-code,cursor",
  );
  requireCondition(
    typeof options.alias === "string" && /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/u.test(options.alias),
    "Model alias must be a bounded model identifier",
  );
  const urls = normalizeUrl(options.inferenceUrl);
  requireCondition(
    !clients.includes("claude-code") || new URL(urls.inferenceUrl).pathname.endsWith("/v1"),
    "Automatic Claude setup requires an inference base ending in /v1. Configure the exact Messages base manually for this gateway; Codex and Cursor can use the supplied inference base.",
  );
  if (clients.every((client) => client === "cursor"))
    return { ...urls, alias: options.alias, clients };
  requireCondition(
    Boolean(options.inferenceKeyFile) !== Boolean(options.inferenceKeyEnv),
    "Choose exactly one inference credential source: --inference-key-file or --inference-key-env",
  );
  const keyRef = options.inferenceKeyFile
    ? { kind: "file", path: absolute(options.inferenceKeyFile, "Inference credential reference") }
    : { kind: "env", name: options.inferenceKeyEnv };
  if (keyRef.kind === "env")
    requireCondition(
      /^[A-Za-z_][A-Za-z0-9_]*$/u.test(keyRef.name),
      "Inference credential environment reference must be a variable name",
    );
  const executables = {};
  for (const client of clients.filter((item) => item !== "cursor")) {
    executables[client] = executable(
      client === "codex" ? options.codexExecutable : options.claudeExecutable,
      `${client} executable`,
    );
  }
  return {
    ...urls,
    alias: options.alias,
    providerId: `hetzner_remote_${digest(`${urls.inferenceUrl}\0${options.alias}`).slice(0, 12)}`,
    clients: [...clients].sort(),
    keyRef,
    executables,
    host: host(),
  };
}

function guided(configuration) {
  if (!configuration.clients.includes("cursor")) return [];
  return [
    "In Cursor Settings > Models, enable the OpenAI-compatible API-key option available in your installed version.",
    `Set the OpenAI base URL override to ${configuration.inferenceUrl}.`,
    `Enter your gateway inference key yourself and add model alias ${configuration.alias}.`,
    "Verify a standard chat request. Cursor Tab, Composer, and agent/tool compatibility are not established by this setup.",
  ];
}

function sourceHashes() {
  return {
    launcher: digest(fs.readFileSync(TEMPLATE)),
    protection: digest(fs.readFileSync(PROTECTION_SOURCE)),
    implementation: digest(fs.readFileSync(fileURLToPath(import.meta.url))),
  };
}

function render(configuration) {
  const source = fs.readFileSync(TEMPLATE, "utf8");
  const files = { [PROTECTION]: fs.readFileSync(PROTECTION_SOURCE, "utf8") };
  for (const client of configuration.clients.filter((item) => item !== "cursor")) {
    files[CLIENT_FILES[client]] = source.replace("__REMOTE_CLIENT_CONFIGURATION__", () =>
      JSON.stringify({ ...configuration, client }),
    );
  }
  return files;
}

async function readOwnedFile(target) {
  assertNoRedirects(target);
  await verifyCurrentUserFileAsync(target, 0o600);
  const before = fs.lstatSync(target, { bigint: true });
  requireCondition(
    before.size <= 1024n * 1024n && before.nlink === 1n,
    "Owned client artifact must be a bounded file without hard links",
  );
  const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    requireCondition(
      json(stamp(fs.fstatSync(fd, { bigint: true }))) === json(stamp(before)),
      "Client artifact changed while opened",
    );
    const bytes = fs.readFileSync(fd);
    requireCondition(
      json(stamp(fs.fstatSync(fd, { bigint: true }))) === json(stamp(before)) &&
        json(stamp(fs.lstatSync(target, { bigint: true }))) === json(stamp(before)),
      "Client artifact changed while read",
    );
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

async function observe(outputDir, { allowMissing = false } = {}) {
  const parent = inspectCurrentUserDirectoryBoundary(path.dirname(outputDir), "Output parent");
  const stat = lstat(outputDir);
  if (!stat) return { parent, directory: null, receipt: null };
  const directory = inspectCurrentUserDirectoryBoundary(outputDir, "Output directory");
  const receiptPath = path.join(outputDir, RECEIPT);
  if (!lstat(receiptPath)) {
    requireCondition(
      [...MANAGED].every((name) => !lstat(path.join(outputDir, name))),
      "Unowned client artifacts already exist in the output directory",
    );
    return { parent, directory, receipt: null };
  }
  const bytes = await readOwnedFile(receiptPath);
  let receipt;
  try {
    receipt = JSON.parse(bytes);
  } catch {
    throw new Error("Invalid client ownership receipt");
  }
  const { id, ...body } = receipt;
  requireCondition(
    id === digest(json(body)) &&
      body.kind === "hetzner-remote-client-receipt" &&
      body.outputDir === outputDir &&
      body.schemaVersion === 1 &&
      Array.isArray(body.artifacts) &&
      body.artifacts.length >= 2 &&
      body.artifacts.length <= 3,
    "Invalid client ownership receipt",
  );
  const names = body.artifacts.map((item) => item.name);
  requireCondition(
    new Set(names).size === names.length && names.includes(PROTECTION),
    "Invalid owned client artifact list",
  );
  const missingArtifacts = [];
  for (const artifact of body.artifacts) {
    requireCondition(
      MANAGED.has(artifact.name) &&
        artifact.name !== RECEIPT &&
        /^[a-f0-9]{64}$/u.test(artifact.sha256),
      "Invalid owned client artifact list",
    );
    const target = path.join(outputDir, artifact.name);
    if (allowMissing && !lstat(target)) {
      missingArtifacts.push(artifact.name);
      continue;
    }
    requireCondition(
      digest(await readOwnedFile(target)) === artifact.sha256,
      "Owned client artifact drifted; preserve it and resolve manually",
    );
  }
  return {
    parent,
    directory,
    receipt: { sha256: digest(bytes), value: receipt, missingArtifacts },
  };
}

function assertSame(left, right, message) {
  requireCondition(json(left) === json(right), message);
}

function expectedOrRollbackProgress(body, current) {
  if (json(body.expected) === json(current)) return true;
  if (body.operation !== "rollback" || !body.expected.receipt || !current.receipt) return false;
  const expectedMissing = body.expected.receipt.missingArtifacts || [];
  const currentMissing = current.receipt.missingArtifacts || [];
  return (
    expectedMissing.every((name) => currentMissing.includes(name)) &&
    json(body.expected) ===
      json({ ...current, receipt: { ...current.receipt, missingArtifacts: expectedMissing } })
  );
}

function completedPlan(body, id, current) {
  if (json(body.expected.parent) !== json(current.parent)) return false;
  if (body.operation === "rollback") {
    return (
      body.expected.receipt &&
      !current.receipt &&
      json(body.expected.directory) === json(current.directory)
    );
  }
  const receipt = current.receipt?.value;
  if (!receipt || receipt.planId !== id) return false;
  const artifacts = Object.entries(render(body.configuration)).map(([name, contents]) => ({
    name,
    sha256: digest(contents),
  }));
  return (
    json(receipt.configuration) === json(body.configuration) &&
    json(receipt.artifacts) === json(artifacts)
  );
}

async function plan(options) {
  const operation = options.operation || "install";
  requireCondition(
    ["install", "rollback"].includes(operation),
    "Operation must be install or rollback",
  );
  const configuration = operation === "install" ? settings(options) : null;
  if (configuration?.clients.every((client) => client === "cursor"))
    return {
      kind: "guided",
      steps: guided(configuration),
      configurationWrites: false,
      credentialReads: false,
    };
  const outputDir = absolute(options.outputDir, "Output directory");
  if (configuration?.keyRef.kind === "file") {
    const relative = path.relative(outputDir, configuration.keyRef.path);
    requireCondition(
      relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative),
      "Keep inference credentials outside the owned launcher directory",
    );
  }
  const expected = await observe(outputDir, { allowMissing: operation === "rollback" });
  if (operation === "install" && expected.receipt) {
    assertSame(
      expected.receipt.value.configuration,
      configuration,
      "Different owned client configuration exists; plan rollback before reconfiguring",
    );
    const desired = Object.entries(render(configuration)).map(([name, contents]) => ({
      name,
      sha256: digest(contents),
    }));
    assertSame(
      expected.receipt.value.artifacts,
      desired,
      "Owned client templates changed; plan rollback before reconfiguring",
    );
  }
  const now = Date.now();
  const body = {
    schemaVersion: 1,
    kind: "hetzner-remote-client-plan",
    operation,
    createdAt: now,
    expiresAt: now + TTL,
    host: host(),
    outputDir,
    expected,
    configuration,
    sources: sourceHashes(),
    guidance: configuration ? guided(configuration) : [],
  };
  return { ...body, id: digest(json(body)) };
}

function optionsFor(configuration) {
  return {
    clients: configuration.clients,
    inferenceUrl: configuration.inferenceUrl,
    alias: configuration.alias,
    inferenceKeyFile: configuration.keyRef?.kind === "file" ? configuration.keyRef.path : undefined,
    inferenceKeyEnv: configuration.keyRef?.kind === "env" ? configuration.keyRef.name : undefined,
    codexExecutable: configuration.executables?.codex?.path,
    claudeExecutable: configuration.executables?.["claude-code"]?.path,
  };
}

function writeExclusive(target, content) {
  const fd = fs.openSync(
    target,
    fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      fs.constants.O_WRONLY |
      (fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    fs.writeFileSync(fd, content);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  secureAndVerifyCurrentUserFile(target, 0o600);
}

async function mutate(command, options) {
  const planPath = absolute(options.plan, "Plan file");
  assertNoRedirects(planPath);
  const planStat = fs.lstatSync(planPath);
  requireCondition(
    planStat.isFile() && planStat.size <= 1024 * 1024,
    "Plan must be a bounded regular JSON file",
  );
  let value;
  try {
    value = JSON.parse(fs.readFileSync(planPath, "utf8"));
  } catch {
    throw new Error("Invalid remote-client plan JSON");
  }
  const { id, ...body } = value;
  requireCondition(
    body.kind === "hetzner-remote-client-plan" &&
      body.schemaVersion === 1 &&
      id === digest(json(body)) &&
      options.approve === id,
    "Plan digest or explicit approval does not match",
  );
  const now = Date.now();
  requireCondition(
    Number.isSafeInteger(body.createdAt) &&
      body.createdAt <= now &&
      body.expiresAt === body.createdAt + TTL &&
      now < body.expiresAt,
    "Client plan expired or has invalid timestamps; plan again",
  );
  requireCondition(
    ["install", "rollback"].includes(body.operation) &&
      (command !== "rollback" || body.operation === "rollback"),
    "Use a rollback plan for rollback",
  );
  assertSame(body.host, host(), "Client plan belongs to a different native host");
  assertSame(body.sources, sourceHashes(), "Client implementation changed; plan again");
  const outputDir = absolute(body.outputDir, "Output directory");
  requireCondition(
    !planPath.startsWith(`${outputDir}${path.sep}`),
    "Store the plan outside the launcher output directory",
  );
  if (body.operation === "install")
    assertSame(
      body.configuration,
      settings(optionsFor(body.configuration)),
      "Client executable or configuration changed; plan again",
    );
  const observationOptions = { allowMissing: body.operation === "rollback" };
  const current = await observe(outputDir, observationOptions);
  requireCondition(
    completedPlan(body, id, current) || expectedOrRollbackProgress(body, current),
    "Client output changed after planning; plan again",
  );
  const lockPath = path.join(
    path.dirname(outputDir),
    `.hetzner-clients-${digest(outputDir).slice(0, 20)}.lock`,
  );
  const lockData = json({ id, nonce: crypto.randomUUID(), pid: process.pid });
  try {
    writeExclusive(lockPath, lockData);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("Another writer owns the client setup lock");
    throw error;
  }
  const assertLock = async () => {
    assertSame(
      body.expected.parent,
      inspectCurrentUserDirectoryBoundary(path.dirname(outputDir), "Output parent"),
      "Output parent changed",
    );
    requireCondition(
      digest(await readOwnedFile(lockPath)) === digest(lockData),
      "Client mutation lock ownership changed",
    );
  };
  try {
    await assertLock();
    const lockedCurrent = await observe(outputDir, observationOptions);
    if (completedPlan(body, id, lockedCurrent))
      return {
        status: "unchanged",
        operation: body.operation,
        outputDir,
        credentialsPreserved: true,
      };
    requireCondition(
      expectedOrRollbackProgress(body, lockedCurrent),
      "Client output changed after planning; plan again",
    );
    if (body.operation === "rollback") {
      const receipt = body.expected.receipt?.value;
      if (!receipt)
        return { status: "unchanged", operation: "rollback", credentialsPreserved: true };
      for (const artifact of [
        ...receipt.artifacts,
        { name: RECEIPT, sha256: body.expected.receipt.sha256 },
      ]) {
        await assertLock();
        assertSame(
          body.expected.directory,
          inspectCurrentUserDirectoryBoundary(outputDir),
          "Output directory changed",
        );
        const target = path.join(outputDir, artifact.name);
        // Keep the immutable receipt until last so an interrupted rollback can resume.
        if (artifact.name !== RECEIPT && !lstat(target)) continue;
        requireCondition(
          digest(await readOwnedFile(target)) === artifact.sha256,
          "Client artifact changed before rollback; preserved",
        );
        fs.unlinkSync(target);
      }
      return {
        status: "rolled-back",
        operation: "rollback",
        credentialsPreserved: true,
        outputDirectoryPreserved: true,
      };
    }
    const configuration = body.configuration;
    if (body.expected.receipt) return { status: "unchanged", outputDir, guidance: body.guidance };
    if (!body.expected.directory) {
      fs.mkdirSync(outputDir, { mode: 0o700 });
      secureCurrentUserDirectory(outputDir);
    }
    const boundary = inspectCurrentUserDirectoryBoundary(outputDir);
    const files = render(configuration);
    const artifacts = Object.entries(files).map(([name, contents]) => ({
      name,
      sha256: digest(contents),
    }));
    const receiptBody = {
      schemaVersion: 1,
      kind: "hetzner-remote-client-receipt",
      outputDir,
      configuration,
      artifacts,
      planId: id,
    };
    files[RECEIPT] = json({ ...receiptBody, id: digest(json(receiptBody)) });
    const written = [];
    try {
      for (const [name, contents] of Object.entries(files)) {
        await assertLock();
        assertSame(
          boundary,
          inspectCurrentUserDirectoryBoundary(outputDir),
          "Output directory changed",
        );
        const target = path.join(outputDir, name);
        writeExclusive(target, contents);
        written.push({ target, sha256: digest(contents) });
      }
      await observe(outputDir);
    } catch (error) {
      for (const item of written.reverse()) {
        await assertLock();
        assertSame(
          boundary,
          inspectCurrentUserDirectoryBoundary(outputDir),
          "Output directory changed; preserve incomplete installation",
        );
        if (digest(await readOwnedFile(item.target)) === item.sha256) fs.unlinkSync(item.target);
      }
      throw error;
    }
    return {
      status: "configured",
      outputDir,
      launchers: configuration.clients
        .filter((client) => client !== "cursor")
        .map((client) => ({
          client,
          executable: process.execPath,
          args: [path.join(outputDir, CLIENT_FILES[client])],
        })),
      guidance: body.guidance,
      compatibility:
        "Configuration only; verify the exact client version with a disposable coding flow",
    };
  } finally {
    await assertLock();
    fs.unlinkSync(lockPath);
  }
}

export async function runRemoteClients(command, options = {}) {
  requireCondition(
    ["plan", "apply", "rollback"].includes(command),
    "Command must be plan, apply, or rollback",
  );
  const allowed =
    command === "plan"
      ? [
          "outputDir",
          "operation",
          "inferenceUrl",
          "alias",
          "clients",
          "inferenceKeyFile",
          "inferenceKeyEnv",
          "codexExecutable",
          "claudeExecutable",
        ]
      : ["plan", "approve"];
  requireCondition(
    Object.keys(options).every((key) => allowed.includes(key)),
    "Unknown option; see --help",
  );
  if (command === "plan" && options.operation === "rollback")
    requireCondition(
      Object.keys(options).every((key) => ["outputDir", "operation"].includes(key)),
      "Rollback planning accepts only --output-dir and --operation rollback",
    );
  return command === "plan" ? plan(options) : mutate(command, options);
}
