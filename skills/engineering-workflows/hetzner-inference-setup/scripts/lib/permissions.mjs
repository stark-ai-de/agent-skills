import fs from "node:fs";
import path from "node:path";
import {
  pathIdentity,
  powershellCommand,
  pathSegments,
  samePathIdentity,
} from "../../assets/templates/protected-file.mjs";
import { MAX_SECRET_BYTES } from "./constants.mjs";
import { invariant } from "./errors.mjs";
import {
  assertWslSameEnvironmentPath,
  minimalCommandEnvironment,
  resolveExecutable,
} from "./hosts.mjs";
import { assertNoLinkSegments, assertWithin } from "./path-proof.mjs";
import { runBoundedCommand } from "./subprocess.mjs";

const WINDOWS_MODIFY_RIGHTS = 197055n;
const WINDOWS_INHERIT_ONLY_FLAG = 2n;
const PERMISSION_TERMINATION_GRACE_MS = 250;
const PERMISSION_FORCE_KILL_GRACE_MS = 250;

async function run(executable, args, options = {}) {
  const result = await runBoundedCommand(
    executable,
    args,
    {
      deadlineAt: options.deadlineAt,
      deadlineReserveMs: options.deadlineReserveMs,
      env: minimalCommandEnvironment(options.environment),
      failureCode: "permission_command_failed",
      forceKillGraceMs: PERMISSION_FORCE_KILL_GRACE_MS,
      label: "Permission command",
      maxBytes: 65_536,
      terminationGraceMs: PERMISSION_TERMINATION_GRACE_MS,
      timeoutCode: "permission_command_timeout",
      timeoutMs: permissionCommandTimeout(options),
    },
    { spawn: options.commandSpawn },
  );
  return result.stdout;
}

function permissionCommandTimeout(options = {}) {
  if (options.deadlineAt === undefined || options.deadlineAt === null) return 10_000;
  const remaining = Math.floor(
    Number(options.deadlineAt) -
      Date.now() -
      (options.deadlineReserveMs ?? 0) -
      PERMISSION_TERMINATION_GRACE_MS -
      PERMISSION_FORCE_KILL_GRACE_MS,
  );
  invariant(
    Number.isFinite(remaining) && remaining > 0,
    "permission_command_timeout",
    "Permission command exceeded its lifecycle deadline",
  );
  return Math.max(1, Math.min(2_500, remaining));
}

function assertFreshPathBoundary(target, host, label) {
  assertWslSameEnvironmentPath(target, host, label);
}

async function assertFreshPathSegments(target, host, label) {
  await assertNoLinkSegments(target, {
    assertPathBoundary: async (segment) =>
      assertFreshPathBoundary(segment, host, `${label} segment`),
  });
}

function assertFreshNamedPath(target, host, label, options = {}) {
  for (const segment of pathSegments(target)) {
    assertFreshPathBoundary(segment, host, `${label} segment`);
    let segmentStat;
    try {
      segmentStat = fs.lstatSync(segment, { bigint: true });
    } catch (error) {
      invariant(false, "redirected_path", `Unable to bind ${label} segment: ${segment}`, {
        reason: error?.code ?? "path_inspection_failed",
      });
    }
    invariant(
      !segmentStat.isSymbolicLink(),
      "redirected_path",
      `Refusing symlink or reparse redirect: ${segment}`,
    );
  }
  assertFreshPathBoundary(target, host, label);
  const stat = fs.lstatSync(target, { bigint: true });
  const expectedKind = options.kind ?? "file";
  invariant(
    expectedKind === "directory"
      ? stat.isDirectory() && !stat.isSymbolicLink()
      : stat.isFile() && !stat.isSymbolicLink(),
    expectedKind === "directory" ? "unsafe_directory" : "unsafe_protected_file",
    `Expected protected ${expectedKind}: ${target}`,
  );
  if (options.expectedIdentity) {
    invariant(
      samePathIdentity(options.expectedIdentity, pathIdentity(stat)),
      expectedKind === "directory" ? "unsafe_directory" : "unsafe_protected_file",
      `Protected ${expectedKind} identity changed across an asynchronous permission boundary: ${target}`,
    );
  }
  if (options.requireLocal === true) {
    const realBoundary = fs.realpathSync.native(host.localBoundary);
    const realTarget = fs.realpathSync.native(target);
    assertWithin(realTarget, realBoundary, "Windows protected path");
  }
  return stat;
}

export function parseWhoamiCsv(value) {
  const match = /^"([^"]+)","(S-\d+(?:-\d+)+)"/.exec(value.trim());
  invariant(match, "windows_identity_invalid", "Unable to parse the current Windows identity");
  return { account: match[1], sid: match[2] };
}

async function currentWindowsIdentity(options = {}) {
  const executable = resolveExecutable("whoami", { platform: "win32" });
  invariant(executable, "whoami_missing", "whoami.exe is required to secure Windows credentials");
  return parseWhoamiCsv(await run(executable, ["/user", "/fo", "csv", "/nh"], options));
}

async function windowsAclSnapshot(target, host, label = "protected path", options = {}) {
  const powershell = resolveExecutable("powershell", { platform: "win32" });
  invariant(
    powershell,
    "powershell_missing",
    "Windows PowerShell is required to verify normalized credential ACLs",
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
    "[pscustomobject]@{owner=$owner;protected=$acl.AreAccessRulesProtected;access=$items} | ConvertTo-Json -Compress -Depth 4",
  ].join(";");
  const bound = assertFreshNamedPath(target, host, label, options);
  const command = powershellCommand(script, [target]);
  const output = await run(powershell, command.args, {
    ...options,
    environment: command.environment,
  });
  assertFreshNamedPath(target, host, label, {
    ...options,
    expectedIdentity: options.expectedIdentity ?? pathIdentity(bound),
  });
  invariant(output, "windows_acl_empty", `Credential ACL has no output: ${target}`);
  const parsed = JSON.parse(output);
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
    owner: parsed.owner,
    protected: parsed.protected === true,
    access,
  };
}

function windowsAceAppliesToCurrentObject(entry) {
  return (
    /^\d+$/.test(entry.propagationFlags) &&
    (BigInt(entry.propagationFlags) & WINDOWS_INHERIT_ONLY_FLAG) === 0n
  );
}

function assertWindowsAclRestricted(target, identity, acl) {
  const entries = acl.access;
  invariant(entries.length > 0, "windows_acl_empty", `Protected ACL has no entries: ${target}`);
  const aclValuesAreCanonical = entries.every(
    (entry) =>
      /^\d+$/.test(entry.rights) &&
      /^\d+$/.test(entry.inheritanceFlags) &&
      /^\d+$/.test(entry.propagationFlags),
  );
  const effectiveRights = aclValuesAreCanonical
    ? entries
        .filter(windowsAceAppliesToCurrentObject)
        .reduce((rights, entry) => rights | BigInt(entry.rights), 0n)
    : 0n;
  invariant(
    acl.owner === identity.sid &&
      acl.protected === true &&
      aclValuesAreCanonical &&
      entries.every(
        (entry) =>
          entry.sid === identity.sid && entry.type === "Allow" && entry.inherited === false,
      ) &&
      (effectiveRights & WINDOWS_MODIFY_RIGHTS) === WINDOWS_MODIFY_RIGHTS,
    "windows_acl_broad",
    `Protected path owner, inheritance, or mutation rights are not restricted to the current user: ${target}`,
    {
      entries: entries.map((entry) => ({
        sid: entry.sid,
        type: entry.type,
        inherited: entry.inherited,
        inheritanceFlags: entry.inheritanceFlags,
        propagationFlags: entry.propagationFlags,
        rights: entry.rights,
      })),
      owner: acl.owner,
      protected: acl.protected,
    },
  );
}

export function assertExternalProtectedDirectoryPath(target, host) {
  if (host.platform !== "win32") return null;
  const normalized = path.win32.normalize(target);
  const root = path.win32.parse(normalized).root;
  invariant(
    path.win32.isAbsolute(normalized) && /^[A-Za-z]:\\$/.test(root),
    "windows_external_parent_not_local",
    `External protected directory must use a local Windows drive: ${target}`,
  );
  return root;
}

async function windowsDriveType(root) {
  const powershell = resolveExecutable("powershell", { platform: "win32" });
  invariant(
    powershell,
    "powershell_missing",
    "Windows PowerShell is required to classify external protected drives",
  );
  const script = [
    "$ErrorActionPreference='Stop'",
    "$drive=[System.IO.DriveInfo]::new($args[0])",
    "$drive.DriveType.ToString()",
  ].join(";");
  const command = powershellCommand(script, [root]);
  return (await run(powershell, command.args, { environment: command.environment })).trim();
}

export async function preflightExternalProtectedDirectory(target, host, options = {}) {
  assertWslSameEnvironmentPath(target, host, "external protected directory");
  const root = assertExternalProtectedDirectoryPath(target, host);
  if (root === null) return;
  const driveType = String(await (options.windowsDriveType ?? windowsDriveType)(root)).trim();
  invariant(
    driveType === "Fixed",
    "windows_external_parent_not_local",
    `External protected directory must use a fixed local Windows volume: ${target}`,
    { driveRoot: root, driveType },
  );
}

function directoryBoundary(stat, protection) {
  return {
    kind: "directory",
    identity: {
      birthtimeNs: String(stat.birthtimeNs),
      dev: String(stat.dev),
      ino: String(stat.ino),
    },
    mode: Number(stat.mode & 0o777n),
    protection,
  };
}

export function validProtectedDirectoryBoundaryObservation(observation, host) {
  if (
    observation?.kind !== "directory" ||
    !Number.isInteger(observation.mode) ||
    JSON.stringify(Object.keys(observation).sort()) !==
      JSON.stringify(["identity", "kind", "mode", "protection"]) ||
    JSON.stringify(Object.keys(observation.identity ?? {}).sort()) !==
      JSON.stringify(["birthtimeNs", "dev", "ino"]) ||
    !Object.values(observation.identity).every((value) => /^\d+$/.test(value))
  ) {
    return false;
  }
  const protection = observation.protection;
  if (host.platform !== "win32") {
    return (
      observation.mode === 0o700 &&
      protection?.kind === "posix-owner" &&
      JSON.stringify(Object.keys(protection).sort()) === JSON.stringify(["kind", "uid"]) &&
      /^\d+$/.test(protection.uid)
    );
  }
  if (
    protection?.kind !== "windows-acl" ||
    protection.protected !== true ||
    !/^S-\d+(?:-\d+)+$/.test(protection.owner ?? "") ||
    !Array.isArray(protection.access) ||
    protection.access.length === 0 ||
    JSON.stringify(Object.keys(protection).sort()) !==
      JSON.stringify(["access", "kind", "owner", "protected"])
  ) {
    return false;
  }
  let effectiveRights = 0n;
  for (const entry of protection.access) {
    if (
      JSON.stringify(Object.keys(entry).sort()) !==
        JSON.stringify([
          "inheritanceFlags",
          "inherited",
          "propagationFlags",
          "rights",
          "sid",
          "type",
        ]) ||
      entry.sid !== protection.owner ||
      entry.type !== "Allow" ||
      entry.inherited !== false ||
      !/^\d+$/.test(entry.rights) ||
      !/^\d+$/.test(entry.inheritanceFlags) ||
      !/^\d+$/.test(entry.propagationFlags)
    ) {
      return false;
    }
    if (windowsAceAppliesToCurrentObject(entry)) effectiveRights |= BigInt(entry.rights);
  }
  return (effectiveRights & WINDOWS_MODIFY_RIGHTS) === WINDOWS_MODIFY_RIGHTS;
}

export async function inspectProtectedDirectoryBoundary(target, host, options = {}) {
  assertFreshPathBoundary(target, host, "protected directory");
  if (options.external === true) {
    await preflightExternalProtectedDirectory(target, host, options);
    assertFreshPathBoundary(target, host, "protected directory");
  }
  await assertFreshPathSegments(target, host, "protected directory");
  assertFreshPathBoundary(target, host, "protected directory");
  const before = await fs.promises.lstat(target, { bigint: true });
  invariant(
    before.isDirectory() && !before.isSymbolicLink(),
    "unsafe_directory",
    `Expected protected directory: ${target}`,
  );
  if (host.platform !== "win32") {
    invariant(
      Number(before.mode & 0o777n) === 0o700,
      "unsafe_directory_mode",
      `Directory mode must be 0700: ${target}`,
    );
    if (typeof process.getuid === "function") {
      invariant(
        before.uid === BigInt(process.getuid()),
        "unsafe_directory_owner",
        `Directory is not owned by the current user: ${target}`,
      );
    }
    return directoryBoundary(before, { kind: "posix-owner", uid: String(before.uid) });
  }

  const real = fs.realpathSync.native(target);
  if (options.external === true) {
    await preflightExternalProtectedDirectory(real, host, options);
    assertFreshPathBoundary(target, host, "protected directory");
  } else assertWithin(real, host.localBoundary, "Windows protected directory");
  const expectedIdentity = pathIdentity(before);
  const identity = await currentWindowsIdentity(options);
  assertFreshNamedPath(target, host, "protected directory", {
    expectedIdentity,
    kind: "directory",
    requireLocal: options.external !== true,
  });
  const acl = await windowsAclSnapshot(target, host, "protected directory", {
    ...options,
    expectedIdentity,
    kind: "directory",
    requireLocal: options.external !== true,
  });
  assertWindowsAclRestricted(target, identity, acl);
  await assertFreshPathSegments(target, host, "protected directory");
  assertFreshPathBoundary(target, host, "protected directory");
  const after = await fs.promises.lstat(target, { bigint: true });
  invariant(
    after.isDirectory() &&
      !after.isSymbolicLink() &&
      samePathIdentity(pathIdentity(before), pathIdentity(after)),
    "unsafe_directory",
    `Protected directory changed while its ACL was verified: ${target}`,
  );
  return directoryBoundary(after, { kind: "windows-acl", ...acl });
}

async function normalizeWindowsAcl(target, host, options = {}) {
  const bound = assertFreshNamedPath(target, host, "protected path", options);
  const expectedIdentity = options.expectedIdentity ?? pathIdentity(bound);
  const identity = await currentWindowsIdentity(options);
  await options.afterWindowsIdentity?.({ identity, target });
  const icacls = resolveExecutable("icacls", { platform: "win32" });
  invariant(icacls, "icacls_missing", "icacls.exe is required to secure Windows paths");
  assertFreshNamedPath(target, host, "protected path", {
    ...options,
    expectedIdentity,
  });
  await run(
    icacls,
    [
      target,
      "/inheritance:r",
      "/grant:r",
      `*${identity.sid}:(F)`,
      "/remove:g",
      "*S-1-1-0",
      "*S-1-5-11",
      "*S-1-5-32-545",
    ],
    options,
  );
  assertFreshNamedPath(target, host, "protected path", {
    ...options,
    expectedIdentity,
  });
  return identity;
}

export async function securePathPermissions(target, host, mode = 0o600, options = {}) {
  let verificationOptions = options;
  assertFreshPathBoundary(target, host, "protected file");
  await assertFreshPathSegments(target, host, "protected file");
  const initial = assertFreshNamedPath(target, host, "protected file", {
    ...options,
    kind: "file",
  });
  const expectedIdentity = options.expectedIdentity ?? pathIdentity(initial);
  if (host.platform !== "win32") {
    assertFreshNamedPath(target, host, "protected file", {
      ...options,
      expectedIdentity,
      kind: "file",
    });
    // Atomic writers already fchmod the retained handle. With an expected identity,
    // verify that binding instead of issuing a second named-path mutation.
    if (options.expectedIdentity === undefined) await fs.promises.chmod(target, mode);
  } else {
    await normalizeWindowsAcl(target, host, {
      ...options,
      expectedIdentity,
      kind: "file",
    });
  }
  verificationOptions = { ...options, expectedIdentity };
  await verifyRestrictedFilePermissions(target, host, mode, verificationOptions);
}

export async function verifyRestrictedFilePermissions(target, host, mode = 0o600, options = {}) {
  assertFreshPathBoundary(target, host, "protected file");
  await assertFreshPathSegments(target, host, "protected file");
  assertFreshPathBoundary(target, host, "protected file");
  const stat =
    host.platform === "win32"
      ? assertFreshNamedPath(target, host, "protected file", {
          ...options,
          kind: "file",
        })
      : await fs.promises.lstat(target, { bigint: true });
  invariant(
    stat.isFile() && !stat.isSymbolicLink(),
    "unsafe_protected_file",
    `Expected protected file: ${target}`,
  );
  if (options.expectedIdentity) {
    invariant(
      samePathIdentity(options.expectedIdentity, pathIdentity(stat)),
      "unsafe_protected_file",
      `Protected file identity changed while its permissions were verified: ${target}`,
    );
  }
  if (host.platform !== "win32") {
    invariant(
      Number(stat.mode & 0o777n) === mode,
      "unsafe_file_mode",
      `File mode must be ${mode.toString(8)}: ${target}`,
    );
    if (typeof process.getuid === "function") {
      invariant(
        stat.uid === BigInt(process.getuid()),
        "unsafe_file_owner",
        `File is not owned by the current user: ${target}`,
      );
    }
    return stat;
  }
  const expectedIdentity = options.expectedIdentity ?? pathIdentity(stat);
  const identity = await currentWindowsIdentity(options);
  assertFreshNamedPath(target, host, "protected file", {
    ...options,
    expectedIdentity,
    kind: "file",
  });
  assertWindowsAclRestricted(
    target,
    identity,
    await windowsAclSnapshot(target, host, "protected file", {
      ...options,
      expectedIdentity,
      kind: "file",
    }),
  );
  const after = assertFreshNamedPath(target, host, "protected file", {
    ...options,
    expectedIdentity,
    kind: "file",
  });
  invariant(
    after.isFile() &&
      !after.isSymbolicLink() &&
      samePathIdentity(pathIdentity(stat), pathIdentity(after)),
    "unsafe_protected_file",
    `Protected file changed while its ACL was verified: ${target}`,
  );
  return after;
}

export async function verifyProtectedPermissions(target, host) {
  if (host.platform === "win32") assertWithin(target, host.localBoundary, "Windows secret path");
  const stat = await verifyRestrictedFilePermissions(target, host, 0o600);
  invariant(
    stat.size > 0n && stat.size <= BigInt(MAX_SECRET_BYTES),
    "invalid_secret",
    `Secret has an invalid size: ${target}`,
  );
  return stat;
}

export async function verifyProtectedDirectory(target, host) {
  return await inspectProtectedDirectoryBoundary(target, host);
}

export async function secureDirectoryPermissions(target, host, options = {}) {
  assertFreshPathBoundary(target, host, "protected directory");
  if (options.external === true) {
    await preflightExternalProtectedDirectory(target, host, options);
    assertFreshPathBoundary(target, host, "protected directory");
  }
  await assertFreshPathSegments(target, host, "protected directory");
  if (host.platform !== "win32") {
    assertFreshPathBoundary(target, host, "protected directory");
    await fs.promises.chmod(target, 0o700);
  } else {
    const initial = assertFreshNamedPath(target, host, "protected directory", {
      kind: "directory",
      requireLocal: options.external !== true,
    });
    await normalizeWindowsAcl(target, host, {
      expectedIdentity: pathIdentity(initial),
      kind: "directory",
      requireLocal: options.external !== true,
    });
  }
  await inspectProtectedDirectoryBoundary(target, host, options);
}

export function assertMachineLocalWindowsRoot(host) {
  if (host.platform !== "win32") return;
  invariant(
    process.env.LOCALAPPDATA &&
      path.win32.resolve(host.localBoundary) === path.win32.resolve(process.env.LOCALAPPDATA),
    "windows_root_not_localappdata",
    "Windows configuration must remain under LOCALAPPDATA",
  );
}
