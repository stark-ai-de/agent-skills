import crypto from "node:crypto";
import os from "node:os";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const HOSTED_SHARD_COUNT = 3;
const FROZEN_CASE_COUNT = 325;
const PREFLIGHT_EVIDENCE_FIELDS = Object.freeze([
  "schemaVersion",
  "parserContract",
  "fixtureSetupContract",
  "baselineValidation",
]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Json(value) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(`${canonicalJson(value)}\n`)
    .digest("hex")}`;
}

export function architectureValueDigest(value) {
  return sha256Json(value);
}

function assertDigest(value, name) {
  if (!DIGEST_PATTERN.test(value ?? "")) throw new Error(`${name} must be a SHA-256 digest.`);
}

function validatePreflightEvidence(evidence) {
  if (
    evidence?.schemaVersion !== 1 ||
    Object.keys(evidence).sort().join("\0") !== [...PREFLIGHT_EVIDENCE_FIELDS].sort().join("\0") ||
    evidence.parserContract !== "passed" ||
    evidence.fixtureSetupContract !== "passed" ||
    evidence.baselineValidation !== "passed"
  ) {
    throw new Error("Architecture Compass preflight evidence is malformed or incomplete.");
  }
}

function validateInventory(inventory) {
  if (inventory?.schemaVersion !== 1 || !Array.isArray(inventory.cases)) {
    throw new Error("Architecture Compass frozen inventory is malformed.");
  }
  if (inventory.cases.length !== FROZEN_CASE_COUNT) {
    throw new Error(
      `Architecture Compass frozen inventory must contain ${FROZEN_CASE_COUNT} cases.`,
    );
  }
  const ids = new Set();
  let previousId = null;
  for (const [ordinal, entry] of inventory.cases.entries()) {
    if (
      typeof entry?.id !== "string" ||
      entry.id.length === 0 ||
      !new Set(["failure", "success"]).has(entry.expectedOutcome) ||
      !new Set(["all", "posix"]).has(entry.applicability)
    ) {
      throw new Error(`Architecture Compass frozen inventory case ${ordinal} is malformed.`);
    }
    if (ids.has(entry.id))
      throw new Error("Architecture Compass frozen inventory has duplicate IDs.");
    if (previousId !== null && previousId >= entry.id) {
      throw new Error("Architecture Compass frozen inventory must use stable ID order.");
    }
    ids.add(entry.id);
    previousId = entry.id;
  }
}

function deterministicResult(result) {
  return {
    id: result.id,
    ordinal: result.ordinal,
    expectedOutcome: result.expectedOutcome,
    status: result.status,
    skipBucket: result.skipBucket,
  };
}

export function architectureAccountingDigest(results) {
  if (!Array.isArray(results)) throw new Error("Architecture Compass results must be an array.");
  return sha256Json(results.map(deterministicResult));
}

export function resolveLocalWorkerCount({
  configured = "auto",
  availableParallelism = os.availableParallelism(),
  assignedCaseCount = Number.POSITIVE_INFINITY,
} = {}) {
  if (!/^(?:auto|[123])$/.test(String(configured))) {
    throw new Error("Architecture Compass local worker count must be auto, 1, 2, or 3.");
  }
  if (!Number.isSafeInteger(availableParallelism) || availableParallelism < 1) {
    throw new Error("Architecture Compass available parallelism must be a positive integer.");
  }
  if (
    assignedCaseCount !== Number.POSITIVE_INFINITY &&
    (!Number.isSafeInteger(assignedCaseCount) || assignedCaseCount < 1)
  ) {
    throw new Error("Architecture Compass assigned case count must be a positive integer.");
  }
  const requested = configured === "auto" ? 3 : Number(configured);
  return Math.min(3, requested, Math.max(1, availableParallelism - 1), assignedCaseCount);
}

export function createHostedShardPlan({
  inventory,
  taskKey,
  baselineDigest,
  preflightEvidence,
  hostedShardCount = HOSTED_SHARD_COUNT,
}) {
  validateInventory(inventory);
  assertDigest(taskKey, "Architecture Compass task key");
  assertDigest(baselineDigest, "Architecture Compass baseline digest");
  validatePreflightEvidence(preflightEvidence);
  if (hostedShardCount !== HOSTED_SHARD_COUNT) {
    throw new Error(`Architecture Compass requires exactly ${HOSTED_SHARD_COUNT} hosted shards.`);
  }
  const inventoryDigest = sha256Json(inventory.cases);
  const preflightEvidenceDigest = sha256Json(preflightEvidence);
  const taskDigest = sha256Json({
    taskKey,
    baselineDigest,
    inventoryDigest,
    preflightEvidenceDigest,
  });
  const shards = Array.from({ length: hostedShardCount }, (_, hostedShardIndex) => {
    const caseOrdinals = inventory.cases
      .map((_, ordinal) => ordinal)
      .filter((ordinal) => ordinal % hostedShardCount === hostedShardIndex);
    return {
      hostedShardIndex,
      hostedShardCount,
      caseOrdinals,
      caseIds: caseOrdinals.map((ordinal) => inventory.cases[ordinal].id),
    };
  });
  return {
    schemaVersion: 1,
    taskKey,
    taskDigest,
    baselineDigest,
    inventoryDigest,
    preflightEvidence,
    preflightEvidenceDigest,
    hostedShardCount,
    shards,
  };
}

function validateResult(result, expected, ordinal, reportIndex) {
  if (
    result?.id !== expected.id ||
    result.ordinal !== ordinal ||
    result.expectedOutcome !== expected.expectedOutcome
  ) {
    throw new Error(
      `Architecture Compass hosted shard ${reportIndex} reported contradictory case metadata at ordinal ${ordinal}.`,
    );
  }
  if (!Number.isSafeInteger(result.durationMs) || result.durationMs < 0) {
    throw new Error(
      `Architecture Compass hosted shard ${reportIndex} reported an invalid case duration.`,
    );
  }
  const telemetry = result.phaseTelemetry;
  for (const phase of ["materializeMs", "mutateMs", "validateMs", "cleanupMs"]) {
    if (!Number.isSafeInteger(telemetry?.[phase]) || telemetry[phase] < 0) {
      throw new Error(
        `Architecture Compass hosted shard ${reportIndex} reported invalid ${phase} telemetry.`,
      );
    }
  }
  if (result.status === "passed") {
    if (result.skipBucket !== null || result.reason !== null) {
      throw new Error(
        `Architecture Compass hosted shard ${reportIndex} attached skip metadata to a passed case.`,
      );
    }
    return;
  }
  if (
    !new Set(["skipped", "not-applicable"]).has(result.status) ||
    typeof result.skipBucket !== "string" ||
    result.skipBucket.length === 0 ||
    typeof result.reason !== "string" ||
    result.reason.length === 0
  ) {
    throw new Error(
      `Architecture Compass hosted shard ${reportIndex} reported an invalid outcome.`,
    );
  }
}

export function aggregateHostedShardReports({ inventory, plan, reports }) {
  validateInventory(inventory);
  const canonicalPlan = createHostedShardPlan({
    inventory,
    taskKey: plan?.taskKey,
    baselineDigest: plan?.baselineDigest,
    preflightEvidence: plan?.preflightEvidence,
    hostedShardCount: plan?.hostedShardCount,
  });
  if (canonicalJson(plan) !== canonicalJson(canonicalPlan)) {
    throw new Error("Architecture Compass hosted shard plan is contradictory.");
  }
  if (!Array.isArray(reports) || reports.length !== canonicalPlan.hostedShardCount) {
    throw new Error(
      "Architecture Compass hosted reports contain missing, duplicate, unexpected, or wrong-shard IDs.",
    );
  }
  const reportsByIndex = new Map();
  for (const report of reports) {
    if (
      !Number.isSafeInteger(report?.hostedShardIndex) ||
      report.hostedShardIndex < 0 ||
      report.hostedShardIndex >= canonicalPlan.hostedShardCount ||
      reportsByIndex.has(report.hostedShardIndex)
    ) {
      throw new Error(
        "Architecture Compass hosted reports contain missing, duplicate, unexpected, or wrong-shard IDs.",
      );
    }
    reportsByIndex.set(report.hostedShardIndex, report);
  }

  const stableShardEvidence = [];
  const allResults = [];
  let maximumLocalWorkerCount = 1;
  for (const shard of canonicalPlan.shards) {
    const report = reportsByIndex.get(shard.hostedShardIndex);
    if (
      report?.schemaVersion !== 1 ||
      report.hostedShardCount !== canonicalPlan.hostedShardCount ||
      report.taskKey !== canonicalPlan.taskKey ||
      report.taskDigest !== canonicalPlan.taskDigest ||
      report.inventoryDigest !== canonicalPlan.inventoryDigest ||
      report.preflightEvidenceDigest !== canonicalPlan.preflightEvidenceDigest ||
      report.baselineDigest !== canonicalPlan.baselineDigest ||
      report.capsuleBeforeDigest !== canonicalPlan.baselineDigest ||
      report.capsuleAfterDigest !== canonicalPlan.baselineDigest ||
      report.preflight !== "passed" ||
      !Number.isSafeInteger(report.localWorkerCount) ||
      report.localWorkerCount < 1 ||
      report.localWorkerCount > 3 ||
      !Array.isArray(report.results) ||
      !Number.isSafeInteger(report.phaseTelemetry?.startupMs) ||
      report.phaseTelemetry.startupMs < 0 ||
      !Number.isSafeInteger(report.phaseTelemetry?.mergeMs) ||
      report.phaseTelemetry.mergeMs < 0 ||
      !new Set(["clone", "copy"]).has(report.materializationStrategy)
    ) {
      throw new Error(
        `Architecture Compass hosted shard ${shard.hostedShardIndex} wrote an invalid report.`,
      );
    }
    const actualIds = report.results.map(({ id }) => id);
    if (canonicalJson(actualIds) !== canonicalJson(shard.caseIds)) {
      throw new Error(
        "Architecture Compass hosted reports contain missing, duplicate, unexpected, or wrong-shard IDs.",
      );
    }
    for (const [index, result] of report.results.entries()) {
      const ordinal = shard.caseOrdinals[index];
      validateResult(result, inventory.cases[ordinal], ordinal, shard.hostedShardIndex);
    }
    const accountingDigest = architectureAccountingDigest(report.results);
    if (report.accountingDigest !== accountingDigest) {
      throw new Error(
        `Architecture Compass hosted shard ${shard.hostedShardIndex} has a contradictory accounting digest.`,
      );
    }
    maximumLocalWorkerCount = Math.max(maximumLocalWorkerCount, report.localWorkerCount);
    stableShardEvidence.push({
      hostedShardIndex: shard.hostedShardIndex,
      caseCount: report.results.length,
      localWorkerCount: report.localWorkerCount,
      accountingDigest,
      capsuleDigest: report.capsuleAfterDigest,
      materializationStrategy: report.materializationStrategy,
    });
    allResults.push(...report.results);
  }

  allResults.sort((left, right) => left.ordinal - right.ordinal);
  const expectedIds = inventory.cases.map(({ id }) => id);
  if (
    allResults.length !== FROZEN_CASE_COUNT ||
    new Set(allResults.map(({ id }) => id)).size !== FROZEN_CASE_COUNT ||
    canonicalJson(allResults.map(({ id }) => id)) !== canonicalJson(expectedIds)
  ) {
    throw new Error(
      "Architecture Compass hosted reports contain missing, duplicate, unexpected, or wrong-shard IDs.",
    );
  }
  const accountingDigest = architectureAccountingDigest(allResults);
  const capabilityComplete = allResults.every(({ status }) => status === "passed");
  if (!capabilityComplete) {
    throw new Error("Architecture Compass hosted evidence is not capability-complete.");
  }
  const evidenceMaterial = {
    schemaVersion: 1,
    gateId: "architecture-compass",
    status: "passed",
    taskKey: canonicalPlan.taskKey,
    taskDigest: canonicalPlan.taskDigest,
    preflightEvidenceDigest: canonicalPlan.preflightEvidenceDigest,
    inventoryDigest: canonicalPlan.inventoryDigest,
    accountingDigest,
    caseCount: FROZEN_CASE_COUNT,
    hostedShardCount: HOSTED_SHARD_COUNT,
    capabilityComplete,
    shards: stableShardEvidence.map(
      ({ materializationStrategy: _strategy, ...evidence }) => evidence,
    ),
  };
  const gateEvidence = {
    schemaVersion: evidenceMaterial.schemaVersion,
    gateId: evidenceMaterial.gateId,
    status: evidenceMaterial.status,
    taskKey: evidenceMaterial.taskKey,
    inventoryDigest: evidenceMaterial.inventoryDigest,
    accountingDigest: evidenceMaterial.accountingDigest,
    evidenceDigest: sha256Json(evidenceMaterial),
    caseCount: evidenceMaterial.caseCount,
    hostedShardCount: evidenceMaterial.hostedShardCount,
    capabilityComplete,
  };
  return {
    schemaVersion: 1,
    workerCount: maximumLocalWorkerCount,
    hostedShardCount: HOSTED_SHARD_COUNT,
    taskKey: canonicalPlan.taskKey,
    taskDigest: canonicalPlan.taskDigest,
    baselineDigest: canonicalPlan.baselineDigest,
    inventoryDigest: canonicalPlan.inventoryDigest,
    preflight: "passed",
    preflightEvidenceDigest: canonicalPlan.preflightEvidenceDigest,
    accountingDigest,
    capabilityComplete,
    hostedShards: stableShardEvidence,
    results: allResults,
    gateEvidence,
  };
}
