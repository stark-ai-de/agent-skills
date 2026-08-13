#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  fingerprintGitCandidateRepository,
  sanitizedGitCommandOutput,
} from "../validation/smoke-install-contract.mjs";
import { canonicalJson, readJson, writeJsonAtomic } from "./validation-contract.mjs";
import {
  controlPlaneIdentity,
  discoverToolchain,
  logicalGitInputs,
} from "./resolve-validation-tasks.mjs";
import { resolveValidationPlan } from "./resolve-validation-plan.mjs";
import {
  createGitHubValidationTaskStore,
  materializeCanonicalTaskBundle,
  TASK_BUNDLE_FILE,
  taskArtifactName,
} from "./github-validation-task-store.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

function parseArguments(argv) {
  const options = {
    repository: process.cwd(),
    coreModule: path.join(moduleDirectory, "validation-task-graph.mjs"),
    runId: process.env.GITHUB_RUN_ID ?? "",
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? "",
    githubOutput: false,
  };
  const valueArguments = new Set([
    "--repository",
    "--core-module",
    "--plan",
    "--resolution",
    "--task-artifacts-root",
    "--index",
    "--boundary",
    "--report",
    "--accepted-output",
    "--repository-identity",
    "--event",
    "--ref",
    "--sha",
    "--base-sha",
    "--architecture-workers",
    "--run-id",
    "--run-attempt",
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
    "plan",
    "taskArtifactsRoot",
    "index",
    "boundary",
    "report",
    "acceptedOutput",
    "repositoryIdentity",
    "event",
    "ref",
    "sha",
    "baseSha",
    "architectureWorkers",
    "runId",
    "runAttempt",
  ]) {
    if (!options[field])
      throw new Error(
        `--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required.`,
      );
  }
  if (!new Set(["pull_request", "push", "workflow_dispatch"]).has(options.event)) {
    throw new Error("--event must be pull_request, push, or workflow_dispatch.");
  }
  if (!new Set(["auto", "1", "2", "3"]).has(options.architectureWorkers)) {
    throw new Error("--architecture-workers must be auto, 1, 2, or 3.");
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

function acceptedTaskContract(task) {
  return {
    gateId: task.gateId,
    taskKey: task.taskKey,
    keyMaterial: structuredClone(task.keyMaterial),
    gateContract: structuredClone(task.gateContract),
    evidence: structuredClone(task.evidence),
    restoreOutputs: structuredClone(task.restoreOutputs),
  };
}

function resolutionEnvironment(options) {
  return {
    CI: "true",
    TZ: "UTC",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    ARCHITECTURE_FIXTURE_WORKERS: options.architectureWorkers,
    ARCHITECTURE_SHARD_COUNT: "3",
    ARCHITECTURE_SHARD_INDEX: "aggregate",
    VALIDATION_EVENT: options.event,
    VALIDATION_BASE_SHA: options.baseSha && options.baseSha !== "none" ? options.baseSha : "",
    SKILLS_SMOKE_FORCE_TTY: "1",
    SKILLS_SMOKE_OVERRIDE_STATE: "exact-installed-cli",
  };
}

function assertCleanCheckoutAtSha(repository, expectedSha) {
  const head = sanitizedGitCommandOutput(
    repository,
    ["rev-parse", "--verify", "HEAD^{commit}"],
    "Could not attest the aggregator checkout HEAD",
  )
    .toString("ascii")
    .trim();
  const expected = sanitizedGitCommandOutput(
    repository,
    ["rev-parse", "--verify", `${expectedSha}^{commit}`],
    "Could not resolve the current workflow SHA",
  )
    .toString("ascii")
    .trim();
  if (!/^[a-f0-9]{40}$/.test(head) || head !== expected || expected !== expectedSha) {
    throw new Error("Aggregator checkout HEAD does not equal the current workflow SHA.");
  }
  const status = sanitizedGitCommandOutput(
    repository,
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    "Could not attest the aggregator checkout tree",
  );
  if (status.length !== 0) {
    throw new Error("Aggregator checkout contains tracked or untracked candidate changes.");
  }
}

export async function attestResolution(core, resolution, options, dependencies = {}) {
  const repository = path.resolve(options.repository);
  const normalizedBaseSha = options.baseSha && options.baseSha !== "none" ? options.baseSha : "";
  const expectedArtifactName = `validation-resolution-v1-${options.runId}-${options.runAttempt}`;
  if (
    resolution.repositoryIdentity !== options.repositoryIdentity ||
    resolution.sourceContext.repository !== options.repositoryIdentity ||
    resolution.sourceContext.workflowPath !== ".github/workflows/validate.yml" ||
    resolution.sourceContext.workflowDigest !== options.identity.workflowDigest ||
    resolution.sourceContext.controlPlaneDigest !== options.identity.controlPlaneDigest ||
    resolution.sourceContext.event !== options.event ||
    resolution.sourceContext.ref !== options.ref ||
    resolution.sourceContext.sha !== options.sha ||
    resolution.sourceContext.runId !== String(options.runId) ||
    resolution.sourceContext.runAttempt !== String(options.runAttempt) ||
    resolution.sourceContext.artifactName !== expectedArtifactName
  ) {
    throw new Error("Resolution provenance differs from the current aggregator context.");
  }
  (dependencies.assertCheckout ?? assertCleanCheckoutAtSha)(repository, options.sha);
  const downloadedPlan = readJson(path.resolve(options.plan));
  const planRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validation-plan-attestation-"));
  let recomputedPlan;
  try {
    recomputedPlan = (dependencies.resolvePlan ?? resolveValidationPlan)({
      repository,
      manifest: path.join(repository, "scripts/ci/validation-manifest.json"),
      planner: path.join(repository, "scripts/ci/plan-validation.mjs"),
      event: options.event,
      baseSha: normalizedBaseSha,
      candidateSha: options.sha,
      output: path.join(planRoot, "validation-plan.json"),
      plannerTimeoutMs: 10000,
    });
  } finally {
    fs.rmSync(planRoot, { recursive: true, force: true });
  }
  if (
    canonicalJson(downloadedPlan) !== canonicalJson(recomputedPlan) ||
    canonicalJson(resolution.plan) !== canonicalJson(recomputedPlan)
  ) {
    throw new Error("Current aggregator independently recomputed a different validation plan.");
  }
  const noLookupStore = {
    async lookup() {
      const error = new Error("attestation does not reuse stored task results");
      error.code = "ERR_STORE_UNAVAILABLE";
      throw error;
    },
  };
  const recomputed = await core.resolve(
    {
      manifest: readJson(path.join(repository, "scripts/ci/validation-manifest.json")),
      plan: recomputedPlan,
      repository,
      repositoryIdentity: options.repositoryIdentity,
      mode: "off",
      environment: resolutionEnvironment(options),
      toolchain: (dependencies.discoverCurrentToolchain ?? discoverToolchain)(repository),
      gitInputs: logicalGitInputs(repository, {
        event: options.event,
        baseSha: normalizedBaseSha,
        sha: options.sha,
      }),
      controlPlaneDigest: options.identity.controlPlaneDigest,
      candidateFingerprint: `${options.candidate.algorithm}:${options.candidate.digest}`,
      candidateFileCount: options.candidate.fileCount,
      sourceContext: {
        repository: options.repositoryIdentity,
        workflowPath: ".github/workflows/validate.yml",
        workflowDigest: options.identity.workflowDigest,
        controlPlaneDigest: options.identity.controlPlaneDigest,
        runId: String(options.runId),
        runAttempt: String(options.runAttempt),
        jobId: "current-aggregator-attestation",
        jobName: "Validate",
        jobConclusion: "success",
        artifactName: expectedArtifactName,
        event: options.event,
        ref: options.ref,
        sha: options.sha,
      },
      now: new Date().toISOString(),
    },
    { store: noLookupStore },
  );
  const current = resolution.tasks.map(({ gateId, taskKey, keyMaterial }) => ({
    gateId,
    taskKey,
    keyMaterial,
  }));
  const expected = recomputed.tasks.map(({ gateId, taskKey, keyMaterial }) => ({
    gateId,
    taskKey,
    keyMaterial,
  }));
  if (canonicalJson(current) !== canonicalJson(expected)) {
    throw new Error("Current aggregator independently recomputed different validation task keys.");
  }
}

function reconstructRecorded(core, resolution, task, directory) {
  const receipt = readJson(path.join(directory, "receipt.json"));
  const bundle = readJson(path.join(directory, "bundle.json"));
  if (
    receipt.gateId !== task.gateId ||
    receipt.taskKey !== task.taskKey ||
    bundle.gateId !== task.gateId ||
    bundle.taskKey !== task.taskKey ||
    bundle.receiptDigest !== receipt.receiptDigest ||
    bundle.resolutionDigest !== resolution.resolutionDigest
  ) {
    throw new Error(`${task.gateId}: downloaded publication contradicts the resolution.`);
  }
  return {
    kind: receipt.kind,
    receipt,
    publication: {
      schemaVersion: 1,
      state: "provisional",
      resolutionDigest: resolution.resolutionDigest,
      bundleDigest: bundle.bundleDigest,
      stagedTreeDigest: core.digestOutput(directory, "directory").digest,
      directory,
    },
  };
}

export async function assembleValidationTasks(options, dependencies = {}) {
  const repository = path.resolve(options.repository);
  const resolution = readJson(path.resolve(options.resolution));
  if (resolution.repositoryRoot !== repository) {
    throw new Error("Resolution repository root differs from the aggregation checkout.");
  }
  const identity = dependencies.identity ?? controlPlaneIdentity(repository);
  if (
    identity.workflowDigest !== resolution.sourceContext.workflowDigest ||
    identity.controlPlaneDigest !== resolution.controlPlaneDigest
  ) {
    throw new Error("Current protected workflow/control-plane identity differs from resolution.");
  }
  const store =
    dependencies.store ??
    createGitHubValidationTaskStore({
      repository: options.repositoryIdentity,
      token: dependencies.token ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
      indexFile: path.resolve(options.index),
      temporaryRoot: path.dirname(path.resolve(options.report)),
      currentRunId: options.runId,
    });
  const core = dependencies.core ?? (await import(pathToFileURL(path.resolve(options.coreModule))));
  const candidate = dependencies.candidate ?? fingerprintGitCandidateRepository(repository);
  if (dependencies.attestResolution) {
    await dependencies.attestResolution({
      core,
      resolution,
      repository,
      identity,
      candidate,
      options,
    });
  } else if (!dependencies.core) {
    await attestResolution(core, resolution, {
      ...options,
      repository,
      identity,
      candidate,
    });
  }
  const records = {};
  const artifactsRoot = path.resolve(options.taskArtifactsRoot);
  const pendingTasks = resolution.tasks.filter(({ status }) => status !== "reused");
  const expectedArtifactNames = new Set(
    pendingTasks.map((task) =>
      taskArtifactName(task.gateId, task.taskKey, options.runId, options.runAttempt),
    ),
  );
  const downloadedBundles = new Map();
  if (fs.existsSync(artifactsRoot)) {
    const entries = fs.readdirSync(artifactsRoot, { withFileTypes: true });
    const isSingleFlatDownload =
      entries.length === 1 && entries[0].isFile() && entries[0].name === TASK_BUNDLE_FILE;
    if (isSingleFlatDownload) {
      if (pendingTasks.length !== 1) {
        throw new Error(`Unexpected current-run task artifact: ${TASK_BUNDLE_FILE}`);
      }
      const [artifactName] = expectedArtifactNames;
      downloadedBundles.set(artifactName, path.join(artifactsRoot, TASK_BUNDLE_FILE));
    } else {
      for (const entry of entries) {
        if (!entry.isDirectory() || !expectedArtifactNames.has(entry.name)) {
          throw new Error(`Unexpected current-run task artifact: ${entry.name}`);
        }
        const directory = path.join(artifactsRoot, entry.name);
        const files = fs.readdirSync(directory, { withFileTypes: true });
        if (files.length !== 1 || !files[0].isFile() || files[0].name !== TASK_BUNDLE_FILE) {
          throw new Error(
            `Current-run task artifact ${entry.name} has unexpected transport files.`,
          );
        }
        downloadedBundles.set(entry.name, path.join(directory, TASK_BUNDLE_FILE));
      }
    }
  }
  for (const task of pendingTasks) {
    const artifactName = taskArtifactName(
      task.gateId,
      task.taskKey,
      options.runId,
      options.runAttempt,
    );
    const downloaded = downloadedBundles.get(artifactName);
    if (!downloaded) continue;
    const temporary = fs.mkdtempSync(
      path.join(path.dirname(path.resolve(options.report)), `.task-${task.gateId}-`),
    );
    const directory = path.join(temporary, "publication");
    materializeCanonicalTaskBundle(downloaded, directory);
    const recorded = reconstructRecorded(core, resolution, task, directory);
    const source = recorded.receipt.source;
    if (
      source.runId !== String(options.runId) ||
      source.runAttempt !== String(options.runAttempt) ||
      source.artifactName !== artifactName
    ) {
      throw new Error(`${task.gateId}: task source does not belong to this run attempt.`);
    }
    const locator = await store.findArtifact({
      expectedName: artifactName,
      runId: options.runId,
      runAttempt: options.runAttempt,
      jobId: source.jobId,
      jobName: source.jobName,
    });
    try {
      records[task.gateId] = await core.finalizePublication(
        { recorded, locator, resolution, now: new Date().toISOString() },
        { store },
      );
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }
  const boundary = readJson(path.resolve(options.boundary));
  const candidateFingerprint = `${candidate.algorithm}:${candidate.digest}`;
  const assembled = await core.assemble(
    {
      resolution,
      records,
      repository,
      candidateFingerprintBefore: boundary.candidateFingerprint,
      candidateFileCountBefore: boundary.candidateFileCount,
      candidateFingerprintAfter: candidateFingerprint,
      candidateFileCountAfter: candidate.fileCount,
      now: new Date().toISOString(),
    },
    { store },
  );
  writeJsonAtomic(path.resolve(options.report), assembled.report);
  const resolvedTasks = new Map(resolution.tasks.map((task) => [task.gateId, task]));
  writeJsonAtomic(path.resolve(options.acceptedOutput), {
    schemaVersion: 1,
    taskResultSetDigest: assembled.report.taskResultSetDigest,
    tasks: assembled.acceptedTaskReceipts.map((accepted) => {
      const task = resolvedTasks.get(accepted.gateId);
      if (!task) {
        throw new Error(
          `${accepted.gateId}: accepted task is absent from the validated resolution.`,
        );
      }
      return {
        ...accepted,
        taskContract: acceptedTaskContract(task),
      };
    }),
  });
  const outputs = {
    validation_scope: assembled.report.scope,
    report_digest: assembled.report.reportDigest,
    task_result_set_digest: assembled.report.taskResultSetDigest,
    current_workflow_digest: identity.workflowDigest,
    current_control_plane_digest: identity.controlPlaneDigest,
    executed_count: String(assembled.report.counts.executed),
    reused_count: String(assembled.report.counts.reused),
    failed: String(assembled.failed),
  };
  if (options.githubOutput) writeGithubOutput(outputs);
  return { assembled, outputs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assembleValidationTasks(parseArguments(process.argv.slice(2)))
    .then(({ assembled }) => {
      if (assembled.failed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`Could not assemble validation tasks: ${error.message}`);
      process.exitCode = 1;
    });
}
