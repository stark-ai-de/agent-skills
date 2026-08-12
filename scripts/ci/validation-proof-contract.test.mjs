import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { digestJson, validateManifest } from "./validation-contract.mjs";
import { validateReceipt } from "./validation-proof-contract.mjs";

function fixture() {
  const manifest = {
    schemaVersion: 1,
    globalInvalidators: [],
    knownPaths: ["tracked.txt"],
    gates: ["skills", "architecture-compass", "smoke-install"].map((id) => ({
      id,
      command: ["node", "--version"],
      paths: [],
      installProfiles: [],
      timeoutMs: 1000,
      prerequisites: [],
      aggregate: true,
      trustedProofRequired: true,
    })),
  };
  const fingerprint = `sha256:${"a".repeat(64)}`;
  const fixtureDigest = `sha256:${"b".repeat(64)}`;
  const planDigest = `sha256:${"c".repeat(64)}`;
  const reportWithoutDigest = {
    schemaVersion: 1,
    planDigest,
    manifestDigest: digestJson(manifest),
    scope: "full",
    selectedGates: manifest.gates.map(({ id }) => id),
    gates: manifest.gates.map(({ id }) => ({
      id,
      status: "passed",
      exitCode: 0,
      durationMs: 1,
      reason: null,
    })),
    candidateFingerprintBefore: fingerprint,
    candidateFileCountBefore: 10,
    candidateFingerprintAfter: fingerprint,
    candidateFileCountAfter: 10,
    fingerprintError: null,
    smokeEvidence: { candidateFingerprint: fingerprint, candidateFileCount: 10 },
    skillsCliVersion: "1.5.22",
    skillsSmokeCli: "configured",
    skillsSmokeForceTty: "1",
    fixtureInventoryDigest: fixtureDigest,
  };
  const report = { ...reportWithoutDigest, reportDigest: digestJson(reportWithoutDigest) };
  const receipt = {
    schema_version: 2,
    validation_scope: "full",
    plan_digest: planDigest,
    manifest_digest: report.manifestDigest,
    full_gate_ids: report.selectedGates,
    gate_report_digest: report.reportDigest,
    candidate_fingerprint: fingerprint,
    candidate_file_count: 10,
    fixture_inventory_digest: fixtureDigest,
    skills_cli_version: "1.5.22",
    skills_smoke_cli: "configured",
    skills_smoke_force_tty: "1",
    skills_gate_success: true,
    smoke_install_success: true,
  };
  return { manifest, report, receipt };
}

test("full receipt accepts exact complete proof", () => {
  const { manifest, report, receipt } = fixture();
  assert.equal(validateReceipt(receipt, report, manifest), receipt);
});

test("affected, incomplete, and tampered proof fails closed", () => {
  const { manifest, report, receipt } = fixture();
  assert.throws(
    () => validateReceipt({ ...receipt, validation_scope: "affected" }, report, manifest),
    /scope mismatch/,
  );
  assert.throws(
    () => validateReceipt(receipt, { ...report, gates: report.gates.slice(1) }, manifest),
    /accounting is incomplete/,
  );
  assert.throws(
    () =>
      validateReceipt(
        { ...receipt, gate_report_digest: `sha256:${"d".repeat(64)}` },
        report,
        manifest,
      ),
    /gate-report digest mismatch/,
  );
  assert.throws(
    () =>
      validateReceipt(receipt, { ...report, reportDigest: `sha256:${"e".repeat(64)}` }, manifest),
    /report digest mismatch/,
  );
  const fingerprintFailureWithoutDigest = {
    ...report,
    fingerprintError: "candidate fingerprint could not be trusted",
  };
  delete fingerprintFailureWithoutDigest.reportDigest;
  const fingerprintFailure = {
    ...fingerprintFailureWithoutDigest,
    reportDigest: digestJson(fingerprintFailureWithoutDigest),
  };
  assert.throws(
    () =>
      validateReceipt(
        { ...receipt, gate_report_digest: fingerprintFailure.reportDigest },
        fingerprintFailure,
        manifest,
      ),
    /fingerprint error mismatch/,
  );
});

test("self-consistent wrong CLI and fixture identities fail against trusted expectations", () => {
  const { manifest, report, receipt } = fixture();
  const wrongVersionReportWithoutDigest = { ...report, skillsCliVersion: "9.9.9" };
  delete wrongVersionReportWithoutDigest.reportDigest;
  const wrongVersionReport = {
    ...wrongVersionReportWithoutDigest,
    reportDigest: digestJson(wrongVersionReportWithoutDigest),
  };
  assert.throws(
    () =>
      validateReceipt(
        {
          ...receipt,
          skills_cli_version: "9.9.9",
          gate_report_digest: wrongVersionReport.reportDigest,
        },
        wrongVersionReport,
        manifest,
        { skillsCliVersion: "1.5.22" },
      ),
    /skills CLI version mismatch/,
  );

  const wrongFixtureDigest = `sha256:${"f".repeat(64)}`;
  const wrongFixtureReportWithoutDigest = {
    ...report,
    fixtureInventoryDigest: wrongFixtureDigest,
  };
  delete wrongFixtureReportWithoutDigest.reportDigest;
  const wrongFixtureReport = {
    ...wrongFixtureReportWithoutDigest,
    reportDigest: digestJson(wrongFixtureReportWithoutDigest),
  };
  assert.throws(
    () =>
      validateReceipt(
        {
          ...receipt,
          fixture_inventory_digest: wrongFixtureDigest,
          gate_report_digest: wrongFixtureReport.reportDigest,
        },
        wrongFixtureReport,
        manifest,
        { fixtureInventoryDigest: report.fixtureInventoryDigest },
      ),
    /fixture inventory digest mismatch/,
  );
});

test("manifest schema 1 rejects gates excluded from trusted full proof", () => {
  const { manifest } = fixture();
  manifest.gates[1].trustedProofRequired = false;
  assert.throws(() => validateManifest(manifest), /requires every gate in trusted full proof/);
});

test("release workflow accepts the boolean false non-expired artifact state", () => {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const workflow = fs.readFileSync(
    path.resolve(directory, "../../.github/workflows/publish-release.yml"),
    "utf8",
  );
  assert.equal(
    workflow.match(/jq -e '\.expired == false'/g)?.length,
    2,
    "both release proof boundaries must test boolean false without jq -e command substitution",
  );
  assert.doesNotMatch(workflow, /jq -er '\.expired'/);
});
