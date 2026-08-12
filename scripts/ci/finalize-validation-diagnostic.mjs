#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";
import {
  digestJson,
  manifestGateIds,
  planDigest,
  readJson,
  validateManifest,
  validatePlan,
  writeJsonAtomic,
} from "./validation-contract.mjs";

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (new Set(["--boundary", "--manifest", "--plan", "--report", "--reason"]).has(argument)) {
      options[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  for (const required of ["boundary", "manifest", "plan", "report", "reason"]) {
    if (!options[required]) throw new Error(`--${required} is required.`);
  }
  return options;
}

function validateBoundary(boundary) {
  if (
    boundary?.schemaVersion !== 1 ||
    !/^sha256:[a-f0-9]{64}$/.test(boundary.candidateFingerprint ?? "") ||
    !Number.isSafeInteger(boundary.candidateFileCount) ||
    boundary.candidateFileCount < 0
  ) {
    throw new Error("Validation diagnostic boundary is malformed.");
  }
  return boundary;
}

function validateRecoveryBoundary(boundary) {
  if (
    boundary?.schemaVersion !== 1 ||
    boundary.candidateFingerprint !== null ||
    boundary.candidateFileCount !== null ||
    typeof boundary.fingerprintError !== "string" ||
    boundary.fingerprintError.length === 0
  ) {
    throw new Error("Validation diagnostic recovery boundary is malformed.");
  }
  return boundary;
}

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function readDiagnosticBoundary(file) {
  try {
    const boundary = readJson(file);
    try {
      return { boundary: validateBoundary(boundary), failure: null };
    } catch {
      const recoveryBoundary = validateRecoveryBoundary(boundary);
      return {
        boundary: recoveryBoundary,
        failure: recoveryBoundary.fingerprintError,
      };
    }
  } catch (error) {
    return {
      boundary: {
        candidateFingerprint: null,
        candidateFileCount: null,
      },
      failure: `Validation diagnostic boundary is unavailable: ${describeError(error)}`,
    };
  }
}

function readFinalCandidateFingerprint(repository) {
  try {
    const fingerprint = fingerprintGitCandidateRepository(repository);
    return {
      fingerprint,
      digest: `${fingerprint.algorithm}:${fingerprint.digest}`,
      failure: null,
    };
  } catch (error) {
    return {
      fingerprint: { fileCount: null },
      digest: null,
      failure: `Final candidate fingerprint failed: ${describeError(error)}`,
    };
  }
}

function readCandidateManifest(file) {
  try {
    return { manifest: validateManifest(readJson(file)), failure: null };
  } catch (error) {
    return {
      manifest: null,
      failure: `Candidate validation manifest is unavailable: ${describeError(error)}`,
    };
  }
}

function readCandidatePlan(file, manifest) {
  if (manifest === null) {
    return {
      plan: null,
      failure: "Candidate validation plan cannot be verified without a valid manifest.",
    };
  }
  try {
    return {
      plan: validatePlan(readJson(file), manifest, "effective plan", {
        requireCandidatePlanDigest: true,
      }),
      failure: null,
    };
  } catch (error) {
    return {
      plan: null,
      failure: `Candidate validation plan is unavailable: ${describeError(error)}`,
    };
  }
}

function validateExistingReport(report, boundary, after, afterFileCount) {
  if (report?.schemaVersion !== 1) {
    throw new Error("Validation report schema must be 1.");
  }
  if (!Array.isArray(report.selectedGates) || !Array.isArray(report.gates)) {
    throw new Error("Validation report gate accounting is malformed.");
  }
  const { reportDigest, ...withoutDigest } = report;
  if (reportDigest !== digestJson(withoutDigest)) {
    throw new Error("Validation report digest does not match its content.");
  }
  if (
    report.candidateFingerprintBefore !== boundary.candidateFingerprint ||
    report.candidateFileCountBefore !== boundary.candidateFileCount ||
    report.candidateFingerprintAfter !== after ||
    report.candidateFileCountAfter !== afterFileCount
  ) {
    throw new Error("Validation report does not match the hosted diagnostic boundary.");
  }
  return report;
}

function syntheticManifestDigest(manifest) {
  return manifest === null
    ? digestJson({ kind: "unavailable-validation-manifest", schemaVersion: 1 })
    : digestJson(manifest);
}

function writeFailedReport({
  options,
  boundary,
  finalFingerprint,
  after,
  manifest,
  plan,
  failures,
  fingerprintFailure,
}) {
  const selectedGates =
    plan?.selectedGates ?? (manifest === null ? ["diagnostic"] : manifestGateIds(manifest));
  const reason = [options.reason, ...failures].filter(Boolean).join(" ");
  const reportWithoutDigest = {
    schemaVersion: 1,
    planDigest:
      plan === null
        ? digestJson({ kind: "pre-run-failure", reason: options.reason })
        : planDigest(plan),
    manifestDigest: syntheticManifestDigest(manifest),
    scope: plan?.scope ?? "full",
    selectedGates,
    gates: selectedGates.map((id, index) => ({
      id,
      status: index === 0 ? "failed" : "skipped",
      exitCode: index === 0 ? 1 : null,
      durationMs: 0,
      reason,
    })),
    candidateFingerprintBefore: boundary.candidateFingerprint,
    candidateFileCountBefore: boundary.candidateFileCount,
    candidateFingerprintAfter: after,
    candidateFileCountAfter: finalFingerprint.fileCount,
    fingerprintError:
      fingerprintFailure ??
      (boundary.candidateFingerprint === after &&
      boundary.candidateFileCount === finalFingerprint.fileCount
        ? null
        : "The materialized Git candidate changed before validation diagnostics were finalized."),
    smokeEvidence: null,
    skillsCliVersion: null,
    skillsSmokeCli: null,
    skillsSmokeForceTty: null,
    fixtureInventoryDigest: null,
    diagnosticFailure: reason,
  };
  writeJsonAtomic(options.report, {
    ...reportWithoutDigest,
    reportDigest: digestJson(reportWithoutDigest),
  });
  console.log(`Synthetic failed validation diagnostic written to ${path.resolve(options.report)}.`);
}

const options = parseArguments(process.argv.slice(2));
const boundaryResult = readDiagnosticBoundary(options.boundary);
const boundary = boundaryResult.boundary;
const finalFingerprintResult = readFinalCandidateFingerprint(process.cwd());
const finalFingerprint = finalFingerprintResult.fingerprint;
const after = finalFingerprintResult.digest;
const manifestResult = readCandidateManifest(options.manifest);
const planResult = readCandidatePlan(options.plan, manifestResult.manifest);
const failures = [
  boundaryResult.failure,
  finalFingerprintResult.failure,
  manifestResult.failure,
  planResult.failure,
].filter(Boolean);
const fingerprintFailure = [boundaryResult.failure, finalFingerprintResult.failure]
  .filter(Boolean)
  .join(" ");

if (fs.existsSync(options.report)) {
  try {
    validateExistingReport(readJson(options.report), boundary, after, finalFingerprint.fileCount);
  } catch (error) {
    failures.push(`Validation runner report is unusable: ${describeError(error)}`);
  }
} else {
  failures.push("Validation runner report is missing.");
}

if (failures.length === 0) {
  console.log(`Validation diagnostic report finalized at ${path.resolve(options.report)}.`);
} else {
  writeFailedReport({
    options,
    boundary,
    finalFingerprint,
    after,
    manifest: manifestResult.manifest,
    plan: planResult.plan,
    failures,
    fingerprintFailure: fingerprintFailure || null,
  });
  process.exitCode = 1;
}
