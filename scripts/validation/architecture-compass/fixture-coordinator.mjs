import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { releaseChildHandles, settleDetachedProcessGroup } from "../lib/process-group.mjs";
import {
  assertRepositoryGuardsUnchanged,
  captureRepositoryGuards,
} from "../lib/legacy-case-lineage-test-harness.mjs";
import {
  createSealedBaselineCapsule,
  hashBaselineCapsule,
  removeSealedBaselineCapsule,
} from "./fixture-capsule.mjs";
import {
  architectureAccountingDigest,
  architectureValueDigest,
  resolveLocalWorkerCount,
} from "./hosted-shards.mjs";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const inventoryRelative =
  "scripts/validation/architecture-compass/test-validator-case-inventory.json";
const digestPattern = /^sha256:[a-f0-9]{64}$/;

export const architectureFixtureDirectories = Object.freeze([
  "skills/engineering-workflows/architecture-compass",
  "skill-evals/architecture-compass",
  "docs/adrs",
]);

export const architectureFixtureFiles = Object.freeze([
  "scripts/validation/architecture-compass/decision-lock.tsv",
  "scripts/validation/architecture-compass/decision-lineage.json",
  "scripts/validation/architecture-compass/legacy-reference-source-lock.json",
  "scripts/validation/architecture-compass/legacy-reference-coverage.json",
  inventoryRelative,
]);

export const architectureFixtureEntries = Object.freeze([
  ...architectureFixtureDirectories,
  ...architectureFixtureFiles,
]);

function assertSharedPreflightEvidence(evidence) {
  const expectedKeys = [
    "baselineValidation",
    "fixtureSetupContract",
    "parserContract",
    "schemaVersion",
  ];
  if (
    evidence?.schemaVersion !== 1 ||
    Object.keys(evidence).sort().join("\0") !== expectedKeys.join("\0") ||
    evidence.parserContract !== "passed" ||
    evidence.fixtureSetupContract !== "passed" ||
    evidence.baselineValidation !== "passed"
  ) {
    throw new Error("Architecture Compass shared preflight evidence is malformed or incomplete.");
  }
}

function writeJsonAtomic(file, value) {
  const target = path.resolve(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, target);
}

function createRunRoot(temporaryParent, runRootModeSetter) {
  const runRoot = fs.mkdtempSync(
    path.join(path.resolve(temporaryParent), "architecture-compass-workers-"),
  );
  try {
    runRootModeSetter(runRoot, 0o700);
    return runRoot;
  } catch (error) {
    try {
      fs.rmSync(runRoot, { recursive: true, force: true });
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Architecture Compass fixture run-root setup and cleanup failed.",
        { cause: error },
      );
    }
    throw error;
  }
}

const standaloneEnvironmentNames = Object.freeze([
  "SystemRoot",
  "COMSPEC",
  "PATHEXT",
  "PATH",
  "HOME",
  "CI",
  "TZ",
  "LANG",
  "LC_ALL",
  "TMPDIR",
  "TMP",
  "TEMP",
]);

function withoutLegacyLineageSteering(environment) {
  const sanitized = {};
  for (const [name, value] of Object.entries(environment ?? {})) {
    if (!name.startsWith("LEGACY_LINEAGE_") && typeof value === "string") {
      sanitized[name] = value;
    }
  }
  return sanitized;
}

function standaloneExecutionEnvironment(environment) {
  const sanitized = withoutLegacyLineageSteering(environment);
  return Object.fromEntries(
    standaloneEnvironmentNames
      .filter((name) => typeof sanitized[name] === "string")
      .map((name) => [name, sanitized[name]]),
  );
}

async function withProcessEnvironment(environment, callback) {
  const previous = { ...process.env };
  for (const name of Object.keys(process.env)) delete process.env[name];
  Object.assign(process.env, environment);
  try {
    return await callback();
  } finally {
    for (const name of Object.keys(process.env)) delete process.env[name];
    Object.assign(process.env, previous);
  }
}

function assignedResults(
  frozenInventory,
  { workerIndex, workerCount, hostedShardIndex, hostedShardCount },
) {
  return frozenInventory.cases
    .map((entry, ordinal) => ({ ...entry, ordinal }))
    .filter(
      ({ ordinal }) =>
        ordinal % hostedShardCount === hostedShardIndex &&
        Math.floor(ordinal / hostedShardCount) % workerCount === workerIndex,
    );
}

function validPhaseTelemetry(telemetry) {
  return ["materializeMs", "mutateMs", "validateMs", "cleanupMs"].every(
    (phase) => Number.isSafeInteger(telemetry?.[phase]) && telemetry[phase] >= 0,
  );
}

function structuredWorkerFailure(completion, frozenInventory, identity) {
  if (!fs.existsSync(completion.reportFile)) return null;
  let report;
  try {
    report = JSON.parse(fs.readFileSync(completion.reportFile, "utf8"));
  } catch {
    return null;
  }
  if (
    report?.schemaVersion !== 1 ||
    report.workerIndex !== completion.workerIndex ||
    report.workerCount !== identity.workerCount ||
    report.hostedShardIndex !== identity.hostedShardIndex ||
    report.hostedShardCount !== identity.hostedShardCount ||
    report.taskKey !== identity.taskKey ||
    report.taskDigest !== identity.taskDigest ||
    report.preflightEvidenceDigest !== identity.preflightEvidenceDigest ||
    report.inventoryDigest !== identity.inventoryDigest ||
    !report.fatal ||
    typeof report.fatal.message !== "string" ||
    report.fatal.message.length === 0 ||
    (report.fatal.stack !== null && typeof report.fatal.stack !== "string") ||
    !Array.isArray(report.results) ||
    !new Set(["clone", "copy"]).has(report.materializationStrategy) ||
    Object.hasOwn(report, "preflight")
  ) {
    return null;
  }

  const expectedResults = assignedResults(frozenInventory, {
    ...identity,
    workerIndex: completion.workerIndex,
  });
  if (report.results.length > expectedResults.length) return null;
  for (const [index, result] of report.results.entries()) {
    const expected = expectedResults[index];
    if (
      result?.id !== expected.id ||
      result.ordinal !== expected.ordinal ||
      result.expectedOutcome !== expected.expectedOutcome ||
      !Number.isSafeInteger(result.durationMs) ||
      result.durationMs < 0
    ) {
      return null;
    }
    const isLast = index === report.results.length - 1;
    if (isLast) {
      if (
        result.status !== "failed" ||
        result.skipBucket !== null ||
        typeof result.reason !== "string" ||
        result.reason.length === 0 ||
        report.fatal.message !== result.reason
      ) {
        return null;
      }
      continue;
    }
    if (result.status === "passed") {
      if (result.reason !== null || result.skipBucket !== null) return null;
      continue;
    }
    if (
      !new Set(["skipped", "not-applicable"]).has(result.status) ||
      typeof result.reason !== "string" ||
      result.reason.length === 0 ||
      typeof result.skipBucket !== "string" ||
      result.skipBucket.length === 0
    ) {
      return null;
    }
  }

  const failedCase = report.results.at(-1);
  return {
    workerIndex: completion.workerIndex,
    message: failedCase
      ? `Architecture Compass fixture worker ${completion.workerIndex} failed case ${failedCase.id}: ${failedCase.reason}`
      : `Architecture Compass fixture worker ${completion.workerIndex} failed before case execution: ${report.fatal.message}`,
  };
}

function readWorkerReport(completion, frozenInventory, identity) {
  if (!fs.existsSync(completion.reportFile)) {
    throw new Error(
      `Architecture Compass fixture worker ${completion.workerIndex} did not write a report.`,
    );
  }
  const report = JSON.parse(fs.readFileSync(completion.reportFile, "utf8"));
  if (
    report.schemaVersion !== 1 ||
    report.workerIndex !== completion.workerIndex ||
    report.workerCount !== identity.workerCount ||
    report.hostedShardIndex !== identity.hostedShardIndex ||
    report.hostedShardCount !== identity.hostedShardCount ||
    report.taskKey !== identity.taskKey ||
    report.taskDigest !== identity.taskDigest ||
    report.preflightEvidenceDigest !== identity.preflightEvidenceDigest ||
    report.inventoryDigest !== identity.inventoryDigest ||
    report.fatal ||
    !new Set(["clone", "copy"]).has(report.materializationStrategy) ||
    !Number.isSafeInteger(report.phaseTelemetry?.startupMs) ||
    report.phaseTelemetry.startupMs < 0 ||
    !Array.isArray(report.results) ||
    Object.hasOwn(report, "preflight")
  ) {
    throw new Error(
      `Architecture Compass fixture worker ${completion.workerIndex} wrote an invalid report.`,
    );
  }

  const expectedResults = assignedResults(frozenInventory, {
    ...identity,
    workerIndex: completion.workerIndex,
  });
  if (
    JSON.stringify(report.results.map(({ id }) => id)) !==
    JSON.stringify(expectedResults.map(({ id }) => id))
  ) {
    throw new Error(
      `Architecture Compass fixture worker ${completion.workerIndex} reported missing, duplicate, unexpected, or wrong-shard IDs.`,
    );
  }
  for (const [index, result] of report.results.entries()) {
    const expected = expectedResults[index];
    if (
      result.id !== expected.id ||
      result.ordinal !== expected.ordinal ||
      result.expectedOutcome !== expected.expectedOutcome
    ) {
      throw new Error(
        `Architecture Compass fixture worker ${completion.workerIndex} reported contradictory case metadata for ${expected.id}.`,
      );
    }
    if (
      !Number.isSafeInteger(result.durationMs) ||
      result.durationMs < 0 ||
      !validPhaseTelemetry(result.phaseTelemetry)
    ) {
      throw new Error(
        `Architecture Compass fixture worker ${completion.workerIndex} reported invalid telemetry for ${expected.id}.`,
      );
    }
    if (result.status === "passed") {
      if (result.reason !== null || result.skipBucket !== null) {
        throw new Error(
          `Architecture Compass fixture worker ${completion.workerIndex} reported skip metadata for passed case ${expected.id}.`,
        );
      }
    } else if (
      !new Set(["skipped", "not-applicable"]).has(result.status) ||
      typeof result.reason !== "string" ||
      result.reason.length === 0 ||
      typeof result.skipBucket !== "string" ||
      result.skipBucket.length === 0
    ) {
      throw new Error(
        `Architecture Compass fixture worker ${completion.workerIndex} reported an invalid outcome for ${expected.id}.`,
      );
    }
    if (
      result.status === "not-applicable" &&
      !(
        process.platform === "win32" &&
        expected.applicability === "posix" &&
        result.skipBucket === "platform"
      )
    ) {
      throw new Error(
        `Architecture Compass fixture worker ${completion.workerIndex} reported an invalid applicability result for ${expected.id}.`,
      );
    }
    if (
      process.platform === "win32" &&
      expected.applicability === "posix" &&
      result.status !== "not-applicable"
    ) {
      throw new Error(
        `Architecture Compass fixture worker ${completion.workerIndex} executed POSIX-only case ${expected.id} on Windows.`,
      );
    }
  }
  return report;
}

async function defaultCoordinatorPreflight(preflightRoot) {
  const { runSharedArchitecturePreflight } = await import("./test-validator.mjs");
  return await runSharedArchitecturePreflight(preflightRoot);
}

export async function runFixtureCoordinator({
  root = moduleRoot,
  workerProgram = path.join(
    moduleRoot,
    "scripts/validation/architecture-compass/test-validator.mjs",
  ),
  workerCount: requestedWorkerCount = null,
  hostedShardIndex = 0,
  hostedShardCount = 1,
  taskKey = null,
  taskDigest = null,
  expectedPreflightEvidenceDigest = null,
  expectedBaselineDigest = null,
  forceOrdinaryCopy = null,
  temporaryParent = os.tmpdir(),
  reportFile = null,
  coordinatorPreflight = defaultCoordinatorPreflight,
  executionEnvironment = null,
  workerEnvironment = {},
  workerTimeoutMs = 30 * 60 * 1000,
  terminationGraceMs = 3000,
  killGraceMs = 3000,
  settlementPollMs = 50,
  runRootModeSetter = fs.chmodSync,
  baselineCapsuleCreator = createSealedBaselineCapsule,
  signalRethrow = (signal) => process.kill(process.pid, signal),
  windowsTreeKill = spawnSync,
} = {}) {
  const resolvedRoot = path.resolve(root);
  const coordinatorEnvironment = withoutLegacyLineageSteering(
    executionEnvironment === null
      ? standaloneExecutionEnvironment(process.env)
      : executionEnvironment,
  );
  requestedWorkerCount ??= resolveLocalWorkerCount({
    configured: coordinatorEnvironment.ARCHITECTURE_FIXTURE_WORKERS ?? "1",
  });
  forceOrdinaryCopy ??= coordinatorEnvironment.ARCHITECTURE_FIXTURE_FORCE_COPY === "1";
  reportFile ??= coordinatorEnvironment.ARCHITECTURE_FIXTURE_REPORT
    ? path.resolve(coordinatorEnvironment.ARCHITECTURE_FIXTURE_REPORT)
    : null;
  const coordinatorStartedAt = Date.now();
  let workersLaunchedAt = null;
  let mergeStartedAt = null;
  if (
    !Number.isSafeInteger(requestedWorkerCount) ||
    requestedWorkerCount < 1 ||
    requestedWorkerCount > 3
  ) {
    throw new Error("Architecture Compass worker count must be an integer from 1 through 3.");
  }
  for (const [name, value] of Object.entries({
    coordinatorPreflight,
    runRootModeSetter,
    baselineCapsuleCreator,
    signalRethrow,
    windowsTreeKill,
  })) {
    if (typeof value !== "function") throw new Error(`${name} must be a function.`);
  }
  const forbiddenWorkerVariables = Object.keys(workerEnvironment).filter((name) =>
    name.startsWith("LEGACY_LINEAGE_"),
  );
  if (forbiddenWorkerVariables.length > 0) {
    throw new Error(
      `Architecture Compass worker environment contains undeclared legacy steering: ${forbiddenWorkerVariables.join(", ")}.`,
    );
  }
  if (
    !new Set([1, 3]).has(hostedShardCount) ||
    !Number.isSafeInteger(hostedShardIndex) ||
    hostedShardIndex < 0 ||
    hostedShardIndex >= hostedShardCount
  ) {
    throw new Error(
      "Architecture Compass hosted shard index/count must describe one or three shards.",
    );
  }
  if (
    hostedShardCount === 3 &&
    [taskKey, taskDigest, expectedPreflightEvidenceDigest, expectedBaselineDigest].some(
      (value) => !digestPattern.test(value ?? ""),
    )
  ) {
    throw new Error(
      "Architecture Compass hosted shard execution requires task, task-digest, preflight, and baseline bindings.",
    );
  }
  for (const [name, value] of Object.entries({
    taskKey,
    taskDigest,
    expectedPreflightEvidenceDigest,
    expectedBaselineDigest,
  })) {
    if (value !== null && !digestPattern.test(value)) {
      throw new Error(`Architecture Compass ${name} must be a SHA-256 digest.`);
    }
  }
  for (const [name, value] of Object.entries({
    workerTimeoutMs,
    terminationGraceMs,
    killGraceMs,
    settlementPollMs,
  })) {
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error(`${name} must be a positive integer.`);
  }

  const repositoryGuardRoot = resolvedRoot;
  const repositoryGuards = captureRepositoryGuards(repositoryGuardRoot);
  let runRoot = null;
  let baselineRoot = null;
  let capsuleBeforeDigest = null;
  let frozenInventory = null;
  let workerCount = requestedWorkerCount;
  let inventoryDigest = null;
  let effectiveTaskKey = taskKey;
  let effectiveTaskDigest = taskDigest;
  let preflightEvidenceDigest = expectedPreflightEvidenceDigest;
  const capsuleCopyFile = forceOrdinaryCopy
    ? (source, destination, mode) => {
        if (mode === fs.constants.COPYFILE_FICLONE) {
          const error = new Error("copy-on-write disabled");
          error.code = "ENOTSUP";
          throw error;
        }
        fs.copyFileSync(source, destination, 0);
      }
    : fs.copyFileSync;
  const children = [];
  const childCompletions = [];
  const childSettlements = new Map();
  let stopping = false;
  let receivedSignal = null;
  let failure = null;
  let coordinatorReport = null;
  let rejectSettlementFailure;
  const settlementFailure = new Promise((_, reject) => {
    rejectSettlementFailure = reject;
  });
  const settleChild = (child) => {
    if (!childSettlements.has(child)) {
      childSettlements.set(
        child,
        settleDetachedProcessGroup(child, {
          terminationGraceMs,
          killGraceMs,
          terminationPollMs: settlementPollMs,
          killPollMs: settlementPollMs,
          windowsTreeKill,
          validateWindowsTreeKill: true,
          windowsTreeLabel: "Architecture Compass fixture worker tree",
          windowsExitLabel: "Architecture Compass fixture worker",
          processGroupLabel: "Architecture Compass fixture worker process group",
        }),
      );
    }
    return childSettlements.get(child);
  };
  const settleAllChildren = async () => {
    const settled = await Promise.allSettled(children.map((child) => settleChild(child)));
    const errors = settled
      .filter(({ status }) => status === "rejected")
      .map(({ reason }) => reason);
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(
        errors,
        "Multiple Architecture Compass fixture worker process groups failed to terminate.",
      );
    }
  };
  let activeSettlement = null;
  const stopWorkers = (signal = null) => {
    if (signal) receivedSignal ??= signal;
    stopping = true;
    activeSettlement ??= settleAllChildren();
    activeSettlement.catch(rejectSettlementFailure);
    return activeSettlement;
  };
  const signalHandlers = new Map(
    ["SIGINT", "SIGTERM"].map((signal) => [signal, () => stopWorkers(signal)]),
  );
  for (const [signal, handler] of signalHandlers) process.once(signal, handler);
  let workerTimeout = null;

  try {
    runRoot = createRunRoot(temporaryParent, runRootModeSetter);
    if (receivedSignal) {
      throw new Error(`Architecture Compass fixture execution received ${receivedSignal}.`);
    }
    baselineRoot = path.join(runRoot, "sealed-baseline");
    const baseline = baselineCapsuleCreator({
      sourceRoot: resolvedRoot,
      destinationRoot: baselineRoot,
      entries: architectureFixtureEntries,
      copyFile: capsuleCopyFile,
    });
    capsuleBeforeDigest = baseline.digest;
    if (expectedBaselineDigest !== null && baseline.digest !== expectedBaselineDigest) {
      throw new Error("Architecture Compass sealed baseline contradicts the hosted plan.");
    }
    if (receivedSignal) {
      throw new Error(`Architecture Compass fixture execution received ${receivedSignal}.`);
    }

    frozenInventory = JSON.parse(
      fs.readFileSync(path.join(baselineRoot, inventoryRelative), "utf8"),
    );
    const assignedCaseCount = frozenInventory.cases.filter(
      (_, ordinal) => ordinal % hostedShardCount === hostedShardIndex,
    ).length;
    workerCount = Math.min(requestedWorkerCount, assignedCaseCount);
    inventoryDigest = architectureValueDigest(frozenInventory.cases);

    if (hostedShardCount === 1) {
      const preflightTemporaryRoot = path.join(runRoot, "coordinator", "fixtures");
      fs.mkdirSync(preflightTemporaryRoot, { recursive: true, mode: 0o700 });
      const preflightEvidence = await withProcessEnvironment(
        {
          ...coordinatorEnvironment,
          TMPDIR: preflightTemporaryRoot,
          TMP: preflightTemporaryRoot,
          TEMP: preflightTemporaryRoot,
        },
        () => coordinatorPreflight(baselineRoot),
      );
      assertSharedPreflightEvidence(preflightEvidence);
      preflightEvidenceDigest = architectureValueDigest(preflightEvidence);
      if (
        expectedPreflightEvidenceDigest !== null &&
        preflightEvidenceDigest !== expectedPreflightEvidenceDigest
      ) {
        throw new Error("Architecture Compass shared preflight contradicts its expected digest.");
      }
    }
    effectiveTaskKey ??= architectureValueDigest({
      gateId: "architecture-compass",
      baselineDigest: baseline.digest,
      inventoryDigest,
      preflightEvidenceDigest,
    });
    effectiveTaskDigest ??= architectureValueDigest({
      taskKey: effectiveTaskKey,
      baselineDigest: baseline.digest,
      inventoryDigest,
      preflightEvidenceDigest,
    });
    const identity = {
      workerCount,
      hostedShardIndex,
      hostedShardCount,
      taskKey: effectiveTaskKey,
      taskDigest: effectiveTaskDigest,
      preflightEvidenceDigest,
      inventoryDigest,
    };

    for (let workerIndex = 0; workerIndex < workerCount; workerIndex += 1) {
      const workerRoot = path.join(runRoot, `worker-${workerIndex}`);
      const temporaryRoot = path.join(workerRoot, "fixtures");
      const workerReport = path.join(workerRoot, "report.json");
      fs.mkdirSync(temporaryRoot, { recursive: true, mode: 0o700 });
      const child = spawn(
        process.execPath,
        [
          workerProgram,
          "--worker-index",
          String(workerIndex),
          "--worker-count",
          String(workerCount),
          "--hosted-shard-index",
          String(hostedShardIndex),
          "--hosted-shard-count",
          String(hostedShardCount),
          "--task-key",
          effectiveTaskKey,
          "--task-digest",
          effectiveTaskDigest,
          "--preflight-evidence-digest",
          preflightEvidenceDigest,
          "--worker-report",
          workerReport,
        ],
        {
          cwd: resolvedRoot,
          detached: process.platform !== "win32",
          env: {
            ...coordinatorEnvironment,
            ...workerEnvironment,
            TMPDIR: temporaryRoot,
            TMP: temporaryRoot,
            TEMP: temporaryRoot,
            ARCHITECTURE_FIXTURE_INVENTORY_PATH: path.join(baselineRoot, inventoryRelative),
            ARCHITECTURE_FIXTURE_INVENTORY_DIGEST: inventoryDigest,
            ARCHITECTURE_FIXTURE_BASELINE: baselineRoot,
            ARCHITECTURE_FIXTURE_FORCE_COPY: forceOrdinaryCopy ? "1" : "0",
            ARCHITECTURE_HOSTED_SHARD_INDEX: String(hostedShardIndex),
            ARCHITECTURE_HOSTED_SHARD_COUNT: String(hostedShardCount),
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      children.push(child);
      if (stopping) settleChild(child).catch(rejectSettlementFailure);
      child.stdout.on("data", (chunk) => process.stdout.write(chunk));
      child.stderr.on("data", (chunk) => process.stderr.write(chunk));
      let spawnError = null;
      childCompletions.push(
        new Promise((resolve) => {
          child.once("error", (error) => {
            spawnError = error;
            stopWorkers();
          });
          child.once("close", (code, signal) => {
            if ((code !== 0 || signal) && !stopping) stopWorkers();
            resolve({ workerIndex, reportFile: workerReport, code, signal, error: spawnError });
          });
        }),
      );
    }
    workersLaunchedAt = Date.now();
    const workerExecutionTimeout = new Promise((_, reject) => {
      workerTimeout = setTimeout(() => {
        stopWorkers();
        reject(
          new Error(`Architecture Compass fixture workers timed out after ${workerTimeoutMs}ms.`),
        );
      }, workerTimeoutMs);
    });
    const completions = await Promise.race([
      Promise.all(childCompletions),
      settlementFailure,
      workerExecutionTimeout,
    ]);
    clearTimeout(workerTimeout);
    workerTimeout = null;
    if (receivedSignal) {
      throw new Error(`Architecture Compass fixture execution received ${receivedSignal}.`);
    }

    mergeStartedAt = Date.now();
    const structuredFailures = completions
      .filter(({ error, code, signal }) => error || code !== 0 || signal)
      .map((completion) => structuredWorkerFailure(completion, frozenInventory, identity))
      .filter(Boolean)
      .sort((left, right) => left.workerIndex - right.workerIndex);
    if (structuredFailures.length > 0) throw new Error(structuredFailures[0].message);

    const reports = [];
    for (const completion of completions) {
      if (completion.error || completion.code !== 0 || completion.signal) {
        throw new Error(
          `Architecture Compass fixture worker ${completion.workerIndex} failed: ${completion.error?.message ?? completion.signal ?? completion.code}`,
        );
      }
      reports.push(readWorkerReport(completion, frozenInventory, identity));
    }
    const results = reports
      .flatMap((report) => report.results)
      .sort((left, right) => left.ordinal - right.ordinal);
    const expectedShardCases = frozenInventory.cases.filter(
      (_, ordinal) => ordinal % hostedShardCount === hostedShardIndex,
    );
    if (
      results.length !== expectedShardCases.length ||
      new Set(results.map(({ id }) => id)).size !== expectedShardCases.length
    ) {
      throw new Error(
        "Architecture Compass fixture merge did not account for every frozen case exactly once.",
      );
    }
    const capsuleAfterDigest = hashBaselineCapsule(baselineRoot);
    if (capsuleAfterDigest !== capsuleBeforeDigest) {
      throw new Error("Architecture Compass sealed baseline capsule changed during execution.");
    }
    coordinatorReport = {
      schemaVersion: 1,
      workerCount,
      localWorkerCount: workerCount,
      hostedShardIndex,
      hostedShardCount,
      taskKey: effectiveTaskKey,
      taskDigest: effectiveTaskDigest,
      preflightEvidenceDigest,
      inventoryDigest,
      baselineDigest: baseline.digest,
      capsuleBeforeDigest,
      capsuleAfterDigest,
      preflight: "passed",
      materializationStrategy: reports.some(
        ({ materializationStrategy }) => materializationStrategy === "copy",
      )
        ? "copy"
        : "clone",
      accountingDigest: architectureAccountingDigest(results),
      results,
      phaseTelemetry: {
        startupMs: (workersLaunchedAt ?? Date.now()) - coordinatorStartedAt,
        mergeMs: Date.now() - (mergeStartedAt ?? Date.now()),
      },
    };
    const negativePassed = results.filter(
      ({ expectedOutcome, status }) => expectedOutcome === "failure" && status === "passed",
    ).length;
    const positivePassed = results.filter(
      ({ expectedOutcome, status }) => expectedOutcome === "success" && status === "passed",
    ).length;
    const skipped = results.filter(({ status }) => status !== "passed");
    console.log(
      `Architecture Compass validator fixtures passed with ${workerCount} worker(s): ${negativePassed} negative cases and ${positivePassed} positive cases.${
        skipped.length > 0
          ? ` ${skipped.length} fixture(s) skipped or not applicable: ${skipped.map((result) => `${result.id}: ${result.reason}`).join("; ")}.`
          : ` All ${results.length} assigned frozen fixtures executed.`
      }`,
    );
  } catch (error) {
    failure = error;
    stopWorkers();
  } finally {
    if (workerTimeout) clearTimeout(workerTimeout);
    if (failure || receivedSignal) stopWorkers();
    const cleanupErrors = [];
    let groupsSettled = false;
    try {
      await settleAllChildren();
      groupsSettled = true;
      await Promise.allSettled(childCompletions);
    } catch (error) {
      for (const child of children) releaseChildHandles(child);
      cleanupErrors.push(error);
    }
    try {
      assertRepositoryGuardsUnchanged(
        repositoryGuardRoot,
        repositoryGuards,
        "Architecture Compass validator suite",
      );
    } catch (error) {
      cleanupErrors.push(error);
    }
    if (groupsSettled && runRoot) {
      try {
        if (baselineRoot) removeSealedBaselineCapsule(baselineRoot);
        fs.rmSync(runRoot, { recursive: true, force: true });
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length > 0) {
      failure = failure
        ? new AggregateError(
            [failure, ...cleanupErrors],
            "Architecture Compass fixture execution and cleanup failed.",
            { cause: failure },
          )
        : cleanupErrors.length === 1
          ? cleanupErrors[0]
          : new AggregateError(cleanupErrors, "Architecture Compass fixture cleanup failed.");
    }
    await new Promise((resolve) => setImmediate(resolve));
    if (!failure && !receivedSignal && reportFile) {
      try {
        writeJsonAtomic(reportFile, coordinatorReport);
      } catch (error) {
        failure = error;
      }
    }
    for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
  }
  if (receivedSignal) {
    signalRethrow(receivedSignal);
    return;
  }
  if (failure) throw failure;
  return coordinatorReport;
}
