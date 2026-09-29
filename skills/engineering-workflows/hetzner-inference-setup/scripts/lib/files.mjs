import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  pathIdentity,
  pathSegments,
  samePathIdentity,
} from "../../assets/templates/protected-file.mjs";
import {
  CREDENTIAL_CONTINUITY_SCHEME,
  MAX_MANAGED_TREE_ENTRIES,
  MAX_SECRET_BYTES,
} from "./constants.mjs";
import { SetupError, invariant } from "./errors.mjs";
import { assertWslSameEnvironmentPath } from "./hosts.mjs";
import { digestJson, sha256, stableJson } from "./json.mjs";
import { assertNoLinkSegments } from "./path-proof.mjs";
import { verifyProtectedPermissions } from "./permissions.mjs";

export { assertNoLinkSegments, assertWithin } from "./path-proof.mjs";

const fsPromises = fs.promises;
const unlinkSync = fs.unlinkSync.bind(fs);
const rmSync = fs.rmSync.bind(fs);
const rmdirSync = fs.rmdirSync.bind(fs);

function modeBits(stat) {
  return stat.mode & 0o777;
}

export async function hashFile(file) {
  const hash = crypto.createHash("sha256");
  await pipeline(fs.createReadStream(file), hash);
  return hash.digest("hex");
}

export async function inspectPath(target, options = {}) {
  try {
    const stat = await fsPromises.lstat(target);
    if (stat.isSymbolicLink()) {
      return {
        kind: "symlink",
        mode: modeBits(stat),
        size: stat.size,
        mtimeMs: Math.trunc(stat.mtimeMs),
      };
    }
    if (stat.isFile()) {
      return {
        kind: "file",
        mode: modeBits(stat),
        size: stat.size,
        mtimeMs: Math.trunc(stat.mtimeMs),
        sha256: options.hash === false ? null : await hashFile(target),
      };
    }
    if (stat.isDirectory()) {
      const entries = options.entries ? (await fsPromises.readdir(target)).sort() : undefined;
      return {
        kind: "directory",
        mode: modeBits(stat),
        mtimeMs: Math.trunc(stat.mtimeMs),
        ...(entries ? { entries } : {}),
      };
    }
    return {
      kind: "other",
      mode: modeBits(stat),
      size: stat.size,
      mtimeMs: Math.trunc(stat.mtimeMs),
    };
  } catch (error) {
    if (error.code === "ENOENT") return { kind: "absent" };
    throw error;
  }
}

export async function inspectPaths(targets) {
  const result = {};
  for (const target of [...new Set(targets)].sort()) result[target] = await inspectPath(target);
  return result;
}

export function observedStateDigest(observations) {
  return digestJson(observations);
}

export async function ensureDirectory(target, mode = 0o700, options = {}) {
  const assertPathBoundary = options.assertPathBoundary ?? options.assertMutationOwned;
  await assertPathBoundary?.(target);
  await assertNoLinkSegments(target, { assertPathBoundary });
  const segments = pathSegments(target);
  const createdSegments = [];
  for (const segment of segments.slice(1)) {
    try {
      await assertPathBoundary?.(segment);
      const stat = await fsPromises.lstat(segment);
      invariant(stat.isDirectory(), "unexpected_path_type", `Expected directory: ${segment}`);
      invariant(
        !stat.isSymbolicLink(),
        "redirected_path",
        `Refusing redirected directory: ${segment}`,
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await assertPathBoundary?.(segment);
      await options.assertMutationOwned?.();
      try {
        await fsPromises.mkdir(segment, { mode });
      } catch (mkdirError) {
        if (mkdirError.code !== "EEXIST") throw mkdirError;
        await assertPathBoundary?.(segment);
        const concurrent = await fsPromises.lstat(segment);
        invariant(
          concurrent.isDirectory() && !concurrent.isSymbolicLink(),
          "unexpected_path_type",
          `Expected concurrently created directory: ${segment}`,
        );
        continue;
      }
      await assertPathBoundary?.(segment);
      const created = await fsPromises.lstat(segment, { bigint: true });
      invariant(
        created.isDirectory() && !created.isSymbolicLink(),
        "unexpected_path_type",
        `Expected created directory: ${segment}`,
      );
      const currentMode = Number(created.mode & 0o777n);
      await options.beforeCreatedDirectoryProtection?.({
        currentMode,
        mode,
        segment,
        target,
      });
      if (process.platform !== "win32" && currentMode !== mode) {
        await assertPathBoundary?.(segment);
        await options.assertMutationOwned?.();
        await fsPromises.chmod(segment, mode);
      }
      await assertPathBoundary?.(segment);
      const protectedStat = await fsPromises.lstat(segment, { bigint: true });
      invariant(
        protectedStat.isDirectory() &&
          !protectedStat.isSymbolicLink() &&
          samePathIdentity(pathIdentity(created), pathIdentity(protectedStat)) &&
          (process.platform === "win32" || Number(protectedStat.mode & 0o777n) === mode),
        "redirected_path",
        `Created directory changed before bootstrap completion: ${segment}`,
      );
      createdSegments.push(path.resolve(segment));
    }
  }
  return {
    createdSegments,
    targetCreated: createdSegments.includes(path.resolve(target)),
  };
}

function regularFileStat(stat) {
  return stat.isFile() && !stat.isSymbolicLink();
}

function directoryStat(stat) {
  return stat.isDirectory() && !stat.isSymbolicLink();
}

function atomicChangedError(target, options = {}, causeCode = undefined) {
  const changedCode = options.expectedParentBoundary
    ? "stale_plan_external_parent"
    : (options.changedCode ?? "atomic_target_changed");
  const label = options.label ?? "Atomic target";
  return new SetupError(changedCode, `${label} parent directory changed: ${path.dirname(target)}`, {
    ...(causeCode ? { causeCode } : {}),
  });
}

function parentChangedCode(options = {}) {
  return options.expectedParentBoundary
    ? "stale_plan_external_parent"
    : (options.changedCode ?? "atomic_target_changed");
}

function expectedParentIdentityMatches(identity, expected) {
  return (
    expected?.kind === "directory" &&
    expected.identity &&
    ["birthtimeNs", "dev", "ino"].every(
      (field) => String(identity[field]) === expected.identity[field],
    )
  );
}

async function openDirectoryAnchor(target, options = {}) {
  const directory = path.dirname(target);
  try {
    await assertNoLinkSegments(directory, {
      assertPathBoundary: options.assertMutationOwned,
    });
    const named = await fsPromises.lstat(directory, { bigint: true });
    invariant(
      directoryStat(named),
      parentChangedCode(options),
      `${options.label ?? "Atomic target"} parent is not a regular directory: ${directory}`,
    );
    const handle = await fsPromises.open(
      directory,
      fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY ?? 0),
    );
    try {
      const opened = await handle.stat({ bigint: true });
      invariant(
        directoryStat(opened) && samePathIdentity(pathIdentity(named), pathIdentity(opened)),
        parentChangedCode(options),
        `${options.label ?? "Atomic target"} parent changed while it was opened: ${directory}`,
      );
      const anchor = {
        boundDirectory: process.platform === "linux" ? `/proc/self/fd/${handle.fd}` : directory,
        directory,
        handle,
        identity: pathIdentity(opened),
      };
      await assertDirectoryAnchor(anchor, target, options);
      return anchor;
    } catch (error) {
      await handle.close().catch(() => {});
      throw error;
    }
  } catch (error) {
    if (
      error instanceof SetupError &&
      [options.changedCode ?? "atomic_target_changed", "stale_plan_external_parent"].includes(
        error.code,
      )
    ) {
      throw error;
    }
    throw atomicChangedError(target, options, error?.code);
  }
}

async function assertDirectoryAnchor(anchor, target, options = {}) {
  try {
    await assertNoLinkSegments(anchor.directory, {
      assertPathBoundary: options.assertMutationOwned,
    });
    const assertCurrentAnchor = async () => {
      const [named, opened] = await Promise.all([
        fsPromises.lstat(anchor.directory, { bigint: true }),
        anchor.handle.stat({ bigint: true }),
      ]);
      invariant(
        directoryStat(named) &&
          directoryStat(opened) &&
          samePathIdentity(anchor.identity, pathIdentity(named)) &&
          samePathIdentity(anchor.identity, pathIdentity(opened)) &&
          (options.expectedParentBoundary === undefined ||
            expectedParentIdentityMatches(anchor.identity, options.expectedParentBoundary)),
        parentChangedCode(options),
        `${options.label ?? "Atomic target"} parent changed during publication: ${anchor.directory}`,
      );
    };
    await assertCurrentAnchor();
    await options.verifyParentBoundary?.({
      directory: anchor.directory,
      identity: anchor.identity,
      target,
    });
    if (options.verifyParentBoundary) {
      await assertNoLinkSegments(anchor.directory, {
        assertPathBoundary: options.assertMutationOwned,
      });
      await assertCurrentAnchor();
    }
  } catch (error) {
    if (
      error instanceof SetupError &&
      [options.changedCode ?? "atomic_target_changed", "stale_plan_external_parent"].includes(
        error.code,
      )
    ) {
      throw error;
    }
    throw atomicChangedError(target, options, error?.code);
  }
}

function anchoredChild(anchor, name) {
  return path.join(anchor.boundDirectory, name);
}

async function assertAnchoredFile(anchor, name, expectedIdentity, target, options = {}) {
  await assertDirectoryAnchor(anchor, target, options);
  let anchored;
  let named;
  try {
    [anchored, named] = await Promise.all([
      fsPromises.lstat(anchoredChild(anchor, name), { bigint: true }),
      fsPromises.lstat(path.join(anchor.directory, name), { bigint: true }),
    ]);
  } catch (error) {
    throw atomicConflict(error, target, options, undefined, true);
  }
  invariant(
    regularFileStat(anchored) &&
      regularFileStat(named) &&
      samePathIdentity(expectedIdentity, pathIdentity(anchored)) &&
      samePathIdentity(expectedIdentity, pathIdentity(named)),
    options.changedCode ?? "atomic_target_changed",
    `${options.label ?? "Atomic target"} temporary identity changed: ${target}`,
  );
}

async function readRegularFileSnapshot(target, options = {}) {
  let namedStat;
  try {
    namedStat = await fsPromises.lstat(target, { bigint: true });
  } catch (error) {
    if (error.code === "ENOENT") return { kind: "absent" };
    throw error;
  }
  const changedCode = options.changedCode ?? "atomic_target_changed";
  const label = options.label ?? "Atomic target";
  invariant(
    regularFileStat(namedStat),
    changedCode,
    `${label} must be absent or a regular file: ${target}`,
  );
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  const handle = await fsPromises.open(target, flags);
  try {
    const before = await handle.stat({ bigint: true });
    invariant(
      regularFileStat(before) && samePathIdentity(pathIdentity(namedStat), pathIdentity(before)),
      changedCode,
      `${label} changed while it was opened: ${target}`,
    );
    const data = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    invariant(
      regularFileStat(after) &&
        samePathIdentity(pathIdentity(before), pathIdentity(after)) &&
        before.size === after.size &&
        before.mtimeNs === after.mtimeNs,
      changedCode,
      `${label} changed while it was read: ${target}`,
    );
    return {
      kind: "file",
      data,
      identity: pathIdentity(after),
      mode: Number(after.mode & 0o777n),
      sha256: sha256(data),
      size: Number(after.size),
    };
  } finally {
    await handle.close();
  }
}

async function publishRecoveryClaim(target, quarantineName, snapshot, options = {}) {
  if (!options.recoveryDirectory || snapshot?.kind !== "file") return null;
  const directory = path.resolve(options.recoveryDirectory);
  invariant(
    directory !== path.resolve(path.dirname(target)),
    "recovery_directory_invalid",
    "Recovery claims must be published outside the mutable target parent",
  );
  const recoveryPath = path.join(directory, quarantineName);
  const verifyRecoveryBoundary = async ({ directory: openedDirectory, identity }) => {
    invariant(
      path.resolve(openedDirectory) === directory,
      "recovery_directory_changed",
      `Recovery publication opened an unexpected directory: ${openedDirectory}`,
    );
    await options.verifyRecoveryDirectory?.({
      directory,
      identity,
      target: recoveryPath,
    });
  };
  const publication = await atomicWrite(recoveryPath, snapshot.data, {
    assertMutationOwned: options.assertMutationOwned,
    beforeRename: async (temporary, binding) => {
      await options.protectRecoveryTemporary?.({
        identity: binding.identity,
        mode: snapshot.mode,
        path: temporary,
        target: recoveryPath,
      });
    },
    changedCode: "recovery_claim_changed",
    expected: { kind: "absent" },
    label: "Recovery claim",
    mode: snapshot.mode,
    requireExistingParent: true,
    verifyParentBoundary: verifyRecoveryBoundary,
  });
  invariant(
    publication.sha256 === snapshot.sha256,
    "recovery_claim_changed",
    `Recovery claim content changed during publication: ${recoveryPath}`,
  );
  await options.verifyRecoveryFile?.({
    identity: publication.identity,
    mode: snapshot.mode,
    path: recoveryPath,
  });
  return {
    identity: publication.identity,
    mode: snapshot.mode,
    path: recoveryPath,
    sha256: publication.sha256,
  };
}

async function removeRecoveryClaim(recovery, options = {}) {
  if (!recovery) return;
  await options.beforeRecoveryRemove?.(recovery);
  const removed = await claimPathForRemoval(
    recovery.path,
    "file",
    async (claimedPath, { namedPath }) => {
      const snapshot = await readRegularFileSnapshot(claimedPath, {
        changedCode: "recovery_claim_changed",
        label: "Recovery claim",
      });
      invariant(
        snapshot.kind === "file" &&
          snapshot.sha256 === recovery.sha256 &&
          samePathIdentity(snapshot.identity, recovery.identity),
        "recovery_claim_changed",
        `Recovery claim changed before cleanup: ${recovery.path}`,
      );
      try {
        await options.verifyRecoveryFile?.({
          identity: snapshot.identity,
          mode: recovery.mode,
          path: namedPath,
        });
      } catch (error) {
        if (error instanceof SetupError && error.code === "lock_ownership_lost") throw error;
        throw new SetupError(
          "recovery_claim_changed",
          `Recovery claim protection changed before cleanup: ${recovery.path}`,
          { reason: error?.code ?? "recovery_protection_unverifiable" },
        );
      }
    },
    unlinkSync,
    {
      assertMutationOwned: options.assertMutationOwned,
      changedCode: "recovery_claim_changed",
      label: "Recovery claim",
      requireExistingParent: true,
      verifyParentBoundary: options.verifyRecoveryDirectory,
    },
  );
  invariant(
    removed,
    "recovery_claim_changed",
    `Recovery claim disappeared before cleanup: ${recovery.path}`,
  );
}

async function verifiedRegularRecoveryPath(candidate, identities, expected = null, options = {}) {
  if (typeof candidate !== "string" || !candidate) return null;
  try {
    const snapshot = await readRegularFileSnapshot(candidate, {
      changedCode: "recovery_claim_changed",
      label: "Recovery claim",
    });
    if (
      snapshot.kind === "file" &&
      identities.some((identity) => identity && samePathIdentity(identity, snapshot.identity)) &&
      (!expected ||
        (snapshot.sha256 === expected.sha256 &&
          (process.platform === "win32" || snapshot.mode === expected.mode)))
    ) {
      if (expected && options.verifyRecoveryFile) {
        await options.verifyRecoveryFile({
          identity: snapshot.identity,
          mode: expected.mode,
          path: candidate,
        });
      }
      return candidate;
    }
  } catch {
    // A recovery candidate is advisory until its retained identity is verified.
  }
  return null;
}

async function preservedFileRecoveryPath(
  rawError,
  originalPath,
  originalIdentity,
  recovery,
  options = {},
  expected = null,
) {
  if (recovery && rawError?.code === "recovery_claim_changed") return null;
  const nestedPath = rawError?.details?.quarantinePath;
  const identities = [originalIdentity, recovery?.identity];
  for (const candidate of [nestedPath, recovery?.path, originalPath]) {
    const verified = await verifiedRegularRecoveryPath(
      candidate,
      identities,
      recovery ?? expected,
      options,
    );
    if (verified) return verified;
  }
  // Non-external callers may not opt into managed recovery publication. Preserve
  // their legacy locator even when the failing boundary made revalidation impossible.
  return recovery ? null : (nestedPath ?? originalPath ?? null);
}

function clearUnverifiedRecoveryDetails(error) {
  if (!error?.details) return;
  const {
    claimedPathPreserved: _claimedPathPreserved,
    quarantinePath: _quarantinePath,
    ...verifiedDetails
  } = error.details;
  error.details = verifiedDetails;
}

function assertExpectedFileState(snapshot, expected, target, options = {}) {
  const changedCode = options.changedCode ?? "atomic_target_changed";
  const label = options.label ?? "Atomic target";
  invariant(
    expected?.kind === "absent" || expected?.kind === "file",
    "atomic_expected_state_invalid",
    `Expected state must describe an absent or regular-file target: ${target}`,
  );
  invariant(
    snapshot.kind === expected.kind,
    changedCode,
    `${label} changed before publication: ${target}`,
  );
  if (snapshot.kind === "absent") return;
  invariant(
    (expected.sha256 === undefined || snapshot.sha256 === expected.sha256) &&
      (expected.identity === undefined || samePathIdentity(snapshot.identity, expected.identity)),
    changedCode,
    `${label} changed before publication: ${target}`,
  );
}

function atomicConflict(error, target, options = {}, details = undefined, force = false) {
  if (error instanceof SetupError) {
    if (details && typeof error === "object") error.details = { ...error.details, ...details };
    return error;
  }
  const changedCode = options.changedCode ?? "atomic_target_changed";
  const label = options.label ?? "Atomic target";
  if (force || ["EEXIST", "ENOENT", "ENOTEMPTY"].includes(error?.code)) {
    return new SetupError(changedCode, `${label} changed at the publication boundary: ${target}`, {
      ...details,
      causeCode: error?.code ?? "unexpected_filesystem_error",
    });
  }
  return error;
}

export async function atomicWrite(target, data, options = {}) {
  const mode = options.mode ?? 0o600;
  await options.assertMutationOwned?.();
  const parent = path.dirname(target);
  if (options.requireExistingParent) {
    await assertNoLinkSegments(parent, {
      assertPathBoundary: options.assertMutationOwned,
    });
  } else {
    await ensureDirectory(parent, options.directoryMode ?? 0o700, {
      assertMutationOwned: options.assertMutationOwned,
    });
  }
  await assertNoLinkSegments(target, {
    assertPathBoundary: options.assertMutationOwned,
  });
  const targetName = path.basename(target);
  const temporaryName = `.${targetName}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const temporary = path.join(path.dirname(target), temporaryName);
  let anchor = null;
  let handle = null;
  let temporaryIdentity = null;
  let quarantine = null;
  let quarantineName = null;
  let claimed = null;
  let recoveryClaim = null;
  let existing = null;
  let expected = null;
  let published = false;
  try {
    anchor = await openDirectoryAnchor(target, options);
    existing = await readRegularFileSnapshot(anchoredChild(anchor, targetName), options);
    await assertDirectoryAnchor(anchor, target, options);
    expected =
      options.expected ??
      (existing.kind === "absent"
        ? { kind: "absent" }
        : { kind: "file", identity: existing.identity, sha256: existing.sha256 });
    assertExpectedFileState(existing, expected, target, options);

    await options.afterDirectoryBind?.({ directory: anchor.directory, target });
    await options.assertMutationOwned?.();
    // Ownership checks may await lock I/O. Run them before the last named/open
    // parent proof so temp creation starts without another JavaScript boundary.
    await assertDirectoryAnchor(anchor, target, options);
    handle = await fsPromises.open(
      anchoredChild(anchor, temporaryName),
      fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
      mode,
    );
    const openedTemporary = await handle.stat({ bigint: true });
    invariant(
      regularFileStat(openedTemporary),
      options.changedCode ?? "atomic_target_changed",
      `${options.label ?? "Atomic target"} temporary is not a regular file: ${temporary}`,
    );
    temporaryIdentity = pathIdentity(openedTemporary);
    await assertAnchoredFile(anchor, temporaryName, temporaryIdentity, target, options);
    if (process.platform !== "win32") await handle.chmod(mode);
    await handle.close();
    handle = null;
    await options.assertMutationOwned?.();
    await options.beforeRename?.(temporary, { identity: temporaryIdentity });
    await assertAnchoredFile(anchor, temporaryName, temporaryIdentity, target, options);
    handle = await fsPromises.open(
      anchoredChild(anchor, temporaryName),
      fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
    const reopenedTemporary = await handle.stat({ bigint: true });
    invariant(
      regularFileStat(reopenedTemporary) &&
        reopenedTemporary.size === 0n &&
        samePathIdentity(temporaryIdentity, pathIdentity(reopenedTemporary)),
      options.changedCode ?? "atomic_target_changed",
      `${options.label ?? "Atomic target"} temporary changed before it was written: ${target}`,
    );
    await options.assertMutationOwned?.();
    await handle.writeFile(data);
    await handle.sync();
    const writtenTemporary = await handle.stat({ bigint: true });
    invariant(
      regularFileStat(writtenTemporary) &&
        samePathIdentity(temporaryIdentity, pathIdentity(writtenTemporary)),
      options.changedCode ?? "atomic_target_changed",
      `${options.label ?? "Atomic target"} temporary changed while it was written: ${target}`,
    );
    await assertAnchoredFile(anchor, temporaryName, temporaryIdentity, target, options);
    await handle.close();
    handle = null;

    if (existing.kind === "file") {
      quarantineName = `.${targetName}.${process.pid}.${crypto.randomUUID()}.quarantine`;
      quarantine = path.join(path.dirname(target), quarantineName);
      await options.beforeClaim?.({ quarantine, target, temporary });
      await options.assertMutationOwned?.();
      await assertDirectoryAnchor(anchor, target, options);
      try {
        await fsPromises.rename(
          anchoredChild(anchor, targetName),
          anchoredChild(anchor, quarantineName),
        );
      } catch (error) {
        throw atomicConflict(error, target, options);
      }
      claimed = await readRegularFileSnapshot(anchoredChild(anchor, quarantineName), options);
      assertExpectedFileState(claimed, expected, target, options);
      invariant(
        samePathIdentity(existing.identity, claimed.identity),
        options.changedCode ?? "atomic_target_changed",
        `${options.label ?? "Atomic target"} was replaced before its publication claim: ${target}`,
      );
      recoveryClaim = await publishRecoveryClaim(target, quarantineName, claimed, options);
      await options.afterClaim?.({ quarantine, target });
      await assertDirectoryAnchor(anchor, target, options);
      const claimedAfterBoundary = await readRegularFileSnapshot(
        anchoredChild(anchor, quarantineName),
        options,
      );
      assertExpectedFileState(claimedAfterBoundary, expected, target, options);
      invariant(
        samePathIdentity(claimed.identity, claimedAfterBoundary.identity),
        options.changedCode ?? "atomic_target_changed",
        `${options.label ?? "Atomic target"} changed after its publication claim: ${target}`,
      );
    }

    if (options.allowImmediateConsumption === true) {
      invariant(
        existing.kind === "absent" && quarantine === null,
        "atomic_consumption_contract_invalid",
        `${options.label ?? "Atomic target"} immediate-consumption publication must create a new file`,
      );
    }
    await options.beforePublish?.({ quarantine, target, temporary });
    await options.assertMutationOwned?.();
    await assertAnchoredFile(anchor, temporaryName, temporaryIdentity, target, options);
    if (options.allowImmediateConsumption === true) {
      options.beforeCommit?.({ target, temporary });
      fs.linkSync(anchoredChild(anchor, temporaryName), anchoredChild(anchor, targetName));
      published = true;
      options.onCommit?.({ target, temporary });
      const committedIdentity = temporaryIdentity;
      try {
        // The exclusive link is the externally observable commit. Cleanup stays
        // synchronous so a consumer cannot turn a committed request into a
        // caller-visible failure by moving it between awaited post-link checks.
        unlinkSync(anchoredChild(anchor, temporaryName));
        temporaryIdentity = null;
      } catch {
        // A committed target remains authoritative. Offline inventory exposes
        // any retained temp instead of falsely reporting that publication failed.
      }
      return {
        kind: "file",
        identity: committedIdentity,
        sha256: sha256(data),
      };
    }
    try {
      await fsPromises.link(
        anchoredChild(anchor, temporaryName),
        anchoredChild(anchor, targetName),
      );
      published = true;
    } catch (error) {
      throw atomicConflict(
        error,
        target,
        options,
        quarantine ? { quarantinePath: quarantine } : {},
      );
    }
    await assertDirectoryAnchor(anchor, target, options);
    const publishedStat = await fsPromises.lstat(anchoredChild(anchor, targetName), {
      bigint: true,
    });
    const temporaryStat = await fsPromises.lstat(anchoredChild(anchor, temporaryName), {
      bigint: true,
    });
    invariant(
      regularFileStat(publishedStat) &&
        samePathIdentity(pathIdentity(publishedStat), pathIdentity(temporaryStat)) &&
        samePathIdentity(temporaryIdentity, pathIdentity(publishedStat)),
      options.changedCode ?? "atomic_target_changed",
      `${options.label ?? "Atomic target"} changed immediately after publication: ${target}`,
    );
    await options.afterPublish?.({ quarantine, target, temporary });
    await assertDirectoryAnchor(anchor, target, options);
    const verifiedPublication = await readRegularFileSnapshot(
      anchoredChild(anchor, targetName),
      options,
    );
    invariant(
      verifiedPublication.kind === "file" &&
        verifiedPublication.sha256 === sha256(data) &&
        samePathIdentity(pathIdentity(publishedStat), verifiedPublication.identity),
      options.changedCode ?? "atomic_target_changed",
      `${options.label ?? "Atomic target"} changed while publication completed: ${target}`,
    );
    await options.assertMutationOwned?.();
    await assertAnchoredFile(anchor, temporaryName, temporaryIdentity, target, options);
    unlinkSync(anchoredChild(anchor, temporaryName));
    temporaryIdentity = null;
    if (quarantine) {
      const verifiedClaim = await readRegularFileSnapshot(
        anchoredChild(anchor, quarantineName),
        options,
      );
      assertExpectedFileState(verifiedClaim, expected, target, options);
      invariant(
        samePathIdentity(claimed.identity, verifiedClaim.identity),
        options.changedCode ?? "atomic_target_changed",
        `${options.label ?? "Atomic target"} changed after its publication claim: ${target}`,
      );
      await options.beforeRemoveClaim?.({ quarantine, target, temporary });
      await options.assertMutationOwned?.();
      await assertDirectoryAnchor(anchor, target, options);
      const removalClaim = await readRegularFileSnapshot(
        anchoredChild(anchor, quarantineName),
        options,
      );
      assertExpectedFileState(removalClaim, expected, target, options);
      invariant(
        samePathIdentity(claimed.identity, removalClaim.identity),
        options.changedCode ?? "atomic_target_changed",
        `${options.label ?? "Atomic target"} changed before claim removal: ${target}`,
      );
      unlinkSync(anchoredChild(anchor, quarantineName));
      quarantine = null;
      await removeRecoveryClaim(recoveryClaim, options);
      recoveryClaim = null;
    }
    return {
      kind: "file",
      identity: verifiedPublication.identity,
      sha256: verifiedPublication.sha256,
    };
  } catch (rawError) {
    let cleanupError = null;
    try {
      await handle?.close();
    } catch (error) {
      cleanupError = error;
    }
    handle = null;
    if (anchor && temporaryIdentity) {
      try {
        await options.beforeRemoveTemporary?.({ target, temporary });
        await options.assertMutationOwned?.();
        await assertAnchoredFile(anchor, temporaryName, temporaryIdentity, target, options);
        unlinkSync(anchoredChild(anchor, temporaryName));
      } catch (error) {
        cleanupError ??= error;
      }
    }
    const recoveryPath = await preservedFileRecoveryPath(
      rawError,
      quarantine,
      claimed?.identity ?? existing?.identity,
      recoveryClaim,
      options,
      claimed ?? existing,
    );
    if (recoveryClaim && !recoveryPath) clearUnverifiedRecoveryDetails(rawError);
    const recoveryDetails = {
      ...(recoveryPath ? { quarantinePath: recoveryPath } : {}),
      ...(cleanupError
        ? { temporaryCleanupCauseCode: cleanupError?.code ?? "cleanup_failed" }
        : {}),
    };
    const error = atomicConflict(
      rawError,
      target,
      options,
      recoveryDetails,
      Boolean(anchor || recoveryPath || published),
    );
    if (recoveryPath && error && typeof error === "object") {
      error.details = {
        ...error.details,
        claimedPathPreserved: true,
        quarantinePath: recoveryPath,
      };
    }
    throw error;
  } finally {
    await handle?.close().catch(() => {});
    await anchor?.handle.close().catch(() => {});
  }
}

export async function atomicWriteJson(target, value, options = {}) {
  return await atomicWrite(target, stableJson(value), options);
}

export async function readJson(target, options = {}) {
  const maxBytes = options.maxBytes ?? 1_048_576;
  const stat = await fsPromises.lstat(target);
  invariant(
    stat.isFile() && !stat.isSymbolicLink(),
    options.unsafeCode ?? "unsafe_json_file",
    `Expected regular JSON file: ${target}`,
  );
  invariant(
    stat.size <= maxBytes,
    options.tooLargeCode ?? "json_too_large",
    `JSON file exceeds ${maxBytes} bytes: ${target}`,
  );
  let value;
  try {
    value = JSON.parse(await fsPromises.readFile(target, "utf8"));
  } catch (error) {
    throw new SetupError(options.invalidCode ?? "invalid_json", `Invalid JSON: ${target}`, {
      reason: error.message,
    });
  }
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    options.shapeCode ?? "invalid_json_shape",
    `Expected JSON object: ${target}`,
  );
  return value;
}

export function validateSecretValue(value, label) {
  invariant(typeof value === "string", "invalid_secret", `${label} must be text`);
  invariant(
    value.length > 0 && Buffer.byteLength(value) <= MAX_SECRET_BYTES,
    "invalid_secret",
    `${label} has an invalid size`,
  );
  invariant(!value.includes("\0"), "invalid_secret", `${label} contains a NUL byte`);
  invariant(!/[\r\n]/.test(value), "invalid_secret", `${label} must be one line`);
  invariant(
    value === value.trim(),
    "invalid_secret",
    `${label} has leading or trailing whitespace`,
  );
  return value;
}

export function validateGatewaySecretValue(value, label = "gateway credential") {
  const validated = validateSecretValue(value, label);
  invariant(
    /^sk-[A-Za-z0-9_-]{43}$/.test(validated),
    "invalid_gateway_secret",
    `${label} does not match the generated administrative-key format`,
  );
  return validated;
}

export async function verifySecretFile(target, host) {
  return await verifyProtectedPermissions(target, host);
}

export async function readSecret(target, host, label, options = {}) {
  const verified = await verifySecretFile(target, host);
  const verifiedIdentity = pathIdentity(verified);
  await options.afterVerify?.({ target });
  assertWslSameEnvironmentPath(target, host, label);
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  let handle;
  let value;
  try {
    handle = await fsPromises.open(target, flags);
  } catch (error) {
    throw new SetupError("concurrent_secret_change", `${label} changed before it was opened`, {
      causeCode: error?.code ?? "secret_unreadable",
    });
  }
  try {
    const opened = await handle.stat({ bigint: true });
    invariant(
      regularFileStat(opened) &&
        samePathIdentity(verifiedIdentity, pathIdentity(opened)) &&
        opened.size === verified.size &&
        opened.mtimeNs === verified.mtimeNs,
      "concurrent_secret_change",
      `${label} changed while it was opened`,
    );
    const protectedBeforeRead = await verifyProtectedPermissions(target, host);
    const openedBeforeRead = await handle.stat({ bigint: true });
    invariant(
      samePathIdentity(verifiedIdentity, pathIdentity(protectedBeforeRead)) &&
        samePathIdentity(verifiedIdentity, pathIdentity(openedBeforeRead)) &&
        protectedBeforeRead.size === verified.size &&
        protectedBeforeRead.mtimeNs === verified.mtimeNs &&
        openedBeforeRead.size === verified.size &&
        openedBeforeRead.mtimeNs === verified.mtimeNs,
      "concurrent_secret_change",
      `${label} changed before it was read`,
    );
    const data = Buffer.alloc(Number(openedBeforeRead.size));
    const firstRead = await handle.read(data, 0, data.length, 0);
    invariant(
      firstRead.bytesRead === data.length,
      "concurrent_secret_change",
      `${label} changed while it was read`,
    );
    await options.afterRead?.({ target });
    const protectedAfterRead = await verifyProtectedPermissions(target, host);
    const openedAfterRead = await handle.stat({ bigint: true });
    invariant(
      samePathIdentity(verifiedIdentity, pathIdentity(protectedAfterRead)) &&
        samePathIdentity(verifiedIdentity, pathIdentity(openedAfterRead)) &&
        protectedAfterRead.size === verified.size &&
        protectedAfterRead.mtimeNs === verified.mtimeNs &&
        openedAfterRead.size === verified.size &&
        openedAfterRead.mtimeNs === verified.mtimeNs,
      "concurrent_secret_change",
      `${label} changed while it was read`,
    );
    const confirmation = Buffer.alloc(data.length);
    const secondRead = await handle.read(confirmation, 0, confirmation.length, 0);
    const finalProtected = await verifyProtectedPermissions(target, host);
    const finalOpened = await handle.stat({ bigint: true });
    invariant(
      secondRead.bytesRead === confirmation.length &&
        data.equals(confirmation) &&
        sha256(data) === sha256(confirmation) &&
        samePathIdentity(verifiedIdentity, pathIdentity(finalProtected)) &&
        samePathIdentity(verifiedIdentity, pathIdentity(finalOpened)) &&
        finalProtected.size === verified.size &&
        finalProtected.mtimeNs === verified.mtimeNs &&
        finalOpened.size === verified.size &&
        finalOpened.mtimeNs === verified.mtimeNs,
      "concurrent_secret_change",
      `${label} changed before its value was consumed`,
    );
    value = data.toString("utf8");
  } catch (error) {
    if (error instanceof SetupError && error.code === "concurrent_secret_change") throw error;
    throw new SetupError("concurrent_secret_change", `${label} changed while it was read`, {
      causeCode: error?.code ?? "secret_read_failed",
    });
  } finally {
    await handle.close().catch(() => {});
  }
  return validateSecretValue(value, label);
}

export async function readGatewaySecret(target, host, label = "gateway credential", options = {}) {
  return validateGatewaySecretValue(await readSecret(target, host, label, options), label);
}

export async function credentialPairContinuity(paths, host) {
  const provider = await readSecret(paths.providerSecret, host, "provider credential");
  const gateway = await readGatewaySecret(paths.gatewaySecret, host, "gateway credential");
  const proof = crypto
    .createHmac("sha256", Buffer.from(gateway, "utf8"))
    .update("hetzner-inference-credential-pair-v1\0", "utf8")
    .update(provider, "utf8")
    .digest("hex");
  return { scheme: CREDENTIAL_CONTINUITY_SCHEME, proof };
}

export async function copyNonSecretBackup(source, destination, options = {}) {
  const state = await readRegularFileSnapshot(source, {
    changedCode: options.changedCode ?? "backup_source_changed",
    label: options.label ?? "Backup source",
  });
  invariant(
    state.kind === "file",
    "backup_source_invalid",
    `Backup source must be a regular file: ${source}`,
  );
  if (options.expectedHash !== undefined) {
    invariant(
      state.sha256 === options.expectedHash,
      options.changedCode ?? "backup_source_changed",
      `Backup source changed before it was copied: ${source}`,
    );
  }
  assertNoSecretMaterial(state.data.toString("utf8"), options.secrets ?? []);
  await atomicWrite(destination, state.data, {
    assertMutationOwned: options.assertMutationOwned,
    beforeRename: options.beforeRename,
    beforePublish: options.beforePublish,
    expected: { kind: "absent" },
    mode: 0o600,
  });
  return { path: destination, sha256: state.sha256, mode: 0o600 };
}

export async function readFileIfOwned(target, expectedHash, options = {}) {
  const state = await readRegularFileSnapshot(target, options);
  invariant(
    state.kind === "file" && state.sha256 === expectedHash,
    options.changedCode ?? "owned_path_changed",
    `${options.label ?? "Owned file"} changed while it was read: ${target}`,
  );
  return state.data;
}

export async function restoreFileFromOwnedBackup(
  target,
  expectedTargetHash,
  backup,
  expectedBackupHash,
  options = {},
) {
  const data = await readFileIfOwned(backup, expectedBackupHash, {
    changedCode: options.backupChangedCode ?? "backup_source_changed",
    label: options.backupLabel ?? "Owned backup",
  });
  await atomicWrite(target, data, {
    afterClaim: options.afterClaim,
    assertMutationOwned: options.assertMutationOwned,
    beforeClaim: options.beforeClaim,
    beforeRename: options.beforeRename,
    beforeRemoveClaim: options.beforeRemoveClaim,
    beforePublish: options.beforePublish,
    changedCode: options.targetChangedCode ?? "owned_path_changed",
    expected: { kind: "file", sha256: expectedTargetHash },
    label: options.targetLabel ?? "Owned restoration target",
    mode: options.mode ?? 0o600,
    expectedParentBoundary: options.expectedParentBoundary,
    requireExistingParent: options.requireExistingParent,
    verifyParentBoundary: options.verifyParentBoundary,
  });
}

export async function inventoryTree(root, options = {}) {
  const maxEntries = options.maxEntries ?? MAX_MANAGED_TREE_ENTRIES;
  const allowSymlinks = options.allowSymlinks === true;
  const rootState = await inspectPath(root, { hash: false });
  if (rootState.kind === "absent") {
    return { count: 0, digest: digestJson([]), entries: [] };
  }
  invariant(
    rootState.kind === "directory",
    "managed_tree_invalid",
    `Managed tree is not a directory: ${root}`,
  );
  const entries = [];

  async function walk(current) {
    const names = (await fsPromises.readdir(current)).sort();
    for (const name of names) {
      const full = path.join(current, name);
      const relative = path.relative(root, full).split(path.sep).join("/");
      const stat = await fsPromises.lstat(full);
      if (stat.isSymbolicLink()) {
        invariant(
          allowSymlinks,
          "managed_tree_redirect",
          `Managed tree contains a symlink or reparse point: ${full}`,
        );
        entries.push({
          path: relative,
          kind: "symlink",
          target: await fsPromises.readlink(full),
        });
      } else if (stat.isDirectory()) {
        entries.push({ path: relative, kind: "directory", mode: modeBits(stat) });
        await walk(full);
      } else if (stat.isFile()) {
        entries.push({
          path: relative,
          kind: "file",
          mode: modeBits(stat),
          size: stat.size,
          sha256: await hashFile(full),
        });
      } else {
        throw new SetupError(
          "managed_tree_special_file",
          `Managed tree contains a special file: ${full}`,
        );
      }
      invariant(
        entries.length <= maxEntries,
        "managed_tree_too_large",
        `Managed tree exceeds ${maxEntries} entries`,
      );
    }
  }

  await walk(root);
  return { count: entries.length, digest: digestJson(entries), entries };
}

export function redactionVariants(secrets) {
  const variants = new Set();
  for (const secret of secrets.filter(Boolean)) {
    variants.add(secret);
    variants.add(Buffer.from(secret, "utf8").toString("base64"));
    variants.add(Buffer.from(secret, "utf8").toString("base64url"));
    variants.add(Buffer.from(secret, "utf8").toString("hex"));
  }
  return [...variants].filter(Boolean).sort((left, right) => right.length - left.length);
}

export function redactText(value, secrets = []) {
  let result = String(value);
  for (const variant of redactionVariants(secrets)) {
    result = result.split(variant).join("[REDACTED]");
  }
  result = result.replace(/((?:Bearer|Api-Key|X-Api-Key)\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]");
  return result;
}

export function assertNoSecretMaterial(value, secrets) {
  const serialized = typeof value === "string" ? value : stableJson(value);
  for (const variant of redactionVariants(secrets)) {
    invariant(!serialized.includes(variant), "secret_leak", "Output contains secret material");
  }
}

function statMatchesKind(stat, kind) {
  return kind === "file"
    ? stat.isFile() && !stat.isSymbolicLink()
    : stat.isDirectory() && !stat.isSymbolicLink();
}

async function claimPathForRemoval(target, kind, verify, removeSync, options = {}) {
  const changedCode =
    options.changedCode ?? (kind === "file" ? "owned_path_changed" : "owned_tree_changed");
  const label = options.label ?? `Owned ${kind}`;
  const anchorOptions = { ...options, changedCode, label };
  const targetName = path.basename(target);
  const quarantineName = `.${targetName}.${process.pid}.${crypto.randomUUID()}.quarantine`;
  const quarantine = path.join(path.dirname(target), quarantineName);
  let anchor;
  let expectedIdentity = null;
  let recoveryClaim = null;
  try {
    anchor = await openDirectoryAnchor(target, anchorOptions);
    let before = options.initialStat;
    if (!before) {
      try {
        before = await fsPromises.lstat(anchoredChild(anchor, targetName), { bigint: true });
      } catch (error) {
        if (error.code === "ENOENT") return false;
        throw error;
      }
    } else {
      const anchoredBefore = await fsPromises.lstat(anchoredChild(anchor, targetName), {
        bigint: true,
      });
      invariant(
        samePathIdentity(pathIdentity(before), pathIdentity(anchoredBefore)),
        changedCode,
        `${label} changed before cleanup: ${target}`,
      );
    }
    invariant(
      statMatchesKind(before, kind),
      changedCode,
      `${label} changed type before cleanup: ${target}`,
    );
    await assertDirectoryAnchor(anchor, target, anchorOptions);
    await verify(anchoredChild(anchor, targetName), {
      namedPath: path.join(anchor.directory, targetName),
    });
    expectedIdentity = pathIdentity(before);
    await options.beforeClaim?.({ quarantine, target });
    await options.assertMutationOwned?.();
    await assertDirectoryAnchor(anchor, target, anchorOptions);
    try {
      await fsPromises.rename(
        anchoredChild(anchor, targetName),
        anchoredChild(anchor, quarantineName),
      );
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new SetupError(
          changedCode,
          `${label} disappeared before it could be claimed: ${target}`,
        );
      }
      throw error;
    }

    try {
      const claimedBeforeBoundary = await fsPromises.lstat(anchoredChild(anchor, quarantineName), {
        bigint: true,
      });
      invariant(
        statMatchesKind(claimedBeforeBoundary, kind) &&
          samePathIdentity(expectedIdentity, pathIdentity(claimedBeforeBoundary)),
        changedCode,
        `${label} was replaced before its cleanup claim: ${target}`,
      );
      await verify(anchoredChild(anchor, quarantineName), {
        namedPath: path.join(anchor.directory, quarantineName),
      });
      if (kind === "file") {
        const snapshot = await readRegularFileSnapshot(anchoredChild(anchor, quarantineName), {
          changedCode,
          label,
        });
        invariant(
          samePathIdentity(expectedIdentity, snapshot.identity),
          changedCode,
          `${label} changed before recovery publication: ${target}`,
        );
        recoveryClaim = await publishRecoveryClaim(target, quarantineName, snapshot, options);
      }
      await options.afterClaim?.({ quarantine, target });
      await assertDirectoryAnchor(anchor, target, anchorOptions);
      const claimed = await fsPromises.lstat(anchoredChild(anchor, quarantineName), {
        bigint: true,
      });
      invariant(
        statMatchesKind(claimed, kind) && samePathIdentity(expectedIdentity, pathIdentity(claimed)),
        changedCode,
        `${label} was replaced before its cleanup claim: ${target}`,
      );
      await verify(anchoredChild(anchor, quarantineName), {
        namedPath: path.join(anchor.directory, quarantineName),
      });
      const verified = await fsPromises.lstat(anchoredChild(anchor, quarantineName), {
        bigint: true,
      });
      invariant(
        statMatchesKind(verified, kind) &&
          samePathIdentity(expectedIdentity, pathIdentity(verified)),
        changedCode,
        `${label} changed after its cleanup claim: ${target}`,
      );
      await options.beforeRemove?.({ quarantine, target });
      await options.assertMutationOwned?.();
      await assertDirectoryAnchor(anchor, target, anchorOptions);
      const removalBefore = await fsPromises.lstat(anchoredChild(anchor, quarantineName), {
        bigint: true,
      });
      invariant(
        statMatchesKind(removalBefore, kind) &&
          samePathIdentity(expectedIdentity, pathIdentity(removalBefore)),
        changedCode,
        `${label} was replaced before final cleanup: ${target}`,
      );
      await verify(anchoredChild(anchor, quarantineName), {
        namedPath: path.join(anchor.directory, quarantineName),
      });
      await assertDirectoryAnchor(anchor, target, anchorOptions);
      const removalAfter = await fsPromises.lstat(anchoredChild(anchor, quarantineName), {
        bigint: true,
      });
      invariant(
        statMatchesKind(removalAfter, kind) &&
          samePathIdentity(expectedIdentity, pathIdentity(removalAfter)) &&
          removalBefore.size === removalAfter.size &&
          removalBefore.mtimeNs === removalAfter.mtimeNs,
        changedCode,
        `${label} changed during final cleanup verification: ${target}`,
      );
      // Keep the last verified pathname check and the OS deletion in one JS turn. The
      // operating-system account is the trust boundary; see references/security.md.
      removeSync(anchoredChild(anchor, quarantineName));
      await removeRecoveryClaim(recoveryClaim, options);
      recoveryClaim = null;
    } catch (rawError) {
      const recoveryPath =
        kind === "file"
          ? await preservedFileRecoveryPath(
              rawError,
              quarantine,
              expectedIdentity,
              recoveryClaim,
              options,
            )
          : (rawError?.details?.quarantinePath ?? quarantine);
      if (recoveryClaim && !recoveryPath) clearUnverifiedRecoveryDetails(rawError);
      const error =
        rawError instanceof SetupError
          ? rawError
          : new SetupError(
              changedCode,
              `${label} cleanup claim failed and requires recovery: ${target}`,
              { causeCode: rawError?.code ?? "unexpected_filesystem_error" },
            );
      error.details = {
        ...error.details,
        ...(recoveryPath
          ? {
              claimedPathPreserved: true,
              quarantinePath: recoveryPath,
            }
          : {}),
      };
      throw error;
    }
    return true;
  } finally {
    await anchor?.handle.close().catch(() => {});
  }
}

export async function removeFileIfOwned(target, expectedHash, options = {}) {
  return await claimPathForRemoval(
    target,
    "file",
    async (quarantine) => {
      const state = await inspectPath(quarantine);
      invariant(
        state.kind === "file" && state.sha256 === expectedHash,
        options.changedCode ?? "owned_path_changed",
        `${options.label ?? "Owned file"} changed before cleanup: ${target}`,
      );
    },
    unlinkSync,
    options,
  );
}

export async function removeJsonFileIfOwned(target, verifyDocument, options = {}) {
  return await claimPathForRemoval(
    target,
    "file",
    async (quarantine) => {
      let value;
      try {
        value = await readJson(quarantine, { maxBytes: options.maxBytes ?? 65_536 });
      } catch (error) {
        throw new SetupError(
          options.changedCode ?? "owned_path_changed",
          `${options.label ?? "Owned JSON file"} changed before cleanup: ${target}`,
          { causeCode: error?.code ?? "invalid_json" },
        );
      }
      await verifyDocument(value);
    },
    unlinkSync,
    options,
  );
}

export async function removeTreeIfOwned(target, expectedDigest, options = {}) {
  return await claimPathForRemoval(
    target,
    "directory",
    async (quarantine) => {
      const inventory = await inventoryTree(quarantine, { allowSymlinks: true });
      invariant(
        inventory.digest === expectedDigest,
        options.changedCode ?? "owned_tree_changed",
        `${options.label ?? "Owned tree"} changed before cleanup: ${target}`,
      );
    },
    (quarantine) => rmSync(quarantine, { recursive: true, force: false }),
    options,
  );
}

export async function removeEmptyDirectoryIfOwned(target, options = {}) {
  let before;
  try {
    before = await fsPromises.lstat(target, { bigint: true });
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  const changedCode = options.changedCode ?? "owned_directory_changed";
  invariant(
    statMatchesKind(before, "directory"),
    changedCode,
    `Cleanup directory changed type: ${target}`,
  );
  if ((await fsPromises.readdir(target)).length > 0) return false;
  return await claimPathForRemoval(
    target,
    "directory",
    async (quarantine) => {
      invariant(
        (await fsPromises.readdir(quarantine)).length === 0,
        changedCode,
        `Cleanup directory changed before removal: ${target}`,
      );
    },
    rmdirSync,
    { ...options, changedCode, initialStat: before },
  );
}
