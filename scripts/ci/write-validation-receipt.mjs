import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  digestJson,
  manifestGateIds,
  readJson,
  validateManifest,
  writeJsonAtomic,
} from "./validation-contract.mjs";
import { validateFullReport } from "./validation-proof-contract.mjs";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;

function requireIndependentDigest(value, label) {
  if (!DIGEST_PATTERN.test(value ?? "")) {
    throw new Error(`${label} must be independently supplied as a SHA-256 digest.`);
  }
  return value;
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (new Set(["--manifest", "--report", "--output"]).has(argument)) {
      options[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  for (const name of ["manifest", "report", "output"]) {
    if (!options[name]) throw new Error(`--${name} is required.`);
  }
  return options;
}

function authorizedProofLevel(context) {
  if (
    context.branch !== "main" ||
    context.ref !== "refs/heads/main" ||
    context.refProtected !== "true"
  ) {
    throw new Error("Trusted validation receipts may be issued only for current protected main.");
  }
  const proofLevel =
    context.event === "push" ? "release" : context.event === "workflow_dispatch" ? "pages" : null;
  if (!proofLevel) {
    throw new Error("Trusted validation receipts require a protected-main push or manual run.");
  }
  if (context.currentSource?.proofLevel !== proofLevel) {
    throw new Error("Current aggregator proof level contradicts its protected-main event.");
  }
  const expectedCurrent = {
    repository: context.repository,
    workflowPath: context.workflowPath,
    workflowDigest: context.workflowDigest,
    controlPlaneDigest: context.controlPlaneDigest,
    runId: context.runId,
    runAttempt: context.runAttempt,
    jobId: context.validationJobId,
    jobName: context.validationJobName,
    jobConclusion: "success",
    artifactName: context.validationArtifactName,
    event: context.event,
    ref: context.ref,
    sha: context.sha,
    refProtected: context.refProtected,
    proofLevel,
  };
  if (digestJson(context.currentSource) !== digestJson(expectedCurrent)) {
    throw new Error("Current aggregator provenance contradicts protected-main authorization.");
  }
  return proofLevel;
}

export function createTrustedValidationReceipt(report, manifest, context) {
  if (report?.schemaVersion !== 2) {
    throw new Error("Trusted validation receipt v3 requires validation report v2.");
  }
  requireIndependentDigest(context.workflowDigest, "Current workflow digest");
  requireIndependentDigest(context.controlPlaneDigest, "Current control-plane digest");
  validateFullReport(report, manifest, { controlPlaneDigest: context.controlPlaneDigest });
  for (const gate of report.gates) {
    if (
      gate.producer?.repository !== context.repository ||
      gate.producer.workflowPath !== context.workflowPath ||
      gate.producer.workflowDigest !== context.workflowDigest ||
      gate.producer.controlPlaneDigest !== context.controlPlaneDigest
    ) {
      throw new Error(
        `${gate.id}: task producer provenance does not match the independently verified current control plane.`,
      );
    }
  }
  const proofLevel = authorizedProofLevel(context);
  const withoutDigest = {
    schema_version: 3,
    proof_level: proofLevel,
    workflow: context.workflow,
    workflow_path: context.workflowPath,
    run_id: context.runId,
    run_attempt: context.runAttempt,
    validation_job_id: context.validationJobId,
    validation_job_name: context.validationJobName,
    validation_job_attempt: context.runAttempt,
    event: context.event,
    branch: context.branch,
    sha: context.sha,
    version: context.version,
    validation_scope: "full",
    plan_digest: report.planDigest,
    manifest_digest: report.manifestDigest,
    control_plane_digest: report.controlPlaneDigest,
    full_gate_ids: manifestGateIds(manifest),
    gate_report_digest: report.reportDigest,
    task_result_set_digest: report.taskResultSetDigest,
    candidate_fingerprint: report.candidateFingerprintAfter,
    candidate_file_count: report.candidateFileCountAfter,
    current_source: context.currentSource,
    tasks: report.gates.map((gate) => ({
      gate_id: gate.id,
      task_key: gate.taskKey,
      receipt_digest: gate.receiptDigest,
      producer: gate.producer,
      producer_locator: gate.producerLocator,
      evidence_digest: gate.evidenceDigest,
      outputs: gate.outputs,
    })),
    site_digest: context.siteDigest,
    pages_artifact_name: context.pagesArtifactName,
    pages_artifact_id: context.pagesArtifactId,
    validation_artifact_name: context.validationArtifactName,
    validation_report_name: "validation-report.json",
  };
  return { ...withoutDigest, receipt_digest: digestJson(withoutDigest) };
}

export function writeValidationReceipt(options) {
  const manifest = validateManifest(readJson(options.manifest));
  const report = readJson(options.report);
  const packageDocument = readJson(path.resolve("package.json"));
  const skillsCliVersion = packageDocument.devDependencies?.skills;
  if (!/^\d+\.\d+\.\d+$/.test(skillsCliVersion ?? "")) {
    throw new Error("package.json must pin the exact skills CLI version.");
  }
  const inventory = readJson(
    path.resolve("scripts/validation/architecture-compass/test-validator-case-inventory.json"),
  );
  if (!Array.isArray(inventory.cases) || inventory.cases.length === 0) {
    throw new Error("The frozen Architecture Compass fixture inventory is malformed.");
  }
  validateFullReport(report, manifest, {
    skillsCliVersion,
    fixtureInventoryDigest: digestJson(inventory.cases),
  });
  if (report.schemaVersion === 2) {
    const context = {
      workflow: requiredEnvironment("GITHUB_WORKFLOW"),
      repository: requiredEnvironment("GITHUB_REPOSITORY"),
      workflowPath: ".github/workflows/validate.yml",
      workflowDigest: requiredEnvironment("CURRENT_WORKFLOW_DIGEST"),
      runId: requiredEnvironment("GITHUB_RUN_ID"),
      runAttempt: requiredEnvironment("GITHUB_RUN_ATTEMPT"),
      validationJobId: requiredEnvironment("VALIDATION_JOB_ID"),
      validationJobName: requiredEnvironment("VALIDATION_JOB_NAME"),
      event: requiredEnvironment("GITHUB_EVENT_NAME"),
      branch: requiredEnvironment("GITHUB_REF_NAME"),
      ref: requiredEnvironment("GITHUB_REF"),
      refProtected: requiredEnvironment("GITHUB_REF_PROTECTED"),
      sha: requiredEnvironment("GITHUB_SHA"),
      version: packageDocument.version,
      controlPlaneDigest: requiredEnvironment("CURRENT_CONTROL_PLANE_DIGEST"),
      currentSource: {
        repository: requiredEnvironment("GITHUB_REPOSITORY"),
        workflowPath: ".github/workflows/validate.yml",
        workflowDigest: requiredEnvironment("CURRENT_WORKFLOW_DIGEST"),
        controlPlaneDigest: requiredEnvironment("CURRENT_CONTROL_PLANE_DIGEST"),
        runId: requiredEnvironment("GITHUB_RUN_ID"),
        runAttempt: requiredEnvironment("GITHUB_RUN_ATTEMPT"),
        jobId: requiredEnvironment("VALIDATION_JOB_ID"),
        jobName: requiredEnvironment("VALIDATION_JOB_NAME"),
        jobConclusion: "success",
        artifactName: requiredEnvironment("VALIDATION_ARTIFACT_NAME"),
        event: requiredEnvironment("GITHUB_EVENT_NAME"),
        ref: requiredEnvironment("GITHUB_REF"),
        sha: requiredEnvironment("GITHUB_SHA"),
        refProtected: requiredEnvironment("GITHUB_REF_PROTECTED"),
        proofLevel:
          process.env.GITHUB_EVENT_NAME === "push"
            ? "release"
            : process.env.GITHUB_EVENT_NAME === "workflow_dispatch"
              ? "pages"
              : "diagnostic",
      },
      siteDigest: requiredEnvironment("SITE_DIGEST"),
      pagesArtifactName: requiredEnvironment("PAGES_ARTIFACT_NAME"),
      pagesArtifactId: requiredEnvironment("PAGES_ARTIFACT_ID"),
      validationArtifactName: requiredEnvironment("VALIDATION_ARTIFACT_NAME"),
    };
    writeJsonAtomic(options.output, createTrustedValidationReceipt(report, manifest, context));
    console.log(`Validation receipt schema v3 written to ${path.resolve(options.output)}.`);
    return;
  }
  const receipt = {
    schema_version: 2,
    workflow: requiredEnvironment("GITHUB_WORKFLOW"),
    workflow_path: ".github/workflows/validate.yml",
    run_id: requiredEnvironment("GITHUB_RUN_ID"),
    run_attempt: requiredEnvironment("GITHUB_RUN_ATTEMPT"),
    validation_job_attempt: requiredEnvironment("GITHUB_RUN_ATTEMPT"),
    event: requiredEnvironment("GITHUB_EVENT_NAME"),
    branch: requiredEnvironment("GITHUB_REF_NAME"),
    sha: requiredEnvironment("GITHUB_SHA"),
    version: JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8")).version,
    validation_scope: report.scope,
    plan_digest: report.planDigest,
    manifest_digest: report.manifestDigest,
    full_gate_ids: manifestGateIds(manifest),
    gate_report_digest: report.reportDigest,
    fixture_inventory_digest: report.fixtureInventoryDigest,
    skills_gate_success: report.gates.find(({ id }) => id === "skills")?.status === "passed",
    smoke_install_success:
      report.gates.find(({ id }) => id === "smoke-install")?.status === "passed",
    candidate_fingerprint: report.candidateFingerprintAfter,
    candidate_file_count: report.candidateFileCountAfter,
    skills_cli_version: report.skillsCliVersion,
    skills_smoke_cli: report.skillsSmokeCli,
    skills_smoke_force_tty: report.skillsSmokeForceTty,
    site_digest: requiredEnvironment("SITE_DIGEST"),
    pages_artifact_name: requiredEnvironment("PAGES_ARTIFACT_NAME"),
    pages_artifact_id: requiredEnvironment("PAGES_ARTIFACT_ID"),
    validation_artifact_name: requiredEnvironment("VALIDATION_ARTIFACT_NAME"),
    validation_report_name: "validation-report.json",
  };
  writeJsonAtomic(options.output, receipt);
  console.log(`Validation receipt schema v2 written to ${path.resolve(options.output)}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    writeValidationReceipt(parseArguments(process.argv.slice(2)));
  } catch (error) {
    console.error(`Could not write validation receipt: ${error.message}`);
    process.exitCode = 1;
  }
}
