import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  assertNoRedirects,
  assertCurrentWslOwnedNamespace,
  assertCurrentWslPath,
  inspectCurrentUserDirectoryBoundaryAsync,
  isDirectoryStat,
  isRegularFileStat,
  pathIdentity,
  readProtectedGatewaySecret,
  readProtectedSecret,
  samePathIdentity,
  secureAndVerifyCurrentUserFileAsync,
  verifyCurrentUserFileAsync,
} from "./protected-file.mjs";

const CONFIG_ROOT = "__CONFIG_ROOT__";
const STATE_ROOT = "__STATE_ROOT__";
const NODE_EXECUTABLE = "__NODE_EXECUTABLE__";
const RUNNER_SCRIPT = "__RUNNER_SCRIPT__";
const RECEIPT_SCHEMA_VERSION = 1;
const HOST = "127.0.0.1";
const PORT = 4000;
const ALIAS = "hetzner-default";
const PROCESS_STOP_DEADLINE_MS = 15_000;
const PROCESS_STOP_PHASE_COUNT_BINDING = "__PROCESS_STOP_PHASE_COUNT__";
const parsedProcessStopPhaseCount = Number(PROCESS_STOP_PHASE_COUNT_BINDING);
const PROCESS_STOP_PHASE_COUNT =
  Number.isInteger(parsedProcessStopPhaseCount) && parsedProcessStopPhaseCount > 0
    ? parsedProcessStopPhaseCount
    : 15;

class ReceiptWriteCancelled extends Error {}

function stopDeadlineBudget(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > PROCESS_STOP_DEADLINE_MS) {
    throw new Error("stop request has an invalid lifecycle duration");
  }
  const phaseMs = durationMs / PROCESS_STOP_PHASE_COUNT;
  return {
    callerProofReserveMs: phaseMs * 2,
    claimCleanupReserveMs: phaseMs * 2,
    postTerminationReserveMs: phaseMs * 6,
    runnerClaimReserveMs: phaseMs * 8,
    terminalPublicationReserveMs: phaseMs * 4,
  };
}

function within(target, boundary) {
  const relative = path.relative(path.resolve(boundary), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function installedBinding(marker, option, injected, label) {
  const bound = injected ?? (marker.startsWith("__") ? option : marker);
  if (!path.isAbsolute(bound)) throw new Error(`${label} binding must be absolute`);
  if (!marker.startsWith("__") && option !== marker) {
    throw new Error(`${label} differs from the installed runner binding`);
  }
  return bound;
}

function runnerBindings(options, dependencies = {}) {
  return {
    configRoot: installedBinding(
      CONFIG_ROOT,
      options["config-root"],
      dependencies.configRoot,
      "configuration root",
    ),
    nodeExecutable: installedBinding(
      NODE_EXECUTABLE,
      options["runner-executable"],
      dependencies.runnerExecutable,
      "Node executable",
    ),
    runnerScript: installedBinding(
      RUNNER_SCRIPT,
      options["runner-script"],
      dependencies.runnerScript,
      "runner script",
    ),
    stateRoot: installedBinding(
      STATE_ROOT,
      options["state-root"],
      dependencies.stateRoot,
      "state root",
    ),
  };
}

function parseRootBoundary(value, label) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${label} binding is not valid JSON`);
  }
  if (
    parsed?.kind !== "directory" ||
    !parsed.identity ||
    !Number.isInteger(parsed.mode) ||
    !parsed.protection
  ) {
    throw new Error(`${label} binding has no directory identity and protection`);
  }
  return parsed;
}

function runnerRootEntries(options, bindings) {
  return [
    [bindings.configRoot, options["config-root-boundary"], "configuration root"],
    [bindings.stateRoot, options["state-root-boundary"], "state root"],
  ];
}

function assertRunnerPathBindings(options, dependencies = {}) {
  const boundaryOptions = dependencies.wslBoundaryOptions ?? {};
  const assertOwnedNamespace =
    dependencies.assertCurrentWslOwnedNamespace ?? assertCurrentWslOwnedNamespace;
  const assertPath = dependencies.assertCurrentWslPath ?? assertCurrentWslPath;
  const bindings = runnerBindings(options, dependencies);
  for (const [target, label] of [
    [bindings.configRoot, "configuration namespace"],
    [bindings.stateRoot, "state namespace"],
  ]) {
    assertOwnedNamespace(target, label, boundaryOptions);
  }
  for (const [target, root, label] of [
    [options.config, bindings.configRoot, "gateway configuration"],
    [options["provider-key"], bindings.configRoot, "provider credential"],
    [options["master-key"], bindings.configRoot, "gateway credential"],
    [options.receipt, bindings.stateRoot, "process receipt"],
    [options["stop-request"], bindings.stateRoot, "process stop request"],
  ]) {
    if (!within(target, root)) throw new Error(`${label} escapes its installed root binding`);
  }
  for (const [target, label] of [
    [bindings.configRoot, "configuration root"],
    [bindings.stateRoot, "state root"],
    [bindings.nodeExecutable, "Node executable"],
    [bindings.runnerScript, "runner script"],
    [options.config, "gateway configuration"],
    [options.litellm, "LiteLLM executable"],
    [options["provider-key"], "provider credential"],
    [options["master-key"], "gateway credential"],
    [options.receipt, "process receipt"],
    [options["stop-request"], "process stop request"],
  ]) {
    assertPath(target, label, boundaryOptions);
  }
  return bindings;
}

function assertRunnerSynchronousBoundaries(options, dependencies = {}) {
  const boundaryOptions = dependencies.wslBoundaryOptions ?? {};
  const assertPath = dependencies.assertCurrentWslPath ?? assertCurrentWslPath;
  const bindings = assertRunnerPathBindings(options, dependencies);
  for (const [target, encodedExpected, label] of runnerRootEntries(options, bindings)) {
    const expected = parseRootBoundary(encodedExpected, label);
    assertNoRedirects(target, {
      assertPathBoundary: (segment) => assertPath(segment, `${label} segment`, boundaryOptions),
    });
    assertPath(target, label, boundaryOptions);
    const current = fs.lstatSync(target, { bigint: true });
    const currentIdentity = pathIdentity(current);
    const expectedIdentity = {
      birthtimeNs: BigInt(expected.identity.birthtimeNs),
      dev: BigInt(expected.identity.dev),
      ino: BigInt(expected.identity.ino),
    };
    if (!isDirectoryStat(current) || !samePathIdentity(currentIdentity, expectedIdentity)) {
      throw new Error(`${label} identity or protection changed after runner spawn`);
    }
    if (Number(current.mode & 0o777n) !== expected.mode) {
      throw new Error(`${label} mode must be ${expected.mode.toString(8).padStart(4, "0")}`);
    }
    if (
      process.platform !== "win32" &&
      expected.protection.kind === "posix-owner" &&
      String(current.uid) !== expected.protection.uid
    ) {
      throw new Error(`${label} owner mismatch`);
    }
  }
  return bindings;
}

async function assertRunnerBoundaries(options, dependencies = {}, operation = {}) {
  const boundaryOptions = dependencies.wslBoundaryOptions ?? {};
  const bindings = assertRunnerSynchronousBoundaries(options, dependencies);
  const inspectBoundary =
    dependencies.inspectCurrentUserDirectoryBoundary ?? inspectCurrentUserDirectoryBoundaryAsync;
  const inspectionByRoot = new Map();
  for (const [target, , label] of runnerRootEntries(options, bindings)) {
    const key =
      process.platform === "win32" ? path.resolve(target).toLowerCase() : path.resolve(target);
    if (!inspectionByRoot.has(key)) {
      inspectionByRoot.set(
        key,
        Promise.resolve().then(() =>
          inspectBoundary(target, label, {
            deadlineAt: operation.deadlineAt,
            deadlineReserveMs: operation.deadlineReserveMs,
            wslBoundaryOptions: boundaryOptions,
          }),
        ),
      );
    }
  }
  const currentByRoot = new Map(
    await Promise.all(
      [...inspectionByRoot].map(async ([key, inspection]) => [key, await inspection]),
    ),
  );
  for (const [target, encodedExpected, label] of runnerRootEntries(options, bindings)) {
    const expected = parseRootBoundary(encodedExpected, label);
    const key =
      process.platform === "win32" ? path.resolve(target).toLowerCase() : path.resolve(target);
    const current = currentByRoot.get(key);
    if (JSON.stringify(stable(current)) !== JSON.stringify(stable(expected))) {
      throw new Error(`${label} identity or protection changed after runner spawn`);
    }
  }
  return bindings;
}

function parse(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!option?.startsWith("--") || value === undefined) {
      throw new Error("runner options must be --name value pairs");
    }
    const name = option.slice(2);
    if (values[name] !== undefined) throw new Error(`duplicate runner option: ${name}`);
    values[name] = value;
  }
  return values;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function assertRunnerNamedPath(target, label, options = {}) {
  assertCurrentWslPath(target, label, options.wslBoundaryOptions ?? {});
}

function assertRunnerPathSegments(target, label, options = {}) {
  const boundaryOptions = options.wslBoundaryOptions ?? {};
  assertNoRedirects(target, {
    assertPathBoundary: (segment) =>
      assertCurrentWslPath(segment, `${label} segment`, boundaryOptions),
  });
}

function openDirectoryAnchor(target, label, options = {}) {
  const directory = path.dirname(target);
  assertRunnerPathSegments(directory, `${label} parent`, options);
  assertRunnerNamedPath(directory, `${label} parent`, options);
  const named = fs.lstatSync(directory, { bigint: true });
  if (!isDirectoryStat(named)) throw new Error(`${label} parent is not a regular directory`);
  assertRunnerNamedPath(directory, `${label} parent`, options);
  const descriptor = fs.openSync(
    directory,
    fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY ?? 0),
  );
  try {
    const opened = fs.fstatSync(descriptor, { bigint: true });
    if (!isDirectoryStat(opened) || !samePathIdentity(pathIdentity(named), pathIdentity(opened))) {
      throw new Error(`${label} parent changed while it was opened`);
    }
    return {
      boundDirectory: process.platform === "linux" ? `/proc/self/fd/${descriptor}` : directory,
      descriptor,
      directory,
      identity: pathIdentity(opened),
    };
  } catch (error) {
    fs.closeSync(descriptor);
    throw error;
  }
}

function assertDirectoryAnchor(anchor, label, options = {}) {
  assertRunnerPathSegments(anchor.directory, `${label} parent`, options);
  assertRunnerNamedPath(anchor.directory, `${label} parent`, options);
  const named = fs.lstatSync(anchor.directory, { bigint: true });
  const opened = fs.fstatSync(anchor.descriptor, { bigint: true });
  if (
    !isDirectoryStat(named) ||
    !isDirectoryStat(opened) ||
    !samePathIdentity(anchor.identity, pathIdentity(named)) ||
    !samePathIdentity(anchor.identity, pathIdentity(opened))
  ) {
    throw new Error(`${label} parent changed during publication`);
  }
}

function anchoredChild(anchor, name) {
  return path.join(anchor.boundDirectory, name);
}

function assertAnchoredFile(anchor, name, expectedIdentity, label, options = {}) {
  assertDirectoryAnchor(anchor, label, options);
  const namedTarget = path.join(anchor.directory, name);
  assertRunnerNamedPath(namedTarget, label, options);
  const anchored = fs.lstatSync(anchoredChild(anchor, name), { bigint: true });
  assertRunnerNamedPath(namedTarget, label, options);
  const named = fs.lstatSync(namedTarget, { bigint: true });
  if (
    !isRegularFileStat(anchored) ||
    !isRegularFileStat(named) ||
    !samePathIdentity(expectedIdentity, pathIdentity(anchored)) ||
    !samePathIdentity(expectedIdentity, pathIdentity(named))
  ) {
    throw new Error(`${label} temporary identity changed`);
  }
}

function fileSnapshot(target, label, options = {}) {
  let named;
  try {
    assertRunnerNamedPath(target, label, options);
    named = fs.lstatSync(target, { bigint: true });
  } catch (error) {
    if (error.code === "ENOENT") return { kind: "absent" };
    throw error;
  }
  if (!isRegularFileStat(named)) throw new Error(`${label} must be an absent or regular file`);
  assertRunnerNamedPath(target, label, options);
  const descriptor = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (
      !isRegularFileStat(before) ||
      !samePathIdentity(pathIdentity(named), pathIdentity(before))
    ) {
      throw new Error(`${label} changed while it was opened`);
    }
    const data = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    if (
      !isRegularFileStat(after) ||
      !samePathIdentity(pathIdentity(before), pathIdentity(after)) ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs
    ) {
      throw new Error(`${label} changed while it was read`);
    }
    return {
      kind: "file",
      data,
      identity: pathIdentity(after),
      sha256: sha256(data),
    };
  } finally {
    fs.closeSync(descriptor);
  }
}

function assertExpectedState(snapshot, expected, label) {
  if (!expected || !["absent", "file"].includes(expected.kind)) {
    throw new Error(`${label} has no valid expected state`);
  }
  if (snapshot.kind !== expected.kind) throw new Error(`${label} changed before publication`);
  if (
    snapshot.kind === "file" &&
    ((expected.sha256 !== undefined && snapshot.sha256 !== expected.sha256) ||
      (expected.identity !== undefined && !samePathIdentity(snapshot.identity, expected.identity)))
  ) {
    throw new Error(`${label} changed before publication`);
  }
}

function preserveQuarantine(error, quarantine) {
  if (quarantine && error && typeof error === "object") {
    error.details = {
      ...error.details,
      claimedPathPreserved: true,
      quarantinePath: quarantine,
    };
  }
  return error;
}

export async function atomicJson(target, value, options = {}) {
  options.assertBoundary?.({ phase: "start", target });
  options.afterBoundary?.({ phase: "start", target });
  options.assertBoundary?.({ phase: "after-start-hook", target });
  const label = options.label ?? "process receipt";
  const data = `${JSON.stringify(stable(value), null, 2)}\n`;
  const targetName = path.basename(target);
  const temporaryName = `.${targetName}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const temporary = path.join(path.dirname(target), temporaryName);
  let anchor = null;
  let descriptor = null;
  let temporaryIdentity = null;
  let quarantine = null;
  let quarantineName = null;
  let claimed = null;
  try {
    anchor = openDirectoryAnchor(target, label, options);
    const existing = fileSnapshot(anchoredChild(anchor, targetName), label, options);
    assertDirectoryAnchor(anchor, label, options);
    const expected =
      options.expected ??
      (existing.kind === "absent"
        ? { kind: "absent" }
        : { kind: "file", identity: existing.identity, sha256: existing.sha256 });
    assertExpectedState(existing, expected, label);
    options.afterDirectoryBind?.({ directory: anchor.directory, target });
    options.assertBoundary?.({ phase: "temporary", target });
    assertDirectoryAnchor(anchor, label, options);
    descriptor = fs.openSync(
      anchoredChild(anchor, temporaryName),
      fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
      0o600,
    );
    const openedTemporary = fs.fstatSync(descriptor, { bigint: true });
    if (!isRegularFileStat(openedTemporary)) throw new Error(`${label} temporary is not regular`);
    temporaryIdentity = pathIdentity(openedTemporary);
    assertAnchoredFile(anchor, temporaryName, temporaryIdentity, label, options);
    if (process.platform !== "win32") fs.fchmodSync(descriptor, 0o600);
    fs.closeSync(descriptor);
    descriptor = null;
    await secureAndVerifyCurrentUserFileAsync(temporary, 0o600, {
      deadlineAt: options.deadlineAt,
      deadlineReserveMs: options.deadlineReserveMs,
      execFile: options.execFile,
      expectedIdentity: temporaryIdentity,
      secureWindowsAclAsync: options.secureWindowsAclAsync,
      wslBoundaryOptions: options.wslBoundaryOptions ?? {},
    });
    await options.assertBoundaryAsync?.({ phase: "after-temporary-protection", target });
    assertAnchoredFile(anchor, temporaryName, temporaryIdentity, label, options);
    descriptor = fs.openSync(
      anchoredChild(anchor, temporaryName),
      fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
    const reopenedTemporary = fs.fstatSync(descriptor, { bigint: true });
    if (
      !isRegularFileStat(reopenedTemporary) ||
      reopenedTemporary.size !== 0n ||
      !samePathIdentity(temporaryIdentity, pathIdentity(reopenedTemporary))
    ) {
      throw new Error(`${label} temporary changed before it was written`);
    }
    fs.writeFileSync(descriptor, data);
    fs.fsyncSync(descriptor);
    const writtenTemporary = fs.fstatSync(descriptor, { bigint: true });
    if (!samePathIdentity(temporaryIdentity, pathIdentity(writtenTemporary))) {
      throw new Error(`${label} temporary changed while it was written`);
    }
    fs.closeSync(descriptor);
    descriptor = null;
    assertAnchoredFile(anchor, temporaryName, temporaryIdentity, label, options);
    options.beforeClaim?.({ target, temporary });
    options.assertBoundary?.({ phase: "claim", target });
    if (existing.kind === "file") {
      quarantineName = `.${targetName}.${process.pid}.${crypto.randomUUID()}.quarantine`;
      quarantine = path.join(path.dirname(target), quarantineName);
      assertDirectoryAnchor(anchor, label, options);
      fs.renameSync(anchoredChild(anchor, targetName), anchoredChild(anchor, quarantineName));
      await options.afterClaim?.({ quarantine, target, temporary });
      options.assertBoundary?.({ phase: "claimed", target });
      assertDirectoryAnchor(anchor, label, options);
      claimed = fileSnapshot(anchoredChild(anchor, quarantineName), label, options);
      assertExpectedState(claimed, expected, label);
      if (!samePathIdentity(existing.identity, claimed.identity)) {
        throw new Error(`${label} was replaced before its publication claim`);
      }
    }
    options.beforePublish?.({ quarantine, target, temporary });
    options.assertBoundary?.({ phase: "publish", target });
    assertAnchoredFile(anchor, temporaryName, temporaryIdentity, label, options);
    fs.linkSync(anchoredChild(anchor, temporaryName), anchoredChild(anchor, targetName));
    assertDirectoryAnchor(anchor, label, options);
    const published = fs.lstatSync(anchoredChild(anchor, targetName), { bigint: true });
    const temporaryStat = fs.lstatSync(anchoredChild(anchor, temporaryName), { bigint: true });
    if (
      !isRegularFileStat(published) ||
      !samePathIdentity(pathIdentity(published), pathIdentity(temporaryStat)) ||
      !samePathIdentity(temporaryIdentity, pathIdentity(published))
    ) {
      throw new Error(`${label} changed immediately after publication`);
    }
    const secured = fileSnapshot(anchoredChild(anchor, targetName), label, options);
    if (
      secured.kind !== "file" ||
      secured.sha256 !== sha256(data) ||
      !samePathIdentity(pathIdentity(published), secured.identity)
    ) {
      throw new Error(`${label} changed while its publication protection was verified`);
    }
    fs.unlinkSync(anchoredChild(anchor, temporaryName));
    temporaryIdentity = null;
    if (quarantine) {
      options.assertBoundary?.({ phase: "cleanup", target });
      const verifiedClaim = fileSnapshot(anchoredChild(anchor, quarantineName), label, options);
      assertExpectedState(verifiedClaim, expected, label);
      if (!samePathIdentity(claimed.identity, verifiedClaim.identity)) {
        throw new Error(`${label} changed after its publication claim`);
      }
      fs.unlinkSync(anchoredChild(anchor, quarantineName));
      quarantine = null;
    }
    return {
      kind: "file",
      identity: secured.identity,
      sha256: sha256(data),
    };
  } catch (error) {
    if (descriptor !== null) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // Preserve the original write failure.
      }
    }
    let cleanupBoundaryError = null;
    try {
      await options.assertBoundaryAsync?.({ phase: "failure-cleanup", target });
      options.assertBoundary?.({ phase: "failure-cleanup", target });
    } catch (boundaryError) {
      cleanupBoundaryError = boundaryError;
    }
    if (!cleanupBoundaryError && anchor && temporaryIdentity) {
      try {
        assertAnchoredFile(anchor, temporaryName, temporaryIdentity, label, options);
        fs.unlinkSync(anchoredChild(anchor, temporaryName));
      } catch {
        // Preserve the original publication failure and any recovery objects.
      }
    }
    if (cleanupBoundaryError) throw preserveQuarantine(cleanupBoundaryError, quarantine);
    throw preserveQuarantine(error, quarantine);
  } finally {
    if (anchor) {
      try {
        fs.closeSync(anchor.descriptor);
      } catch {
        // The primary publication result remains authoritative.
      }
    }
  }
}

export function claimTokenBoundStopRequest(target, processToken, dependencies = {}) {
  dependencies.assertBoundary?.({ phase: "start", target });
  const anchor = openDirectoryAnchor(target, "stop request", dependencies);
  const targetName = path.basename(target);
  const quarantineName = `.${targetName}.${process.pid}.${crypto.randomUUID()}.quarantine`;
  const quarantine = path.join(path.dirname(target), quarantineName);
  let before;
  let request;
  let claimedPath = false;
  try {
    before = fileSnapshot(anchoredChild(anchor, targetName), "stop request", dependencies);
    if (before.kind === "absent") {
      fs.closeSync(anchor.descriptor);
      return null;
    }
    if (dependencies.expected) {
      assertExpectedState(before, dependencies.expected, "stop request");
    }
    request = JSON.parse(before.data.toString("utf8"));
    if (!validStopRequest(request, processToken)) {
      throw new Error("stop request does not match the owned process token and schema");
    }
    dependencies.beforeClaim?.({ quarantine, target });
    dependencies.assertBoundary?.({ phase: "claim", target });
    assertDirectoryAnchor(anchor, "stop request", dependencies);
    fs.renameSync(anchoredChild(anchor, targetName), anchoredChild(anchor, quarantineName));
    claimedPath = true;
    dependencies.afterClaim?.({ quarantine, target });
    dependencies.assertBoundary?.({ phase: "claimed", target });
    assertDirectoryAnchor(anchor, "stop request", dependencies);
    const claimed = fileSnapshot(
      anchoredChild(anchor, quarantineName),
      "stop request",
      dependencies,
    );
    if (
      claimed.kind !== "file" ||
      !samePathIdentity(before.identity, claimed.identity) ||
      claimed.sha256 !== before.sha256
    ) {
      throw new Error("stop request was replaced before its cleanup claim");
    }
    const claimedRequest = JSON.parse(claimed.data.toString("utf8"));
    if (!validStopRequest(claimedRequest, processToken)) {
      throw new Error("stop request identity changed before cleanup");
    }
  } catch (error) {
    try {
      fs.closeSync(anchor.descriptor);
    } catch {
      // Preserve the stop-request failure.
    }
    throw preserveQuarantine(error, claimedPath ? quarantine : null);
  }
  return {
    path: quarantine,
    request,
    sha256: before.sha256,
    remove() {
      try {
        dependencies.assertBoundary?.({ phase: "remove", target });
        assertDirectoryAnchor(anchor, "stop request", dependencies);
        const verified = fileSnapshot(
          anchoredChild(anchor, quarantineName),
          "stop request",
          dependencies,
        );
        if (
          verified.kind !== "file" ||
          !samePathIdentity(before.identity, verified.identity) ||
          verified.sha256 !== before.sha256
        ) {
          throw new Error("stop request changed after its cleanup claim");
        }
        const verifiedRequest = JSON.parse(verified.data.toString("utf8"));
        if (!validStopRequest(verifiedRequest, processToken)) {
          throw new Error("stop request identity changed after its cleanup claim");
        }
        fs.unlinkSync(anchoredChild(anchor, quarantineName));
        const removed = fileSnapshot(
          anchoredChild(anchor, quarantineName),
          "stop request cleanup claim",
          dependencies,
        );
        if (removed.kind !== "absent") {
          throw new Error("stop request cleanup claim remained after removal");
        }
      } catch (error) {
        throw preserveQuarantine(error, quarantine);
      } finally {
        try {
          fs.closeSync(anchor.descriptor);
        } catch {
          // The claim result remains authoritative.
        }
      }
    },
  };
}

function validStopRequest(request, processToken) {
  const requestedAt = Date.parse(request?.requestedAt);
  const deadlineAt = Date.parse(request?.deadlineAt);
  return (
    request &&
    typeof request === "object" &&
    !Array.isArray(request) &&
    JSON.stringify(Object.keys(request).sort()) ===
      JSON.stringify(["deadlineAt", "processToken", "requestedAt", "schemaVersion"].sort()) &&
    request.schemaVersion === 1 &&
    Number.isFinite(requestedAt) &&
    Number.isFinite(deadlineAt) &&
    requestedAt <= Date.now() &&
    deadlineAt > requestedAt &&
    deadlineAt - requestedAt <= PROCESS_STOP_DEADLINE_MS &&
    request.processToken === processToken
  );
}

function inspectTokenBoundStopRequest(target, processToken, dependencies = {}) {
  dependencies.assertBoundary?.({ phase: "inspect", target });
  const anchor = openDirectoryAnchor(target, "stop request", dependencies);
  try {
    const snapshot = fileSnapshot(
      anchoredChild(anchor, path.basename(target)),
      "stop request",
      dependencies,
    );
    if (snapshot.kind === "absent") return null;
    const request = JSON.parse(snapshot.data.toString("utf8"));
    if (!validStopRequest(request, processToken)) {
      throw new Error("stop request does not match the owned process token and schema");
    }
    return {
      expected: { kind: "file", identity: snapshot.identity, sha256: snapshot.sha256 },
      request,
    };
  } finally {
    fs.closeSync(anchor.descriptor);
  }
}

export function removeTokenBoundStopRequest(target, processToken, dependencies = {}) {
  const claim = claimTokenBoundStopRequest(target, processToken, dependencies);
  if (!claim) return false;
  claim.remove();
  return true;
}

function regularFile(target, label, options = {}) {
  if (!path.isAbsolute(target)) throw new Error(`${label} path must be absolute`);
  assertRunnerNamedPath(target, label, options);
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular file`);
  return stat;
}

function defaultRunnerPath(source) {
  if (process.platform !== "win32") return "/usr/bin:/bin";
  const systemRoot = source.SystemRoot ?? source.WINDIR;
  if (typeof systemRoot !== "string" || !path.win32.isAbsolute(systemRoot)) {
    throw new Error("runner requires an absolute Windows system root when PATH is unset");
  }
  return [path.win32.join(systemRoot, "System32"), systemRoot].join(path.delimiter);
}

function minimalEnvironment(extra, source = process.env, dependencies = {}) {
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
    if (source[key] !== undefined) env[key] = source[key];
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
  env.PATH ??= dependencies.defaultPath ?? defaultRunnerPath(source);
  return { ...env, ...extra };
}

function assertAbsoluteEnvironmentPath(value, label, assertPath, boundaryOptions) {
  if (typeof value !== "string" || !value || !path.isAbsolute(value)) {
    throw new Error(`${label} must be an absolute non-empty path`);
  }
  assertPath(value, label, boundaryOptions);
}

function assertRunnerEnvironment(environment, dependencies = {}) {
  const boundaryOptions = dependencies.wslBoundaryOptions ?? {};
  const assertOwnedNamespace =
    dependencies.assertCurrentWslOwnedNamespace ?? assertCurrentWslOwnedNamespace;
  const assertPath = dependencies.assertCurrentWslPath ?? assertCurrentWslPath;
  for (const name of ["HOME", "LOCALAPPDATA", "TEMP", "TMP", "TMPDIR", "USERPROFILE"]) {
    if (environment[name] === undefined) continue;
    const label = `LiteLLM environment namespace ${name}`;
    assertAbsoluteEnvironmentPath(environment[name], label, assertPath, boundaryOptions);
    assertOwnedNamespace(environment[name], label, boundaryOptions);
  }
  if (typeof environment.PATH !== "string" || !environment.PATH) {
    throw new Error("LiteLLM PATH must be a non-empty path list");
  }
  for (const [index, entry] of environment.PATH.split(path.delimiter).entries()) {
    const label = `LiteLLM PATH entry ${index + 1}`;
    assertAbsoluteEnvironmentPath(entry, label, assertPath, boundaryOptions);
    assertOwnedNamespace(entry, label, boundaryOptions);
  }
}

function portOpen(timeoutMs = 250) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: HOST, port: PORT });
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function authenticatedGatewayReady(masterKey, timeoutMs = 750) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`http://${HOST}:${PORT}/v1/models`, {
      headers: { Authorization: `Bearer ${masterKey}` },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      return false;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65_536) {
        controller.abort();
        return false;
      }
      chunks.push(Buffer.from(value));
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return Array.isArray(body?.data) && body.data.some((model) => model?.id === ALIAS);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function runGatewayRunner(argv = process.argv.slice(2), dependencies = {}) {
  const options = parse(argv);
  const spawnChild = dependencies.spawn ?? spawn;
  const pathExists = dependencies.existsSync ?? fs.existsSync;
  const readProviderCredential = dependencies.readProtectedSecret ?? readProtectedSecret;
  const readGatewayCredential =
    dependencies.readProtectedGatewaySecret ?? readProtectedGatewaySecret;
  const writeAtomicJson = dependencies.atomicJson ?? atomicJson;
  const checkPortOpen = dependencies.portOpen ?? portOpen;
  const checkGatewayReady = dependencies.authenticatedGatewayReady ?? authenticatedGatewayReady;
  const pause = dependencies.delay ?? delay;
  const heartbeatIntervalMs = dependencies.heartbeatIntervalMs ?? 2_000;
  const stopWatcherIntervalMs = dependencies.stopWatcherIntervalMs ?? 250;
  const startupAttempts = dependencies.startupAttempts ?? 60;
  const startupDelayMs = dependencies.startupDelayMs ?? 250;
  const stopAttempts = dependencies.stopAttempts ?? 20;
  const stopDelayMs = dependencies.stopDelayMs ?? 250;
  const stopDeadlineMs = dependencies.stopDeadlineMs ?? PROCESS_STOP_DEADLINE_MS;
  const verifyStopRequest = dependencies.verifyCurrentUserFileAsync ?? verifyCurrentUserFileAsync;
  const required = [
    "config",
    "config-root",
    "config-root-boundary",
    "litellm",
    "master-key",
    "port",
    "provider-key",
    "receipt",
    "receipt-expected",
    "runner-executable",
    "runner-script",
    "state-root",
    "state-root-boundary",
    "stop-request",
    "token",
  ];
  for (const name of required) {
    if (!options[name]) throw new Error(`missing --${name}`);
  }
  const runnerPathOptions = {
    wslBoundaryOptions: dependencies.wslBoundaryOptions ?? {},
  };
  dependencies.beforeInitialBoundary?.({ options });
  await assertRunnerBoundaries(options, dependencies);
  if (Number(options.port) !== PORT) throw new Error("runner permits only port 4000");
  if (!/^[a-f0-9]{64}$/.test(options.token)) throw new Error("invalid process token");
  if (
    options["receipt-expected"] !== "absent" &&
    !/^[a-f0-9]{64}$/.test(options["receipt-expected"])
  ) {
    throw new Error("invalid expected receipt state");
  }
  await assertRunnerBoundaries(options, dependencies);
  regularFile(options.config, "gateway config", runnerPathOptions);
  regularFile(options.litellm, "LiteLLM executable", runnerPathOptions);
  const childEnvironment = minimalEnvironment(
    {
      LITELLM_LOG: "ERROR",
      NO_COLOR: "1",
      PYTHONUTF8: "1",
    },
    dependencies.env ?? process.env,
    dependencies,
  );
  dependencies.beforeCredentialBoundary?.({ options });
  await assertRunnerBoundaries(options, dependencies);
  assertRunnerEnvironment(childEnvironment, dependencies);
  const protectedReadOptions = runnerPathOptions;
  const providerKey = readProviderCredential(
    options["provider-key"],
    "provider credential",
    protectedReadOptions,
  );
  const masterKey = readGatewayCredential(
    options["master-key"],
    "gateway credential",
    protectedReadOptions,
  );
  if (await checkPortOpen()) throw new Error("port 4000 is already occupied");

  const args = ["--config", options.config, "--host", HOST, "--port", String(PORT)];
  const bindings = await assertRunnerBoundaries(options, dependencies);
  assertRunnerNamedPath(process.execPath, "running Node executable", runnerPathOptions);
  const runnerExecutable = fs.realpathSync.native(process.execPath);
  assertRunnerNamedPath(fileURLToPath(import.meta.url), "running script", runnerPathOptions);
  const runnerScript = fs.realpathSync.native(fileURLToPath(import.meta.url));
  assertRunnerNamedPath(bindings.nodeExecutable, "Node executable", runnerPathOptions);
  if (runnerExecutable !== fs.realpathSync.native(bindings.nodeExecutable)) {
    throw new Error("running Node executable differs from the installed runner binding");
  }
  assertRunnerNamedPath(bindings.runnerScript, "runner script", runnerPathOptions);
  if (runnerScript !== fs.realpathSync.native(bindings.runnerScript)) {
    throw new Error("running script differs from the installed runner binding");
  }
  assertRunnerNamedPath(options.litellm, "LiteLLM executable", runnerPathOptions);
  const gatewayExecutable = fs.realpathSync.native(options.litellm);
  assertRunnerNamedPath(options.config, "gateway configuration", runnerPathOptions);
  const configPath = fs.realpathSync.native(options.config);
  assertRunnerNamedPath(options.config, "gateway configuration", runnerPathOptions);
  const configSha256 = sha256(fs.readFileSync(options.config));
  const baseReceipt = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    processToken: options.token,
    runnerPid: process.pid,
    runnerExecutable,
    runnerScript,
    gatewayExecutable,
    gatewayArgsDigest: sha256(JSON.stringify(args)),
    configPath,
    configSha256,
    host: HOST,
    port: PORT,
    startedAt: new Date().toISOString(),
  };
  dependencies.beforeSpawnBoundary?.({ options });
  await assertRunnerBoundaries(options, dependencies);
  assertRunnerEnvironment(childEnvironment, dependencies);
  dependencies.beforeConfirmedCredentialBoundary?.({ options });
  assertRunnerSynchronousBoundaries(options, dependencies);
  assertRunnerEnvironment(childEnvironment, dependencies);
  const confirmedProviderKey = readProviderCredential(
    options["provider-key"],
    "provider credential",
    protectedReadOptions,
  );
  const confirmedMasterKey = readGatewayCredential(
    options["master-key"],
    "gateway credential",
    protectedReadOptions,
  );
  if (
    sha256(confirmedProviderKey) !== sha256(providerKey) ||
    sha256(confirmedMasterKey) !== sha256(masterKey)
  ) {
    throw new Error("credential content changed before gateway consumption");
  }
  assertRunnerSynchronousBoundaries(options, dependencies);
  assertRunnerEnvironment(childEnvironment, dependencies);
  const child = spawnChild(options.litellm, args, {
    cwd: path.dirname(options.config),
    env: {
      ...childEnvironment,
      HETZNER_INFERENCE_API_KEY: confirmedProviderKey,
      LITELLM_MASTER_KEY: confirmedMasterKey,
    },
    stdio: "ignore",
    windowsHide: true,
  });
  if (!Number.isInteger(child.pid) || child.pid <= 0) {
    throw new Error("LiteLLM child has no usable process identity");
  }
  let stopped = false;
  let stopping = false;
  let exitDetails = null;
  let childError = null;
  let fatalError = null;
  let heartbeat = null;
  let stopWatcher = null;
  let stopOperation = null;
  let stopRequestBusy = false;
  let termination = null;
  let boundaryCheck = null;
  let receiptWrites = Promise.resolve();
  let pendingReceiptWrites = 0;
  let heartbeatReceipt = null;
  let stopDeadlineAt = null;
  let activeStopBudget = null;
  let activeStopClaim = null;
  let activeStopContext = null;
  let terminalReceiptPublished = false;
  let receiptExpected =
    options["receipt-expected"] === "absent"
      ? { kind: "absent" }
      : { kind: "file", sha256: options["receipt-expected"] };
  let resolveChildExit;
  const childExit = new Promise((resolve) => {
    resolveChildExit = resolve;
  });

  function recordChildExit(details) {
    if (stopped) return;
    stopped = true;
    exitDetails = details;
    resolveChildExit(details);
  }

  const onChildError = (error) => {
    childError ??= error;
    clearTimers();
    queueMicrotask(() => {
      void terminateOwnedChild().catch((terminationError) => {
        fatalError = terminationError;
      });
    });
  };
  child.on("error", onChildError);
  child.once("exit", (code, signal) => {
    recordChildExit({ error: childError, code, signal });
  });
  child.once("close", (code, signal) => {
    recordChildExit({ error: childError, code, signal });
  });

  function clearTimers() {
    if (heartbeat !== null) clearInterval(heartbeat);
    if (stopWatcher !== null) clearInterval(stopWatcher);
    heartbeat = null;
    stopWatcher = null;
  }

  async function terminateOwnedChild(deadlineReserveMs = 0) {
    if (stopped) return;
    if (!termination) {
      termination = (async () => {
        stopping = true;
        stopDeadlineAt ??= Date.now() + stopDeadlineMs;
        const termAttempts = Math.ceil(stopAttempts / 2);
        const killAttempts = Math.floor(stopAttempts / 2);
        const terminationDeadlineAt = stopDeadlineAt - deadlineReserveMs;
        const termDeadlineAt = Date.now() + Math.max(0, terminationDeadlineAt - Date.now()) / 2;
        const waitForExit = async (attempts, phaseDeadlineAt) => {
          for (let attempt = 0; attempt < attempts && !stopped; attempt += 1) {
            const remaining = Math.min(terminationDeadlineAt, phaseDeadlineAt) - Date.now();
            if (remaining <= 0) break;
            await pause(Math.min(stopDelayMs, remaining));
          }
        };
        try {
          child.kill("SIGTERM");
        } catch {
          // The exit event remains the source of truth.
        }
        await waitForExit(termAttempts, termDeadlineAt);
        if (!stopped) {
          try {
            child.kill("SIGKILL");
          } catch {
            // The final bounded wait below still verifies termination.
          }
          await waitForExit(killAttempts, terminationDeadlineAt);
        }
        if (!stopped) throw new Error("unable to terminate the exact LiteLLM child");
        await childExit;
      })();
    }
    await termination;
  }

  function failClosed(error) {
    if (!fatalError) fatalError = error instanceof Error ? error : new Error(String(error));
    clearTimers();
    void terminateOwnedChild().catch((terminationError) => {
      fatalError = terminationError;
    });
  }

  function checkRunnerBoundaries(deadlineAt = null, deadlineReserveMs = 0) {
    if (deadlineAt !== null) {
      return assertRunnerBoundaries(options, dependencies, { deadlineAt, deadlineReserveMs });
    }
    if (boundaryCheck !== null) return boundaryCheck;
    const operation = assertRunnerBoundaries(options, dependencies);
    const tracked = operation.finally(() => {
      if (boundaryCheck === tracked) boundaryCheck = null;
    });
    boundaryCheck = tracked;
    return tracked;
  }

  function assertStopDeadline(label, deadlineReserveMs = 0) {
    if (stopDeadlineAt !== null && Date.now() >= stopDeadlineAt - deadlineReserveMs) {
      throw new Error(`${label} exceeded the ${stopDeadlineMs}-ms stop deadline`);
    }
  }

  function assertReceiptWriteAllowed(status, isReady) {
    if (isReady && (fatalError || stopping || stopped)) {
      throw new ReceiptWriteCancelled("ready receipt superseded by a terminal transition");
    }
    if (fatalError) throw fatalError;
    if (status === "ready" && (stopping || stopped)) {
      throw new Error("ready receipt is not permitted after a terminal transition");
    }
  }

  function writeReceipt(status, extra = {}, writeOptions = {}) {
    const isHeartbeat = writeOptions.heartbeat === true;
    const isReady = status === "ready";
    const deadlineReserveMs = writeOptions.deadlineReserveMs ?? 0;
    if (isHeartbeat && heartbeatReceipt !== null) return heartbeatReceipt;
    if (fatalError) {
      return isReady ? Promise.resolve(null) : Promise.reject(fatalError);
    }
    let statusMetadata = {};
    if (status === "stopping") {
      if (
        Object.keys(extra).length !== 1 ||
        typeof extra.stopReason !== "string" ||
        extra.stopReason.length === 0
      ) {
        return Promise.reject(new Error("stopping receipt requires one stop reason"));
      }
      statusMetadata = { stopReason: extra.stopReason, stopRequest: activeStopContext };
    } else if (status === "stopped" || status === "failed") {
      const unknown = Object.keys(extra).filter(
        (key) => !["error", "exitCode", "exitSignal"].includes(key),
      );
      if (unknown.length > 0) {
        return Promise.reject(new Error("terminal receipt contains unsupported metadata"));
      }
      statusMetadata = {
        error: extra.error ?? null,
        exitCode: extra.exitCode ?? null,
        exitSignal: extra.exitSignal ?? null,
        stopRequest: activeStopContext,
      };
    } else if (status !== "ready" || Object.keys(extra).length > 0) {
      return Promise.reject(new Error("unsupported process receipt status"));
    }
    const scheduled = receiptWrites.then(async () => {
      if (isReady && (fatalError || stopping || stopped)) return null;
      assertReceiptWriteAllowed(status, isReady);
      if (isHeartbeat) dependencies.beforeHeartbeatReceipt?.({ target: options.receipt });
      assertStopDeadline(`${status} receipt publication`, deadlineReserveMs);
      const receipt = {
        ...baseReceipt,
        childPid: child.pid,
        heartbeatAt: new Date().toISOString(),
        status,
        ...statusMetadata,
      };
      const next = await writeAtomicJson(options.receipt, receipt, {
        afterBoundary: dependencies.afterReceiptBoundary,
        assertBoundary: ({ phase }) => {
          assertRunnerSynchronousBoundaries(options, dependencies);
          if (phase !== "failure-cleanup") {
            assertReceiptWriteAllowed(status, isReady);
            assertStopDeadline(`${status} receipt publication`, deadlineReserveMs);
          }
        },
        assertBoundaryAsync: async ({ phase }) => {
          await checkRunnerBoundaries(stopDeadlineAt, deadlineReserveMs);
          if (phase !== "failure-cleanup") assertReceiptWriteAllowed(status, isReady);
          if (phase !== "failure-cleanup") {
            assertStopDeadline(`${status} receipt publication`, deadlineReserveMs);
          }
        },
        deadlineAt: stopDeadlineAt,
        deadlineReserveMs,
        execFile: dependencies.execFile,
        expected: receiptExpected,
        label: "process receipt",
        wslBoundaryOptions: runnerPathOptions.wslBoundaryOptions,
      });
      if (!next || next.kind !== "file" || !next.identity || !next.sha256) {
        throw new Error("process receipt writer returned no owned publication state");
      }
      receiptExpected = next;
      assertStopDeadline(`${status} receipt publication`, deadlineReserveMs);
      if (status === "stopped" || status === "failed") terminalReceiptPublished = true;
      return next;
    });
    pendingReceiptWrites += 1;
    const operation = scheduled.catch((error) => {
      if (isReady && error instanceof ReceiptWriteCancelled) {
        return null;
      }
      throw error;
    });
    const finalized = operation.finally(() => {
      pendingReceiptWrites -= 1;
    });
    receiptWrites = finalized.catch((error) => {
      failClosed(error);
    });
    if (!isHeartbeat) return finalized;
    const tracked = finalized.finally(() => {
      if (heartbeatReceipt === tracked) heartbeatReceipt = null;
    });
    heartbeatReceipt = tracked;
    return tracked;
  }

  async function stopOwnedChild(reason, deadlineReserveMs = 0) {
    if (stopping || stopped) return;
    stopping = true;
    stopDeadlineAt ??= Date.now() + stopDeadlineMs;
    clearTimers();
    const publishStopping = pendingReceiptWrites === 0;
    const tasks = [terminateOwnedChild(deadlineReserveMs)];
    if (publishStopping) {
      tasks.unshift(writeReceipt("stopping", { stopReason: reason }, { deadlineReserveMs }));
    }
    const results = await Promise.allSettled(tasks);
    const receiptResult = publishStopping ? results[0] : { status: "fulfilled" };
    const terminationResult = results.at(-1);
    if (terminationResult.status === "rejected") throw terminationResult.reason;
    if (receiptResult.status === "rejected") throw receiptResult.reason;
  }

  async function cleanupActiveStopClaim() {
    if (!activeStopClaim) return;
    const claim = activeStopClaim;
    await dependencies.beforeStopRequestCleanup?.({ claim: claim.path });
    await checkRunnerBoundaries(stopDeadlineAt, activeStopBudget.claimCleanupReserveMs);
    assertStopDeadline("stop request cleanup", activeStopBudget.claimCleanupReserveMs);
    // Removing the exact retained claim is the completion commit. Callers bind
    // the claim name and hash from the terminal receipt and require its absence.
    claim.remove();
    activeStopClaim = null;
  }

  stopWatcher = setInterval(() => {
    if (stopRequestBusy || stopped || stopping) return;
    stopRequestBusy = true;
    const operation = (async () => {
      await checkRunnerBoundaries();
      if (fatalError || stopped || stopping) return;
      if (!pathExists(options["stop-request"])) return;
      const inspected = inspectTokenBoundStopRequest(options["stop-request"], options.token, {
        assertBoundary: () => assertRunnerSynchronousBoundaries(options, dependencies),
        wslBoundaryOptions: runnerPathOptions.wslBoundaryOptions,
      });
      if (!inspected) return;
      stopDeadlineAt ??= Date.parse(inspected.request.deadlineAt);
      const requestBudget = stopDeadlineBudget(
        Date.parse(inspected.request.deadlineAt) - Date.parse(inspected.request.requestedAt),
      );
      assertStopDeadline("stop request detection");
      dependencies.beforeStopRequestClaim?.({ target: options["stop-request"] });
      await checkRunnerBoundaries(stopDeadlineAt, requestBudget.runnerClaimReserveMs);
      assertStopDeadline("stop request protection", requestBudget.runnerClaimReserveMs);
      await verifyStopRequest(options["stop-request"], 0o600, {
        deadlineAt: stopDeadlineAt,
        deadlineReserveMs: requestBudget.runnerClaimReserveMs,
        execFile: dependencies.execFile,
        expectedIdentity: inspected.expected.identity,
        windowsAclSnapshotAsync: dependencies.windowsAclSnapshotAsync,
        wslBoundaryOptions: runnerPathOptions.wslBoundaryOptions,
      });
      assertStopDeadline("stop request claim", requestBudget.runnerClaimReserveMs);
      if (fatalError || stopped || stopping) return;
      const claim = claimTokenBoundStopRequest(options["stop-request"], options.token, {
        assertBoundary: () => assertRunnerSynchronousBoundaries(options, dependencies),
        afterClaim: dependencies.afterStopRequestClaim,
        expected: inspected.expected,
        wslBoundaryOptions: runnerPathOptions.wslBoundaryOptions,
      });
      if (!claim) return;
      activeStopBudget = requestBudget;
      activeStopClaim = claim;
      activeStopContext = {
        claim: path.basename(claim.path),
        deadlineAt: claim.request.deadlineAt,
        requestedAt: claim.request.requestedAt,
        sha256: claim.sha256,
      };
      await stopOwnedChild("approved-stop-request", requestBudget.postTerminationReserveMs);
    })();
    const trackedOperation = operation.catch((error) => {
      failClosed(error);
      throw error;
    });
    stopOperation = trackedOperation;
    void trackedOperation
      .catch(() => {})
      .finally(() => {
        if (stopOperation === trackedOperation) stopOperation = null;
        stopRequestBusy = false;
      });
  }, stopWatcherIntervalMs);

  const signalHandlers = new Map();
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const handler = () => {
      void stopOwnedChild(`runner-${signal.toLowerCase()}`).catch(failClosed);
    };
    signalHandlers.set(signal, handler);
    process.on(signal, handler);
  }

  try {
    let ready = false;
    let consecutiveAuthenticatedChecks = 0;
    for (let attempt = 0; attempt < startupAttempts && !stopped && !fatalError; attempt += 1) {
      if (await checkGatewayReady(confirmedMasterKey)) {
        consecutiveAuthenticatedChecks += 1;
        if (consecutiveAuthenticatedChecks >= 3) {
          ready = true;
          break;
        }
      } else {
        consecutiveAuthenticatedChecks = 0;
      }
      await pause(startupDelayMs);
    }
    if (fatalError) throw fatalError;
    if (stopped && childError) throw childError;
    if (!ready) throw new Error("LiteLLM did not bind the reviewed loopback port in time");
    await writeReceipt("ready");

    heartbeat = setInterval(() => {
      if (stopped || stopping) return;
      void writeReceipt("ready", {}, { heartbeat: true }).catch(() => {});
    }, heartbeatIntervalMs);
    while (!stopped && !fatalError) await pause(250);
    if (fatalError) throw fatalError;

    await childExit;
    if (stopOperation) await stopOperation;
    if (fatalError) throw fatalError;
    const unexpectedExit = Boolean(exitDetails?.error) || !stopping;
    await writeReceipt(
      unexpectedExit ? "failed" : "stopped",
      {
        error: exitDetails?.error?.message ?? null,
        exitCode: exitDetails?.code ?? null,
        exitSignal: exitDetails?.signal ?? null,
      },
      { deadlineReserveMs: activeStopBudget?.terminalPublicationReserveMs ?? 0 },
    );
    await cleanupActiveStopClaim();
    if (unexpectedExit) {
      throw (
        exitDetails.error ??
        new Error(`LiteLLM exited unexpectedly: ${exitDetails.signal ?? String(exitDetails.code)}`)
      );
    }
  } catch (error) {
    clearTimers();
    try {
      await terminateOwnedChild();
    } catch (terminationError) {
      throw new AggregateError(
        [error, terminationError],
        "Gateway runner failed to terminate safely",
      );
    }
    if (!fatalError && !terminalReceiptPublished) {
      try {
        await writeReceipt(
          "failed",
          {
            error: exitDetails?.error?.message ?? error.message,
            exitCode: exitDetails?.code ?? null,
            exitSignal: exitDetails?.signal ?? null,
          },
          { deadlineReserveMs: activeStopBudget?.terminalPublicationReserveMs ?? 0 },
        );
        await cleanupActiveStopClaim();
      } catch {
        // The exact child is already terminal; the original failure remains authoritative.
      }
    }
    throw error;
  } finally {
    clearTimers();
    for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
    try {
      if (!stopped) await terminateOwnedChild();
      if (stopOperation) await stopOperation.catch(() => {});
      await receiptWrites;
    } finally {
      child.removeListener("error", onChildError);
    }
  }
}

const executedDirectly =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (executedDirectly) {
  runGatewayRunner().catch((error) => {
    process.stderr.write(`gateway runner failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
