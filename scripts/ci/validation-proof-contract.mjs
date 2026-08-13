import {
  canonicalJson,
  digestJson,
  manifestGateIds,
  validateManifest,
} from "./validation-contract.mjs";

export const EXPECTED_SKILLS_CLI_VERSION = "1.5.22";

function requireEqual(actual, expected, label) {
  if (actual !== expected)
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
}

function requireDigest(value, label) {
  if (!/^sha256:[a-f0-9]{64}$/.test(value ?? "")) {
    throw new Error(`${label} must be a SHA-256 digest.`);
  }
}

function requireInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function requireExactKeys(value, required, optional, label) {
  requireObject(value, label);
  const allowed = new Set([...required, ...optional]);
  const missing = required.filter((field) => !Object.hasOwn(value, field));
  const unknown = Object.keys(value).filter((field) => !allowed.has(field));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `${label} fields are invalid (missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}).`,
    );
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

const PRODUCER_FIELDS = [
  "repository",
  "workflowPath",
  "workflowDigest",
  "controlPlaneDigest",
  "runId",
  "runAttempt",
  "jobId",
  "jobName",
  "jobConclusion",
  "artifactName",
  "event",
  "ref",
  "sha",
  "createdAt",
];

const LOCATOR_FIELDS = [
  "kind",
  "id",
  "name",
  "digest",
  "size",
  "repository",
  "runId",
  "runAttempt",
  "jobId",
  "jobName",
];

function validateProducer(producer, report, label) {
  requireExactKeys(producer, PRODUCER_FIELDS, ["expiresAt"], label);
  for (const field of PRODUCER_FIELDS) requireString(producer[field], `${label}.${field}`);
  requireDigest(producer.workflowDigest, `${label} workflow digest`);
  requireDigest(producer.controlPlaneDigest, `${label} control-plane digest`);
  requireEqual(producer.controlPlaneDigest, report.controlPlaneDigest, `${label} control plane`);
  requireEqual(producer.jobConclusion, "success", `${label} job conclusion`);
  if (!Number.isFinite(Date.parse(producer.createdAt))) {
    throw new Error(`${label}.createdAt must be an ISO timestamp.`);
  }
  if (producer.expiresAt !== undefined && !Number.isFinite(Date.parse(producer.expiresAt))) {
    throw new Error(`${label}.expiresAt must be an ISO timestamp.`);
  }
}

function validateProducerLocator(locator, producer, label) {
  requireExactKeys(locator, LOCATOR_FIELDS, ["expiresAt"], label);
  for (const field of LOCATOR_FIELDS.filter((field) => !new Set(["size", "digest"]).has(field))) {
    requireString(locator[field], `${label}.${field}`);
  }
  requireEqual(locator.kind, "github-artifact", `${label} kind`);
  requireDigest(locator.digest, `${label} digest`);
  if (!Number.isSafeInteger(locator.size) || locator.size < 1) {
    throw new Error(`${label}.size must be a positive integer.`);
  }
  if (locator.expiresAt !== undefined && !Number.isFinite(Date.parse(locator.expiresAt))) {
    throw new Error(`${label}.expiresAt must be an ISO timestamp.`);
  }
  const correlations = {
    repository: producer.repository,
    runId: producer.runId,
    runAttempt: producer.runAttempt,
    jobId: producer.jobId,
    jobName: producer.jobName,
    name: producer.artifactName,
  };
  for (const [field, expected] of Object.entries(correlations)) {
    requireEqual(locator[field], expected, `${label}.${field} producer correlation`);
  }
}

function validateOutputs(outputs, gateContract, label) {
  if (!Array.isArray(outputs)) throw new Error(`${label} must be an array.`);
  const declared = gateContract.restoreOutputs ?? [];
  requireEqual(outputs.length, declared.length, `${label} output contract length`);
  for (const [index, output] of outputs.entries()) {
    requireExactKeys(
      output,
      ["id", "kind", "digest", "fileCount", "size"],
      [],
      `${label}[${index}]`,
    );
    requireEqual(output.id, declared[index].id, `${label}[${index}] id`);
    requireEqual(output.kind, declared[index].kind, `${label}[${index}] kind`);
    requireDigest(output.digest, `${label}[${index}] digest`);
    requireInteger(output.fileCount, `${label}[${index}] file count`);
    requireInteger(output.size, `${label}[${index}] size`);
  }
}

function validateFullReportV2(report, manifest, expected) {
  requireExactKeys(
    report,
    [
      "schemaVersion",
      "proofLevel",
      "planDigest",
      "manifestDigest",
      "controlPlaneDigest",
      "scope",
      "selectedGates",
      "gates",
      "counts",
      "taskResultSetDigest",
      "candidateFingerprintBefore",
      "candidateFileCountBefore",
      "candidateFingerprintAfter",
      "candidateFileCountAfter",
      "fingerprintError",
      "reportDigest",
    ],
    [],
    "validation report v2",
  );
  requireEqual(report.proofLevel, "diagnostic", "validation report proof level");
  requireEqual(report.scope, "full", "validation report scope");
  requireEqual(report.manifestDigest, digestJson(manifest), "validation report manifest digest");
  requireDigest(report.controlPlaneDigest, "validation report control-plane digest");
  requireDigest(report.planDigest, "validation report plan digest");
  requireDigest(report.taskResultSetDigest, "validation report task-result-set digest");
  const fullGateIds = manifestGateIds(manifest);
  if (JSON.stringify(report.selectedGates) !== JSON.stringify(fullGateIds)) {
    throw new Error("Validation report does not contain the exact full gate set.");
  }
  if (!Array.isArray(report.gates) || report.gates.length !== fullGateIds.length) {
    throw new Error("Validation report gate accounting is incomplete.");
  }
  if (JSON.stringify(report.gates.map(({ id }) => id)) !== JSON.stringify(fullGateIds)) {
    throw new Error("Validation report gate order or identity differs from the manifest.");
  }
  for (const [index, gate] of report.gates.entries()) {
    requireExactKeys(
      gate,
      [
        "id",
        "status",
        "source",
        "taskKey",
        "receiptDigest",
        "producer",
        "producerLocator",
        "lookupDurationMs",
        "lookupResult",
        "lookupMissCount",
        "lookupRejectCount",
        "durationMs",
        "evidenceDigest",
        "outputs",
        "reason",
      ],
      [],
      `${gate.id ?? "unknown"}: validation report gate`,
    );
    if (gate.status !== "passed" || !new Set(["executed", "reused"]).has(gate.source)) {
      throw new Error(`Validation report gate ${gate.id} did not pass with a valid source.`);
    }
    requireDigest(gate.taskKey, `${gate.id}: task key`);
    requireDigest(gate.receiptDigest, `${gate.id}: task receipt digest`);
    requireDigest(gate.evidenceDigest, `${gate.id}: evidence digest`);
    requireInteger(gate.durationMs, `${gate.id}: duration`);
    requireInteger(gate.lookupDurationMs, `${gate.id}: lookup duration`);
    if (!new Set(["miss", "hit", "verify", "reject"]).has(gate.lookupResult)) {
      throw new Error(`${gate.id}: lookup result is invalid.`);
    }
    requireInteger(gate.lookupMissCount, `${gate.id}: lookup miss count`);
    requireInteger(gate.lookupRejectCount, `${gate.id}: lookup reject count`);
    if (
      !new Set([0, 1]).has(gate.lookupMissCount) ||
      !new Set([0, 1]).has(gate.lookupRejectCount) ||
      gate.lookupRejectCount > gate.lookupMissCount
    ) {
      throw new Error(`${gate.id}: lookup accounting is invalid.`);
    }
    if (!gate.producer || !gate.producerLocator) {
      throw new Error(`${gate.id}: producer provenance is incomplete.`);
    }
    requireEqual(gate.reason, null, `${gate.id}: passing gate reason`);
    validateProducer(gate.producer, report, `${gate.id}: producer`);
    validateProducerLocator(gate.producerLocator, gate.producer, `${gate.id}: producer locator`);
    validateOutputs(gate.outputs, manifest.gates[index], `${gate.id}: outputs`);
  }
  requireDigest(report.candidateFingerprintBefore, "candidate fingerprint before gates");
  requireDigest(report.candidateFingerprintAfter, "candidate fingerprint after gates");
  requireInteger(report.candidateFileCountBefore, "candidate file count before gates");
  requireInteger(report.candidateFileCountAfter, "candidate file count after gates");
  requireEqual(
    report.candidateFingerprintAfter,
    report.candidateFingerprintBefore,
    "candidate fingerprint boundary",
  );
  requireEqual(
    report.candidateFileCountAfter,
    report.candidateFileCountBefore,
    "candidate file-count boundary",
  );
  requireEqual(report.fingerprintError, null, "validation report fingerprint error");
  const expectedTaskResultSet = digestJson(
    report.gates.map(({ id, taskKey, receiptDigest, status }) => ({
      id,
      taskKey,
      receiptDigest,
      status,
    })),
  );
  requireEqual(
    report.taskResultSetDigest,
    expectedTaskResultSet,
    "validation report task-result-set digest",
  );
  const expectedCounts = {
    executed: report.gates.filter(({ source }) => source === "executed").length,
    reused: report.gates.filter(({ source }) => source === "reused").length,
    passed: report.gates.length,
    failed: 0,
    misses: report.gates.reduce((count, gate) => count + gate.lookupMissCount, 0),
    rejects: report.gates.reduce((count, gate) => count + gate.lookupRejectCount, 0),
  };
  requireEqual(
    JSON.stringify(report.counts),
    JSON.stringify(expectedCounts),
    "validation report counts",
  );
  if (expected.controlPlaneDigest !== undefined) {
    requireEqual(
      report.controlPlaneDigest,
      expected.controlPlaneDigest,
      "validation report control-plane digest",
    );
  }
  const { reportDigest, ...withoutDigest } = report;
  requireEqual(reportDigest, digestJson(withoutDigest), "validation report digest");
  return { fullGateIds, reportDigest };
}

export function validateFullReport(report, manifestInput, expected = {}) {
  const manifest = validateManifest(manifestInput);
  if (report?.schemaVersion === 2) return validateFullReportV2(report, manifest, expected);
  if (report?.schemaVersion !== 1) throw new Error("Validation report schema must be 1.");
  requireEqual(report.scope, "full", "validation report scope");
  requireEqual(report.manifestDigest, digestJson(manifest), "validation report manifest digest");
  const fullGateIds = manifestGateIds(manifest);
  if (JSON.stringify(report.selectedGates) !== JSON.stringify(fullGateIds)) {
    throw new Error("Validation report does not contain the exact full gate set.");
  }
  if (!Array.isArray(report.gates) || report.gates.length !== fullGateIds.length) {
    throw new Error("Validation report gate accounting is incomplete.");
  }
  if (JSON.stringify(report.gates.map(({ id }) => id)) !== JSON.stringify(fullGateIds)) {
    throw new Error("Validation report gate order or identity differs from the manifest.");
  }
  for (const gate of report.gates) {
    if (gate.status !== "passed" || gate.exitCode !== 0) {
      throw new Error(`Validation report gate ${gate.id} did not pass.`);
    }
  }
  requireDigest(report.planDigest, "validation report plan digest");
  requireDigest(report.candidateFingerprintBefore, "candidate fingerprint before gates");
  requireDigest(report.candidateFingerprintAfter, "candidate fingerprint after gates");
  requireEqual(
    report.candidateFingerprintAfter,
    report.candidateFingerprintBefore,
    "candidate fingerprint boundary",
  );
  requireEqual(
    report.candidateFileCountAfter,
    report.candidateFileCountBefore,
    "candidate file-count boundary",
  );
  requireEqual(report.fingerprintError, null, "validation report fingerprint error");
  if (!report.smokeEvidence) throw new Error("Full validation report is missing smoke evidence.");
  requireEqual(
    report.smokeEvidence.candidateFingerprint,
    report.candidateFingerprintAfter,
    "smoke candidate fingerprint",
  );
  requireEqual(
    report.smokeEvidence.candidateFileCount,
    report.candidateFileCountAfter,
    "smoke candidate file count",
  );
  if (!/^\d+\.\d+\.\d+$/.test(report.skillsCliVersion ?? "")) {
    throw new Error("Full validation report is missing the exact skills CLI version.");
  }
  requireEqual(
    report.skillsCliVersion,
    expected.skillsCliVersion ?? EXPECTED_SKILLS_CLI_VERSION,
    "validation report skills CLI version",
  );
  requireEqual(report.skillsSmokeCli, "configured", "skills smoke CLI state");
  if (!new Set(["0", "1"]).has(report.skillsSmokeForceTty)) {
    throw new Error("Full validation report has an invalid skills smoke TTY state.");
  }
  requireDigest(report.fixtureInventoryDigest, "fixture inventory digest");
  if (expected.fixtureInventoryDigest !== undefined) {
    requireEqual(
      report.fixtureInventoryDigest,
      expected.fixtureInventoryDigest,
      "validation report fixture inventory digest",
    );
  }
  const { reportDigest, ...withoutDigest } = report;
  requireEqual(reportDigest, digestJson(withoutDigest), "validation report digest");
  return { fullGateIds, reportDigest };
}

export function validateReceipt(receipt, report, manifest, expected = {}) {
  const { fullGateIds, reportDigest } = validateFullReport(report, manifest, expected);
  if (receipt?.schema_version === 3) {
    requireExactKeys(
      receipt,
      [
        "schema_version",
        "proof_level",
        "workflow",
        "workflow_path",
        "run_id",
        "run_attempt",
        "validation_job_id",
        "validation_job_name",
        "validation_job_attempt",
        "event",
        "branch",
        "sha",
        "version",
        "validation_scope",
        "plan_digest",
        "manifest_digest",
        "control_plane_digest",
        "full_gate_ids",
        "gate_report_digest",
        "task_result_set_digest",
        "candidate_fingerprint",
        "candidate_file_count",
        "current_source",
        "tasks",
        "site_digest",
        "pages_artifact_name",
        "pages_artifact_id",
        "validation_artifact_name",
        "validation_report_name",
        "receipt_digest",
      ],
      [],
      "trusted validation receipt v3",
    );
    if (!new Set(["pages", "release"]).has(receipt.proof_level)) {
      throw new Error("Trusted validation receipt proof level must be pages or release.");
    }
    requireEqual(receipt.validation_scope, "full", "validation receipt scope");
    requireEqual(receipt.plan_digest, report.planDigest, "receipt plan digest");
    requireEqual(receipt.manifest_digest, report.manifestDigest, "receipt manifest digest");
    requireEqual(
      receipt.control_plane_digest,
      report.controlPlaneDigest,
      "receipt control-plane digest",
    );
    requireEqual(receipt.gate_report_digest, reportDigest, "receipt gate-report digest");
    requireEqual(
      receipt.task_result_set_digest,
      report.taskResultSetDigest,
      "receipt task-result-set digest",
    );
    requireEqual(
      JSON.stringify(receipt.full_gate_ids),
      JSON.stringify(fullGateIds),
      "receipt full-gate set",
    );
    requireEqual(
      receipt.candidate_fingerprint,
      report.candidateFingerprintAfter,
      "receipt candidate fingerprint",
    );
    requireEqual(
      receipt.candidate_file_count,
      report.candidateFileCountAfter,
      "receipt candidate file count",
    );
    if (!Array.isArray(receipt.tasks) || receipt.tasks.length !== fullGateIds.length) {
      throw new Error("Validation receipt task provenance is incomplete.");
    }
    for (const [index, task] of receipt.tasks.entries()) {
      requireExactKeys(
        task,
        [
          "gate_id",
          "task_key",
          "receipt_digest",
          "producer",
          "producer_locator",
          "evidence_digest",
          "outputs",
        ],
        [],
        `receipt task ${index}`,
      );
      const gate = report.gates[index];
      requireEqual(task.gate_id, gate.id, "receipt task gate ID");
      requireEqual(task.task_key, gate.taskKey, "receipt task key");
      requireEqual(task.receipt_digest, gate.receiptDigest, "receipt task digest");
      requireEqual(task.evidence_digest, gate.evidenceDigest, "receipt task evidence digest");
      requireEqual(
        canonicalJson(task.producer),
        canonicalJson(gate.producer),
        "receipt task producer",
      );
      requireEqual(
        canonicalJson(task.producer_locator),
        canonicalJson(gate.producerLocator),
        "receipt task producer locator",
      );
      requireEqual(
        canonicalJson(task.outputs),
        canonicalJson(gate.outputs),
        "receipt task outputs",
      );
    }
    const expectedFields = {
      workflow: expected.workflow,
      workflow_path: expected.workflowPath,
      event: expected.event,
      branch: expected.branch,
      sha: expected.sha,
      version: expected.version,
      run_id: expected.runId,
      run_attempt: expected.runAttempt,
      validation_job_attempt: expected.runAttempt,
      validation_job_id: expected.validationJobId,
      validation_job_name: expected.validationJobName,
      site_digest: expected.siteDigest,
      pages_artifact_name: expected.pagesArtifactName,
      pages_artifact_id: expected.pagesArtifactId,
      validation_artifact_name: expected.validationArtifactName,
      proof_level: expected.proofLevel,
    };
    for (const [field, value] of Object.entries(expectedFields)) {
      if (value !== undefined) requireEqual(receipt[field], value, `receipt ${field}`);
    }
    for (const field of [
      "workflow",
      "workflow_path",
      "run_id",
      "run_attempt",
      "validation_job_id",
      "validation_job_name",
      "validation_job_attempt",
      "event",
      "branch",
      "sha",
      "version",
      "site_digest",
      "pages_artifact_name",
      "pages_artifact_id",
      "validation_artifact_name",
      "validation_report_name",
    ]) {
      if (typeof receipt[field] !== "string" || receipt[field].length === 0) {
        throw new Error(`Validation receipt ${field} must be a non-empty string.`);
      }
    }
    requireDigest(receipt.site_digest, "validation receipt site digest");
    requireEqual(receipt.branch, "main", "validation receipt protected-main branch");
    const expectedEvent = receipt.proof_level === "release" ? "push" : "workflow_dispatch";
    requireEqual(receipt.event, expectedEvent, "validation receipt proof-level event");
    requireEqual(
      receipt.validation_job_attempt,
      receipt.run_attempt,
      "validation receipt job attempt",
    );
    requireExactKeys(
      receipt.current_source,
      [
        "repository",
        "workflowPath",
        "workflowDigest",
        "controlPlaneDigest",
        "runId",
        "runAttempt",
        "jobId",
        "jobName",
        "jobConclusion",
        "artifactName",
        "event",
        "ref",
        "sha",
        "refProtected",
        "proofLevel",
      ],
      [],
      "current aggregator source",
    );
    for (const field of [
      "repository",
      "workflowPath",
      "workflowDigest",
      "controlPlaneDigest",
      "runId",
      "runAttempt",
      "jobId",
      "jobName",
      "jobConclusion",
      "artifactName",
      "event",
      "ref",
      "sha",
      "refProtected",
      "proofLevel",
    ]) {
      requireString(receipt.current_source[field], `current aggregator source.${field}`);
    }
    requireDigest(receipt.current_source.workflowDigest, "current aggregator workflow digest");
    requireDigest(
      receipt.current_source.controlPlaneDigest,
      "current aggregator control-plane digest",
    );
    requireEqual(
      receipt.current_source.controlPlaneDigest,
      receipt.control_plane_digest,
      "current aggregator control plane",
    );
    requireEqual(
      receipt.current_source.jobConclusion,
      "success",
      "current aggregator job conclusion",
    );
    requireEqual(receipt.current_source.runId, receipt.run_id, "current aggregator run ID");
    requireEqual(
      receipt.current_source.runAttempt,
      receipt.run_attempt,
      "current aggregator run attempt",
    );
    requireEqual(
      receipt.current_source.jobId,
      receipt.validation_job_id,
      "current aggregator job ID",
    );
    requireEqual(
      receipt.current_source.jobName,
      receipt.validation_job_name,
      "current aggregator job name",
    );
    requireEqual(receipt.current_source.event, receipt.event, "current aggregator event");
    requireEqual(receipt.current_source.sha, receipt.sha, "current aggregator SHA");
    requireEqual(receipt.current_source.ref, "refs/heads/main", "current aggregator ref");
    requireEqual(receipt.current_source.refProtected, "true", "current aggregator protected ref");
    requireEqual(
      receipt.current_source.proofLevel,
      receipt.proof_level,
      "current aggregator proof level",
    );
    requireEqual(
      receipt.current_source.artifactName,
      receipt.validation_artifact_name,
      "current aggregator artifact name",
    );
    requireEqual(
      receipt.current_source.workflowPath,
      receipt.workflow_path,
      "current aggregator workflow path",
    );
    for (const [index, task] of receipt.tasks.entries()) {
      requireEqual(
        task.producer.repository,
        receipt.current_source.repository,
        `receipt task ${index} repository`,
      );
      requireEqual(
        task.producer.workflowPath,
        receipt.workflow_path,
        `receipt task ${index} workflow path`,
      );
      requireEqual(
        task.producer.workflowDigest,
        receipt.current_source.workflowDigest,
        `receipt task ${index} workflow digest`,
      );
      requireEqual(
        task.producer.controlPlaneDigest,
        receipt.control_plane_digest,
        `receipt task ${index} control plane`,
      );
    }
    const siteGateIndex = fullGateIds.indexOf("site");
    if (siteGateIndex >= 0) {
      const siteOutput = receipt.tasks[siteGateIndex].outputs.find(({ id }) => id === "site-dist");
      if (!siteOutput) throw new Error("Trusted validation receipt lacks site-dist output proof.");
      requireEqual(siteOutput.digest, receipt.site_digest, "trusted site output digest");
    }
    if (expected.repository !== undefined) {
      requireEqual(
        receipt.current_source.repository,
        expected.repository,
        "current aggregator repository",
      );
    }
    if (expected.ref !== undefined) {
      requireEqual(receipt.current_source.ref, expected.ref, "current aggregator ref");
    }
    if (expected.refProtected !== undefined) {
      requireEqual(
        receipt.current_source.refProtected,
        expected.refProtected,
        "current aggregator protected ref",
      );
    }
    if (expected.workflowDigest !== undefined) {
      requireEqual(
        receipt.current_source.workflowDigest,
        expected.workflowDigest,
        "current aggregator workflow digest",
      );
    }
    const { receipt_digest: receiptDigest, ...withoutDigest } = receipt;
    requireEqual(receiptDigest, digestJson(withoutDigest), "validation receipt digest");
    return receipt;
  }
  if (receipt?.schema_version !== 2) throw new Error("Validation receipt schema must be 2.");
  requireEqual(receipt.validation_scope, "full", "validation receipt scope");
  requireEqual(receipt.plan_digest, report.planDigest, "receipt plan digest");
  requireEqual(receipt.manifest_digest, report.manifestDigest, "receipt manifest digest");
  requireEqual(receipt.gate_report_digest, reportDigest, "receipt gate-report digest");
  requireEqual(
    JSON.stringify(receipt.full_gate_ids),
    JSON.stringify(fullGateIds),
    "receipt full-gate set",
  );
  requireEqual(
    receipt.candidate_fingerprint,
    report.candidateFingerprintAfter,
    "receipt candidate fingerprint",
  );
  requireEqual(
    receipt.candidate_file_count,
    report.candidateFileCountAfter,
    "receipt candidate file count",
  );
  requireEqual(
    receipt.fixture_inventory_digest,
    report.fixtureInventoryDigest,
    "receipt fixture inventory digest",
  );
  requireEqual(receipt.skills_cli_version, report.skillsCliVersion, "receipt skills CLI version");
  requireEqual(receipt.skills_smoke_cli, report.skillsSmokeCli, "receipt skills smoke CLI state");
  requireEqual(
    receipt.skills_smoke_force_tty,
    report.skillsSmokeForceTty,
    "receipt skills smoke TTY state",
  );
  requireEqual(receipt.skills_gate_success, true, "receipt skills gate success");
  requireEqual(receipt.smoke_install_success, true, "receipt smoke-install success");
  const expectedFields = {
    workflow: expected.workflow,
    workflow_path: expected.workflowPath,
    event: expected.event,
    branch: expected.branch,
    sha: expected.sha,
    version: expected.version,
    run_id: expected.runId,
    run_attempt: expected.runAttempt,
    validation_job_attempt: expected.runAttempt,
    pages_artifact_name: expected.pagesArtifactName,
    validation_artifact_name: expected.validationArtifactName,
  };
  for (const [field, value] of Object.entries(expectedFields)) {
    if (value !== undefined) requireEqual(receipt[field], value, `receipt ${field}`);
  }
  return receipt;
}
