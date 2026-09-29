import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  assertCurrentWslOwnedNamespace,
  assertCurrentWslPath,
  readProtectedSecret,
} from "./remote-protected-file.mjs";

const configuration = __REMOTE_CLIENT_CONFIGURATION__;

const STATE_DIRECTORIES = [
  "APPDATA",
  "LOCALAPPDATA",
  "CODEX_HOME",
  "CLAUDE_CONFIG_DIR",
  "TEMP",
  "TMP",
  "TMPDIR",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
  "XDG_RUNTIME_DIR",
];
const POINT_PATHS = [
  "HOME",
  "USERPROFILE",
  "GIT_ASKPASS",
  "NODE_EXTRA_CA_CERTS",
  "SHELL",
  "SSH_ASKPASS",
  "SSH_AUTH_SOCK",
  "SSL_CERT_FILE",
  "SystemRoot",
  "WINDIR",
];

// Only read path variables here: credential sources must remain untouched until validation.
export function clientPathEnvironment(source = process.env) {
  const env = {};
  for (const key of [...STATE_DIRECTORIES, ...POINT_PATHS, "PATH", "SSL_CERT_DIR"])
    if (source[key] !== undefined) env[key] = source[key];
  env.HOME ??= (process.platform === "win32" ? env.USERPROFILE : undefined) ?? os.homedir();
  const temp = env.TMPDIR ?? env.TMP ?? env.TEMP ?? os.tmpdir();
  env.TMPDIR ??= temp;
  env.TMP ??= temp;
  env.TEMP ??= temp;
  if (env.PATH === undefined) {
    if (process.platform === "win32") {
      const root = env.SystemRoot ?? env.WINDIR;
      if (!root || !path.isAbsolute(root)) throw new Error("Missing native system root");
      env.PATH = [path.join(root, "System32"), root].join(path.delimiter);
    } else env.PATH = "/usr/bin:/bin";
  }
  return env;
}

export function assertClientBoundaries(environment, options = {}) {
  const boundary = options.wslBoundaryOptions ?? {};
  const check = (value, label, namespace = false) => {
    if (typeof value !== "string" || !path.isAbsolute(value) || /[\0\r\n]/u.test(value))
      throw new Error("Client paths must be absolute native paths");
    assertCurrentWslPath(value, label, boundary);
    if (namespace) assertCurrentWslOwnedNamespace(value, label, boundary);
  };
  check(options.cwd ?? process.cwd(), "Client working directory", true);
  if (options.executable) check(options.executable, "Client executable");
  for (const key of STATE_DIRECTORIES)
    if (environment[key] !== undefined) check(environment[key], `Client ${key}`, true);
  for (const key of POINT_PATHS)
    if (environment[key] !== undefined && environment[key] !== "")
      check(environment[key], `Client ${key}`);
  for (const key of ["HOME", "USERPROFILE"]) {
    if (environment[key] === undefined) continue;
    check(environment[key], `Client ${key}`);
    for (const suffix of [".codex", ".claude", ".cache", ".config", ".local/share", ".local/state"])
      check(path.join(environment[key], suffix), `Client ${key}/${suffix}`, true);
  }
  for (const key of ["PATH", "SSL_CERT_DIR"]) {
    if (environment[key] === undefined) continue;
    if (typeof environment[key] !== "string" || !environment[key])
      throw new Error("Invalid client path list");
    for (const entry of environment[key].split(path.delimiter))
      check(entry, `Client ${key} entry`, true);
  }
}

function stamp(stat) {
  return Object.fromEntries(
    ["dev", "ino", "birthtimeNs", "mtimeNs", "size"].map((key) => [key, String(stat[key])]),
  );
}

export function conflictingClaudeSettings(options = {}) {
  if (
    (options.args ?? process.argv.slice(2)).some((arg) =>
      /^--(?:settings|setting-sources)(?:=|$)/u.test(arg),
    )
  )
    throw new Error("Resolve explicit Claude settings overrides before using this launcher");
  const home =
    options.configDir ?? process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
  const files = [path.join(home, "settings.json")];
  let directory = options.cwd ?? process.cwd();
  for (;;) {
    files.push(
      path.join(directory, ".claude", "settings.json"),
      path.join(directory, ".claude", "settings.local.json"),
    );
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  const managed =
    options.managedDirectory ??
    (process.platform === "linux"
      ? "/etc/claude-code"
      : process.platform === "darwin"
        ? "/Library/Application Support/ClaudeCode"
        : process.env.ProgramFiles
          ? path.join(process.env.ProgramFiles, "ClaudeCode")
          : null);
  if (managed) {
    files.push(path.join(managed, "managed-settings.json"));
    const fragments = path.join(managed, "managed-settings.d");
    assertCurrentWslOwnedNamespace(fragments, "Claude managed settings fragments");
    try {
      for (const name of fs.readdirSync(fragments))
        if (!name.startsWith(".") && name.endsWith(".json")) files.push(path.join(fragments, name));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  for (const file of new Set(files)) {
    assertCurrentWslPath(file, "Claude settings source");
    let data;
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error("unsafe settings");
      data = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw new Error(
        "Cannot inspect Claude settings safely; review the gateway configuration manually",
      );
    }
    if (
      data.apiKeyHelper ||
      Object.keys(data.env || {}).some((key) =>
        /^(?:ANTHROPIC_|CLAUDE_CODE_(?:USE_|OAUTH_TOKEN))/u.test(key),
      )
    ) {
      throw new Error(
        "Claude settings override gateway routing or authentication; resolve that conflict before using this launcher",
      );
    }
  }
}

function runLauncher() {
  try {
    if (
      configuration.host.platform !== process.platform ||
      configuration.host.arch !== process.arch ||
      configuration.host.wsl !== (process.env.WSL_DISTRO_NAME || null)
    ) {
      throw new Error("Run this launcher in its original native host environment");
    }
    const selected = configuration.executables[configuration.client];
    const pathEnvironment = clientPathEnvironment();
    const assertBoundaries = () =>
      assertClientBoundaries(pathEnvironment, { executable: selected.path });
    assertBoundaries();
    const current = stamp(fs.statSync(selected.path, { bigint: true }));
    if (Object.keys(current).some((key) => current[key] !== selected.stamp[key])) {
      throw new Error("Client executable changed; re-plan the owned launchers");
    }
    if (configuration.client === "claude-code") conflictingClaudeSettings();
    const ref = configuration.keyRef;
    const secret =
      ref.kind === "file"
        ? readProtectedSecret(ref.path, "Gateway inference credential", {
            allowTrailingNewline: true,
          })
        : process.env[ref.name];
    if (typeof secret !== "string" || !/^[\x21-\x7e]{1,8192}$/u.test(secret)) {
      throw new Error("Gateway inference credential is missing or malformed");
    }
    const env = { ...process.env, ...pathEnvironment };
    for (const key of Object.keys(env)) {
      if (
        /^(?:ANTHROPIC_|OPENAI_|AZURE_OPENAI_|HETZNER_|LITELLM_|CLAUDE_CODE_(?:USE_|OAUTH_TOKEN))/u.test(
          key,
        )
      )
        delete env[key];
    }
    if (ref.kind === "env") delete env[ref.name];
    const args = process.argv.slice(2);
    let clientArgs;
    if (configuration.client === "codex") {
      env.HETZNER_GATEWAY_API_KEY = secret;
      const provider = `{ name = "Hetzner via LiteLLM", base_url = ${JSON.stringify(configuration.inferenceUrl)}, wire_api = "responses", env_key = "HETZNER_GATEWAY_API_KEY" }`;
      clientArgs = [
        "-c",
        `model=${JSON.stringify(configuration.alias)}`,
        "-c",
        `model_provider=${JSON.stringify(configuration.providerId)}`,
        "-c",
        `model_providers.${configuration.providerId}=${provider}`,
        ...args,
      ];
    } else {
      env.ANTHROPIC_BASE_URL = configuration.anthropicBaseUrl;
      env.ANTHROPIC_AUTH_TOKEN = secret;
      for (const key of [
        "ANTHROPIC_MODEL",
        "ANTHROPIC_SMALL_FAST_MODEL",
        "ANTHROPIC_DEFAULT_SONNET_MODEL",
        "ANTHROPIC_DEFAULT_OPUS_MODEL",
        "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      ])
        env[key] = configuration.alias;
      clientArgs = args;
    }
    assertBoundaries();
    if (configuration.client === "claude-code") conflictingClaudeSettings();
    const child = spawn(selected.path, clientArgs, {
      env,
      stdio: "inherit",
      shell: false,
      windowsHide: false,
    });
    let terminationTimer;
    const handlers = new Map();
    for (const signal of ["SIGINT", "SIGTERM"]) {
      const handler = () => {
        child.kill(signal);
        terminationTimer ??= setTimeout(() => child.kill("SIGKILL"), 5000);
        terminationTimer.unref();
      };
      handlers.set(signal, handler);
      process.on(signal, handler);
    }
    child.on("error", () => {
      process.stderr.write("Unable to start the selected native client\n");
      process.exitCode = 1;
    });
    child.on("close", (code, signal) => {
      clearTimeout(terminationTimer);
      for (const [name, handler] of handlers) process.off(name, handler);
      process.exitCode = Number.isInteger(code) ? code : signal === "SIGINT" ? 130 : 143;
    });
  } catch {
    // Underlying filesystem or parsing errors can include data; keep runtime failure output fixed.
    process.stderr.write(
      "Remote client launcher refused: check native executable, protected inference credential, and conflicting client settings.\n",
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  runLauncher();
