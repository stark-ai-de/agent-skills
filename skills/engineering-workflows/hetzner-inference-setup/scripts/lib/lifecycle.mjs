import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathIdentity, samePathIdentity } from "../../assets/templates/protected-file.mjs";
import {
  GATEWAY_HOST,
  GATEWAY_PORT,
  PROCESS_READY_TIMEOUT_MS,
  PROCESS_STOP_PHASE_COUNT,
  PROCESS_STOP_TIMEOUT_MS,
} from "./constants.mjs";
import { SetupError, invariant } from "./errors.mjs";
import {
  atomicWriteJson,
  credentialPairContinuity,
  inspectPath,
  inventoryTree,
  readJson,
} from "./files.mjs";
import { assertWslSameEnvironmentPath, minimalCommandEnvironment } from "./hosts.mjs";
import { sha256, stableJson } from "./json.mjs";
import {
  inspectProtectedDirectoryBoundary,
  securePathPermissions,
  verifyRestrictedFilePermissions,
} from "./permissions.mjs";
import {
  assertCurrentHostStorageBoundaries,
  manifestProcessHasIdentity,
  processIdentityFindings,
  processReceiptFresh,
  readProcessReceipt,
} from "./state.mjs";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function newStopWindow(dependencies = {}) {
  const requestedAt = Date.now();
  const timeoutMs = dependencies.stopTimeoutMs ?? PROCESS_STOP_TIMEOUT_MS;
  return {
    ...stopDeadlineBudget(timeoutMs),
    deadlineAt: requestedAt + timeoutMs,
    requestedAt,
  };
}

function stopDeadlineBudget(durationMs) {
  invariant(
    Number.isFinite(durationMs) && durationMs > 0 && durationMs <= PROCESS_STOP_TIMEOUT_MS,
    "process_stop_request_invalid",
    "Process stop request requires a bounded lifecycle duration",
  );
  const phaseMs = durationMs / PROCESS_STOP_PHASE_COUNT;
  return {
    callerProofReserveMs: phaseMs * 2,
    identityProofReserveMs: phaseMs / 5,
    requestPublicationReserveMs: phaseMs * 12,
    terminalReceiptReadReserveMs: phaseMs,
  };
}

function remainingStopTime(deadlineAt, deadlineReserveMs = 0) {
  return Math.max(0, deadlineAt - deadlineReserveMs - Date.now());
}

function assertStopDeadline(deadlineAt, label, deadlineReserveMs = 0) {
  invariant(
    Number.isFinite(deadlineAt) && Date.now() < deadlineAt - deadlineReserveMs,
    "gateway_stop_timeout",
    `${label} exceeded the shared process-stop deadline`,
  );
}

async function readReceiptBeforeDeadline(
  readReceipt,
  paths,
  host,
  deadlineAt,
  label,
  deadlineReserveMs = 0,
) {
  assertStopDeadline(deadlineAt, label, deadlineReserveMs);
  const receipt = await readReceipt(paths, host, { deadlineAt, deadlineReserveMs });
  assertStopDeadline(deadlineAt, label, deadlineReserveMs);
  return receipt;
}

async function readReceiptAfterCommittedStop(
  readReceipt,
  paths,
  host,
  deadlineAt,
  label,
  deadlineReserveMs,
  pause,
) {
  // Receipt replacement claims the old name before the new exclusive link is
  // published. Only a caller already bound to a committed/joined stop may wait
  // through that transient absence; a present invalid receipt still fails closed.
  while (true) {
    try {
      const receipt = await readReceiptBeforeDeadline(
        readReceipt,
        paths,
        host,
        deadlineAt,
        label,
        deadlineReserveMs,
      );
      if (receipt !== null) return receipt;
    } catch (error) {
      let transientAbsence = error?.code === "ENOENT";
      if (!transientAbsence && error?.code === "process_receipt_invalid") {
        assertStopDeadline(deadlineAt, label, deadlineReserveMs);
        assertCurrentHostStorageBoundaries(paths, host);
        const current = await inspectPath(paths.processReceipt, { hash: false });
        assertStopDeadline(deadlineAt, label, deadlineReserveMs);
        assertCurrentHostStorageBoundaries(paths, host);
        transientAbsence = current.kind === "absent";
      }
      if (!transientAbsence) throw error;
    }

    const remaining = remainingStopTime(deadlineAt, deadlineReserveMs);
    assertStopDeadline(deadlineAt, label, deadlineReserveMs);
    await pause(Math.min(25, remaining));
  }
}

function stopResult(changed, receipt) {
  return {
    changed,
    receipt,
    terminalStatus: receipt?.status ?? "not-running",
  };
}

async function waitForExactChildExit(child, timeoutMs = 6_000) {
  if (
    Number.isInteger(child.exitCode) ||
    (child.signalCode !== null && child.signalCode !== undefined)
  )
    return true;
  return await new Promise((resolve) => {
    const finish = (terminal) => {
      clearTimeout(timer);
      child.removeListener("exit", onTerminal);
      child.removeListener("close", onTerminal);
      resolve(terminal);
    };
    const onTerminal = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.once("exit", onTerminal);
    child.once("close", onTerminal);
  });
}

export async function writeStopRequest(paths, host, processToken, now, options = {}) {
  const deadlineAt = options.deadlineAt ?? now + PROCESS_STOP_TIMEOUT_MS;
  const downstreamReserveMs =
    options.downstreamReserveMs ?? stopDeadlineBudget(deadlineAt - now).requestPublicationReserveMs;
  const requiredDownstreamReserveMs = stopDeadlineBudget(
    deadlineAt - now,
  ).requestPublicationReserveMs;
  invariant(
    Number.isFinite(now) &&
      Number.isFinite(deadlineAt) &&
      deadlineAt > now &&
      deadlineAt - now <= PROCESS_STOP_TIMEOUT_MS,
    "process_stop_request_invalid",
    "Process stop request requires a bounded absolute deadline",
  );
  invariant(
    Number.isFinite(downstreamReserveMs) &&
      downstreamReserveMs > 0 &&
      downstreamReserveMs < deadlineAt - now &&
      downstreamReserveMs === requiredDownstreamReserveMs,
    "process_stop_request_invalid",
    "Process stop request requires the shared runner and caller proof reserve",
  );
  let committed = false;
  try {
    await (options.atomicWriteJson ?? atomicWriteJson)(
      paths.processStopRequest,
      {
        deadlineAt: new Date(deadlineAt).toISOString(),
        schemaVersion: 1,
        processToken,
        requestedAt: new Date(now).toISOString(),
      },
      {
        allowImmediateConsumption: true,
        assertMutationOwned: options.assertMutationOwned,
        beforeRename: async (temporary, binding) => {
          await (options.securePathPermissions ?? securePathPermissions)(temporary, host, 0o600, {
            deadlineAt,
            deadlineReserveMs: downstreamReserveMs,
            expectedIdentity: binding.identity,
          });
          invariant(
            Date.now() < deadlineAt - downstreamReserveMs,
            "process_stop_request_invalid",
            "Process stop request protection exhausted the runner's reserved deadline budget",
          );
        },
        beforePublish: async (...args) => {
          invariant(
            Date.now() < deadlineAt - downstreamReserveMs,
            "process_stop_request_invalid",
            "Process stop request publication exhausted the runner's reserved deadline budget",
          );
          await options.beforePublish?.(...args);
          invariant(
            Date.now() < deadlineAt - downstreamReserveMs,
            "process_stop_request_invalid",
            "Process stop request publication exhausted the runner's reserved deadline budget",
          );
        },
        beforeCommit: () => {
          invariant(
            Date.now() < deadlineAt - downstreamReserveMs,
            "process_stop_request_invalid",
            "Process stop request publication exhausted the runner's reserved deadline budget",
          );
        },
        changedCode: "process_state_changed",
        expected: { kind: "absent" },
        label: "Process stop request",
        mode: 0o600,
        onCommit: () => {
          committed = true;
        },
      },
    );
  } catch (error) {
    // Once the exclusive target link exists, the request may already have been
    // observed or claimed. Preserve at-least-once semantics instead of telling
    // the caller that a committed stop request was never published.
    if (!committed) throw error;
  }
  invariant(
    committed,
    "process_stop_request_invalid",
    "Process stop request writer returned without a publication commit",
  );
}

function exactKeys(value, expected) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
  );
}

function validStopRequestDocument(request, processToken, expected = null) {
  const requestedAt = Date.parse(request?.requestedAt);
  const deadlineAt = Date.parse(request?.deadlineAt);
  return (
    exactKeys(request, ["deadlineAt", "processToken", "requestedAt", "schemaVersion"]) &&
    request.schemaVersion === 1 &&
    request.processToken === processToken &&
    Number.isFinite(requestedAt) &&
    Number.isFinite(deadlineAt) &&
    deadlineAt > requestedAt &&
    deadlineAt - requestedAt <= PROCESS_STOP_TIMEOUT_MS &&
    (expected === null ||
      (request.requestedAt === new Date(expected.requestedAt).toISOString() &&
        request.deadlineAt === new Date(expected.deadlineAt).toISOString()))
  );
}

function receiptStopContext(receipt, paths, label) {
  const context = receipt?.stopRequest;
  invariant(
    exactKeys(context, ["claim", "deadlineAt", "requestedAt", "sha256"]),
    "process_stop_request_invalid",
    `${label} has no complete stop-request completion context`,
  );
  const requestedAt = Date.parse(context.requestedAt);
  const deadlineAt = Date.parse(context.deadlineAt);
  const claimPrefix = `.${path.basename(paths.processStopRequest)}.${receipt.runnerPid}.`;
  const claimSuffix = ".quarantine";
  const claim = typeof context.claim === "string" ? context.claim : "";
  const claimId = claim.slice(claimPrefix.length, -claimSuffix.length);
  invariant(
    Number.isFinite(requestedAt) &&
      Number.isFinite(deadlineAt) &&
      deadlineAt > requestedAt &&
      deadlineAt - requestedAt <= PROCESS_STOP_TIMEOUT_MS &&
      new Date(requestedAt).toISOString() === context.requestedAt &&
      new Date(deadlineAt).toISOString() === context.deadlineAt &&
      typeof context.sha256 === "string" &&
      /^[a-f0-9]{64}$/u.test(context.sha256) &&
      typeof context.claim === "string" &&
      path.basename(claim) === claim &&
      claim.startsWith(claimPrefix) &&
      claim.endsWith(claimSuffix) &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(claimId),
    "process_stop_request_invalid",
    `${label} has malformed stop-request completion context`,
  );
  return {
    ...stopDeadlineBudget(deadlineAt - requestedAt),
    claimPath: path.join(path.dirname(paths.processStopRequest), context.claim),
    context,
    deadlineAt,
    processToken: receipt.processToken,
    requestedAt,
  };
}

function expectedStopContext(stopWindow, processToken) {
  return {
    deadlineAt: stopWindow.deadlineAt,
    processToken,
    requestedAt: stopWindow.requestedAt,
  };
}

function assertMatchingStopContext(receipt, paths, expected, label) {
  const stopWindow = receiptStopContext(receipt, paths, label);
  invariant(
    stopWindow.processToken === expected.processToken &&
      stopWindow.requestedAt === expected.requestedAt &&
      stopWindow.deadlineAt === expected.deadlineAt,
    "process_stop_request_changed",
    `${label} does not match the caller's exact stop request`,
  );
  return stopWindow;
}

async function stopCompletionReady(
  paths,
  host,
  receipt,
  expected,
  deadlineReserveMs = 0,
  validatePresentClaim = false,
) {
  const stopWindow = assertMatchingStopContext(
    receipt,
    paths,
    expected,
    "Terminal process receipt",
  );
  const assertCompletionDeadline = () => {
    if (deadlineReserveMs !== null) {
      assertStopDeadline(stopWindow.deadlineAt, "Stop-request completion proof", deadlineReserveMs);
    }
  };
  assertCompletionDeadline();
  assertCurrentHostStorageBoundaries(paths, host);
  const targetState = await inspectPath(paths.processStopRequest, { hash: false });
  assertCompletionDeadline();
  assertCurrentHostStorageBoundaries(paths, host);
  invariant(
    targetState.kind === "absent",
    "process_stop_request_changed",
    "Owned runner completion left concurrent or unowned stop-request state",
  );
  const claimed = await inspectPath(stopWindow.claimPath);
  assertCompletionDeadline();
  assertCurrentHostStorageBoundaries(paths, host);
  if (claimed.kind === "absent") return true;
  invariant(
    claimed.kind === "file" && claimed.sha256 === stopWindow.context.sha256,
    "process_stop_request_changed",
    "Owned runner stop-request claim changed before completion",
  );
  if (!validatePresentClaim) return false;
  try {
    assertCurrentHostStorageBoundaries(paths, host);
    const verified = await verifyRestrictedFilePermissions(
      stopWindow.claimPath,
      host,
      0o600,
      deadlineReserveMs === null ? {} : { deadlineAt: stopWindow.deadlineAt, deadlineReserveMs },
    );
    assertCompletionDeadline();
    assertCurrentHostStorageBoundaries(paths, host);
    const request = await readJson(stopWindow.claimPath, {
      invalidCode: "process_stop_request_invalid",
      maxBytes: 16_384,
      shapeCode: "process_stop_request_invalid",
      tooLargeCode: "process_stop_request_invalid",
      unsafeCode: "process_stop_request_invalid",
    });
    assertCurrentHostStorageBoundaries(paths, host);
    const confirmed = await inspectPath(stopWindow.claimPath);
    assertCurrentHostStorageBoundaries(paths, host);
    const confirmedStat = fs.lstatSync(stopWindow.claimPath, { bigint: true });
    assertCompletionDeadline();
    invariant(
      validStopRequestDocument(request, receipt.processToken, expected) &&
        confirmed.kind === "file" &&
        confirmed.sha256 === stopWindow.context.sha256 &&
        samePathIdentity(pathIdentity(verified), pathIdentity(confirmedStat)),
      "process_stop_request_changed",
      "Owned runner stop-request claim changed while completion was verified",
    );
    return false;
  } catch (error) {
    assertCurrentHostStorageBoundaries(paths, host);
    const afterFailure = await inspectPath(stopWindow.claimPath, { hash: false });
    assertCompletionDeadline();
    assertCurrentHostStorageBoundaries(paths, host);
    if (afterFailure.kind !== "absent") throw error;
    const finalTarget = await inspectPath(paths.processStopRequest, { hash: false });
    assertCompletionDeadline();
    assertCurrentHostStorageBoundaries(paths, host);
    invariant(
      finalTarget.kind === "absent",
      "process_stop_request_changed",
      "A concurrent stop request appeared while claim cleanup completed",
    );
    return true;
  }
}

async function joinExistingStopWindow(paths, host, receipt) {
  const stopWindow = receiptStopContext(receipt, paths, "Stopping process receipt");
  assertStopDeadline(
    stopWindow.deadlineAt,
    "Existing stop-request join",
    stopWindow.callerProofReserveMs,
  );
  const expected = expectedStopContext(stopWindow, receipt.processToken);
  const completed = await stopCompletionReady(
    paths,
    host,
    receipt,
    expected,
    stopWindow.callerProofReserveMs,
    true,
  );
  invariant(
    !completed,
    "process_stop_request_changed",
    "Stopping receipt no longer has its protected in-progress request claim",
  );
  return { expected, stopWindow };
}

async function assertStopRequestConsumed(
  paths,
  host,
  receipt = null,
  expected = null,
  deadlineReserveMs = 0,
) {
  if (expected !== null) {
    const complete = await stopCompletionReady(paths, host, receipt, expected, deadlineReserveMs);
    invariant(
      complete,
      "process_stop_request_changed",
      "Terminal receipt became visible before runner publication and claim cleanup completed",
    );
    return;
  }
  if (receipt?.stopRequest !== null && receipt?.stopRequest !== undefined) {
    const historicalWindow = receiptStopContext(receipt, paths, "Terminal process receipt");
    const historicalExpected = expectedStopContext(historicalWindow, receipt.processToken);
    const complete = await stopCompletionReady(paths, host, receipt, historicalExpected, null);
    invariant(
      complete,
      "process_stop_request_changed",
      "Terminal process receipt still has its exact in-progress request claim",
    );
    return;
  }
  assertCurrentHostStorageBoundaries(paths, host);
  const state = await inspectPath(paths.processStopRequest, { hash: false });
  assertCurrentHostStorageBoundaries(paths, host);
  invariant(
    state.kind === "absent",
    "process_stop_request_changed",
    "Owned runner completion left concurrent or unowned stop-request state",
  );
}

export async function loopbackPortOpen(timeoutMs = 250) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host: GATEWAY_HOST, port: GATEWAY_PORT });
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

function runnerArguments(paths, plan, processToken, expectedReceipt, rootBoundaries) {
  return [
    paths.gatewayRunner,
    "--config",
    paths.gatewayConfig,
    "--config-root",
    paths.configRoot,
    "--config-root-boundary",
    JSON.stringify(rootBoundaries.configRoot),
    "--litellm",
    plan.litellm.executable,
    "--master-key",
    paths.gatewaySecret,
    "--port",
    String(GATEWAY_PORT),
    "--provider-key",
    paths.providerSecret,
    "--receipt",
    paths.processReceipt,
    "--receipt-expected",
    expectedReceipt,
    "--runner-executable",
    plan.executables.node.path,
    "--runner-script",
    paths.gatewayRunner,
    "--state-root",
    paths.stateRoot,
    "--state-root-boundary",
    JSON.stringify(rootBoundaries.stateRoot),
    "--stop-request",
    paths.processStopRequest,
    "--token",
    processToken,
  ];
}

async function runnerRootBoundaries(paths, host) {
  const configRoot = await inspectProtectedDirectoryBoundary(paths.configRoot, host);
  const stateRoot =
    path.resolve(paths.stateRoot) === path.resolve(paths.configRoot)
      ? configRoot
      : await inspectProtectedDirectoryBoundary(paths.stateRoot, host);
  return { configRoot, stateRoot };
}

async function assertProcessIdentity(
  receipt,
  manifest,
  paths,
  expectedRunnerExecutable,
  options = {},
) {
  if (options.deadlineAt !== undefined) {
    assertStopDeadline(
      options.deadlineAt,
      "Process terminal identity proof",
      options.deadlineReserveMs ?? 0,
    );
  }
  const findings = await processIdentityFindings(receipt, manifest, paths, {
    ...options,
    expectedRunnerExecutable,
    host: options.host,
  });
  if (options.deadlineAt !== undefined) {
    assertStopDeadline(
      options.deadlineAt,
      "Process terminal identity proof",
      options.deadlineReserveMs ?? 0,
    );
  }
  invariant(
    findings.length === 0,
    "process_identity_mismatch",
    "Process receipt does not match the complete owned gateway identity",
    { findings },
  );
}

async function assertRuntimeIdentity(manifest, paths, plan, host) {
  assertCurrentHostStorageBoundaries(paths, host);
  assertWslSameEnvironmentPath(plan.litellm.executable, host, "LiteLLM executable");
  invariant(
    plan.litellm.executable === manifest.runtime.litellmExecutable,
    "runtime_identity_mismatch",
    "Planned LiteLLM executable differs from the manifest-owned runtime",
  );
  let inventory;
  try {
    inventory = await inventoryTree(paths.venvRoot, { allowSymlinks: true });
  } catch {
    throw new SetupError(
      "runtime_identity_mismatch",
      "Manifest-owned runtime cannot be inventoried immediately before start",
    );
  }
  invariant(
    inventory.digest === manifest.runtime.treeDigest,
    "runtime_identity_mismatch",
    "Manifest-owned runtime changed immediately before start",
  );
}

async function assertRunnerExecutableIdentity(manifest, plan, host) {
  const planned = plan.executables?.node;
  const owned = manifest.executables?.node;
  invariant(
    planned?.path === owned?.path && planned?.sha256 === owned?.sha256,
    "runner_executable_identity_mismatch",
    "Planned Node.js executable differs from the manifest-owned identity",
  );
  assertWslSameEnvironmentPath(planned.path, host, "node executable");
  const observation = await inspectPath(planned.path);
  invariant(
    observation.kind === "file" && observation.sha256 === planned.sha256,
    "runner_executable_identity_mismatch",
    "Node.js executable changed immediately before gateway spawn",
  );
}

export async function startOwnedGateway(
  { assertMutationOwned = null, host, manifest, paths, plan, now },
  dependencies = {},
) {
  assertCurrentHostStorageBoundaries(paths, host);
  const readReceipt = dependencies.readProcessReceipt ?? readProcessReceipt;
  const portOpen = dependencies.loopbackPortOpen ?? loopbackPortOpen;
  const spawnRunner = dependencies.spawn ?? spawn;
  const pause = dependencies.delay ?? delay;
  await assertRuntimeIdentity(manifest, paths, plan, host);
  const existing = await readReceipt(paths, host);
  if (existing) {
    await assertProcessIdentity(
      existing,
      manifest,
      paths,
      manifest.process?.runnerExecutable ?? plan.executables.node.path,
      { allowStatusTransition: true, host },
    );
    if (processReceiptFresh(existing, now)) {
      invariant(
        await portOpen(),
        "owned_process_unhealthy",
        "The owned runner heartbeat is fresh but its loopback listener is unavailable",
      );
      return { changed: false, receipt: existing };
    }
    invariant(
      existing.status === "stopped" || existing.status === "failed",
      "process_identity_stale",
      "A non-terminal owned process receipt is stale; refusing to overwrite its identity",
    );
  }
  invariant(
    !(await portOpen()),
    "port_occupied",
    `127.0.0.1:${GATEWAY_PORT} is occupied by an unproven listener; nothing was stopped`,
  );
  const credentialContinuity = await credentialPairContinuity(paths, host);
  invariant(
    (await inspectPath(paths.gatewayRunner)).sha256 ===
      manifest.artifacts.find((artifact) => artifact.role === "gateway-runner")?.sha256,
    "runner_identity_mismatch",
    "Gateway runner no longer matches the owned manifest",
  );
  assertWslSameEnvironmentPath(plan.litellm.executable, host, "LiteLLM executable");
  invariant(
    (await inspectPath(plan.litellm.executable, { hash: false })).kind === "file",
    "litellm_executable_missing",
    "Owned LiteLLM executable is missing",
  );
  await assertRuntimeIdentity(manifest, paths, plan, host);
  await assertRunnerExecutableIdentity(manifest, plan, host);

  const receiptState = await inspectPath(paths.processReceipt);
  invariant(
    existing
      ? receiptState.kind === "file" && receiptState.sha256 === sha256(stableJson(existing))
      : receiptState.kind === "absent",
    "process_receipt_changed",
    "Process receipt changed immediately before gateway spawn",
  );
  const expectedReceipt = existing ? receiptState.sha256 : "absent";
  const confirmedCredentialContinuity = await credentialPairContinuity(paths, host);
  invariant(
    confirmedCredentialContinuity.scheme === credentialContinuity.scheme &&
      confirmedCredentialContinuity.proof === credentialContinuity.proof,
    "concurrent_secret_change",
    "Credential pair changed immediately before gateway spawn",
  );

  const processToken = crypto.randomBytes(32).toString("hex");
  await assertMutationOwned?.();
  assertCurrentHostStorageBoundaries(paths, host);
  const rootBoundaries = await runnerRootBoundaries(paths, host);
  await assertMutationOwned?.();
  assertCurrentHostStorageBoundaries(paths, host);
  const confirmedRootBoundaries = await runnerRootBoundaries(paths, host);
  invariant(
    stableJson(confirmedRootBoundaries) === stableJson(rootBoundaries),
    "runner_root_boundary_changed",
    "Managed root identity or protection changed immediately before gateway spawn",
  );
  await assertMutationOwned?.();
  assertCurrentHostStorageBoundaries(paths, host);
  assertWslSameEnvironmentPath(plan.executables.node.path, host, "node executable");
  const child = spawnRunner(
    plan.executables.node.path,
    runnerArguments(paths, plan, processToken, expectedReceipt, confirmedRootBoundaries),
    {
      detached: true,
      env: minimalCommandEnvironment(
        host.kind === "wsl" ? { WSL_DISTRO_NAME: host.wslDistribution } : {},
      ),
      stdio: "ignore",
      windowsHide: true,
    },
  );
  let spawnError = null;
  child.once("error", (error) => {
    spawnError = error;
  });
  child.unref();

  try {
    const deadline = Date.now() + PROCESS_READY_TIMEOUT_MS;
    while (Date.now() <= deadline) {
      await pause(250);
      if (spawnError) {
        throw new SetupError(
          "gateway_runner_spawn_failed",
          "Unable to spawn the owned gateway runner",
          {
            reason: spawnError.message,
          },
        );
      }
      let receipt;
      try {
        receipt = await readReceipt(paths, host);
      } catch (error) {
        if (error.code === "ENOENT" || error.code === "invalid_json") continue;
        throw error;
      }
      if (receipt?.processToken !== processToken) continue;
      if (receipt.status === "failed" || receipt.status === "stopped") {
        throw new SetupError(
          "gateway_start_failed",
          "Owned gateway runner exited before readiness",
          {
            status: receipt.status,
          },
        );
      }
      if (processReceiptFresh(receipt)) {
        await assertProcessIdentity(receipt, manifest, paths, plan.executables.node.path, {
          allowUnrecordedProcess: true,
          host,
        });
        await assertStopRequestConsumed(paths, host);
        return { changed: true, receipt };
      }
    }
    throw new SetupError("gateway_start_timeout", "Owned gateway did not become ready in time");
  } catch (rawError) {
    const error =
      rawError instanceof Error
        ? rawError
        : new SetupError("gateway_start_failed", String(rawError));
    const runnerSpawned = Number.isInteger(child.pid);
    let runnerTerminal = !runnerSpawned;
    let terminalReceiptConfirmed = !runnerSpawned;
    let cleanupFailure = null;
    let receipt = null;
    let publishedStopExpected = null;
    try {
      receipt = await readReceipt(paths, host);
    } catch (receiptError) {
      cleanupFailure = receiptError;
    }
    let terminalReceipt =
      receipt?.processToken === processToken &&
      (receipt.status === "failed" || receipt.status === "stopped");
    if (runnerSpawned) {
      const stopWindow = newStopWindow(dependencies);
      if (!terminalReceipt) {
        try {
          await assertMutationOwned?.();
          await (dependencies.writeStopRequest ?? writeStopRequest)(
            paths,
            host,
            processToken,
            stopWindow.requestedAt,
            {
              assertMutationOwned,
              atomicWriteJson: dependencies.atomicWriteJson,
              beforePublish: dependencies.beforeStopRequestPublish,
              deadlineAt: stopWindow.deadlineAt,
              downstreamReserveMs: stopWindow.requestPublicationReserveMs,
              securePathPermissions: dependencies.securePathPermissions,
            },
          );
          publishedStopExpected = expectedStopContext(stopWindow, processToken);
        } catch (stopRequestError) {
          cleanupFailure ??= stopRequestError;
          try {
            child.kill("SIGTERM");
          } catch (signalError) {
            cleanupFailure ??= signalError;
          }
        }
      }
      runnerTerminal = await waitForExactChildExit(
        child,
        remainingStopTime(stopWindow.deadlineAt, stopWindow.callerProofReserveMs),
      );
      try {
        assertStopDeadline(
          stopWindow.deadlineAt,
          "Startup cleanup runner termination",
          stopWindow.callerProofReserveMs,
        );
        receipt =
          publishedStopExpected === null
            ? await readReceiptBeforeDeadline(
                readReceipt,
                paths,
                host,
                stopWindow.deadlineAt,
                "Startup cleanup terminal receipt",
                stopWindow.terminalReceiptReadReserveMs,
              )
            : await readReceiptAfterCommittedStop(
                readReceipt,
                paths,
                host,
                stopWindow.deadlineAt,
                "Startup cleanup terminal receipt",
                stopWindow.terminalReceiptReadReserveMs,
                pause,
              );
        terminalReceipt =
          receipt?.processToken === processToken &&
          (receipt.status === "failed" || receipt.status === "stopped");
        if (terminalReceipt) {
          if (publishedStopExpected !== null) {
            const completionReady = await stopCompletionReady(
              paths,
              host,
              receipt,
              publishedStopExpected,
              stopWindow.terminalReceiptReadReserveMs,
            );
            invariant(
              completionReady,
              "process_stop_request_changed",
              "Startup cleanup observed a terminal receipt before its publication completed",
            );
          }
          await assertProcessIdentity(receipt, manifest, paths, plan.executables.node.path, {
            allowStatusTransition: true,
            allowUnrecordedProcess: true,
            checkCurrentFiles: false,
            deadlineAt: stopWindow.deadlineAt,
            deadlineReserveMs: stopWindow.identityProofReserveMs,
            host,
          });
          await assertStopRequestConsumed(paths, host, receipt, publishedStopExpected);
          terminalReceiptConfirmed = true;
        }
      } catch (receiptError) {
        cleanupFailure ??= receiptError;
      }
    }
    const details = {
      ...error.details,
      ...(cleanupFailure ? { cleanupCode: cleanupFailure.code ?? "cleanup_failed" } : {}),
      ownedProcessToken: processToken,
      ownedRunnerTerminal: runnerTerminal,
      ownedTerminalReceiptConfirmed: terminalReceiptConfirmed,
    };
    if (!runnerTerminal || !terminalReceiptConfirmed) {
      throw new SetupError(
        "process_cleanup_requires_manual_recovery",
        "Owned gateway process-tree termination was not confirmed; setup state was preserved for manual recovery",
        {
          ...details,
          causeCode: error.code ?? "unexpected_error",
          cleanupSafe: false,
        },
      );
    }
    error.details = details;
    throw error;
  }
}

const IMMUTABLE_PROCESS_IDENTITY_FIELDS = [
  "processToken",
  "runnerPid",
  "childPid",
  "runnerExecutable",
  "runnerScript",
  "gatewayExecutable",
  "gatewayArgsDigest",
  "configPath",
  "configSha256",
  "host",
  "port",
  "startedAt",
];

function sameStartedProcessIdentity(left, right) {
  return IMMUTABLE_PROCESS_IDENTITY_FIELDS.every((field) => left?.[field] === right?.[field]);
}

export async function compensateStartedGateway(
  { assertMutationOwned = null, host, manifest, paths, receipt, now },
  dependencies = {},
) {
  assertCurrentHostStorageBoundaries(paths, host);
  invariant(
    receipt?.status === "ready",
    "process_compensation_identity_missing",
    "Process compensation requires the exact ready receipt returned by start",
  );
  const readReceipt = dependencies.readProcessReceipt ?? readProcessReceipt;
  const pause = dependencies.delay ?? delay;
  let current = await readReceipt(paths, host);
  invariant(
    sameStartedProcessIdentity(current, receipt),
    "process_compensation_identity_mismatch",
    "Process identity changed before compensating stop",
  );
  await assertProcessIdentity(current, manifest, paths, receipt.runnerExecutable, {
    allowStatusTransition: true,
    allowUnrecordedProcess: true,
    host,
  });
  if (current.status === "stopped" || current.status === "failed") {
    await assertStopRequestConsumed(paths, host, current);
    return { changed: false, receipt: current };
  }
  invariant(
    current.status === "ready" || current.status === "stopping",
    "process_compensation_identity_mismatch",
    "Process compensation encountered an unsupported lifecycle state",
  );
  invariant(
    current.status === "stopping" || processReceiptFresh(current, now),
    "process_identity_stale",
    "Process compensation requires a fresh exact-token receipt",
  );
  let stopWindow;
  let expected;
  if (current.status === "stopping") {
    ({ expected, stopWindow } = await joinExistingStopWindow(paths, host, current));
  } else {
    stopWindow = newStopWindow(dependencies);
    expected = expectedStopContext(stopWindow, receipt.processToken);
    await assertMutationOwned?.();
    await (dependencies.writeStopRequest ?? writeStopRequest)(
      paths,
      host,
      receipt.processToken,
      stopWindow.requestedAt,
      {
        assertMutationOwned,
        atomicWriteJson: dependencies.atomicWriteJson,
        beforePublish: dependencies.beforeStopRequestPublish,
        deadlineAt: stopWindow.deadlineAt,
        downstreamReserveMs: stopWindow.requestPublicationReserveMs,
        securePathPermissions: dependencies.securePathPermissions,
      },
    );
  }

  while (remainingStopTime(stopWindow.deadlineAt, stopWindow.terminalReceiptReadReserveMs) > 0) {
    await pause(
      Math.min(
        250,
        remainingStopTime(stopWindow.deadlineAt, stopWindow.terminalReceiptReadReserveMs),
      ),
    );
    current = await readReceiptAfterCommittedStop(
      readReceipt,
      paths,
      host,
      stopWindow.deadlineAt,
      "Compensating stop terminal receipt",
      stopWindow.terminalReceiptReadReserveMs,
      pause,
    );
    invariant(
      sameStartedProcessIdentity(current, receipt),
      "process_compensation_identity_mismatch",
      "Process identity changed during compensating stop",
    );
    if (current.status === "stopped" || current.status === "failed") {
      const completionReady = await stopCompletionReady(
        paths,
        host,
        current,
        expected,
        stopWindow.terminalReceiptReadReserveMs,
      );
      if (!completionReady) continue;
      await assertProcessIdentity(current, manifest, paths, receipt.runnerExecutable, {
        allowStatusTransition: true,
        allowUnrecordedProcess: true,
        checkCurrentFiles: false,
        deadlineAt: stopWindow.deadlineAt,
        deadlineReserveMs: stopWindow.identityProofReserveMs,
        host,
      });
      await assertStopRequestConsumed(paths, host, current, expected);
      return { changed: true, receipt: current };
    }
  }
  throw new SetupError(
    "process_compensation_timeout",
    "The exact process started by this mutation did not acknowledge its compensating stop",
  );
}

export async function stopOwnedGateway(
  { assertMutationOwned = null, host, manifest, paths, now },
  dependencies = {},
) {
  assertCurrentHostStorageBoundaries(paths, host);
  const readReceipt = dependencies.readProcessReceipt ?? readProcessReceipt;
  const pause = dependencies.delay ?? delay;
  const receipt = await readReceipt(paths, host);
  if (!receipt) {
    invariant(
      !manifestProcessHasIdentity(manifest.process),
      "process_receipt_missing",
      "The manifest records an owned process identity but its protected receipt is missing",
    );
    return stopResult(false, receipt);
  }
  const expectedRunnerExecutable =
    manifest.process?.runnerExecutable ?? manifest.executables.node.path;
  if (receipt.status === "stopped" || receipt.status === "failed") {
    await assertProcessIdentity(receipt, manifest, paths, expectedRunnerExecutable, {
      allowStatusTransition: true,
      checkCurrentFiles: false,
      host,
    });
    await assertStopRequestConsumed(paths, host, receipt);
    return stopResult(false, receipt);
  }
  invariant(
    receipt.status === "stopping" || processReceiptFresh(receipt, now),
    "process_identity_stale",
    "The process receipt has no fresh owned heartbeat; PID alone cannot authorize a stop",
  );
  await assertProcessIdentity(receipt, manifest, paths, expectedRunnerExecutable, {
    allowStatusTransition: receipt.status === "stopping",
    host,
  });
  let stopWindow;
  let expected;
  if (receipt.status === "stopping") {
    ({ expected, stopWindow } = await joinExistingStopWindow(paths, host, receipt));
  } else {
    stopWindow = newStopWindow(dependencies);
    expected = expectedStopContext(stopWindow, receipt.processToken);
    await assertMutationOwned?.();
    await (dependencies.writeStopRequest ?? writeStopRequest)(
      paths,
      host,
      receipt.processToken,
      stopWindow.requestedAt,
      {
        assertMutationOwned,
        atomicWriteJson: dependencies.atomicWriteJson,
        beforePublish: dependencies.beforeStopRequestPublish,
        deadlineAt: stopWindow.deadlineAt,
        downstreamReserveMs: stopWindow.requestPublicationReserveMs,
        securePathPermissions: dependencies.securePathPermissions,
      },
    );
  }

  while (remainingStopTime(stopWindow.deadlineAt, stopWindow.terminalReceiptReadReserveMs) > 0) {
    await pause(
      Math.min(
        250,
        remainingStopTime(stopWindow.deadlineAt, stopWindow.terminalReceiptReadReserveMs),
      ),
    );
    const current = await readReceiptAfterCommittedStop(
      readReceipt,
      paths,
      host,
      stopWindow.deadlineAt,
      "Gateway stop terminal receipt",
      stopWindow.terminalReceiptReadReserveMs,
      pause,
    );
    invariant(
      sameStartedProcessIdentity(current, receipt),
      "process_identity_changed",
      "Process receipt identity changed while stopping",
    );
    if (current.status === "stopped" || current.status === "failed") {
      const completionReady = await stopCompletionReady(
        paths,
        host,
        current,
        expected,
        stopWindow.terminalReceiptReadReserveMs,
      );
      if (!completionReady) continue;
      await assertProcessIdentity(current, manifest, paths, expectedRunnerExecutable, {
        allowStatusTransition: true,
        deadlineAt: stopWindow.deadlineAt,
        deadlineReserveMs: stopWindow.identityProofReserveMs,
        host,
      });
      await assertStopRequestConsumed(paths, host, current, expected);
      return stopResult(true, current);
    }
  }
  throw new SetupError(
    "gateway_stop_timeout",
    "Owned runner did not acknowledge the stop request; no PID signal was sent",
  );
}
