import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { digestJson, writeJsonAtomic } from "./validation-contract.mjs";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const initializeScript = path.join(scriptRoot, "initialize-validation-diagnostic.mjs");
const finalizeScript = path.join(scriptRoot, "finalize-validation-diagnostic.mjs");

function assertExactDiagnosticReportV2(report) {
  assert.deepEqual(Object.keys(report).sort(), [
    "candidateFileCountAfter",
    "candidateFileCountBefore",
    "candidateFingerprintAfter",
    "candidateFingerprintBefore",
    "controlPlaneDigest",
    "counts",
    "fingerprintError",
    "gates",
    "manifestDigest",
    "planDigest",
    "proofLevel",
    "reportDigest",
    "schemaVersion",
    "scope",
    "selectedGates",
    "taskResultSetDigest",
  ]);
  const { reportDigest, ...withoutDigest } = report;
  assert.equal(reportDigest, digestJson(withoutDigest));
  for (const gate of report.gates) {
    assert.deepEqual(Object.keys(gate).sort(), [
      "durationMs",
      "evidenceDigest",
      "id",
      "lookupDurationMs",
      "lookupMissCount",
      "lookupRejectCount",
      "lookupResult",
      "outputs",
      "producer",
      "producerLocator",
      "reason",
      "receiptDigest",
      "source",
      "status",
      "taskKey",
    ]);
  }
}

function execute(command, arguments_, options = {}) {
  const { expectedStatus = 0, ...spawnOptions } = options;
  const result = spawnSync(command, arguments_, {
    ...spawnOptions,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== expectedStatus) {
    throw new Error(
      result.stderr?.trim() ||
        `${command} ${arguments_.join(" ")} exited ${result.status}; expected ${expectedStatus}.`,
    );
  }
  return result.stdout;
}

function fixture(t) {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), "validation-diagnostic-repo-"));
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validation-diagnostic-output-"));
  t.after(() => fs.rmSync(repository, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outputRoot, { recursive: true, force: true }));

  execute("git", ["init", "--quiet"], { cwd: repository });
  execute("git", ["config", "user.email", "validation@example.invalid"], {
    cwd: repository,
  });
  execute("git", ["config", "user.name", "Validation Test"], { cwd: repository });
  fs.writeFileSync(path.join(repository, "tracked.txt"), "candidate\n");
  execute("git", ["add", "tracked.txt"], { cwd: repository });
  execute("git", ["commit", "--quiet", "-m", "fixture"], { cwd: repository });

  const boundaryFile = path.join(outputRoot, "boundary.json");
  const manifestFile = path.join(outputRoot, "manifest.json");
  const planFile = path.join(outputRoot, "plan.json");
  const reportFile = path.join(outputRoot, "report.json");
  execute(process.execPath, [initializeScript, "--output", boundaryFile], { cwd: repository });

  const manifest = {
    schemaVersion: 1,
    globalInvalidators: [],
    knownPaths: ["tracked.txt"],
    gates: [
      {
        id: "fixture",
        command: [process.execPath, "-e", "process.exit(0)"],
        paths: ["tracked.txt"],
        installProfiles: [],
        timeoutMs: 1000,
        prerequisites: [],
        aggregate: true,
        trustedProofRequired: true,
      },
    ],
  };
  const plan = {
    schemaVersion: 1,
    scope: "full",
    reason: "diagnostic fixture",
    baseSha: "base",
    candidateSha: "candidate",
    changedPaths: ["tracked.txt"],
    selectedGates: ["fixture"],
    installProfiles: [],
    manifestDigest: digestJson(manifest),
    basePlanDigest: null,
    candidatePlanDigest: digestJson({ source: "candidate planner" }),
  };
  return {
    repository,
    boundaryFile,
    manifestFile,
    planFile,
    reportFile,
    manifest,
    plan,
  };
}

function finalize(fixture_, spawnOptions = {}) {
  execute(
    process.execPath,
    [
      finalizeScript,
      "--boundary",
      fixture_.boundaryFile,
      "--manifest",
      fixture_.manifestFile,
      "--plan",
      fixture_.planFile,
      "--report",
      fixture_.reportFile,
      "--reason",
      "validation runner did not complete",
    ],
    { cwd: fixture_.repository, expectedStatus: 1, ...spawnOptions },
  );
  return JSON.parse(fs.readFileSync(fixture_.reportFile, "utf8"));
}

function assertFailedReport(report, boundary, expectedGate) {
  assertExactDiagnosticReportV2(report);
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.scope, "full");
  assert.deepEqual(report.selectedGates, [expectedGate]);
  assert.equal(report.gates.length, 1);
  assert.equal(report.gates[0].id, expectedGate);
  assert.equal(report.gates[0].status, "failed");
  assert.match(report.gates[0].reason, /validation runner did not complete/);
  assert.equal(report.candidateFingerprintBefore, boundary.candidateFingerprint);
  assert.equal(report.candidateFingerprintAfter, boundary.candidateFingerprint);
  assert.equal(report.candidateFileCountBefore, boundary.candidateFileCount);
  assert.equal(report.candidateFileCountAfter, boundary.candidateFileCount);
  assert.equal(report.fingerprintError, null);
}

test("finalizer emits a failed report when the candidate manifest is malformed", (t) => {
  const fixture_ = fixture(t);
  fs.writeFileSync(fixture_.manifestFile, "{ malformed manifest");
  const boundary = JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8"));

  const report = finalize(fixture_);

  assertFailedReport(report, boundary, "diagnostic");
  assert.match(report.gates[0].reason, /manifest is unavailable/);
  assert.match(report.gates[0].reason, /plan cannot be verified/);
  assert.match(report.gates[0].reason, /report is missing/);
});

test("finalizer emits a failed report when the candidate manifest is missing", (t) => {
  const fixture_ = fixture(t);
  const boundary = JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8"));

  const report = finalize(fixture_);

  assertFailedReport(report, boundary, "diagnostic");
  assert.match(report.gates[0].reason, /manifest is unavailable/);
});

test("finalizer emits a failed report when the candidate plan is malformed", (t) => {
  const fixture_ = fixture(t);
  writeJsonAtomic(fixture_.manifestFile, fixture_.manifest);
  fs.writeFileSync(fixture_.planFile, "{ malformed plan");
  const boundary = JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8"));

  const report = finalize(fixture_);

  assertFailedReport(report, boundary, "fixture");
  assert.match(report.gates[0].reason, /plan is unavailable/);
});

test("finalizer replaces an unparsable runner report with a failed report", (t) => {
  const fixture_ = fixture(t);
  writeJsonAtomic(fixture_.manifestFile, fixture_.manifest);
  writeJsonAtomic(fixture_.planFile, fixture_.plan);
  fs.writeFileSync(fixture_.reportFile, "{ malformed report");
  const boundary = JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8"));

  const report = finalize(fixture_);

  assertFailedReport(report, boundary, "fixture");
  assert.match(report.gates[0].reason, /runner report is unusable/);
});

test("finalizer emits a failed report when the diagnostic boundary is missing", (t) => {
  const fixture_ = fixture(t);
  writeJsonAtomic(fixture_.manifestFile, fixture_.manifest);
  writeJsonAtomic(fixture_.planFile, fixture_.plan);
  fs.rmSync(fixture_.boundaryFile);

  const report = finalize(fixture_);

  assert.equal(report.schemaVersion, 2);
  assert.deepEqual(report.selectedGates, ["fixture"]);
  assert.equal(report.gates[0].status, "failed");
  assert.equal(report.candidateFingerprintBefore, null);
  assert.equal(report.candidateFileCountBefore, null);
  assert.match(report.candidateFingerprintAfter, /^sha256:[a-f0-9]{64}$/);
  assert.ok(Number.isSafeInteger(report.candidateFileCountAfter));
  assert.match(report.fingerprintError, /boundary is unavailable/);
  assert.match(report.gates[0].reason, /boundary is unavailable/);
  const { reportDigest, ...withoutDigest } = report;
  assert.equal(reportDigest, digestJson(withoutDigest));
});

test("finalizer emits a failed report when the diagnostic boundary is malformed", (t) => {
  const fixture_ = fixture(t);
  writeJsonAtomic(fixture_.manifestFile, fixture_.manifest);
  writeJsonAtomic(fixture_.planFile, fixture_.plan);
  fs.writeFileSync(fixture_.boundaryFile, "{ malformed boundary");

  const report = finalize(fixture_);

  assert.equal(report.schemaVersion, 2);
  assert.deepEqual(report.selectedGates, ["fixture"]);
  assert.equal(report.gates[0].status, "failed");
  assert.equal(report.candidateFingerprintBefore, null);
  assert.equal(report.candidateFileCountBefore, null);
  assert.match(report.candidateFingerprintAfter, /^sha256:[a-f0-9]{64}$/);
  assert.ok(Number.isSafeInteger(report.candidateFileCountAfter));
  assert.match(report.fingerprintError, /boundary is unavailable/);
  assert.match(report.gates[0].reason, /boundary is unavailable/);
  const { reportDigest, ...withoutDigest } = report;
  assert.equal(reportDigest, digestJson(withoutDigest));
});

test("finalizer emits a failed report when the final candidate fingerprint fails", (t) => {
  const fixture_ = fixture(t);
  writeJsonAtomic(fixture_.manifestFile, fixture_.manifest);
  writeJsonAtomic(fixture_.planFile, fixture_.plan);
  const boundary = JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8"));

  const report = finalize(fixture_, { env: { ...process.env, PATH: "" } });

  assert.equal(report.schemaVersion, 2);
  assert.deepEqual(report.selectedGates, ["fixture"]);
  assert.equal(report.gates[0].status, "failed");
  assert.equal(report.candidateFingerprintBefore, boundary.candidateFingerprint);
  assert.equal(report.candidateFileCountBefore, boundary.candidateFileCount);
  assert.equal(report.candidateFingerprintAfter, null);
  assert.equal(report.candidateFileCountAfter, null);
  assert.match(report.fingerprintError, /Final candidate fingerprint failed/);
  assert.match(report.gates[0].reason, /Final candidate fingerprint failed/);
  const { reportDigest, ...withoutDigest } = report;
  assert.equal(reportDigest, digestJson(withoutDigest));
});

test("initializer leaves a recovery boundary that the finalizer reports", (t) => {
  const fixture_ = fixture(t);

  execute(process.execPath, [initializeScript, "--output", fixture_.boundaryFile], {
    cwd: fixture_.repository,
    env: { ...process.env, PATH: "" },
    expectedStatus: 1,
  });

  const boundary = JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8"));
  assert.equal(boundary.schemaVersion, 1);
  assert.equal(boundary.candidateFingerprint, null);
  assert.equal(boundary.candidateFileCount, null);
  assert.match(boundary.fingerprintError, /Initial candidate fingerprint failed/);
  assert.deepEqual(
    fs
      .readdirSync(path.dirname(fixture_.boundaryFile))
      .filter((name) => name.startsWith("boundary.json.tmp-")),
    [],
  );

  writeJsonAtomic(fixture_.manifestFile, fixture_.manifest);
  writeJsonAtomic(fixture_.planFile, fixture_.plan);
  const report = finalize(fixture_);
  assert.match(report.gates[0].reason, /Initial candidate fingerprint failed/);
});
