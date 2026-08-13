import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { digestJson, validateManifest } from "./validation-contract.mjs";
import { validateReceipt } from "./validation-proof-contract.mjs";
import { createTrustedValidationReceipt } from "./write-validation-receipt.mjs";

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

test("report v2 and trusted receipt v3 bind every task producer", () => {
  const { manifest } = fixture();
  const fingerprint = `sha256:${"1".repeat(64)}`;
  const controlPlaneDigest = `sha256:${"2".repeat(64)}`;
  const gates = manifest.gates.map(({ id }, index) => {
    const runId = String(index + 1);
    const artifactName = `validation-task-v1-${id}-${runId}-1`;
    return {
      id,
      status: "passed",
      source: index === 0 ? "reused" : "executed",
      taskKey: digestJson({ id }),
      receiptDigest: digestJson({ id, receipt: 1 }),
      producer: {
        repository: "stark-ai-de/agent-skills",
        workflowPath: ".github/workflows/validate.yml",
        workflowDigest: controlPlaneDigest,
        controlPlaneDigest,
        runId,
        runAttempt: "1",
        jobId: String(50 + index),
        jobName: id,
        jobConclusion: "success",
        artifactName,
        event: index === 0 ? "pull_request" : "push",
        ref: index === 0 ? "refs/pull/52/merge" : "refs/heads/main",
        sha: `producer-${index}`,
        createdAt: `2026-08-13T12:0${index}:00.000Z`,
      },
      producerLocator: {
        kind: "github-artifact",
        id: String(100 + index),
        name: artifactName,
        digest: digestJson({ id, artifact: 1 }),
        size: 100 + index,
        repository: "stark-ai-de/agent-skills",
        runId,
        runAttempt: "1",
        jobId: String(50 + index),
        jobName: id,
      },
      lookupDurationMs: index,
      lookupResult: index === 0 ? "hit" : "miss",
      lookupMissCount: index === 0 ? 0 : 1,
      lookupRejectCount: 0,
      durationMs: index + 1,
      evidenceDigest: digestJson({ id, evidence: 1 }),
      outputs: [],
      reason: null,
    };
  });
  const taskResultSetDigest = digestJson(
    gates.map(({ id, taskKey, receiptDigest, status }) => ({
      id,
      taskKey,
      receiptDigest,
      status,
    })),
  );
  const reportWithoutDigest = {
    schemaVersion: 2,
    proofLevel: "diagnostic",
    planDigest: digestJson({ plan: 2 }),
    manifestDigest: digestJson(manifest),
    controlPlaneDigest,
    scope: "full",
    selectedGates: manifest.gates.map(({ id }) => id),
    gates,
    counts: { executed: 2, reused: 1, passed: 3, failed: 0, misses: 2, rejects: 0 },
    taskResultSetDigest,
    candidateFingerprintBefore: fingerprint,
    candidateFileCountBefore: 10,
    candidateFingerprintAfter: fingerprint,
    candidateFileCountAfter: 10,
    fingerprintError: null,
  };
  const report = { ...reportWithoutDigest, reportDigest: digestJson(reportWithoutDigest) };
  const context = {
    repository: "stark-ai-de/agent-skills",
    workflow: "Validate",
    workflowPath: ".github/workflows/validate.yml",
    workflowDigest: controlPlaneDigest,
    controlPlaneDigest,
    runId: "500",
    runAttempt: "1",
    validationJobId: "700",
    validationJobName: "validate",
    event: "push",
    branch: "main",
    ref: "refs/heads/main",
    refProtected: "true",
    sha: "candidate",
    version: "1.0.0",
    currentSource: {
      repository: "stark-ai-de/agent-skills",
      workflowPath: ".github/workflows/validate.yml",
      workflowDigest: controlPlaneDigest,
      controlPlaneDigest,
      runId: "500",
      runAttempt: "1",
      jobId: "700",
      jobName: "validate",
      jobConclusion: "success",
      artifactName: "validation-proof",
      event: "push",
      ref: "refs/heads/main",
      sha: "candidate",
      refProtected: "true",
      proofLevel: "release",
    },
    siteDigest: digestJson({ site: 1 }),
    pagesArtifactName: "github-pages-production",
    pagesArtifactId: "900",
    validationArtifactName: "validation-proof",
  };
  const receipt = createTrustedValidationReceipt(report, manifest, context);
  assert.equal(receipt.proof_level, "release");
  const expected = {
    workflow: "Validate",
    workflowPath: ".github/workflows/validate.yml",
    runId: "500",
    runAttempt: "1",
    validationJobId: "700",
    validationJobName: "validate",
    event: "push",
    branch: "main",
    sha: "candidate",
    version: "1.0.0",
    siteDigest: digestJson({ site: 1 }),
    pagesArtifactName: "github-pages-production",
    pagesArtifactId: "900",
    validationArtifactName: "validation-proof",
    proofLevel: "release",
    repository: "stark-ai-de/agent-skills",
    ref: "refs/heads/main",
    refProtected: "true",
  };
  assert.equal(validateReceipt(receipt, report, manifest, expected), receipt);
  for (const missing of ["workflowDigest", "controlPlaneDigest"]) {
    const selfAsserted = structuredClone(context);
    delete selfAsserted[missing];
    assert.throws(
      () => createTrustedValidationReceipt(report, manifest, selfAsserted),
      /independently supplied|digest/i,
    );
  }
  const wrongCurrentControl = structuredClone(context);
  wrongCurrentControl.controlPlaneDigest = fingerprint;
  wrongCurrentControl.currentSource.controlPlaneDigest = fingerprint;
  assert.throws(
    () => createTrustedValidationReceipt(report, manifest, wrongCurrentControl),
    /control.?plane/i,
  );
  for (const mutate of [
    (copy) => (copy.tasks[0].producer.runId = "wrong"),
    (copy) => (copy.tasks[0].producer_locator.id = "wrong"),
    (copy) => (copy.tasks[0].outputs = [{ id: "injected" }]),
    (copy) => (copy.validation_job_id = "wrong"),
    (copy) => (copy.site_digest = digestJson({ site: "wrong" })),
    (copy) => (copy.pages_artifact_id = "wrong"),
  ]) {
    const tampered = structuredClone(receipt);
    mutate(tampered);
    const { receipt_digest: ignored, ...withoutDigest } = tampered;
    void ignored;
    tampered.receipt_digest = digestJson(withoutDigest);
    assert.throws(() => validateReceipt(tampered, report, manifest, expected), /mismatch/);
  }

  const pagesContext = structuredClone(context);
  pagesContext.event = "workflow_dispatch";
  pagesContext.currentSource.event = "workflow_dispatch";
  pagesContext.currentSource.proofLevel = "pages";
  assert.equal(createTrustedValidationReceipt(report, manifest, pagesContext).proof_level, "pages");
  const copiedUpgrade = createTrustedValidationReceipt(report, manifest, pagesContext);
  copiedUpgrade.proof_level = "release";
  copiedUpgrade.current_source.proofLevel = "release";
  const { receipt_digest: ignoredUpgradeDigest, ...upgradeMaterial } = copiedUpgrade;
  void ignoredUpgradeDigest;
  copiedUpgrade.receipt_digest = digestJson(upgradeMaterial);
  assert.throws(
    () => validateReceipt(copiedUpgrade, report, manifest, { ...expected, proofLevel: "release" }),
    /event mismatch/,
  );
  for (const mutate of [
    (copy) => (copy.event = "pull_request"),
    (copy) => (copy.branch = "feature"),
    (copy) => (copy.ref = "refs/heads/feature"),
    (copy) => (copy.refProtected = "false"),
    (copy) => (copy.currentSource.proofLevel = "pages"),
    (copy) => (copy.currentSource.jobId = "wrong"),
  ]) {
    const unauthorized = structuredClone(context);
    mutate(unauthorized);
    assert.throws(
      () => createTrustedValidationReceipt(report, manifest, unauthorized),
      /protected.?main|proof level|provenance/i,
    );
  }

  for (const mutate of [
    (copy) => (copy.producer.unexpected = true),
    (copy) => (copy.producerLocator.unexpected = true),
    (copy) => (copy.outputs = [{ id: "site", kind: "directory", digest: fingerprint }]),
  ]) {
    const invalidReportWithoutDigest = structuredClone(report);
    delete invalidReportWithoutDigest.reportDigest;
    mutate(invalidReportWithoutDigest.gates[0]);
    const invalidReport = {
      ...invalidReportWithoutDigest,
      reportDigest: digestJson(invalidReportWithoutDigest),
    };
    assert.throws(
      () => createTrustedValidationReceipt(invalidReport, manifest, context),
      /schema|fields|output contract/i,
    );
  }
  const wrongProducerControlWithoutDigest = structuredClone(report);
  delete wrongProducerControlWithoutDigest.reportDigest;
  wrongProducerControlWithoutDigest.gates[0].producer.controlPlaneDigest = fingerprint;
  const wrongProducerControl = {
    ...wrongProducerControlWithoutDigest,
    reportDigest: digestJson(wrongProducerControlWithoutDigest),
  };
  assert.throws(
    () => createTrustedValidationReceipt(wrongProducerControl, manifest, context),
    /producer control plane mismatch/,
  );
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

test("release workflow invokes one shared verifier at both proof boundaries", () => {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const workflow = fs.readFileSync(
    path.resolve(directory, "../../.github/workflows/publish-release.yml"),
    "utf8",
  );
  assert.equal(
    workflow.match(/node scripts\/ci\/verify-release-proof\.mjs/g)?.length,
    2,
    "release readiness and publication must use the same checked-in verifier",
  );
  assert.equal(workflow.match(/--boundary release-readiness/g)?.length, 1);
  assert.equal(workflow.match(/--boundary publication/g)?.length, 1);
  for (const argument of [
    "--github-repository",
    "--manifest",
    "--receipt",
    "--report",
    "--pages-archive",
    "--release-sha",
    "--version",
    "--validate-run-id",
    "--validate-job-attempt",
    "--pages-artifact-name",
    "--validation-artifact-name",
  ]) {
    assert.equal(
      workflow.match(new RegExp(argument, "g"))?.length,
      2,
      `both proof boundaries must pass ${argument}`,
    );
  }
  assert.doesNotMatch(workflow, /node scripts\/ci\/verify-validation-proof\.mjs/);
  assert.doesNotMatch(workflow, /pages_metadata=|validation_metadata=|artifact_site_digest=/);
});
