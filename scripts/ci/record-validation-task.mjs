#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readJson, writeJsonAtomic } from "./validation-contract.mjs";
import { packCanonicalTaskBundle, taskArtifactName } from "./github-validation-task-store.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

function parseArguments(argv) {
  const options = {
    repository: process.cwd(),
    coreModule: path.join(moduleDirectory, "validation-task-graph.mjs"),
    event: process.env.GITHUB_EVENT_NAME ?? "workflow_dispatch",
    ref: process.env.GITHUB_REF ?? "refs/heads/unknown",
    sha: process.env.GITHUB_SHA ?? "",
    runId: process.env.GITHUB_RUN_ID ?? "",
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? "",
    githubOutput: false,
  };
  const valueArguments = new Set([
    "--repository",
    "--core-module",
    "--resolution",
    "--gate-id",
    "--outcome",
    "--publication-directory",
    "--transport-bundle",
    "--recorded-output",
    "--repository-identity",
    "--event",
    "--ref",
    "--sha",
    "--run-id",
    "--run-attempt",
    "--job-name",
    "--job-id",
    "--failure-reason",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--github-output") {
      options.githubOutput = true;
      continue;
    }
    if (!valueArguments.has(argument)) throw new Error(`Unknown argument: ${argument}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new Error(`${argument} requires a value.`);
    options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  for (const field of [
    "resolution",
    "gateId",
    "outcome",
    "publicationDirectory",
    "transportBundle",
    "recordedOutput",
    "repositoryIdentity",
    "sha",
    "runId",
    "runAttempt",
    "jobName",
    "jobId",
  ]) {
    if (!options[field])
      throw new Error(
        `--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required.`,
      );
  }
  return options;
}

function writeGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
  );
}

export async function recordValidationTask(options, dependencies = {}) {
  const resolution = readJson(path.resolve(options.resolution));
  const outcomeFile = path.resolve(options.outcome);
  const core = dependencies.core ?? (await import(pathToFileURL(path.resolve(options.coreModule))));
  if (!fs.existsSync(outcomeFile)) {
    if (!options.failureReason) {
      throw new Error("Task outcome is absent and --failure-reason was not supplied.");
    }
    writeJsonAtomic(
      outcomeFile,
      core.createFailedTaskOutcome({
        resolution,
        gateId: options.gateId,
        reason: options.failureReason,
      }),
    );
  }
  const envelope = readJson(outcomeFile);
  const task = resolution.tasks?.find(({ gateId }) => gateId === options.gateId);
  if (!task || envelope.gateId !== options.gateId || task.taskKey !== envelope.taskKey) {
    throw new Error("Task outcome does not belong to the current resolution.");
  }
  if (envelope.resolutionDigest !== resolution.resolutionDigest) {
    throw new Error("Task outcome resolution digest is not current.");
  }
  const artifactName = taskArtifactName(
    task.gateId,
    task.taskKey,
    options.runId,
    options.runAttempt,
  );
  const sourceContext = {
    repository: options.repositoryIdentity,
    workflowPath: resolution.sourceContext.workflowPath,
    workflowDigest: resolution.sourceContext.workflowDigest,
    controlPlaneDigest: resolution.controlPlaneDigest,
    runId: String(options.runId),
    runAttempt: String(options.runAttempt),
    jobId: String(options.jobId),
    jobName: options.jobName,
    // This is provisional until finalizePublication reopens the completed job.
    jobConclusion: envelope.outcome.status === "passed" ? "success" : "failure",
    artifactName,
    event: options.event,
    ref: options.ref,
    sha: options.sha,
  };
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.parse(now) + 30 * 24 * 60 * 60 * 1000).toISOString();
  const recorded = await core.record({
    resolution,
    gateId: task.gateId,
    repository: path.resolve(options.repository),
    publicationDirectory: path.resolve(options.publicationDirectory),
    outcome: envelope.outcome,
    sourceContext,
    candidateFingerprintBefore: envelope.candidateFingerprintBefore,
    candidateFileCountBefore: envelope.candidateFileCountBefore,
    candidateFingerprintAfter: envelope.candidateFingerprintAfter,
    candidateFileCountAfter: envelope.candidateFileCountAfter,
    now,
    expiresAt,
  });
  const packed = packCanonicalTaskBundle(
    recorded.publication.directory,
    path.resolve(options.transportBundle),
  );
  writeJsonAtomic(path.resolve(options.recordedOutput), recorded);
  const outputs = {
    artifact_name: artifactName,
    publication_file: packed.file,
    transport_digest: packed.digest,
    gate_id: task.gateId,
    task_key: task.taskKey,
    outcome_status: envelope.outcome.status,
    should_fail: String(envelope.outcome.status !== "passed"),
  };
  if (options.githubOutput) writeGithubOutput(outputs);
  return { recorded, outputs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  recordValidationTask(parseArguments(process.argv.slice(2))).catch((error) => {
    console.error(`Could not record validation task: ${error.message}`);
    process.exitCode = 1;
  });
}
