import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  assertCurrentWslOwnedNamespace,
  assertCurrentWslPath,
  readProtectedGatewaySecret,
} from "./protected-file.mjs";

const CLAUDE_EXECUTABLE = "__CLAUDE_EXECUTABLE__";
const CONFIG_ROOT = "__CONFIG_ROOT__";
const STATE_ROOT = "__STATE_ROOT__";
const BASE_URL = "http://127.0.0.1:4000";
const MODEL = "hetzner-default";
const WINDOWS_COMMAND_SCRIPT_SUFFIXES = new Set([".cmd", ".bat"]);
const WINDOWS_COMMAND_META_CHARACTERS = new Set('()[]%!^"`<>&|;,*? ');
const CLIENT_MUTABLE_STATE_PATH_VARIABLES = [
  "APPDATA",
  "CLAUDE_CONFIG_DIR",
  "HOME",
  "LOCALAPPDATA",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
];
const CLIENT_MUTABLE_STATE_NAMESPACE_VARIABLES = new Set([
  "APPDATA",
  "CLAUDE_CONFIG_DIR",
  "LOCALAPPDATA",
  "TEMP",
  "TMP",
  "TMPDIR",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
]);
const CLIENT_POINT_PATH_VARIABLES = [
  "GIT_ASKPASS",
  "NODE_EXTRA_CA_CERTS",
  "SHELL",
  "SSH_ASKPASS",
  "SSH_AUTH_SOCK",
  "SSL_CERT_FILE",
  "SystemRoot",
  "WINDIR",
];
const CLIENT_NAMESPACE_LIST_VARIABLES = ["SSL_CERT_DIR"];

function within(target, boundary) {
  const relative = path.relative(path.resolve(boundary), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function defaultClientPath(source) {
  if (process.platform !== "win32") return "/usr/bin:/bin";
  const systemRoot = source.SystemRoot ?? source.WINDIR;
  if (typeof systemRoot !== "string" || !path.win32.isAbsolute(systemRoot)) {
    throw new Error("Claude launcher requires an absolute Windows system root when PATH is unset");
  }
  return [path.win32.join(systemRoot, "System32"), systemRoot].join(path.delimiter);
}

function clientEnvironment(source = process.env, dependencies = {}) {
  const exact = new Set([
    "APPDATA",
    "CLAUDE_CONFIG_DIR",
    "COLORTERM",
    "GIT_ASKPASS",
    "HOME",
    "LANG",
    "LOCALAPPDATA",
    "NODE_EXTRA_CA_CERTS",
    "PATH",
    "PATHEXT",
    "SHELL",
    "SSH_ASKPASS",
    "SSH_AUTH_SOCK",
    "SSL_CERT_DIR",
    "SSL_CERT_FILE",
    "SystemDrive",
    "SystemRoot",
    "TEMP",
    "TERM",
    "TMP",
    "TMPDIR",
    "USERPROFILE",
    "WINDIR",
    "XDG_CACHE_HOME",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "XDG_STATE_HOME",
  ]);
  const env = {};
  for (const [name, value] of Object.entries(source)) {
    if (exact.has(name) || name.startsWith("LC_")) env[name] = value;
  }
  for (const name of [...CLIENT_POINT_PATH_VARIABLES, ...CLIENT_NAMESPACE_LIST_VARIABLES]) {
    if (env[name] === "") delete env[name];
  }
  if (process.platform !== "win32") {
    delete env.PATHEXT;
    delete env.SystemDrive;
    delete env.SystemRoot;
    delete env.WINDIR;
  }
  const effectiveHome =
    env.HOME ??
    (process.platform === "win32" ? env.USERPROFILE : undefined) ??
    (dependencies.homedir ?? os.homedir)();
  if (env.HOME === undefined) env.HOME = effectiveHome;
  if (process.platform === "win32" && env.USERPROFILE === undefined) {
    env.USERPROFILE = effectiveHome;
  }
  const effectiveTemp = env.TMPDIR ?? env.TMP ?? env.TEMP ?? (dependencies.tmpdir ?? os.tmpdir)();
  env.TEMP ??= effectiveTemp;
  env.TMP ??= effectiveTemp;
  env.TMPDIR ??= effectiveTemp;
  env.PATH ??= dependencies.defaultPath ?? defaultClientPath(source);
  return env;
}

function assertClientMutableStatePaths(
  environment,
  assertPath,
  assertOwnedNamespace,
  boundaryOptions,
) {
  for (const name of CLIENT_MUTABLE_STATE_PATH_VARIABLES) {
    if (environment[name] === undefined) continue;
    const label = `Claude mutable-state path ${name}`;
    assertPath(environment[name], label, boundaryOptions);
    if (CLIENT_MUTABLE_STATE_NAMESPACE_VARIABLES.has(name)) {
      assertOwnedNamespace(environment[name], label, boundaryOptions);
    }
  }
  if (environment.HOME !== undefined) {
    for (const [suffix, label] of [
      [[".claude"], "HOME/.claude"],
      [[".cache"], "HOME/.cache"],
      [[".config"], "HOME/.config"],
      [[".local", "share"], "HOME/.local/share"],
      [[".local", "state"], "HOME/.local/state"],
    ]) {
      assertOwnedNamespace(
        path.join(environment.HOME, ...suffix),
        `Claude mutable-state namespace ${label}`,
        boundaryOptions,
      );
    }
  }
  if (environment.USERPROFILE !== undefined) {
    assertOwnedNamespace(
      path.join(environment.USERPROFILE, ".claude"),
      "Claude mutable-state namespace USERPROFILE/.claude",
      boundaryOptions,
    );
  }
}

function assertClientPath(environment, assertPath, assertOwnedNamespace, boundaryOptions) {
  if (environment.PATH === undefined) return;
  if (typeof environment.PATH !== "string" || environment.PATH.length === 0) {
    throw new Error("Claude PATH must be a non-empty path list");
  }
  for (const [index, entry] of environment.PATH.split(path.delimiter).entries()) {
    if (!entry || !path.isAbsolute(entry)) {
      throw new Error(`Claude PATH entry ${index + 1} must be absolute and non-empty`);
    }
    const label = `Claude PATH entry ${index + 1}`;
    assertPath(entry, label, boundaryOptions);
    assertOwnedNamespace(entry, label, boundaryOptions);
  }
}

function assertAbsoluteClientPath(value, label, assertPath, boundaryOptions) {
  if (typeof value !== "string" || !value || !path.isAbsolute(value)) {
    throw new Error(`${label} must be an absolute non-empty path`);
  }
  assertPath(value, label, boundaryOptions);
}

function assertClientAuxiliaryPaths(
  environment,
  assertPath,
  assertOwnedNamespace,
  boundaryOptions,
) {
  for (const name of CLIENT_POINT_PATH_VARIABLES) {
    if (environment[name] === undefined) continue;
    assertAbsoluteClientPath(
      environment[name],
      `Claude forwarded path ${name}`,
      assertPath,
      boundaryOptions,
    );
  }
  for (const name of CLIENT_NAMESPACE_LIST_VARIABLES) {
    if (environment[name] === undefined) continue;
    if (typeof environment[name] !== "string" || !environment[name]) {
      throw new Error(`Claude forwarded path list ${name} must be non-empty`);
    }
    for (const [index, entry] of environment[name].split(path.delimiter).entries()) {
      const label = `Claude forwarded namespace ${name} entry ${index + 1}`;
      assertAbsoluteClientPath(entry, label, assertPath, boundaryOptions);
      assertOwnedNamespace(entry, label, boundaryOptions);
    }
  }
}

function assertClaudeSettings(environment, argv, assertPath, boundaryOptions, dependencies) {
  if (
    argv.some((arg) =>
      ["--settings", "--setting-sources"].some(
        (flag) => arg === flag || arg.startsWith(`${flag}=`),
      ),
    )
  ) {
    throw new Error(
      "Claude settings-source overrides require manual review before using the gateway launcher",
    );
  }
  const files = [
    path.join(
      environment.CLAUDE_CONFIG_DIR ?? path.join(environment.HOME, ".claude"),
      "settings.json",
    ),
  ];
  let directory = (dependencies.cwd ?? process.cwd)();
  for (;;) {
    files.push(
      path.join(directory, ".claude", "settings.json"),
      path.join(directory, ".claude", "settings.local.json"),
    );
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  const managedRoot =
    dependencies.managedSettingsRoot ??
    (process.platform === "win32"
      ? path.join(process.env.ProgramFiles ?? String.raw`C:\Program Files`, "ClaudeCode")
      : process.platform === "darwin"
        ? "/Library/Application Support/ClaudeCode"
        : "/etc/claude-code");
  files.push(path.join(managedRoot, "managed-settings.json"));
  const fragments = path.join(managedRoot, "managed-settings.d");
  assertPath(fragments, "Claude managed settings fragments", boundaryOptions);
  try {
    const names = fs.readdirSync(fragments);
    if (names.length > 256) throw new Error("too many managed settings fragments");
    for (const name of names.sort()) {
      if (!name.startsWith(".") && name.endsWith(".json")) files.push(path.join(fragments, name));
    }
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new Error("Claude managed settings fragments could not be inspected safely");
  }
  for (const file of new Set(files)) {
    assertPath(file, "Claude settings", boundaryOptions);
    let descriptor;
    let data;
    try {
      descriptor = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK ?? 0));
      const stat = fs.fstatSync(descriptor);
      if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error("unsafe settings file");
      const buffer = Buffer.alloc(1024 * 1024 + 1);
      const count = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
      if (count > 1024 * 1024) throw new Error("oversized settings file");
      data = JSON.parse(buffer.subarray(0, count).toString("utf8"));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw new Error(
        "Claude settings could not be inspected safely; review gateway routing manually",
      );
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    }
    assertPath(file, "Claude settings", boundaryOptions);
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      (data.env !== undefined &&
        (!data.env || typeof data.env !== "object" || Array.isArray(data.env)))
    ) {
      throw new Error("Claude settings must have an object with an optional environment object");
    }
    if (
      data.apiKeyHelper ||
      Object.keys(data.env ?? {}).some((name) =>
        /^(?:ANTHROPIC_|CLAUDE_CODE_(?:USE_|OAUTH_TOKEN))/u.test(name),
      )
    ) {
      throw new Error(
        "Claude settings override gateway routing or authentication; resolve the conflict before using this launcher",
      );
    }
  }
}

function escapeWindowsCommandMeta(value) {
  return [...value]
    .map((character) =>
      WINDOWS_COMMAND_META_CHARACTERS.has(character) ? `^${character}` : character,
    )
    .join("");
}

function escapeWindowsCommandArgument(argument) {
  if (typeof argument !== "string" || /[\0\r\n]/u.test(argument)) {
    throw new Error("Windows command-script arguments must be single-line strings");
  }
  let escaped = argument.replace(/(\\*)"/gu, '$1$1\\"').replace(/(\\*)$/u, "$1$1");
  escaped = `"${escaped}"`;
  return escapeWindowsCommandMeta(escapeWindowsCommandMeta(escaped));
}

function approvedInvocation(executable, args, env) {
  if (
    process.platform !== "win32" ||
    !WINDOWS_COMMAND_SCRIPT_SUFFIXES.has(path.win32.extname(executable).toLowerCase())
  ) {
    return { executable, args, windowsVerbatimArguments: false };
  }
  if (typeof env.SystemRoot !== "string" || !path.win32.isAbsolute(env.SystemRoot)) {
    throw new Error("SystemRoot must be absolute for an approved Windows command script");
  }
  const command = [
    escapeWindowsCommandMeta(executable),
    ...args.map(escapeWindowsCommandArgument),
  ].join(" ");
  return {
    executable: path.win32.join(env.SystemRoot, "System32", "cmd.exe"),
    args: ["/d", "/s", "/v:off", "/c", `"${command}"`],
    windowsVerbatimArguments: true,
  };
}

export function runClaudeLauncher(argv = process.argv.slice(2), dependencies = {}) {
  if (!path.isAbsolute(CLAUDE_EXECUTABLE)) {
    throw new Error("launcher has no approved Claude executable");
  }
  const credentialPath =
    dependencies.credentialPath ??
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "secrets",
      "litellm-master-key",
    );
  const configRoot = dependencies.configRoot ?? CONFIG_ROOT;
  const stateRoot = dependencies.stateRoot ?? STATE_ROOT;
  if (![configRoot, stateRoot, credentialPath].every((value) => path.isAbsolute(value))) {
    throw new Error("launcher has no absolute owned-root binding");
  }
  if (!within(credentialPath, configRoot)) {
    throw new Error("gateway credential escapes the bound configuration root");
  }
  const boundaryOptions = dependencies.wslBoundaryOptions ?? {};
  const assertOwnedNamespace =
    dependencies.assertCurrentWslOwnedNamespace ?? assertCurrentWslOwnedNamespace;
  const assertPath = dependencies.assertCurrentWslPath ?? assertCurrentWslPath;
  const sourceEnvironment = dependencies.env ?? process.env;
  const assertBoundaries = (environment) => {
    assertOwnedNamespace(configRoot, "configuration namespace", boundaryOptions);
    assertOwnedNamespace(stateRoot, "state namespace", boundaryOptions);
    assertPath(credentialPath, "gateway credential", boundaryOptions);
    assertPath(CLAUDE_EXECUTABLE, "Claude executable", boundaryOptions);
    assertClientMutableStatePaths(environment, assertPath, assertOwnedNamespace, boundaryOptions);
    assertClientPath(environment, assertPath, assertOwnedNamespace, boundaryOptions);
    assertClientAuxiliaryPaths(environment, assertPath, assertOwnedNamespace, boundaryOptions);
  };
  const env = clientEnvironment(sourceEnvironment, dependencies);
  dependencies.beforeCredentialBoundary?.({
    configRoot,
    credentialPath,
    executable: CLAUDE_EXECUTABLE,
    stateRoot,
  });
  assertBoundaries(env);
  assertClaudeSettings(env, argv, assertPath, boundaryOptions, dependencies);
  const credential = (dependencies.readProtectedGatewaySecret ?? readProtectedGatewaySecret)(
    credentialPath,
    "gateway credential",
    { wslBoundaryOptions: boundaryOptions },
  );
  const passthrough = [...argv];
  if (passthrough[0] === "--") passthrough.shift();
  env.ANTHROPIC_AUTH_TOKEN = credential;
  env.ANTHROPIC_BASE_URL = BASE_URL;
  env.ANTHROPIC_MODEL = MODEL;
  env.ANTHROPIC_DEFAULT_HAIKU_MODEL = MODEL;
  env.ANTHROPIC_DEFAULT_OPUS_MODEL = MODEL;
  env.ANTHROPIC_DEFAULT_SONNET_MODEL = MODEL;

  const invocation = approvedInvocation(CLAUDE_EXECUTABLE, passthrough, env);
  dependencies.beforeSpawnBoundary?.({
    credentialPath,
    executable: invocation.executable,
  });
  assertBoundaries(env);
  assertClaudeSettings(env, passthrough, assertPath, boundaryOptions, dependencies);
  assertPath(invocation.executable, "Claude invocation executable", boundaryOptions);
  const child = (dependencies.spawn ?? spawn)(invocation.executable, invocation.args, {
    env,
    stdio: "inherit",
    windowsVerbatimArguments: invocation.windowsVerbatimArguments,
    windowsHide: false,
  });
  child.on("error", (error) => {
    process.stderr.write(`Claude Code launcher failed: ${error.message}\n`);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
  return child;
}

const executedDirectly =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (executedDirectly) {
  try {
    runClaudeLauncher();
  } catch (error) {
    process.stderr.write(`Claude Code launcher failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}
