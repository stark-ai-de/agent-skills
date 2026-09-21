import fs from "node:fs";
import path from "node:path";
import { execFile, spawnSync } from "node:child_process";

const MAX_SECRET_BYTES = 8192;
const MAX_WSL_ALIAS_HOPS = 40;
const WINDOWS_INHERIT_ONLY_FLAG = 2n;
const WINDOWS_MODIFY_RIGHTS = 197055n;
const WINDOWS_ACL_TERMINATION_GRACE_MS = 250;
const WINDOWS_ACL_FORCE_KILL_GRACE_MS = 250;

function boundaryError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function decodeMountInfoField(value) {
  return value.replace(/\\([0-7]{3})/gu, (_match, octal) =>
    String.fromCharCode(Number.parseInt(octal, 8)),
  );
}

export function parseCurrentWslWindowsMounts(value) {
  if (typeof value !== "string") {
    throw boundaryError("wsl_mount_table_invalid", "WSL mount metadata must be text");
  }
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
    if (!structurallyValid) {
      throw boundaryError(
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
    }
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
    if (isDrvFs) mounts.add(mountPoint);
  }
  if (!hasRootMount) {
    throw boundaryError(
      "wsl_mount_table_invalid",
      "WSL mount metadata has no structurally valid root mount",
    );
  }
  return [...mounts].sort((left, right) => right.length - left.length || left.localeCompare(right));
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

function currentWslMounts(options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  if (platform !== "linux") {
    return null;
  }
  let isWsl = Boolean(env.WSL_DISTRO_NAME || env.WSL_INTEROP || options.isWsl);
  if (!isWsl) {
    try {
      const osRelease =
        options.osReleaseProvider?.() ??
        options.osRelease ??
        (options.readOsReleaseSync ?? fs.readFileSync)("/proc/sys/kernel/osrelease", "utf8");
      isWsl = /(?:microsoft|wsl)/iu.test(String(osRelease));
    } catch {
      isWsl = false;
    }
  }
  if (!isWsl) return null;
  let value;
  try {
    value =
      options.mountInfoProvider?.() ??
      options.mountInfo ??
      (options.readFileSync ?? fs.readFileSync)("/proc/self/mountinfo", "utf8");
  } catch (error) {
    throw boundaryError(
      "wsl_mount_table_unavailable",
      "Unable to read WSL mount metadata before classifying a protected path",
      { reason: error?.code ?? "mountinfo_read_failed" },
    );
  }
  return parseCurrentWslWindowsMounts(value);
}

function assertNotWslWindowsMounted(target, label, mounts) {
  const mountedAt = mounts.find((mountPoint) => pathContains(mountPoint, target));
  if (mountedAt !== undefined) {
    throw boundaryError(
      "wsl_cross_boundary_path",
      `${label} must remain inside the selected WSL distribution: ${target}`,
      { label, mountPoint: mountedAt, path: target },
    );
  }
}

function inspectCurrentWslAliases(target, label, mounts, options) {
  const lstatSync = options.lstatSync ?? fs.lstatSync;
  const readlinkSync = options.readlinkSync ?? fs.readlinkSync;
  let pending = path.posix.normalize(target);
  const visited = new Set();
  for (let hop = 0; hop <= MAX_WSL_ALIAS_HOPS; hop += 1) {
    assertNotWslWindowsMounted(pending, label, mounts);
    if (visited.has(pending)) {
      throw boundaryError(
        "wsl_path_alias_cycle",
        `${label} contains a cyclic path alias: ${target}`,
      );
    }
    visited.add(pending);
    const parsed = path.posix.parse(pending);
    const parts = path.posix.relative(parsed.root, pending).split(path.posix.sep).filter(Boolean);
    let current = parsed.root;
    let redirected = false;
    for (let index = 0; index < parts.length; index += 1) {
      current = path.posix.join(current, parts[index]);
      assertNotWslWindowsMounted(current, label, mounts);
      let stat;
      try {
        stat = lstatSync(current);
      } catch (error) {
        if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return pending;
        throw boundaryError(
          "wsl_path_classification_failed",
          `Unable to classify ${label} without following an unsafe path: ${target}`,
          { reason: error?.code ?? "path_inspection_failed" },
        );
      }
      if (!stat.isSymbolicLink()) continue;
      let linkTarget;
      try {
        linkTarget = readlinkSync(current);
      } catch (error) {
        throw boundaryError(
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
  throw boundaryError(
    "wsl_path_alias_limit",
    `${label} exceeds the safe path-alias limit: ${target}`,
  );
}

export function assertCurrentWslPath(target, label = "Path", options = {}) {
  const mounts = currentWslMounts(options);
  if (mounts === null) return target;
  if (typeof target !== "string" || !path.posix.isAbsolute(target)) {
    throw boundaryError("wsl_path_invalid", `${label} must be an absolute WSL path`);
  }
  inspectCurrentWslAliases(target, label, mounts, options);
  return target;
}

export function assertCurrentWslOwnedNamespace(target, label = "Namespace", options = {}) {
  const mounts = currentWslMounts(options);
  if (mounts === null) return target;
  if (typeof target !== "string" || !path.posix.isAbsolute(target)) {
    throw boundaryError("wsl_path_invalid", `${label} must be an absolute WSL path`);
  }
  const nestedMount = mounts.find((mountPoint) => pathContains(target, mountPoint));
  if (nestedMount !== undefined) {
    throw boundaryError(
      "wsl_cross_boundary_path",
      `${label} intersects a Windows-mounted WSL path: ${nestedMount}`,
      { label, mountPoint: nestedMount, path: target },
    );
  }
  const resolved = inspectCurrentWslAliases(target, label, mounts, options);
  const resolvedNestedMount = mounts.find((mountPoint) => pathContains(resolved, mountPoint));
  if (resolvedNestedMount !== undefined) {
    throw boundaryError(
      "wsl_cross_boundary_path",
      `${label} resolves to a namespace containing a Windows-mounted WSL path: ${resolvedNestedMount}`,
      { label, mountPoint: resolvedNestedMount, path: target, resolvedPath: resolved },
    );
  }
  return target;
}

export function pathSegments(target) {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  const parts = path.relative(parsed.root, resolved).split(path.sep).filter(Boolean);
  const segments = [parsed.root];
  for (const part of parts) segments.push(path.join(segments.at(-1), part));
  return segments;
}

export function pathIdentity(stat) {
  return { birthtimeNs: stat.birthtimeNs, dev: stat.dev, ino: stat.ino };
}

export function samePathIdentity(left, right) {
  return left.birthtimeNs === right.birthtimeNs && left.dev === right.dev && left.ino === right.ino;
}

export function isRegularFileStat(stat) {
  return stat.isFile() && !stat.isSymbolicLink();
}

export function isDirectoryStat(stat) {
  return stat.isDirectory() && !stat.isSymbolicLink();
}

function sameSecretSnapshot(left, right) {
  return (
    samePathIdentity(pathIdentity(left), pathIdentity(right)) &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs
  );
}

export function assertNoRedirects(target, options = {}) {
  for (const segment of pathSegments(target)) {
    options.assertPathBoundary?.(segment);
    const stat = fs.lstatSync(segment);
    if (stat.isSymbolicLink()) throw new Error(`redirected path segment: ${segment}`);
  }
}

function windowsAclCommand(target, timeout = 10_000) {
  const executable = path.join(
    process.env.SystemRoot || process.env.WINDIR || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const script = [
    "$ErrorActionPreference='Stop'",
    "$acl=Get-Acl -LiteralPath $args[0]",
    "$owner=$acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value",
    "$items=@($acl.Access | ForEach-Object {",
    "  $sid=$_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value",
    "  $rights=([int64]$_.FileSystemRights).ToString()",
    "  $inheritanceFlags=([int64]$_.InheritanceFlags).ToString()",
    "  $propagationFlags=([int64]$_.PropagationFlags).ToString()",
    "  [pscustomobject]@{sid=$sid;type=$_.AccessControlType.ToString();inherited=$_.IsInherited;rights=$rights;inheritanceFlags=$inheritanceFlags;propagationFlags=$propagationFlags}",
    "})",
    "$current=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value",
    "[pscustomobject]@{owner=$owner;current=$current;protected=$acl.AreAccessRulesProtected;access=$items} | ConvertTo-Json -Compress -Depth 4",
  ].join(";");
  return {
    args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script, target],
    executable,
    options: {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        WINDIR: process.env.WINDIR,
      },
      maxBuffer: 65_536,
      timeout,
      windowsHide: true,
    },
  };
}

function boundedAsyncTimeout(options = {}, maximum = 2_500) {
  if (options.deadlineAt === undefined || options.deadlineAt === null) return maximum;
  const remaining = Math.floor(
    Number(options.deadlineAt) -
      Date.now() -
      (options.deadlineReserveMs ?? 0) -
      WINDOWS_ACL_TERMINATION_GRACE_MS -
      WINDOWS_ACL_FORCE_KILL_GRACE_MS,
  );
  if (!Number.isFinite(remaining) || remaining <= 0) {
    throw new Error("protected Windows ACL operation exceeded its lifecycle deadline");
  }
  return Math.max(1, Math.min(maximum, remaining));
}

function parseWindowsAclSnapshot(value) {
  const parsed = JSON.parse(value);
  const access = (
    Array.isArray(parsed.access) ? parsed.access : parsed.access ? [parsed.access] : []
  )
    .map((entry) => ({
      inherited: entry.inherited === true,
      inheritanceFlags: String(entry.inheritanceFlags),
      propagationFlags: String(entry.propagationFlags),
      rights: String(entry.rights),
      sid: entry.sid,
      type: entry.type,
    }))
    .sort((left, right) =>
      `${left.sid}\0${left.type}\0${left.inherited}\0${left.inheritanceFlags}\0${left.propagationFlags}\0${left.rights}`.localeCompare(
        `${right.sid}\0${right.type}\0${right.inherited}\0${right.inheritanceFlags}\0${right.propagationFlags}\0${right.rights}`,
      ),
    );
  return {
    access,
    current: parsed.current,
    owner: parsed.owner,
    protected: parsed.protected === true,
  };
}

function windowsAclSnapshot(target, options = {}) {
  assertProtectedPathBoundary(target, "protected Windows path", options);
  const command = windowsAclCommand(target);
  const result = spawnSync(command.executable, command.args, command.options);
  if (result.status !== 0) throw new Error("unable to verify Windows credential ACL");
  return parseWindowsAclSnapshot(result.stdout);
}

function windowsAclSnapshotAsync(target, options = {}) {
  assertProtectedPathBoundary(target, "protected Windows path", options);
  const command = windowsAclCommand(target, boundedAsyncTimeout(options));
  return executeFileAsync(command, "unable to verify Windows credential ACL", options).then(
    (stdout) => {
      try {
        return parseWindowsAclSnapshot(stdout);
      } catch {
        throw new Error("unable to verify Windows credential ACL");
      }
    },
  );
}

function secureWindowsAclCommand(target, timeout = 2_500) {
  const executable = path.join(
    process.env.SystemRoot || process.env.WINDIR || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const script = [
    "$ErrorActionPreference='Stop'",
    "$current=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value",
    "$icacls=Join-Path $env:SystemRoot 'System32\\icacls.exe'",
    "& $icacls $args[0] '/inheritance:r' '/grant:r' ('*'+$current+':(F)') '/remove:g' '*S-1-1-0' '*S-1-5-11' '*S-1-5-32-545' | Out-Null",
    "if($LASTEXITCODE -ne 0){throw 'icacls failed'}",
    "$acl=Get-Acl -LiteralPath $args[0]",
    "$owner=$acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value",
    "$items=@($acl.Access | ForEach-Object {",
    "  $sid=$_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value",
    "  $rights=([int64]$_.FileSystemRights).ToString()",
    "  $inheritanceFlags=([int64]$_.InheritanceFlags).ToString()",
    "  $propagationFlags=([int64]$_.PropagationFlags).ToString()",
    "  [pscustomobject]@{sid=$sid;type=$_.AccessControlType.ToString();inherited=$_.IsInherited;rights=$rights;inheritanceFlags=$inheritanceFlags;propagationFlags=$propagationFlags}",
    "})",
    "[pscustomobject]@{owner=$owner;current=$current;protected=$acl.AreAccessRulesProtected;access=$items} | ConvertTo-Json -Compress -Depth 4",
  ].join(";");
  return {
    args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script, target],
    executable,
    options: {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        WINDIR: process.env.WINDIR,
      },
      maxBuffer: 65_536,
      timeout,
      windowsHide: true,
    },
  };
}

async function secureWindowsAclAsync(target, options = {}) {
  assertProtectedPathBoundary(target, "protected Windows path", options);
  const stdout = await executeFileAsync(
    secureWindowsAclCommand(target, boundedAsyncTimeout(options)),
    "unable to secure and verify Windows process state ACL",
    options,
  );
  try {
    return parseWindowsAclSnapshot(stdout);
  } catch {
    throw new Error("unable to secure and verify Windows process state ACL");
  }
}

function childTerminal(child) {
  return (
    Number.isInteger(child?.exitCode) ||
    (child?.signalCode !== null && child?.signalCode !== undefined)
  );
}

export function executeFileAsync(command, message, options = {}) {
  return new Promise((resolve, reject) => {
    const hasDeadline = options.deadlineAt !== undefined && options.deadlineAt !== null;
    const completionDeadlineAt = hasDeadline
      ? Number(options.deadlineAt) - (options.deadlineReserveMs ?? 0)
      : Number.POSITIVE_INFINITY;
    const runtimeTimeoutMs = Number(command.options.timeout);
    const startedAt = Date.now();
    const boundedRuntimeTimeoutMs = hasDeadline
      ? Math.min(
          runtimeTimeoutMs,
          completionDeadlineAt -
            startedAt -
            WINDOWS_ACL_TERMINATION_GRACE_MS -
            WINDOWS_ACL_FORCE_KILL_GRACE_MS,
        )
      : runtimeTimeoutMs;
    if (
      !Number.isFinite(runtimeTimeoutMs) ||
      runtimeTimeoutMs <= 0 ||
      !Number.isFinite(boundedRuntimeTimeoutMs) ||
      boundedRuntimeTimeoutMs <= 0 ||
      (hasDeadline && (!Number.isFinite(completionDeadlineAt) || completionDeadlineAt <= startedAt))
    ) {
      reject(new Error(`${message}: lifecycle deadline exceeded`));
      return;
    }

    const commandOptions = { ...command.options };
    delete commandOptions.timeout;
    let child = null;
    let callbackResult = null;
    let closed = false;
    let failure = null;
    let settled = false;
    let terminating = false;
    let timeoutTimer = null;
    let escalationTimer = null;
    let confirmationTimer = null;

    const clearTimers = () => {
      clearTimeout(timeoutTimer);
      clearTimeout(escalationTimer);
      clearTimeout(confirmationTimer);
    };
    const settle = (operation, value) => {
      if (settled) return;
      settled = true;
      clearTimers();
      operation(value);
    };
    const finishFromCallback = () => {
      if (!callbackResult || !closed) return;
      if (failure || callbackResult.error) {
        settle(reject, failure ?? new Error(message));
        return;
      }
      if (hasDeadline && Date.now() >= completionDeadlineAt) {
        settle(reject, new Error(`${message}: lifecycle deadline exceeded`));
        return;
      }
      settle(resolve, callbackResult.stdout);
    };
    const rejectUnconfirmedTermination = () => {
      const error = boundaryError(
        "protected_acl_termination_unconfirmed",
        `${message}: ACL subprocess termination was not confirmed`,
        { cleanupSafe: false },
      );
      settle(reject, error);
      child?.unref?.();
      child?.stdout?.destroy?.();
      child?.stderr?.destroy?.();
    };
    const terminate = (reason) => {
      if (settled || terminating) return;
      failure ??= reason;
      if (closed) {
        settle(reject, failure);
        return;
      }
      terminating = true;
      try {
        child?.kill?.("SIGTERM");
      } catch {
        // A bounded SIGKILL attempt and close confirmation still follow.
      }
      const escalationDelay = Math.max(
        0,
        Math.min(
          WINDOWS_ACL_TERMINATION_GRACE_MS,
          completionDeadlineAt - Date.now() - WINDOWS_ACL_FORCE_KILL_GRACE_MS,
        ),
      );
      escalationTimer = setTimeout(() => {
        if (settled) return;
        if (!childTerminal(child)) {
          try {
            child?.kill?.("SIGKILL");
          } catch {
            // The bounded close-confirmation timer below remains authoritative.
          }
        }
        const confirmationDelay = Math.max(
          0,
          Math.min(WINDOWS_ACL_FORCE_KILL_GRACE_MS, completionDeadlineAt - Date.now()),
        );
        confirmationTimer = setTimeout(rejectUnconfirmedTermination, confirmationDelay);
      }, escalationDelay);
    };

    try {
      child = (options.execFile ?? execFile)(
        command.executable,
        command.args,
        commandOptions,
        (error, stdout) => {
          callbackResult = { error, stdout };
          if (error && !failure) {
            if (closed || childTerminal(child)) failure = new Error(message);
            else terminate(new Error(message));
          }
          finishFromCallback();
        },
      );
    } catch (error) {
      reject(error);
      return;
    }
    if (!child || typeof child.once !== "function") {
      if (callbackResult) finishFromCallback();
      if (!settled) reject(new Error(`${message}: ACL subprocess handle was unavailable`));
      return;
    }
    child.once("error", (error) => {
      if (!failure) terminate(new Error(`${message}: ${error.message}`));
    });
    child.once("close", () => {
      closed = true;
      if (failure) {
        settle(reject, failure);
        return;
      }
      finishFromCallback();
    });
    timeoutTimer = setTimeout(
      () => terminate(new Error(`${message}: lifecycle deadline exceeded`)),
      boundedRuntimeTimeoutMs,
    );
  });
}

export function secureCurrentUserFile(target, mode = 0o600, options = {}) {
  assertProtectedPathSegments(target, "protected process state", options);
  if (process.platform !== "win32") {
    assertProtectedPathBoundary(target, "protected process state", options);
    fs.chmodSync(target, mode);
    return;
  }
  const snapshot = windowsAclSnapshot(target, options);
  const executable = path.join(
    process.env.SystemRoot || process.env.WINDIR || "C:\\Windows",
    "System32",
    "icacls.exe",
  );
  assertProtectedPathBoundary(target, "protected process state", options);
  const result = spawnSync(
    executable,
    [
      target,
      "/inheritance:r",
      "/grant:r",
      `*${snapshot.current}:(F)`,
      "/remove:g",
      "*S-1-1-0",
      "*S-1-5-11",
      "*S-1-5-32-545",
    ],
    { encoding: "utf8", maxBuffer: 65_536, timeout: 10_000, windowsHide: true },
  );
  if (result.status !== 0) throw new Error("unable to secure Windows process state ACL");
}

export function secureAndVerifyCurrentUserFile(target, mode = 0o600, options = {}) {
  secureCurrentUserFile(target, mode, options);
  assertProtectedPathSegments(target, "protected process state", options);
  assertProtectedPathBoundary(target, "protected process state", options);
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("protected process state must be a regular file");
  }
  if (process.platform !== "win32") {
    if ((stat.mode & 0o777) !== mode) {
      throw new Error(`protected process state mode must be ${mode.toString(8)}`);
    }
    if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
      throw new Error("protected process state owner mismatch");
    }
    return;
  }
  const boundary = process.env.LOCALAPPDATA;
  if (!boundary) throw new Error("LOCALAPPDATA is required");
  assertProtectedPathBoundary(target, "protected process state", options);
  const relative = path.relative(path.resolve(boundary), fs.realpathSync.native(target));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("protected process state is outside LOCALAPPDATA");
  }
  assertWindowsRestricted(target, windowsAclSnapshot(target, options));
}

function assertAsyncProtectedFileBinding(target, expectedIdentity, options, phase) {
  assertProtectedPathSegments(target, "protected process state", options);
  assertProtectedPathBoundary(target, "protected process state", options);
  const stat = fs.lstatSync(target, { bigint: true });
  if (!isRegularFileStat(stat) || !samePathIdentity(expectedIdentity, pathIdentity(stat))) {
    throw new Error(`protected process state changed ${phase}`);
  }
  const boundary = process.env.LOCALAPPDATA;
  if (!boundary) throw new Error("LOCALAPPDATA is required");
  const relative = path.relative(fs.realpathSync.native(boundary), fs.realpathSync.native(target));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("protected process state is outside LOCALAPPDATA");
  }
  return stat;
}

export async function secureAndVerifyCurrentUserFileAsync(target, mode = 0o600, options = {}) {
  if (process.platform !== "win32") {
    secureAndVerifyCurrentUserFile(target, mode, options);
    return;
  }
  assertProtectedPathSegments(target, "protected process state", options);
  assertProtectedPathBoundary(target, "protected process state", options);
  const initial = fs.lstatSync(target, { bigint: true });
  if (!isRegularFileStat(initial)) {
    throw new Error("protected process state must be a regular file");
  }
  const expectedIdentity = options.expectedIdentity ?? pathIdentity(initial);
  if (!samePathIdentity(expectedIdentity, pathIdentity(initial))) {
    throw new Error("protected process state changed before its ACL was inspected");
  }
  assertAsyncProtectedFileBinding(target, expectedIdentity, options, "before its ACL was applied");
  const finalAcl = await (options.secureWindowsAclAsync ?? secureWindowsAclAsync)(target, options);
  assertAsyncProtectedFileBinding(
    target,
    expectedIdentity,
    options,
    "while its ACL was applied and verified",
  );
  assertWindowsRestricted(target, finalAcl);
}

export async function verifyCurrentUserFileAsync(target, mode = 0o600, options = {}) {
  if (!path.isAbsolute(target)) throw new Error("protected process-state path must be absolute");
  assertProtectedPathSegments(target, "protected process state", options);
  assertProtectedPathBoundary(target, "protected process state", options);
  const initial = fs.lstatSync(target, { bigint: true });
  if (!isRegularFileStat(initial)) {
    throw new Error("protected process state must be a regular file");
  }
  const expectedIdentity = options.expectedIdentity ?? pathIdentity(initial);
  if (!samePathIdentity(expectedIdentity, pathIdentity(initial))) {
    throw new Error("protected process state changed before its protection was inspected");
  }
  if (process.platform !== "win32") {
    if (Number(initial.mode & 0o777n) !== mode) {
      throw new Error(`protected process state mode must be ${mode.toString(8)}`);
    }
    if (typeof process.getuid === "function" && initial.uid !== BigInt(process.getuid())) {
      throw new Error("protected process state owner mismatch");
    }
    return initial;
  }
  assertAsyncProtectedFileBinding(
    target,
    expectedIdentity,
    options,
    "before its ACL was inspected",
  );
  const acl = await (options.windowsAclSnapshotAsync ?? windowsAclSnapshotAsync)(target, options);
  const after = assertAsyncProtectedFileBinding(
    target,
    expectedIdentity,
    options,
    "while its ACL was inspected",
  );
  assertWindowsRestricted(target, acl);
  return after;
}

function assertWindowsRestricted(target, acl) {
  const access = Array.isArray(acl.access) ? acl.access : acl.access ? [acl.access] : [];
  const aclValuesAreCanonical = access.every(
    (entry) =>
      /^\d+$/.test(String(entry.rights)) &&
      /^\d+$/.test(String(entry.inheritanceFlags)) &&
      /^\d+$/.test(String(entry.propagationFlags)),
  );
  const effectiveRights = aclValuesAreCanonical
    ? access
        .filter(
          (entry) => (BigInt(String(entry.propagationFlags)) & WINDOWS_INHERIT_ONLY_FLAG) === 0n,
        )
        .reduce((rights, entry) => rights | BigInt(String(entry.rights)), 0n)
    : 0n;
  if (
    acl.owner !== acl.current ||
    acl.protected !== true ||
    access.length === 0 ||
    !aclValuesAreCanonical ||
    (effectiveRights & WINDOWS_MODIFY_RIGHTS) !== WINDOWS_MODIFY_RIGHTS ||
    access.some(
      (entry) => entry.sid !== acl.current || entry.type !== "Allow" || entry.inherited !== false,
    )
  ) {
    throw new Error(`${target} ACL is not restricted to the current user`);
  }
}

export function secureCurrentUserDirectory(target, options = {}) {
  assertProtectedPathSegments(target, "process-state directory", options);
  assertProtectedPathBoundary(target, "process-state directory", options);
  const stat = fs.lstatSync(target);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("process-state directory is unsafe");
  }
  secureCurrentUserFile(target, 0o700, options);
  if (process.platform !== "win32") {
    assertProtectedPathBoundary(target, "process-state directory", options);
    const secured = fs.lstatSync(target);
    if ((secured.mode & 0o777) !== 0o700) {
      throw new Error("process-state directory mode must be 0700");
    }
    if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
      throw new Error("process-state directory owner mismatch");
    }
  } else {
    const boundary = process.env.LOCALAPPDATA;
    if (!boundary) throw new Error("LOCALAPPDATA is required");
    assertProtectedPathBoundary(target, "process-state directory", options);
    const relative = path.relative(path.resolve(boundary), fs.realpathSync.native(target));
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("process-state directory is outside LOCALAPPDATA");
    }
    assertWindowsRestricted(target, windowsAclSnapshot(target, options));
  }
}

function currentDirectoryBoundary(stat, protection) {
  return {
    identity: {
      birthtimeNs: String(stat.birthtimeNs),
      dev: String(stat.dev),
      ino: String(stat.ino),
    },
    kind: "directory",
    mode: Number(stat.mode & 0o777n),
    protection,
  };
}

export function inspectCurrentUserDirectoryBoundary(
  target,
  label = "protected directory",
  options = {},
) {
  if (!path.isAbsolute(target)) throw new Error(`${label} path must be absolute`);
  const boundaryOptions = options.wslBoundaryOptions ?? options.wsl ?? options;
  assertCurrentWslOwnedNamespace(target, label, boundaryOptions);
  assertNoRedirects(target, {
    assertPathBoundary: (segment) =>
      assertCurrentWslPath(segment, `${label} segment`, boundaryOptions),
  });
  assertCurrentWslPath(target, label, boundaryOptions);
  const before = fs.lstatSync(target, { bigint: true });
  if (!isDirectoryStat(before)) throw new Error(`${label} is not a protected directory`);

  if (process.platform !== "win32") {
    if (Number(before.mode & 0o777n) !== 0o700) throw new Error(`${label} mode must be 0700`);
    if (typeof process.getuid === "function" && before.uid !== BigInt(process.getuid())) {
      throw new Error(`${label} owner mismatch`);
    }
    return currentDirectoryBoundary(before, {
      kind: "posix-owner",
      uid: String(before.uid),
    });
  }

  const env = options.env ?? process.env;
  const localBoundary = env.LOCALAPPDATA;
  if (!localBoundary) throw new Error("LOCALAPPDATA is required");
  assertCurrentWslPath(target, label, boundaryOptions);
  const real = fs.realpathSync.native(target);
  const relative = path.relative(path.resolve(localBoundary), real);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} is outside LOCALAPPDATA`);
  }
  const acl = (options.windowsAclSnapshot ?? windowsAclSnapshot)(target, options);
  assertWindowsRestricted(target, acl);
  assertCurrentWslPath(target, label, boundaryOptions);
  const after = fs.lstatSync(target, { bigint: true });
  if (!isDirectoryStat(after) || !samePathIdentity(pathIdentity(before), pathIdentity(after))) {
    throw new Error(`${label} changed while its protection was verified`);
  }
  return currentDirectoryBoundary(after, {
    access: acl.access,
    kind: "windows-acl",
    owner: acl.owner,
    protected: acl.protected,
  });
}

export async function inspectCurrentUserDirectoryBoundaryAsync(
  target,
  label = "protected directory",
  options = {},
) {
  if (process.platform !== "win32") {
    return inspectCurrentUserDirectoryBoundary(target, label, options);
  }
  if (!path.isAbsolute(target)) throw new Error(`${label} path must be absolute`);
  const boundaryOptions = options.wslBoundaryOptions ?? options.wsl ?? options;
  assertCurrentWslOwnedNamespace(target, label, boundaryOptions);
  assertProtectedPathSegments(target, label, options);
  assertProtectedPathBoundary(target, label, options);
  const before = fs.lstatSync(target, { bigint: true });
  if (!isDirectoryStat(before)) throw new Error(`${label} is not a protected directory`);

  const env = options.env ?? process.env;
  const localBoundary = env.LOCALAPPDATA;
  if (!localBoundary) throw new Error("LOCALAPPDATA is required");
  assertProtectedPathBoundary(target, label, options);
  const real = fs.realpathSync.native(target);
  const relative = path.relative(fs.realpathSync.native(localBoundary), real);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} is outside LOCALAPPDATA`);
  }
  const acl = await (options.windowsAclSnapshotAsync ?? windowsAclSnapshotAsync)(target, options);
  assertProtectedPathSegments(target, label, options);
  assertProtectedPathBoundary(target, label, options);
  const confirmedReal = fs.realpathSync.native(target);
  const confirmedRelative = path.relative(fs.realpathSync.native(localBoundary), confirmedReal);
  if (confirmedRelative.startsWith("..") || path.isAbsolute(confirmedRelative)) {
    throw new Error(`${label} is outside LOCALAPPDATA`);
  }
  const after = fs.lstatSync(target, { bigint: true });
  if (!isDirectoryStat(after) || !samePathIdentity(pathIdentity(before), pathIdentity(after))) {
    throw new Error(`${label} changed while its protection was verified`);
  }
  assertWindowsRestricted(target, acl);
  return currentDirectoryBoundary(after, {
    access: acl.access,
    kind: "windows-acl",
    owner: acl.owner,
    protected: acl.protected,
  });
}

function assertProtectedPathBoundary(target, label, options = {}) {
  return assertCurrentWslPath(target, label, options.wslBoundaryOptions ?? options.wsl ?? {});
}

function assertProtectedPathSegments(target, label, options = {}) {
  const boundaryOptions = options.wslBoundaryOptions ?? options.wsl ?? {};
  assertNoRedirects(target, {
    assertPathBoundary: (segment) =>
      assertCurrentWslPath(segment, `${label} segment`, boundaryOptions),
  });
}

export function verifyProtectedFile(target, label = "credential", options = {}) {
  if (!path.isAbsolute(target)) throw new Error(`${label} path must be absolute`);
  assertProtectedPathBoundary(target, label, options);
  assertProtectedPathSegments(target, label, options);
  assertProtectedPathBoundary(target, label, options);
  const stat = fs.lstatSync(target, { bigint: true });
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size < 1n ||
    stat.size > BigInt(MAX_SECRET_BYTES)
  ) {
    throw new Error(`${label} is not a bounded regular file`);
  }
  if (process.platform !== "win32") {
    if (Number(stat.mode & 0o777n) !== 0o600) throw new Error(`${label} mode must be 0600`);
    if (typeof process.getuid === "function" && stat.uid !== BigInt(process.getuid())) {
      throw new Error(`${label} owner mismatch`);
    }
  } else {
    const boundary = process.env.LOCALAPPDATA;
    if (!boundary) throw new Error("LOCALAPPDATA is required");
    assertProtectedPathBoundary(target, label, options);
    const relative = path.relative(path.resolve(boundary), fs.realpathSync.native(target));
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`${label} is outside LOCALAPPDATA`);
    }
    const acl = windowsAclSnapshot(target, options);
    assertWindowsRestricted(label, acl);
  }
  assertProtectedPathBoundary(target, label, options);
  const after = fs.lstatSync(target, { bigint: true });
  if (!after.isFile() || after.isSymbolicLink() || !sameSecretSnapshot(stat, after)) {
    throw new Error(`${label} changed while its protection was verified`);
  }
  return after;
}

export function readProtectedSecret(target, label = "credential", options = {}) {
  const verified = verifyProtectedFile(target, label, options);
  options.afterVerify?.({ target });
  assertProtectedPathBoundary(target, label, options);
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  const descriptor = fs.openSync(target, flags);
  try {
    const opened = fs.fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || !sameSecretSnapshot(verified, opened)) {
      throw new Error(`${label} changed while opened`);
    }
    const protectedBeforeRead = verifyProtectedFile(target, label, options);
    const openedBeforeRead = fs.fstatSync(descriptor, { bigint: true });
    if (
      !sameSecretSnapshot(verified, protectedBeforeRead) ||
      !sameSecretSnapshot(verified, openedBeforeRead)
    ) {
      throw new Error(`${label} changed before read`);
    }
    const data = Buffer.alloc(Number(openedBeforeRead.size));
    assertProtectedPathBoundary(target, label, options);
    if (fs.readSync(descriptor, data, 0, data.length, 0) !== data.length) {
      throw new Error(`${label} changed while read`);
    }
    options.afterRead?.({ target });
    const protectedAfterRead = verifyProtectedFile(target, label, options);
    const openedAfterRead = fs.fstatSync(descriptor, { bigint: true });
    if (
      !sameSecretSnapshot(verified, protectedAfterRead) ||
      !sameSecretSnapshot(verified, openedAfterRead)
    ) {
      throw new Error(`${label} changed while read`);
    }
    const confirmation = Buffer.alloc(data.length);
    assertProtectedPathBoundary(target, label, options);
    const confirmed = fs.readSync(descriptor, confirmation, 0, confirmation.length, 0);
    const finalProtected = verifyProtectedFile(target, label, options);
    const finalOpened = fs.fstatSync(descriptor, { bigint: true });
    if (
      confirmed !== confirmation.length ||
      !data.equals(confirmation) ||
      !sameSecretSnapshot(verified, finalProtected) ||
      !sameSecretSnapshot(verified, finalOpened)
    ) {
      throw new Error(`${label} changed before its value was consumed`);
    }
    const rawValue = data.toString("utf8");
    // Caller-owned text files may end in one newline; managed credentials stay strict.
    const value = options.allowTrailingNewline === true ? rawValue.replace(/\r?\n$/, "") : rawValue;
    if (!value || value !== value.trim() || /[\r\n\0]/.test(value)) {
      throw new Error(`${label} is malformed`);
    }
    return value;
  } finally {
    fs.closeSync(descriptor);
  }
}

export function readProtectedGatewaySecret(target, label = "gateway credential", options = {}) {
  const value = readProtectedSecret(target, label, { ...options, allowTrailingNewline: false });
  if (!/^sk-[A-Za-z0-9_-]{43}$/.test(value)) {
    throw new Error(`${label} does not match the generated administrative-key format`);
  }
  return value;
}
