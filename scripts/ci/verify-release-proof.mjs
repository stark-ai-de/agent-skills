#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { digestJson, readJson, validateManifest } from "./validation-contract.mjs";
import { validateReceipt } from "./validation-proof-contract.mjs";
import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";

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
    "--pages-archive",
    "--release-sha",
    "--version",
    "--validate-run-id",
    "--validate-job-attempt",
    "--pages-artifact-name",
    "--validation-artifact-name",
  ]);
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!valueArguments.has(argument)) throw new Error(`Unknown argument: ${argument}`);
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
    options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  for (const argument of valueArguments) {
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
  for (const field of ["manifest", "receipt", "report", "pagesArchive"]) {
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

function verifyWorkflowRunArtifact(metadata, expected, label) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error(`${label} metadata is malformed.`);
  }
  requireEqual(metadata.name, expected.name, `${label} name`);
  requireEqual(metadata.expired, false, `${label} expired state`);
  requireEqual(String(metadata.workflow_run?.id ?? ""), expected.runId, `${label} run ID`);
  requireEqual(metadata.workflow_run?.head_sha, expected.sha, `${label} head SHA`);
  requireEqual(metadata.workflow_run?.head_branch, "main", `${label} head branch`);
  return metadata;
}

function fetchArtifactMetadata(options, pagesArtifactId) {
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
    },
    "validation artifact",
  );
  requirePositiveInteger(validationArtifact.id, "validation artifact ID");

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
    },
    "Pages artifact",
  );
  requireEqual(String(pagesArtifact.id ?? ""), pagesArtifactId, "Pages artifact ID");
  return {
    pagesArtifactId,
    validationArtifactId: String(validationArtifact.id),
  };
}

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

function verifyPagesArchive(archive, expectedDigest) {
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
      "--no-same-permissions",
      "--delay-directory-restore",
    ]);
    inspectExtractedTree(extracted);
    const digest = run("bash", ["-c", digestSiteCommand], { cwd: extracted }).trim();
    requireDigest(digest, "extracted Pages artifact digest", { prefix: false });
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

export function verifyReleaseProof(options) {
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
    pagesArtifactName: options.pagesArtifactName,
    validationArtifactName: options.validationArtifactName,
  });

  requireDigest(receipt.candidate_fingerprint, "receipt candidate fingerprint");
  if (!Number.isSafeInteger(receipt.candidate_file_count) || receipt.candidate_file_count <= 0) {
    throw new Error("receipt candidate file count must be a positive safe integer.");
  }
  requireDigest(receipt.site_digest, "receipt site digest", { prefix: false });
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

  const artifactIdentity = fetchArtifactMetadata(options, pagesArtifactId);
  verifyPagesArchive(options.pagesArchive, receipt.site_digest);
  verifyCheckedOutCandidate(options, receipt);
  return {
    ...artifactIdentity,
    boundary: options.boundary,
    releaseSha: options.releaseSha,
    siteDigest: receipt.site_digest,
  };
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = verifyReleaseProof(options);
    console.log(
      `Verified ${result.boundary} release proof for ${result.releaseSha} with Pages artifact ${result.pagesArtifactId} and validation artifact ${result.validationArtifactId}.`,
    );
  } catch (error) {
    console.error(`Release proof verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
