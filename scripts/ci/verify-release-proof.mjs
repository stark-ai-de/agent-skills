#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { digestJson, readJson, validateManifest } from "./validation-contract.mjs";
import { validateReceipt } from "./validation-proof-contract.mjs";
import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";
import { _internal as taskGraphInternal, digestOutput } from "./validation-task-graph.mjs";
import {
  createGitHubValidationTaskStore,
  localControlPlaneIdentity,
} from "./github-validation-task-store.mjs";

const digestSiteCommand = String.raw`set -euo pipefail
find . -type f -print0 \
  | sort -z \
  | while IFS= read -r -d '' file; do sha256sum "$file"; done \
  | sha256sum \
  | cut -d' ' -f1`;

function parseArguments(arguments_) {
  const options = {};
  const valueArguments = new Set([
    "--boundary",
    "--repository-root",
    "--github-repository",
    "--manifest",
    "--receipt",
    "--report",
    "--accepted-tasks",
    "--pages-archive",
    "--release-sha",
    "--version",
    "--validate-run-id",
    "--validate-job-attempt",
    "--validate-job-id",
    "--pages-artifact-name",
    "--validation-artifact-name",
    "--validation-artifact-id",
    "--expected-workflow-digest",
    "--expected-control-plane-digest",
  ]);
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!valueArguments.has(argument)) throw new Error(`Unknown argument: ${argument}`);
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
    options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  const requiredArguments = [
    "--boundary",
    "--repository-root",
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
  ];
  for (const argument of requiredArguments) {
    const name = argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (!options[name]) throw new Error(`${argument} is required.`);
  }
  if (!new Set(["release-readiness", "publication"]).has(options.boundary)) {
    throw new Error("--boundary must be release-readiness or publication.");
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(options.githubRepository)) {
    throw new Error("--github-repository must be an owner/repository name.");
  }
  if (!/^[a-f0-9]{40}$/.test(options.releaseSha)) {
    throw new Error("--release-sha must be a 40-character lowercase commit SHA.");
  }
  if (!/^\d+\.\d+\.\d+$/.test(options.version)) {
    throw new Error("--version must be an exact semantic version.");
  }
  for (const field of ["validateRunId", "validateJobAttempt"]) {
    if (!/^[1-9]\d*$/.test(options[field])) {
      throw new Error(
        `--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} must be a positive integer.`,
      );
    }
  }
  options.repositoryRoot = path.resolve(options.repositoryRoot);
  for (const field of ["manifest", "receipt", "report", "pagesArchive", "acceptedTasks"]) {
    if (!options[field]) continue;
    options[field] = path.resolve(options[field]);
  }
  return options;
}

function describeProcessFailure(command, arguments_, result) {
  const detail =
    result.stderr?.trim() || result.stdout?.trim() || result.error?.message || "failed";
  return `${command} ${arguments_.join(" ")} ${detail}`;
}

function run(command, arguments_, { cwd = undefined, environment = process.env } = {}) {
  const result = spawnSync(command, arguments_, {
    cwd,
    env: environment,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
  });
  if (result.status !== 0 || (result.error && result.status === null)) {
    throw new Error(describeProcessFailure(command, arguments_, result));
  }
  return result.stdout;
}

function readCommandJson(command, arguments_, options) {
  const output = run(command, arguments_, options);
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`${command} returned malformed JSON: ${error.message}`);
  }
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function requirePositiveInteger(value, label) {
  const normalized = typeof value === "number" ? String(value) : value;
  if (!/^[1-9]\d*$/.test(normalized ?? "")) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return normalized;
}

function requireDigest(value, label, { prefix = true } = {}) {
  const pattern = prefix ? /^sha256:[a-f0-9]{64}$/ : /^[a-f0-9]{64}$/;
  if (!pattern.test(value ?? "")) throw new Error(`${label} must be a SHA-256 digest.`);
  return value;
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function requireExactKeys(value, required, label) {
  requireObject(value, label);
  const allowed = new Set(required);
  const missing = required.filter((field) => !Object.hasOwn(value, field));
  const unknown = Object.keys(value).filter((field) => !allowed.has(field));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `${label} fields are invalid (missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}).`,
    );
  }
}

function validateAcceptedTaskContract(accepted, options, trustedReceipt) {
  requireExactKeys(accepted, ["gateId", "receipt", "locator", "taskContract"], "accepted task");
  requireExactKeys(
    accepted.taskContract,
    ["gateId", "taskKey", "keyMaterial", "gateContract", "evidence", "restoreOutputs"],
    `${accepted.gateId ?? "unknown"} task contract`,
  );
  const contract = accepted.taskContract;
  requireObject(contract.keyMaterial, `${accepted.gateId} task key material`);
  requireObject(contract.gateContract, `${accepted.gateId} gate contract`);
  if (!Array.isArray(contract.restoreOutputs)) {
    throw new Error(`${accepted.gateId} task restore outputs must be an array.`);
  }
  requireEqual(contract.gateId, accepted.gateId, `${accepted.gateId} contract gate ID`);
  requireEqual(contract.taskKey, digestJson(contract.keyMaterial), `${accepted.gateId} task key`);
  requireEqual(contract.keyMaterial.gateId, contract.gateId, `${accepted.gateId} keyed gate ID`);
  requireEqual(
    contract.keyMaterial.repositoryIdentity,
    options.githubRepository,
    `${accepted.gateId} keyed repository identity`,
  );
  requireEqual(
    contract.keyMaterial.enginePolicyDigest,
    options.expectedControlPlaneDigest,
    `${accepted.gateId} keyed control-plane identity`,
  );
  requireEqual(
    contract.keyMaterial.gateContractDigest,
    digestJson(contract.gateContract),
    `${accepted.gateId} gate contract digest`,
  );
  requireEqual(contract.gateContract.id, contract.gateId, `${accepted.gateId} gate contract ID`);
  requireEqual(
    digestJson(contract.evidence),
    digestJson(contract.gateContract.evidence),
    `${accepted.gateId} evidence contract`,
  );
  requireEqual(
    digestJson(contract.restoreOutputs),
    digestJson(contract.gateContract.restoreOutputs),
    `${accepted.gateId} output contract`,
  );
  if (
    !Array.isArray(contract.gateContract.prerequisites) ||
    !Array.isArray(contract.keyMaterial.prerequisiteKeys) ||
    contract.gateContract.prerequisites.length !== contract.keyMaterial.prerequisiteKeys.length
  ) {
    throw new Error(`${accepted.gateId} prerequisite contract is malformed.`);
  }
  requireEqual(
    contract.keyMaterial.evidenceOutputContractDigest,
    digestJson({ evidence: contract.evidence, restoreOutputs: contract.restoreOutputs }),
    `${accepted.gateId} evidence/output contract digest`,
  );
  const validated = taskGraphInternal.validateGateReceipt(accepted.receipt, {
    repositoryIdentity: options.githubRepository,
    workflowPath: ".github/workflows/validate.yml",
    workflowDigest: options.expectedWorkflowDigest,
    gateId: contract.gateId,
    taskKey: contract.taskKey,
    controlPlaneDigest: options.expectedControlPlaneDigest,
    manifestDigest: trustedReceipt.manifest_digest,
    restoreOutputs: contract.restoreOutputs,
    evidence: contract.evidence,
    keyMaterial: contract.keyMaterial,
  });
  if (validated.kind !== "result" || validated.reusable !== true) {
    throw new Error(`${accepted.gateId} task receipt is not a reusable successful result.`);
  }
  return validated;
}

function verifyWorkflowRunArtifact(metadata, expected, label) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error(`${label} metadata is malformed.`);
  }
  requireEqual(metadata.name, expected.name, `${label} name`);
  requireEqual(metadata.expired, false, `${label} expired state`);
  requireEqual(String(metadata.workflow_run?.id ?? ""), expected.runId, `${label} run ID`);
  requireEqual(metadata.workflow_run?.head_sha, expected.sha, `${label} head SHA`);
  requireEqual(metadata.workflow_run?.head_branch, "main", `${label} head branch`);
  if (expected.repositoryId !== undefined) {
    requireEqual(
      String(metadata.workflow_run?.repository_id ?? ""),
      expected.repositoryId,
      `${label} repository ID`,
    );
    requireEqual(
      String(metadata.workflow_run?.head_repository_id ?? ""),
      expected.headRepositoryId,
      `${label} head repository ID`,
    );
    requireDigest(
      /^[a-f0-9]{64}$/.test(metadata.digest ?? "") ? `sha256:${metadata.digest}` : metadata.digest,
      `${label} digest`,
    );
    requirePositiveInteger(metadata.size_in_bytes, `${label} size`);
  }
  return metadata;
}

function fetchArtifactMetadata(options, pagesArtifactId, repositories = {}) {
  const pages = readCommandJson(
    "gh",
    [
      "api",
      `repos/${options.githubRepository}/actions/runs/${options.validateRunId}/artifacts`,
      "--paginate",
      "--slurp",
    ],
    { cwd: options.repositoryRoot },
  );
  if (!Array.isArray(pages)) throw new Error("Validation artifact listing is malformed.");
  const artifacts = [];
  for (const [index, page] of pages.entries()) {
    if (!Array.isArray(page?.artifacts)) {
      throw new Error(`Validation artifact listing page ${index + 1} is malformed.`);
    }
    artifacts.push(...page.artifacts);
  }
  const validationArtifacts = artifacts.filter(
    (artifact) => artifact?.name === options.validationArtifactName && artifact?.expired === false,
  );
  if (validationArtifacts.length !== 1) {
    throw new Error(
      `Expected exactly one unexpired validation artifact named ${options.validationArtifactName}, found ${validationArtifacts.length}.`,
    );
  }
  const validationArtifact = verifyWorkflowRunArtifact(
    validationArtifacts[0],
    {
      name: options.validationArtifactName,
      runId: options.validateRunId,
      sha: options.releaseSha,
      ...repositories,
    },
    "validation artifact",
  );
  const validationArtifactId = requirePositiveInteger(
    validationArtifact.id,
    "validation artifact ID",
  );
  if (options.validationArtifactId) {
    requireEqual(validationArtifactId, options.validationArtifactId, "validation artifact ID");
  }

  const pagesArtifact = readCommandJson(
    "gh",
    ["api", `repos/${options.githubRepository}/actions/artifacts/${pagesArtifactId}`],
    { cwd: options.repositoryRoot },
  );
  verifyWorkflowRunArtifact(
    pagesArtifact,
    {
      name: options.pagesArtifactName,
      runId: options.validateRunId,
      sha: options.releaseSha,
      ...repositories,
    },
    "Pages artifact",
  );
  requireEqual(String(pagesArtifact.id ?? ""), pagesArtifactId, "Pages artifact ID");
  return {
    pagesArtifactId,
    validationArtifactId,
  };
}

function verifyCurrentValidationProducer(options, receipt) {
  const runMetadata = readCommandJson(
    "gh",
    ["api", `repos/${options.githubRepository}/actions/runs/${options.validateRunId}`],
    { cwd: options.repositoryRoot },
  );
  for (const [actual, expected, label] of [
    [String(runMetadata.id ?? ""), options.validateRunId, "validation run ID"],
    [String(runMetadata.run_attempt ?? ""), options.validateJobAttempt, "validation run attempt"],
    [runMetadata.status, "completed", "validation run status"],
    [runMetadata.conclusion, "success", "validation run conclusion"],
    [runMetadata.event, "push", "validation run event"],
    [runMetadata.head_branch, "main", "validation run branch"],
    [runMetadata.head_sha, options.releaseSha, "validation run SHA"],
    [
      String(runMetadata.path ?? "").split("@", 1)[0],
      ".github/workflows/validate.yml",
      "validation workflow path",
    ],
    [runMetadata.repository?.full_name, options.githubRepository, "validation repository"],
    [
      runMetadata.head_repository?.full_name,
      options.githubRepository,
      "validation head repository",
    ],
  ]) {
    requireEqual(actual, expected, label);
  }
  const repositoryId = requirePositiveInteger(
    runMetadata.repository?.id,
    "validation repository ID",
  );
  const headRepositoryId = requirePositiveInteger(
    runMetadata.head_repository?.id,
    "validation head repository ID",
  );
  requireEqual(headRepositoryId, repositoryId, "validation head repository ID");
  const jobPages = readCommandJson(
    "gh",
    [
      "api",
      `repos/${options.githubRepository}/actions/runs/${options.validateRunId}/attempts/${options.validateJobAttempt}/jobs?filter=all&per_page=100`,
      "--paginate",
      "--slurp",
    ],
    { cwd: options.repositoryRoot },
  );
  if (!Array.isArray(jobPages)) throw new Error("Validation job inventory is malformed.");
  const jobs = [];
  for (const [index, page] of jobPages.entries()) {
    if (!Array.isArray(page?.jobs)) {
      throw new Error(`Validation job inventory page ${index + 1} is malformed.`);
    }
    jobs.push(...page.jobs);
  }
  const matches = jobs.filter(
    (job) =>
      /\/check-runs\/([1-9]\d*)$/.exec(job?.check_run_url ?? "")?.[1] === options.validateJobId,
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one Validate check-run ${options.validateJobId}, found ${matches.length}.`,
    );
  }
  for (const [actual, expected, label] of [
    [matches[0].name, "Validate", "validation job name"],
    [matches[0].status, "completed", "validation job status"],
    [matches[0].conclusion, "success", "validation job conclusion"],
    [receipt.validation_job_id, options.validateJobId, "receipt validation job ID"],
    [receipt.validation_job_name, "Validate", "receipt validation job name"],
  ]) {
    requireEqual(actual, expected, label);
  }
  return { repositoryId, headRepositoryId };
}

async function verifyTaskProducers(options, receipt, acceptedDocument, store) {
  if (
    acceptedDocument?.schemaVersion !== 1 ||
    acceptedDocument.taskResultSetDigest !== receipt.task_result_set_digest ||
    !Array.isArray(acceptedDocument.tasks) ||
    acceptedDocument.tasks.length !== receipt.tasks.length
  ) {
    throw new Error("Accepted task receipt set is missing or contradicts the trusted receipt.");
  }
  const acceptedByGate = new Map();
  for (const accepted of acceptedDocument.tasks) {
    if (
      typeof accepted?.gateId !== "string" ||
      !accepted.receipt ||
      !accepted.locator ||
      !accepted.taskContract ||
      acceptedByGate.has(accepted.gateId)
    ) {
      throw new Error("Accepted task receipt set contains a malformed or duplicate identity.");
    }
    acceptedByGate.set(accepted.gateId, accepted);
  }
  const artifactIds = new Set();
  const validatedByGate = new Map();
  const trustContext = {
    repository: options.githubRepository,
    workflowPath: ".github/workflows/validate.yml",
    workflowDigest: options.expectedWorkflowDigest,
    controlPlaneDigest: options.expectedControlPlaneDigest,
  };
  for (const task of receipt.tasks) {
    const accepted = acceptedByGate.get(task.gate_id);
    if (!accepted) throw new Error(`Trusted task ${task.gate_id} is missing its accepted receipt.`);
    const validatedReceipt = validateAcceptedTaskContract(accepted, options, receipt);
    for (const [actual, expected, label] of [
      [validatedReceipt.gateId, task.gate_id, "gate ID"],
      [validatedReceipt.taskKey, task.task_key, "task key"],
      [validatedReceipt.receiptDigest, task.receipt_digest, "receipt digest"],
      [validatedReceipt.evidenceDigest, task.evidence_digest, "evidence digest"],
      [digestJson(validatedReceipt.source), digestJson(task.producer), "producer"],
      [digestJson(accepted.locator), digestJson(task.producer_locator), "producer locator"],
      [digestJson(validatedReceipt.outputs), digestJson(task.outputs), "output receipts"],
    ]) {
      requireEqual(actual, expected, `${task.gate_id} ${label}`);
    }
    const artifactId = requirePositiveInteger(accepted.locator.id, `${task.gate_id} artifact ID`);
    if (artifactIds.has(artifactId)) {
      throw new Error(`Duplicate task artifact identity: ${artifactId}.`);
    }
    artifactIds.add(artifactId);
    validatedByGate.set(task.gate_id, { accepted, validatedReceipt, artifactId });
  }
  for (const [gateId, { accepted }] of validatedByGate) {
    const { prerequisites } = accepted.taskContract.gateContract;
    const { prerequisiteKeys } = accepted.taskContract.keyMaterial;
    for (const [index, prerequisiteGate] of prerequisites.entries()) {
      const prerequisite = validatedByGate.get(prerequisiteGate);
      if (!prerequisite) {
        throw new Error(`${gateId} prerequisite ${prerequisiteGate} has no accepted task receipt.`);
      }
      requireEqual(
        prerequisite.accepted.taskContract.taskKey,
        prerequisiteKeys[index],
        `${gateId} prerequisite ${prerequisiteGate} task key`,
      );
    }
  }
  for (const { accepted, validatedReceipt } of validatedByGate.values()) {
    const deadline = new Date(Date.now() + 20_000).toISOString();
    const verified = await store.verify({
      locator: accepted.locator,
      receipt: validatedReceipt,
      trustContext,
      deadline,
      timeoutMs: 20_000,
    });
    if (verified?.verified !== true || verified.artifact?.expired !== false) {
      throw new Error(
        `${validatedReceipt.gateId} producer did not yield authoritative reusable proof.`,
      );
    }
  }
  return artifactIds.size;
}

export const _releaseProofInternal = Object.freeze({ verifyTaskProducers });

function archiveEntries(archive) {
  const output = run("tar", ["--quoting-style=escape", "--list", "--file", archive]);
  const entries = output.endsWith("\n") ? output.slice(0, -1).split("\n") : output.split("\n");
  if (entries.length === 0 || (entries.length === 1 && entries[0] === "")) {
    throw new Error("Pages artifact archive is empty.");
  }
  const seen = new Set();
  for (const entry of entries) {
    if (!entry || entry.includes("\u0000") || /[\r\n\\]/.test(entry)) {
      throw new Error(`Pages artifact contains an unsafe or ambiguous entry: ${entry}`);
    }
    if (entry.startsWith("/")) throw new Error(`Pages artifact entry is absolute: ${entry}`);
    const relative = entry.replace(/^(\.\/)+/, "");
    if (relative !== "" && relative !== ".") {
      const components = relative.replace(/\/$/, "").split("/");
      if (components.some((component) => component === ".." || component === "")) {
        throw new Error(`Pages artifact entry escapes its extraction root: ${entry}`);
      }
    }
    const normalized = relative.replace(/\/$/, "");
    if (seen.has(normalized)) throw new Error(`Pages artifact contains duplicate entry: ${entry}`);
    seen.add(normalized);
  }
  return entries;
}

function verifyArchiveTypes(archive) {
  const output = run("tar", ["--quoting-style=escape", "--list", "--verbose", "--file", archive]);
  const rows = output.endsWith("\n") ? output.slice(0, -1).split("\n") : output.split("\n");
  if (rows.length === 0) throw new Error("Pages artifact archive has no entries.");
  for (const row of rows) {
    if (!new Set(["-", "d"]).has(row[0])) {
      throw new Error(`Pages artifact contains a non-regular archive entry: ${row}`);
    }
  }
}

function inspectExtractedTree(directory) {
  let files = 0;
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) {
        throw new Error(
          `Pages artifact contains a symbolic link: ${path.relative(directory, full)}`,
        );
      }
      if (stat.isDirectory()) {
        visit(full);
        continue;
      }
      if (!stat.isFile()) {
        throw new Error(
          `Pages artifact contains a non-regular entry: ${path.relative(directory, full)}`,
        );
      }
      if (stat.nlink !== 1) {
        throw new Error(
          `Pages artifact contains a hard-linked file: ${path.relative(directory, full)}`,
        );
      }
      files += 1;
    }
  };
  visit(directory);
  if (files === 0) throw new Error("Pages artifact contains no regular files.");
  return files;
}

function verifyPagesArchive(archive, expectedDigest, { contentAddressed = false } = {}) {
  const archiveStat = fs.lstatSync(archive);
  if (!archiveStat.isFile() || archiveStat.isSymbolicLink() || archiveStat.size === 0) {
    throw new Error("Pages artifact archive must be a non-empty regular, non-symlink file.");
  }
  archiveEntries(archive);
  verifyArchiveTypes(archive);
  const extracted = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-release-pages-"));
  try {
    run("tar", [
      "--extract",
      "--file",
      archive,
      "--directory",
      extracted,
      "--no-same-owner",
      ...(contentAddressed ? ["--same-permissions"] : ["--no-same-permissions"]),
      "--delay-directory-restore",
    ]);
    inspectExtractedTree(extracted);
    const digest = contentAddressed
      ? digestOutput(extracted, "directory").digest
      : run("bash", ["-c", digestSiteCommand], { cwd: extracted }).trim();
    requireDigest(digest, "extracted Pages artifact digest", { prefix: contentAddressed });
    requireEqual(digest, expectedDigest, "Pages artifact digest");
    return digest;
  } finally {
    fs.rmSync(extracted, { recursive: true, force: true });
  }
}

function verifyCheckedOutCandidate(options, receipt) {
  const packageDocument = readJson(path.join(options.repositoryRoot, "package.json"));
  requireEqual(packageDocument.version, options.version, "checked-out package version");
  const checkedOutSha = run("git", ["rev-parse", "HEAD"], {
    cwd: options.repositoryRoot,
  }).trim();
  requireEqual(checkedOutSha, options.releaseSha, "checked-out commit SHA");

  const candidate = fingerprintGitCandidateRepository(options.repositoryRoot);
  requireEqual(
    `${candidate.algorithm}:${candidate.digest}`,
    receipt.candidate_fingerprint,
    "checked-out candidate fingerprint",
  );
  requireEqual(
    candidate.fileCount,
    receipt.candidate_file_count,
    "checked-out candidate file count",
  );

  const mainLines = run("git", ["ls-remote", "origin", "refs/heads/main"], {
    cwd: options.repositoryRoot,
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  if (mainLines.length !== 1) throw new Error("Could not resolve exactly one origin main ref.");
  const match = /^([a-f0-9]{40})\trefs\/heads\/main$/.exec(mainLines[0]);
  if (!match) throw new Error("origin main returned malformed ref metadata.");
  requireEqual(match[1], options.releaseSha, "origin main SHA");
}

export async function verifyReleaseProof(options, dependencies = {}) {
  const manifest = validateManifest(readJson(options.manifest));
  const receipt = readJson(options.receipt);
  const report = readJson(options.report);
  const packageDocument = readJson(path.join(options.repositoryRoot, "package.json"));
  const skillsCliVersion = packageDocument.devDependencies?.skills;
  if (!/^\d+\.\d+\.\d+$/.test(skillsCliVersion ?? "")) {
    throw new Error("package.json must pin the exact skills CLI version.");
  }
  const inventory = readJson(
    path.join(
      options.repositoryRoot,
      "scripts/validation/architecture-compass/test-validator-case-inventory.json",
    ),
  );
  if (!Array.isArray(inventory.cases) || inventory.cases.length === 0) {
    throw new Error("The frozen Architecture Compass fixture inventory is malformed.");
  }
  const isV3 = receipt.schema_version === 3;
  if (isV3) {
    for (const field of [
      "acceptedTasks",
      "validateJobId",
      "expectedWorkflowDigest",
      "expectedControlPlaneDigest",
      "validationArtifactId",
    ]) {
      if (!options[field]) {
        throw new Error(
          `--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required for receipt v3.`,
        );
      }
    }
    requirePositiveInteger(options.validateJobId, "Validate job check-run ID");
    requirePositiveInteger(options.validationArtifactId, "Validation artifact ID");
    requireDigest(options.expectedWorkflowDigest, "expected workflow digest");
    requireDigest(options.expectedControlPlaneDigest, "expected control-plane digest");
    const identity = localControlPlaneIdentity(options.repositoryRoot);
    requireEqual(
      identity.workflowDigest,
      options.expectedWorkflowDigest,
      "checked-out workflow digest",
    );
    requireEqual(
      identity.controlPlaneDigest,
      options.expectedControlPlaneDigest,
      "checked-out control-plane digest",
    );
  }
  validateReceipt(receipt, report, manifest, {
    skillsCliVersion,
    fixtureInventoryDigest: digestJson(inventory.cases),
    workflow: "Validate",
    workflowPath: ".github/workflows/validate.yml",
    event: "push",
    branch: "main",
    sha: options.releaseSha,
    version: options.version,
    runId: options.validateRunId,
    runAttempt: options.validateJobAttempt,
    validationJobId: options.validateJobId,
    validationJobName: isV3 ? "Validate" : undefined,
    pagesArtifactName: options.pagesArtifactName,
    validationArtifactName: options.validationArtifactName,
    repository: isV3 ? options.githubRepository : undefined,
    ref: isV3 ? "refs/heads/main" : undefined,
    refProtected: isV3 ? "true" : undefined,
    workflowDigest: options.expectedWorkflowDigest,
    controlPlaneDigest: options.expectedControlPlaneDigest,
    proofLevel: isV3 ? "release" : undefined,
  });

  requireDigest(receipt.candidate_fingerprint, "receipt candidate fingerprint");
  if (!Number.isSafeInteger(receipt.candidate_file_count) || receipt.candidate_file_count <= 0) {
    throw new Error("receipt candidate file count must be a positive safe integer.");
  }
  requireDigest(receipt.site_digest, "receipt site digest", { prefix: isV3 });
  const expectedPagesName = `github-pages-${options.validateRunId}-${options.validateJobAttempt}`;
  const expectedValidationName = `validation-receipt-${options.validateRunId}-${options.validateJobAttempt}`;
  requireEqual(options.pagesArtifactName, expectedPagesName, "expected Pages artifact name");
  requireEqual(
    options.validationArtifactName,
    expectedValidationName,
    "expected validation artifact name",
  );
  const pagesArtifactId = requirePositiveInteger(
    typeof receipt.pages_artifact_id === "number"
      ? String(receipt.pages_artifact_id)
      : receipt.pages_artifact_id,
    "receipt Pages artifact ID",
  );

  let currentRepositories = {};
  let producerCount = 0;
  if (isV3) {
    currentRepositories = verifyCurrentValidationProducer(options, receipt);
    const accepted = readJson(options.acceptedTasks);
    const store =
      dependencies.store ??
      createGitHubValidationTaskStore({
        repository: options.githubRepository,
        token: dependencies.token ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
        temporaryRoot: os.tmpdir(),
      });
    producerCount = await verifyTaskProducers(options, receipt, accepted, store);
  }
  const artifactIdentity = fetchArtifactMetadata(options, pagesArtifactId, currentRepositories);
  verifyPagesArchive(options.pagesArchive, receipt.site_digest, { contentAddressed: isV3 });
  verifyCheckedOutCandidate(options, receipt);
  return {
    ...artifactIdentity,
    boundary: options.boundary,
    releaseSha: options.releaseSha,
    siteDigest: receipt.site_digest,
    producerCount,
  };
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = await verifyReleaseProof(options);
    console.log(
      `Verified ${result.boundary} release proof for ${result.releaseSha} with Pages artifact ${result.pagesArtifactId} and validation artifact ${result.validationArtifactId}.`,
    );
  } catch (error) {
    console.error(`Release proof verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
