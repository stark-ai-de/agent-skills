import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { invariant } from "./errors.mjs";
import { runBoundedCommand } from "./subprocess.mjs";

const WINDOWS_EXECUTABLE_SUFFIXES = [".EXE", ".CMD", ".BAT", ".COM"];
const WINDOWS_COMMAND_SCRIPT_SUFFIXES = new Set([".cmd", ".bat"]);
const WINDOWS_COMMAND_META_CHARACTERS = new Set('()[]%!^"`<>&|;,*? ');
const MAX_WSL_ALIAS_HOPS = 40;
const CONSERVATIVE_CASE_INSENSITIVE_COLLATOR = new Intl.Collator("und", {
  sensitivity: "base",
  usage: "search",
});

function absolute(value, label, pathApi = path) {
  invariant(
    typeof value === "string" && value.length > 0,
    "missing_host_root",
    `${label} is required`,
  );
  invariant(pathApi.isAbsolute(value), "relative_host_root", `${label} must be absolute`, {
    value,
  });
  return pathApi.normalize(value);
}

function pathComponents(value, pathApi) {
  const normalized = pathApi.resolve(value).normalize("NFC");
  const parsed = pathApi.parse(normalized);
  return {
    parts: pathApi
      .relative(parsed.root, normalized)
      .split(pathApi.sep)
      .filter(Boolean)
      .map((part) => part.normalize("NFC")),
    root: parsed.root.normalize("NFC"),
  };
}

function conservativeCaseInsensitiveEqual(left, right) {
  return CONSERVATIVE_CASE_INSENSITIVE_COLLATOR.compare(left, right) === 0;
}

function withinPath(target, boundary, pathApi, caseFold = false) {
  if (caseFold) {
    const targetPath = pathComponents(target, pathApi);
    const boundaryPath = pathComponents(boundary, pathApi);
    return (
      conservativeCaseInsensitiveEqual(targetPath.root, boundaryPath.root) &&
      boundaryPath.parts.length <= targetPath.parts.length &&
      boundaryPath.parts.every((part, index) =>
        conservativeCaseInsensitiveEqual(part, targetPath.parts[index]),
      )
    );
  }
  const relative = pathApi.relative(
    pathApi.resolve(boundary).normalize("NFC"),
    pathApi.resolve(target).normalize("NFC"),
  );
  return relative === "" || (!relative.startsWith("..") && !pathApi.isAbsolute(relative));
}

function assertExternalCodexHome(host) {
  const pathApi = host.pathStyle === "win32" ? path.win32 : path.posix;
  const caseFold = host.kind === "windows" || host.kind === "macos";
  const overlap = [host.configRoot, host.stateRoot].find((root) =>
    [
      withinPath(host.codexHome, root, pathApi, caseFold),
      withinPath(root, host.codexHome, pathApi, caseFold),
    ].some(Boolean),
  );
  invariant(
    overlap === undefined,
    "codex_home_overlaps_managed_root",
    "CODEX_HOME must remain disjoint from the managed configuration and state roots",
    { codexHome: host.codexHome, managedRoot: overlap },
  );
}

function decodeMountInfoField(value) {
  return value.replace(/\\([0-7]{3})/gu, (_match, octal) =>
    String.fromCharCode(Number.parseInt(octal, 8)),
  );
}

export function parseWslWindowsMounts(value) {
  invariant(
    typeof value === "string",
    "wsl_mount_table_invalid",
    "WSL mount metadata must be text",
  );
  const mounts = new Set();
  let hasRootMount = false;
  for (const [lineIndex, line] of value.split("\n").entries()) {
    if (!line.trim()) continue;
    const fields = line.trim().split(" ");
    const separator = fields.indexOf("-");
    const root = decodeMountInfoField(fields[3] ?? "");
    // nsfs show_path emits a namespace handle (for example net:[123]), not a pathname.
    const validRoot =
      path.posix.isAbsolute(root) ||
      (fields[separator + 1] === "nsfs" && /^[a-z_]+:\[\d+\]$/u.test(root));
    const structurallyValid =
      !fields.includes("") &&
      separator >= 6 &&
      separator + 4 === fields.length &&
      /^\d+$/u.test(fields[0]) &&
      /^\d+$/u.test(fields[1]) &&
      /^\d+:\d+$/u.test(fields[2]) &&
      validRoot &&
      path.posix.isAbsolute(decodeMountInfoField(fields[4])) &&
      fields[5].length > 0 &&
      fields[separator + 1].length > 0 &&
      fields[separator + 2].length > 0 &&
      fields[separator + 3].length > 0;
    invariant(
      structurallyValid,
      "wsl_mount_table_invalid",
      "WSL mount metadata contains a malformed or truncated record",
      {
        lineNumber: lineIndex + 1,
        fieldCount: fields.length,
        separatorIndex: separator,
        emptyFieldIndexes: fields.flatMap((field, index) => (field === "" ? [index] : [])),
        mountIdNumeric: /^\d+$/u.test(fields[0] ?? ""),
        parentIdNumeric: /^\d+$/u.test(fields[1] ?? ""),
        deviceNumeric: /^\d+:\d+$/u.test(fields[2] ?? ""),
        rootAbsolute: path.posix.isAbsolute(decodeMountInfoField(fields[3] ?? "")),
        mountPointAbsolute: path.posix.isAbsolute(decodeMountInfoField(fields[4] ?? "")),
      },
    );
    const mountPoint = path.posix.normalize(decodeMountInfoField(fields[4]));
    if (mountPoint === "/") hasRootMount = true;
    const fileSystem = fields[separator + 1].toLowerCase();
    const source = decodeMountInfoField(fields[separator + 2]);
    const superOptions = decodeMountInfoField(fields[separator + 3]);
    const isDrvFs =
      fileSystem === "drvfs" ||
      (fileSystem === "9p" &&
        (/^[a-z]:(?:[\\/]|$)/iu.test(source) ||
          /(?:^|,)aname=drvfs(?:[;,]|$)/iu.test(superOptions)));
    if (!isDrvFs) continue;
    mounts.add(mountPoint);
  }
  invariant(
    hasRootMount,
    "wsl_mount_table_invalid",
    "WSL mount metadata has no structurally valid root mount",
  );
  return [...mounts].sort((left, right) => right.length - left.length || left.localeCompare(right));
}

function createWslMountTopologyProvider(options) {
  const fixedMountInfo = options.mountInfo;
  const readMountInfo =
    options.mountInfoProvider ??
    (fixedMountInfo === undefined
      ? () => (options.readFileSync ?? fs.readFileSync)("/proc/self/mountinfo", "utf8")
      : () => fixedMountInfo);
  return () => {
    let mountInfo;
    try {
      mountInfo = readMountInfo();
    } catch (error) {
      invariant(
        false,
        "wsl_mount_table_unavailable",
        "Unable to read WSL mount metadata before classifying host paths",
        { reason: error?.code ?? "mountinfo_read_failed" },
      );
    }
    return Object.freeze(parseWslWindowsMounts(mountInfo));
  };
}

function mountTable(hostOrMounts) {
  if (Array.isArray(hostOrMounts)) return hostOrMounts;
  if (typeof hostOrMounts?.wslMountTopologyProvider === "function") {
    return hostOrMounts.wslMountTopologyProvider();
  }
  return hostOrMounts?.wslWindowsMounts;
}

export function isWslWindowsMountedPath(value, hostOrMounts) {
  if (typeof value !== "string" || !path.posix.isAbsolute(value)) return false;
  const mounts = mountTable(hostOrMounts);
  if (!Array.isArray(mounts)) return false;
  const normalized = path.posix.normalize(value);
  return mounts.some(
    (mountPoint) =>
      normalized === mountPoint || mountPoint === "/" || normalized.startsWith(`${mountPoint}/`),
  );
}

function assertNotWslWindowsMounted(value, host, label, mounts) {
  const mountedAt = mounts.find((mountPoint) => pathContains(mountPoint, value));
  invariant(
    mountedAt === undefined,
    "wsl_cross_boundary_path",
    `${label} must remain inside the selected WSL distribution: ${value}`,
    { label, mountPoint: mountedAt, path: value, wslDistribution: host.wslDistribution },
  );
}

function pathContains(root, target) {
  const normalizedRoot = path.posix.normalize(root);
  const normalizedTarget = path.posix.normalize(target);
  return (
    normalizedTarget === normalizedRoot ||
    normalizedRoot === "/" ||
    normalizedTarget.startsWith(`${normalizedRoot}/`)
  );
}

function inspectWslPathAliases(value, host, label, options, mounts) {
  invariant(
    Array.isArray(mounts),
    "wsl_mount_table_unavailable",
    "WSL mount metadata is required before classifying host paths",
  );
  const lstatSync = options.lstatSync ?? fs.lstatSync;
  const readlinkSync = options.readlinkSync ?? fs.readlinkSync;
  let pending = path.posix.normalize(value);
  const visited = new Set();
  for (let hop = 0; hop <= MAX_WSL_ALIAS_HOPS; hop += 1) {
    assertNotWslWindowsMounted(pending, host, label, mounts);
    invariant(
      !visited.has(pending),
      "wsl_path_alias_cycle",
      `${label} contains a cyclic path alias: ${value}`,
    );
    visited.add(pending);
    const parsed = path.posix.parse(pending);
    const parts = path.posix.relative(parsed.root, pending).split(path.posix.sep).filter(Boolean);
    let current = parsed.root;
    let redirected = false;
    for (let index = 0; index < parts.length; index += 1) {
      current = path.posix.join(current, parts[index]);
      assertNotWslWindowsMounted(current, host, label, mounts);
      let stat;
      try {
        stat = lstatSync(current);
      } catch (error) {
        if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return pending;
        invariant(
          false,
          "wsl_path_classification_failed",
          `Unable to classify ${label} without following an unsafe path: ${value}`,
          { reason: error?.code ?? "path_inspection_failed" },
        );
      }
      if (!stat.isSymbolicLink()) continue;
      let linkTarget;
      try {
        linkTarget = readlinkSync(current);
      } catch (error) {
        invariant(
          false,
          "wsl_path_classification_failed",
          `Unable to read ${label} path alias safely: ${current}`,
          { reason: error?.code ?? "readlink_failed" },
        );
      }
      pending = path.posix.resolve(
        path.posix.dirname(current),
        linkTarget,
        ...parts.slice(index + 1),
      );
      redirected = true;
      break;
    }
    if (!redirected) return pending;
  }
  invariant(false, "wsl_path_alias_limit", `${label} exceeds the safe path-alias limit: ${value}`);
}

export function assertWslSameEnvironmentPath(value, host, label = "Path", options = {}) {
  if (host?.kind !== "wsl") return value;
  invariant(
    typeof value === "string" && path.posix.isAbsolute(value),
    "wsl_path_invalid",
    `${label} must be an absolute WSL path`,
  );
  const mounts = mountTable(host);
  invariant(
    Array.isArray(mounts),
    "wsl_mount_table_unavailable",
    "WSL mount metadata is required before classifying host paths",
  );
  inspectWslPathAliases(value, host, label, options, mounts);
  return value;
}

export function assertWslOwnedNamespace(value, host, label, options = {}) {
  if (host?.kind !== "wsl") return value;
  const mounts = mountTable(host);
  invariant(
    Array.isArray(mounts),
    "wsl_mount_table_unavailable",
    "WSL mount metadata is required before classifying owned namespaces",
  );
  const nestedMount = mounts.find((mountPoint) => pathContains(value, mountPoint));
  invariant(
    nestedMount === undefined,
    "wsl_cross_boundary_path",
    `${label} intersects a Windows-mounted WSL path: ${nestedMount}`,
    { label, mountPoint: nestedMount, path: value, wslDistribution: host.wslDistribution },
  );
  const resolved = inspectWslPathAliases(value, host, label, options, mounts);
  const resolvedNestedMount = mounts.find((mountPoint) => pathContains(resolved, mountPoint));
  invariant(
    resolvedNestedMount === undefined,
    "wsl_cross_boundary_path",
    `${label} resolves to a namespace containing a Windows-mounted WSL path: ${resolvedNestedMount}`,
    {
      label,
      mountPoint: resolvedNestedMount,
      path: value,
      resolvedPath: resolved,
      wslDistribution: host.wslDistribution,
    },
  );
  return value;
}

export function detectHost(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const home = options.home ?? os.homedir();

  if (platform === "win32") {
    const pathApi = path.win32;
    const localAppData = absolute(env.LOCALAPPDATA, "LOCALAPPDATA", pathApi);
    const base = pathApi.join(localAppData, "stark-ai", "hetzner-inference");
    const codexHome = env.CODEX_HOME
      ? absolute(env.CODEX_HOME, "CODEX_HOME", pathApi)
      : pathApi.join(absolute(home, "home", pathApi), ".codex");
    const host = {
      kind: "windows",
      platform,
      pathStyle: "win32",
      configRoot: base,
      stateRoot: base,
      codexHome,
      localBoundary: localAppData,
      wslDistribution: null,
    };
    assertExternalCodexHome(host);
    return host;
  }

  invariant(
    platform === "linux" || platform === "darwin",
    "unsupported_host",
    `Unsupported platform: ${platform}`,
  );
  const normalizedHome = absolute(home, "home", path.posix);

  if (platform === "darwin") {
    const base = path.posix.join(
      normalizedHome,
      "Library",
      "Application Support",
      "stark-ai",
      "hetzner-inference",
    );
    const host = {
      kind: "macos",
      platform,
      pathStyle: "posix",
      configRoot: base,
      stateRoot: base,
      codexHome: env.CODEX_HOME
        ? absolute(env.CODEX_HOME, "CODEX_HOME", path.posix)
        : path.posix.join(normalizedHome, ".codex"),
      localBoundary: normalizedHome,
      wslDistribution: null,
    };
    assertExternalCodexHome(host);
    return host;
  }

  const isWsl = Boolean(env.WSL_DISTRO_NAME || env.WSL_INTEROP || options.isWsl);
  const configBase = env.XDG_CONFIG_HOME
    ? absolute(env.XDG_CONFIG_HOME, "XDG_CONFIG_HOME", path.posix)
    : path.posix.join(normalizedHome, ".config");
  const stateBase = env.XDG_STATE_HOME
    ? absolute(env.XDG_STATE_HOME, "XDG_STATE_HOME", path.posix)
    : path.posix.join(normalizedHome, ".local", "state");
  const wslMountTopologyProvider = isWsl ? createWslMountTopologyProvider(options) : null;
  const host = {
    kind: isWsl ? "wsl" : "linux",
    platform,
    pathStyle: "posix",
    configRoot: path.posix.join(configBase, "stark-ai", "hetzner-inference"),
    stateRoot: path.posix.join(stateBase, "stark-ai", "hetzner-inference"),
    codexHome: env.CODEX_HOME
      ? absolute(env.CODEX_HOME, "CODEX_HOME", path.posix)
      : path.posix.join(normalizedHome, ".codex"),
    localBoundary: normalizedHome,
    wslDistribution: isWsl ? env.WSL_DISTRO_NAME || "unknown" : null,
  };
  assertExternalCodexHome(host);
  if (isWsl) {
    Object.defineProperties(host, {
      wslMountTopologyProvider: {
        configurable: false,
        enumerable: false,
        value: wslMountTopologyProvider,
        writable: false,
      },
      wslWindowsMounts: {
        configurable: false,
        enumerable: false,
        get: wslMountTopologyProvider,
      },
    });
    assertWslSameEnvironmentPath(normalizedHome, host, "home", options);
    assertWslSameEnvironmentPath(configBase, host, "XDG_CONFIG_HOME", options);
    assertWslSameEnvironmentPath(stateBase, host, "XDG_STATE_HOME", options);
    assertWslOwnedNamespace(host.configRoot, host, "configuration namespace", options);
    assertWslOwnedNamespace(host.stateRoot, host, "state namespace", options);
    assertWslSameEnvironmentPath(host.codexHome, host, "CODEX_HOME", options);
    assertWslSameEnvironmentPath(
      path.posix.join(host.codexHome, "hetzner.config.toml"),
      host,
      "Codex profile",
      options,
    );
  }
  return host;
}

export function managedPaths(host) {
  assertExternalCodexHome(host);
  const pathApi = host.pathStyle === "win32" ? path.win32 : path.posix;
  const configRoot = host.configRoot;
  const stateRoot = host.stateRoot;
  return {
    configRoot,
    stateRoot,
    secretsDir: pathApi.join(configRoot, "secrets"),
    providerSecret: pathApi.join(configRoot, "secrets", "hetzner-api-key"),
    gatewaySecret: pathApi.join(configRoot, "secrets", "litellm-master-key"),
    binDir: pathApi.join(configRoot, "bin"),
    credentialHelper: pathApi.join(configRoot, "bin", "read-credential.mjs"),
    protectedFileHelper: pathApi.join(configRoot, "bin", "protected-file.mjs"),
    claudeLauncher: pathApi.join(configRoot, "bin", "claude-hetzner.mjs"),
    gatewayRunner: pathApi.join(configRoot, "bin", "gateway-runner.mjs"),
    gatewayConfig: pathApi.join(configRoot, "gateway", "config.yaml"),
    runtimeRoot: pathApi.join(stateRoot, "runtime"),
    venvRoot: pathApi.join(stateRoot, "runtime", "venv"),
    manifest: pathApi.join(stateRoot, "install-manifest.json"),
    processReceipt: pathApi.join(stateRoot, "process-receipt.json"),
    processStopRequest: pathApi.join(stateRoot, "process-stop.json"),
    rollbackReceipt: pathApi.join(stateRoot, "rollback-receipt.json"),
    lock: pathApi.join(stateRoot, "mutation.lock"),
    backupsRoot: pathApi.join(stateRoot, "backups"),
    codexProfile: pathApi.join(host.codexHome, "hetzner.config.toml"),
  };
}

function candidateNames(name, platform, env) {
  if (platform !== "win32" || path.win32.extname(name)) return [name];
  const suffixes = (env.PATHEXT || WINDOWS_EXECUTABLE_SUFFIXES.join(";"))
    .split(";")
    .filter(Boolean);
  return suffixes.map((suffix) => `${name}${suffix.toLowerCase()}`);
}

export function resolveExecutable(name, options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const host = options.host;
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const delimiter = platform === "win32" ? ";" : ":";
  const existsSync = options.existsSync ?? fs.existsSync;
  const realpathSync = options.realpathSync ?? fs.realpathSync.native;
  const statSync = options.statSync ?? fs.statSync;

  if (pathApi.isAbsolute(name)) {
    assertWslSameEnvironmentPath(name, host, "Executable", options);
    if (!existsSync(name)) return null;
    const resolved = realpathSync(name);
    assertWslSameEnvironmentPath(resolved, host, "Executable", options);
    return resolved;
  }

  for (const root of (env.PATH || "").split(delimiter).filter(Boolean)) {
    for (const candidate of candidateNames(name, platform, env)) {
      const full = pathApi.join(root, candidate);
      try {
        assertWslSameEnvironmentPath(full, host, "Executable", options);
      } catch (error) {
        if (error?.code !== "wsl_cross_boundary_path") throw error;
        if (options.rejectCrossBoundaryCandidate === true) throw error;
        continue;
      }
      let resolved;
      try {
        const stat = statSync(full);
        if (!stat.isFile()) continue;
        resolved = realpathSync(full);
      } catch {
        // Continue searching PATH.
        continue;
      }
      assertWslSameEnvironmentPath(resolved, host, "Executable", options);
      return resolved;
    }
  }
  return null;
}

function escapeWindowsCommandMeta(value) {
  return [...value]
    .map((character) =>
      WINDOWS_COMMAND_META_CHARACTERS.has(character) ? `^${character}` : character,
    )
    .join("");
}

function escapeWindowsCommandArgument(argument) {
  invariant(
    typeof argument === "string" && !/[\0\r\n]/u.test(argument),
    "windows_command_argument_invalid",
    "Windows command-script arguments must be single-line strings",
  );
  let escaped = argument.replace(/(\\*)"/gu, '$1$1\\"').replace(/(\\*)$/u, "$1$1");
  escaped = `"${escaped}"`;
  return escapeWindowsCommandMeta(escapeWindowsCommandMeta(escaped));
}

export function commandInvocation(executable, args, options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  if (
    platform !== "win32" ||
    !WINDOWS_COMMAND_SCRIPT_SUFFIXES.has(path.win32.extname(executable).toLowerCase())
  ) {
    return { executable, args, windowsVerbatimArguments: false };
  }
  invariant(
    typeof env.SystemRoot === "string" && path.win32.isAbsolute(env.SystemRoot),
    "windows_system_root_invalid",
    "SystemRoot must be an absolute Windows path for command-script execution",
  );
  invariant(
    typeof executable === "string" && path.win32.isAbsolute(executable),
    "windows_command_path_invalid",
    "Windows command scripts must use an absolute approved path",
  );
  const command = [
    escapeWindowsCommandMeta(executable),
    ...args.map((argument) => escapeWindowsCommandArgument(String(argument))),
  ].join(" ");
  return {
    executable: path.win32.join(env.SystemRoot, "System32", "cmd.exe"),
    args: ["/d", "/s", "/v:off", "/c", `"${command}"`],
    windowsVerbatimArguments: true,
  };
}

export async function captureVersion(
  executable,
  args = ["--version"],
  timeoutMs = 5_000,
  options = {},
) {
  if (!executable) return null;
  const environment = minimalCommandEnvironment({}, options.env);
  const invocation = commandInvocation(executable, args, {
    env: environment,
    platform: options.platform,
  });
  const result = await runBoundedCommand(invocation.executable, invocation.args, {
    displayExecutable: executable,
    env: environment,
    failureCode: "version_failed",
    label: "Version command",
    maxBytes: 16_384,
    timeoutCode: "version_timeout",
    timeoutMs,
    windowsVerbatimArguments: invocation.windowsVerbatimArguments,
  });
  return (result.stdout || result.stderr).trim().split(/\r?\n/, 1)[0] || null;
}

export function minimalCommandEnvironment(extra = {}, source = process.env) {
  const allowed = [
    "HOME",
    "LOCALAPPDATA",
    "PATH",
    "PATHEXT",
    "SystemDrive",
    "SystemRoot",
    "TEMP",
    "TMP",
    "TMPDIR",
    "USERPROFILE",
    "WINDIR",
  ];
  const env = {};
  for (const key of allowed) {
    if (source?.[key] !== undefined) env[key] = source[key];
  }
  return { ...env, ...extra };
}

export function parsePythonVersion(value) {
  const match = /Python\s+(\d+)\.(\d+)\.(\d+)/i.exec(value || "");
  if (!match) return null;
  return match.slice(1).map(Number);
}

export function compareVersion(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return Math.sign(delta);
  }
  return 0;
}
