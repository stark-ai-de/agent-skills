import { digestJson, manifestGateIds, validateManifest } from "./validation-contract.mjs";

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

export function validateFullReport(report, manifestInput, expected = {}) {
  const manifest = validateManifest(manifestInput);
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
