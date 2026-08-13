#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  fingerprintGitCandidateRepository,
  sanitizedGitCommandOutput,
} from "../validation/smoke-install-contract.mjs";
import {
  digestJson,
  readJson,
  validateManifest,
  validatePlan,
  writeJsonAtomic,
} from "./validation-contract.mjs";
import {
  executionPathDigest,
  observeSystemToolIdentity,
  systemToolPolicyIdentity,
} from "./run-validation-task.mjs";
import { ACTIONLINT_CONTRACT, ACTIONLINT_IDENTITY } from "./actionlint-contract.mjs";
import {
  createGitHubValidationTaskStore,
  localControlPlaneIdentity,
} from "./github-validation-task-store.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultManifest = path.join(moduleDirectory, "validation-manifest.json");
const defaultCore = path.join(moduleDirectory, "validation-task-graph.mjs");

function parseArguments(argv) {
  const options = {
    repository: process.cwd(),
    manifest: defaultManifest,
    coreModule: defaultCore,
    mode: "auto",
    event: process.env.GITHUB_EVENT_NAME ?? "workflow_dispatch",
    ref: process.env.GITHUB_REF ?? "refs/heads/unknown",
    sha: process.env.GITHUB_SHA ?? "",
    baseSha: "",
    runId: process.env.GITHUB_RUN_ID ?? "",
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? "",
    jobName: "Resolve validation tasks",
    architectureWorkers: "auto",
    githubOutput: false,
  };
  const valueArguments = new Set([
    "--repository",
    "--manifest",
    "--core-module",
    "--plan",
    "--output",
    "--index",
    "--boundary",
    "--mode",
    "--repository-identity",
    "--event",
    "--ref",
    "--sha",
    "--base-sha",
    "--run-id",
    "--run-attempt",
    "--job-name",
    "--job-id",
    "--architecture-workers",
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
    "plan",
    "output",
    "index",
    "boundary",
    "repositoryIdentity",
    "sha",
    "runId",
    "runAttempt",
    "jobId",
  ]) {
    if (!options[field])
      throw new Error(
        `--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required.`,
      );
  }
  if (!new Set(["auto", "off", "verify"]).has(options.mode)) {
    throw new Error("--mode must be auto, off, or verify.");
  }
  if (!new Set(["auto", "1", "2", "3"]).has(options.architectureWorkers)) {
    throw new Error("--architecture-workers must be auto, 1, 2, or 3.");
  }
  return options;
}

export function controlPlaneIdentity(repository) {
  return localControlPlaneIdentity(repository);
}

function exactPackageIdentities(repository) {
  const packageDocument = readJson(path.join(repository, "package.json"));
  const packageManager = /^pnpm@(\d+\.\d+\.\d+)$/.exec(packageDocument.packageManager ?? "")?.[1];
  const skills = packageDocument.devDependencies?.skills;
  const actionlint = packageDocument.devDependencies?.["github-actionlint"];
  const oxfmt = packageDocument.devDependencies?.oxfmt;
  const oxlint = packageDocument.devDependencies?.oxlint;
  if (
    ![packageManager, skills, actionlint, oxfmt, oxlint].every((value) =>
      /^\d+\.\d+\.\d+$/.test(value ?? ""),
    )
  ) {
    throw new Error(
      "package.json must pin pnpm, skills, github-actionlint, oxfmt, and oxlint exactly.",
    );
  }
  if (actionlint !== ACTIONLINT_CONTRACT.version) {
    throw new Error(`github-actionlint must remain pinned to ${ACTIONLINT_CONTRACT.version}.`);
  }
  return { packageManager, skills, actionlint, oxfmt, oxlint };
}

export function discoverToolchain(repository) {
  const packages = exactPackageIdentities(repository);
  const imageOs = process.env.ImageOS;
  const imageVersion = process.env.ImageVersion;
  if (!/^[A-Za-z0-9_.-]+$/.test(imageOs ?? "") || !/^[A-Za-z0-9_.-]+$/.test(imageVersion ?? "")) {
    throw new Error("GitHub hosted ImageOS and ImageVersion are required for runtime observation.");
  }
  if (process.versions.node !== "22.20.0") {
    throw new Error(`Validation requires exact Node.js 22.20.0, got ${process.versions.node}.`);
  }
  const tools = {
    bash: systemToolPolicyIdentity("bash"),
    env: systemToolPolicyIdentity("env"),
    node: observeSystemToolIdentity("node", repository),
    npm: observeSystemToolIdentity("npm", repository),
    pnpm: `pnpm@${packages.packageManager}`,
    git: systemToolPolicyIdentity("git"),
    python3: systemToolPolicyIdentity("python3"),
    script: systemToolPolicyIdentity("script"),
    sh: systemToolPolicyIdentity("sh"),
    mkfifo: systemToolPolicyIdentity("mkfifo"),
    sleep: systemToolPolicyIdentity("sleep"),
    tar: systemToolPolicyIdentity("tar"),
    actionlint: ACTIONLINT_IDENTITY,
    oxfmt: `oxfmt@${packages.oxfmt}`,
    oxlint: `oxlint@${packages.oxlint}`,
    "skills-cli": `skills@${packages.skills}`,
  };
  return {
    ...tools,
    runnerLabel: "ubuntu-24.04",
    observedRunner: `${imageOs}@${imageVersion}`,
    pathDigest: executionPathDigest(process.env.PATH),
  };
}

function gitDigest(repository, argv) {
  const output = sanitizedGitCommandOutput(
    repository,
    argv,
    `Could not capture logical Git input: git ${argv.join(" ")}`,
  );
  return digestJson({ outputBase64: output.toString("base64") });
}

export function logicalGitInputs(repository, { event, baseSha, sha }) {
  const candidate = sha || "HEAD";
  const normalizedBase = baseSha && baseSha !== "none" ? baseSha : null;
  return {
    eventClass: event,
    candidateTree: gitDigest(repository, ["rev-parse", `${candidate}^{tree}`]),
    baseCommit: normalizedBase
      ? gitDigest(repository, ["rev-parse", `${normalizedBase}^{commit}`])
      : digestJson({ kind: "no-base-commit" }),
    baseTree: normalizedBase
      ? gitDigest(repository, ["rev-parse", `${normalizedBase}^{tree}`])
      : digestJson({ kind: "no-base-tree" }),
    baseDiff: normalizedBase
      ? gitDigest(repository, ["diff", "--binary", "--no-ext-diff", normalizedBase, candidate])
      : digestJson({ kind: "no-base-diff" }),
    baseReleaseMetadata: normalizedBase
      ? gitDigest(repository, [
          "ls-tree",
          "-r",
          "--full-tree",
          normalizedBase,
          "--",
          "package.json",
          "CHANGELOG.md",
          "skills",
        ])
      : digestJson({ kind: "no-base-release-metadata" }),
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

function writeGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
  );
}

export function compactOutputs(resolution) {
  const rootTasks = resolution.executionGroups.root;
  const rootMatrix = {
    include: rootTasks.map(({ gateId, taskKey, installProfiles }) => ({
      gateId,
      taskKey,
      needsRoot: installProfiles.includes("root"),
      needsSite: installProfiles.includes("site"),
    })),
  };
  const status = (task) => task?.status ?? "unselected";
  return {
    validation_scope: resolution.plan.scope,
    resolution_digest: resolution.resolutionDigest,
    root_matrix: JSON.stringify(rootMatrix),
    has_root_misses: String(rootMatrix.include.length > 0),
    has_skills_miss: String(Boolean(resolution.executionGroups.skills)),
    has_architecture_miss: String(Boolean(resolution.executionGroups.architectureCompass)),
    has_smoke_miss: String(Boolean(resolution.executionGroups.smokeInstall)),
    skills_status: status(resolution.tasks.find(({ gateId }) => gateId === "skills")),
    skills_task_key:
      resolution.tasks.find(({ gateId }) => gateId === "skills")?.taskKey ?? "unselected",
    architecture_task_key:
      resolution.tasks.find(({ gateId }) => gateId === "architecture-compass")?.taskKey ??
      "unselected",
    smoke_task_key:
      resolution.tasks.find(({ gateId }) => gateId === "smoke-install")?.taskKey ?? "unselected",
    all_reused: String(resolution.tasks.every(({ status: value }) => value === "reused")),
  };
}

export async function resolveValidationTasks(options, dependencies = {}) {
  const repository = path.resolve(options.repository);
  const manifest = validateManifest(readJson(path.resolve(options.manifest)));
  const plan = validatePlan(readJson(path.resolve(options.plan)), manifest, "task resolver plan", {
    requireCandidatePlanDigest: true,
  });
  const boundary = readJson(path.resolve(options.boundary));
  const candidate = fingerprintGitCandidateRepository(repository);
  const candidateFingerprint = `${candidate.algorithm}:${candidate.digest}`;
  if (
    boundary?.candidateFingerprint !== candidateFingerprint ||
    boundary?.candidateFileCount !== candidate.fileCount
  ) {
    throw new Error("Candidate fingerprint changed before task resolution.");
  }
  const identity = controlPlaneIdentity(repository);
  const store =
    dependencies.store ??
    createGitHubValidationTaskStore({
      repository: options.repositoryIdentity,
      token: dependencies.token ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
      indexFile: path.resolve(options.index),
      currentRunId: options.runId,
    });
  const now = new Date().toISOString();
  const sourceContext = {
    repository: options.repositoryIdentity,
    workflowPath: ".github/workflows/validate.yml",
    workflowDigest: identity.workflowDigest,
    controlPlaneDigest: identity.controlPlaneDigest,
    runId: String(options.runId),
    runAttempt: String(options.runAttempt),
    jobId: String(options.jobId),
    jobName: options.jobName,
    jobConclusion: "success",
    artifactName: `validation-resolution-v1-${options.runId}-${options.runAttempt}`,
    event: options.event,
    ref: options.ref,
    sha: options.sha,
  };
  const core = dependencies.core ?? (await import(pathToFileURL(path.resolve(options.coreModule))));
  const resolution = await core.resolve(
    {
      manifest,
      plan,
      repository,
      repositoryIdentity: options.repositoryIdentity,
      mode: options.mode,
      environment: resolutionEnvironment(options),
      toolchain: discoverToolchain(repository),
      gitInputs: logicalGitInputs(repository, options),
      controlPlaneDigest: identity.controlPlaneDigest,
      candidateFingerprint,
      candidateFileCount: candidate.fileCount,
      sourceContext,
      now,
    },
    { store },
  );
  writeJsonAtomic(path.resolve(options.output), resolution);
  const outputs = compactOutputs(resolution);
  if (options.githubOutput) writeGithubOutput(outputs);
  return { resolution, outputs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  resolveValidationTasks(parseArguments(process.argv.slice(2))).catch((error) => {
    console.error(`Could not resolve validation tasks: ${error.message}`);
    process.exitCode = 1;
  });
}
