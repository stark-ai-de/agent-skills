import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { assembleValidationTasks, attestResolution } from "./assemble-validation-tasks.mjs";
import {
  materializeCanonicalTaskBundle,
  packCanonicalTaskBundle,
  taskArtifactName,
  TASK_BUNDLE_FILE,
} from "./github-validation-task-store.mjs";
import { recordValidationTask } from "./record-validation-task.mjs";
import { compactOutputs, logicalGitInputs } from "./resolve-validation-tasks.mjs";

const DIGEST = `sha256:${"a".repeat(64)}`;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function writeJson(file, value, mode = undefined) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${JSON.stringify(canonicalize(value))}\n`,
    mode === undefined ? {} : { mode },
  );
}

function temporaryRoot(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "validation-task-cli-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function git(repository, arguments_) {
  const result = spawnSync("git", arguments_, { cwd: repository, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("release metadata keys bind the base commit and exact release-relevant base blobs", (context) => {
  const repository = temporaryRoot(context);
  fs.mkdirSync(path.join(repository, "skills/example"), { recursive: true });
  fs.writeFileSync(path.join(repository, "package.json"), '{"version":"1.0.0"}\n');
  fs.writeFileSync(path.join(repository, "CHANGELOG.md"), "# Changelog\n");
  fs.writeFileSync(path.join(repository, "skills/example/SKILL.md"), "---\nname: example\n---\n");
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "validation@example.invalid"]);
  git(repository, ["config", "user.name", "Validation Test"]);
  git(repository, ["add", "."]);
  git(repository, ["commit", "--quiet", "-m", "base"]);
  const baseSha = git(repository, ["rev-parse", "HEAD"]);
  fs.writeFileSync(path.join(repository, "package.json"), '{"version":"1.0.1"}\n');
  git(repository, ["add", "package.json"]);
  git(repository, ["commit", "--quiet", "-m", "candidate"]);
  const sha = git(repository, ["rev-parse", "HEAD"]);

  const inputs = logicalGitInputs(repository, { event: "pull_request", baseSha, sha });
  const previousGitDir = process.env.GIT_DIR;
  process.env.GIT_DIR = path.join(repository, "steering-must-not-apply");
  let steeredInputs;
  try {
    steeredInputs = logicalGitInputs(repository, { event: "pull_request", baseSha, sha });
  } finally {
    if (previousGitDir === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previousGitDir;
  }
  assert.deepEqual(steeredInputs, inputs);
  assert.deepEqual(Object.keys(inputs).sort(), [
    "baseCommit",
    "baseDiff",
    "baseReleaseMetadata",
    "baseTree",
    "candidateTree",
    "eventClass",
  ]);
  for (const field of [
    "baseCommit",
    "baseDiff",
    "baseReleaseMetadata",
    "baseTree",
    "candidateTree",
  ]) {
    assert.match(inputs[field], /^sha256:[a-f0-9]{64}$/);
  }
  assert.notEqual(inputs.baseReleaseMetadata, inputs.baseTree);
});

test("resolver emits empty-safe miss matrices and explicit prerequisite status", () => {
  const outputs = compactOutputs({
    plan: { scope: "full" },
    resolutionDigest: DIGEST,
    executionGroups: {
      root: [],
      skills: null,
      architectureCompass: null,
      smokeInstall: null,
    },
    tasks: [{ gateId: "skills", taskKey: DIGEST, status: "reused" }],
  });
  assert.equal(outputs.root_matrix, '{"include":[]}');
  assert.equal(outputs.has_root_misses, "false");
  assert.equal(outputs.has_skills_miss, "false");
  assert.equal(outputs.skills_status, "reused");
  assert.equal(outputs.all_reused, "true");
});

test("record wrapper delegates policy then seals exactly one transport bundle", async (context) => {
  const root = temporaryRoot(context);
  const resolutionFile = path.join(root, "resolution.json");
  const outcomeFile = path.join(root, "outcome.json");
  const publication = path.join(root, "publication");
  const transport = path.join(root, "upload", TASK_BUNDLE_FILE);
  const recordedOutput = path.join(root, "recorded.json");
  const resolution = {
    resolutionDigest: DIGEST,
    controlPlaneDigest: DIGEST,
    sourceContext: {
      workflowPath: ".github/workflows/validate.yml",
      workflowDigest: DIGEST,
    },
    tasks: [{ gateId: "skills", taskKey: DIGEST }],
  };
  const envelope = {
    gateId: "skills",
    taskKey: DIGEST,
    resolutionDigest: DIGEST,
    candidateFingerprintBefore: DIGEST,
    candidateFileCountBefore: 1,
    candidateFingerprintAfter: DIGEST,
    candidateFileCountAfter: 1,
    outcome: { status: "passed" },
  };
  writeJson(resolutionFile, resolution);
  writeJson(outcomeFile, envelope);
  const fakeCore = {
    async record(options) {
      fs.mkdirSync(options.publicationDirectory, { recursive: true, mode: 0o700 });
      const receipt = {
        kind: "result",
        gateId: "skills",
        taskKey: DIGEST,
        receiptDigest: DIGEST,
        outputs: [],
        source: options.sourceContext,
      };
      writeJson(path.join(options.publicationDirectory, "receipt.json"), receipt, 0o600);
      writeJson(
        path.join(options.publicationDirectory, "bundle.json"),
        {
          gateId: "skills",
          taskKey: DIGEST,
          receiptDigest: DIGEST,
          resolutionDigest: DIGEST,
          bundleDigest: DIGEST,
        },
        0o600,
      );
      return {
        kind: "result",
        receipt,
        publication: {
          schemaVersion: 1,
          state: "provisional",
          resolutionDigest: DIGEST,
          bundleDigest: DIGEST,
          stagedTreeDigest: DIGEST,
          directory: options.publicationDirectory,
        },
      };
    },
  };
  const { outputs } = await recordValidationTask(
    {
      repository: root,
      resolution: resolutionFile,
      gateId: "skills",
      outcome: outcomeFile,
      publicationDirectory: publication,
      transportBundle: transport,
      recordedOutput,
      repositoryIdentity: "example/repository",
      event: "push",
      ref: "refs/heads/main",
      sha: "b".repeat(40),
      runId: "10",
      runAttempt: "2",
      jobName: "Gate / skills",
      jobId: "30",
      githubOutput: false,
    },
    { core: fakeCore },
  );
  assert.equal(outputs.publication_file, transport);
  assert.deepEqual(fs.readdirSync(path.dirname(transport)), [TASK_BUNDLE_FILE]);
  const restored = path.join(root, "restored");
  materializeCanonicalTaskBundle(transport, restored);
  assert.equal(JSON.parse(fs.readFileSync(path.join(restored, "receipt.json"))).gateId, "skills");
});

test("record wrapper seals a canonical failed tombstone when setup produced no outcome", async (context) => {
  const root = temporaryRoot(context);
  const resolutionFile = path.join(root, "resolution.json");
  const outcomeFile = path.join(root, "outcome.json");
  const resolution = {
    resolutionDigest: DIGEST,
    controlPlaneDigest: DIGEST,
    sourceContext: {
      workflowPath: ".github/workflows/validate.yml",
      workflowDigest: DIGEST,
    },
    tasks: [{ gateId: "skills", taskKey: DIGEST }],
  };
  writeJson(resolutionFile, resolution);
  let recordedOutcome = null;
  const fakeCore = {
    createFailedTaskOutcome({ resolution: current, gateId, reason }) {
      assert.equal(current.resolutionDigest, DIGEST);
      assert.equal(gateId, "skills");
      assert.match(reason, /setup failed/);
      return {
        schemaVersion: 1,
        gateId,
        taskKey: DIGEST,
        resolutionDigest: DIGEST,
        candidateFingerprintBefore: DIGEST,
        candidateFileCountBefore: 1,
        candidateFingerprintAfter: DIGEST,
        candidateFileCountAfter: 1,
        outcome: { status: "failed" },
      };
    },
    async record(options) {
      recordedOutcome = options.outcome;
      fs.mkdirSync(options.publicationDirectory, { recursive: true, mode: 0o700 });
      const receipt = {
        gateId: "skills",
        taskKey: DIGEST,
        receiptDigest: DIGEST,
        outputs: [],
        source: options.sourceContext,
      };
      writeJson(path.join(options.publicationDirectory, "receipt.json"), receipt, 0o600);
      writeJson(
        path.join(options.publicationDirectory, "bundle.json"),
        {
          gateId: "skills",
          taskKey: DIGEST,
          receiptDigest: DIGEST,
          resolutionDigest: DIGEST,
          bundleDigest: DIGEST,
        },
        0o600,
      );
      return {
        receipt,
        publication: { directory: options.publicationDirectory },
      };
    },
  };
  const result = await recordValidationTask(
    {
      repository: root,
      resolution: resolutionFile,
      gateId: "skills",
      outcome: outcomeFile,
      failureReason: "setup failed before execution",
      publicationDirectory: path.join(root, "publication"),
      transportBundle: path.join(root, "upload", TASK_BUNDLE_FILE),
      recordedOutput: path.join(root, "recorded.json"),
      repositoryIdentity: "example/repository",
      event: "push",
      ref: "refs/heads/main",
      sha: "b".repeat(40),
      runId: "10",
      runAttempt: "2",
      jobName: "Gate / skills",
      jobId: "30",
      githubOutput: false,
    },
    { core: fakeCore },
  );
  assert.equal(recordedOutcome.status, "failed");
  assert.equal(result.outputs.outcome_status, "failed");
  assert.equal(result.outputs.should_fail, "true");
  assert.equal(JSON.parse(fs.readFileSync(outcomeFile)).outcome.status, "failed");
});

test("assemble wrapper finalizes completed miss artifacts before aggregate proof", async (context) => {
  const root = temporaryRoot(context);
  const report = path.join(root, "report.json");
  const acceptedOutput = path.join(root, "accepted.json");
  const artifactsRoot = path.join(root, "artifacts");
  const artifactName = taskArtifactName("skills", DIGEST, "10", "2");
  const source = {
    runId: "10",
    runAttempt: "2",
    jobId: "30",
    jobName: "Gate / skills",
    artifactName,
  };
  const receipt = {
    kind: "result",
    gateId: "skills",
    taskKey: DIGEST,
    receiptDigest: DIGEST,
    outputs: [],
    source,
  };
  const raw = path.join(root, "raw");
  fs.mkdirSync(raw, { mode: 0o700 });
  writeJson(path.join(raw, "receipt.json"), receipt, 0o600);
  writeJson(
    path.join(raw, "bundle.json"),
    {
      gateId: "skills",
      taskKey: DIGEST,
      receiptDigest: DIGEST,
      resolutionDigest: DIGEST,
      bundleDigest: DIGEST,
    },
    0o600,
  );
  const downloaded = path.join(artifactsRoot, artifactName, TASK_BUNDLE_FILE);
  packCanonicalTaskBundle(raw, downloaded);
  const resolution = {
    repositoryRoot: root,
    repositoryIdentity: "example/repository",
    resolutionDigest: DIGEST,
    controlPlaneDigest: DIGEST,
    sourceContext: { workflowDigest: DIGEST },
    tasks: [{ gateId: "skills", taskKey: DIGEST, status: "miss" }],
  };
  const resolutionFile = path.join(root, "resolution.json");
  const boundary = path.join(root, "boundary.json");
  writeJson(resolutionFile, resolution);
  writeJson(boundary, { candidateFingerprint: DIGEST, candidateFileCount: 1 });
  const locator = { kind: "github-artifact", id: "40" };
  const store = {
    async findArtifact() {
      return locator;
    },
  };
  let finalized = false;
  const core = {
    digestOutput() {
      return { digest: DIGEST };
    },
    async finalizePublication(value) {
      finalized = true;
      return { receipt: value.recorded.receipt, locator, publication: { state: "published" } };
    },
    async assemble({ records }) {
      assert.equal(records.skills.publication.state, "published");
      return {
        failed: false,
        report: {
          scope: "full",
          reportDigest: DIGEST,
          taskResultSetDigest: DIGEST,
          counts: { executed: 1, reused: 0 },
        },
        acceptedTaskReceipts: [{ gateId: "skills", receipt, locator }],
      };
    },
  };
  const { outputs } = await assembleValidationTasks(
    {
      repository: root,
      resolution: resolutionFile,
      taskArtifactsRoot: artifactsRoot,
      index: path.join(root, "index.json"),
      boundary,
      report,
      acceptedOutput,
      repositoryIdentity: "example/repository",
      runId: "10",
      runAttempt: "2",
      githubOutput: false,
    },
    {
      core,
      store,
      identity: { workflowDigest: DIGEST, controlPlaneDigest: DIGEST },
      candidate: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1 },
    },
  );
  assert.equal(finalized, true);
  assert.equal(outputs.failed, "false");
  assert.equal(JSON.parse(fs.readFileSync(acceptedOutput)).tasks.length, 1);
});

test("assemble wrapper invokes independent current-aggregator task-key attestation", async (context) => {
  const root = temporaryRoot(context);
  const resolutionFile = path.join(root, "resolution.json");
  const report = path.join(root, "report.json");
  const acceptedOutput = path.join(root, "accepted.json");
  const resolution = {
    repositoryRoot: root,
    repositoryIdentity: "example/repository",
    resolutionDigest: DIGEST,
    controlPlaneDigest: DIGEST,
    sourceContext: { workflowDigest: DIGEST },
    tasks: [],
  };
  writeJson(resolutionFile, resolution);
  const boundary = path.join(root, "boundary.json");
  writeJson(boundary, { candidateFingerprint: DIGEST, candidateFileCount: 1 });
  let attested = false;
  await assembleValidationTasks(
    {
      repository: root,
      resolution: resolutionFile,
      taskArtifactsRoot: path.join(root, "artifacts"),
      index: path.join(root, "index.json"),
      boundary,
      report,
      acceptedOutput,
      repositoryIdentity: "example/repository",
      runId: "10",
      runAttempt: "2",
      githubOutput: false,
    },
    {
      identity: { workflowDigest: DIGEST, controlPlaneDigest: DIGEST },
      candidate: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1 },
      attestResolution() {
        attested = true;
      },
      core: {
        async assemble() {
          return {
            failed: false,
            report: {
              scope: "full",
              reportDigest: DIGEST,
              taskResultSetDigest: DIGEST,
              counts: { executed: 0, reused: 0 },
            },
            acceptedTaskReceipts: [],
          };
        },
      },
      store: {},
    },
  );
  assert.equal(attested, true);
});

test("aggregator attestation derives plan, provenance, and worker mode from current inputs", async (context) => {
  const root = temporaryRoot(context);
  const transport = temporaryRoot(context);
  fs.mkdirSync(path.join(root, "scripts/ci"), { recursive: true });
  writeJson(path.join(root, "scripts/ci/validation-manifest.json"), { schemaVersion: 2 });
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "validation@example.invalid"]);
  git(root, ["config", "user.name", "Validation Test"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "candidate"]);
  const sha = git(root, ["rev-parse", "HEAD"]);
  const plan = { schemaVersion: 1, candidateSha: sha, baseSha: "" };
  const planFile = path.join(transport, "downloaded-plan.json");
  writeJson(planFile, plan);
  const sourceContext = {
    repository: "example/repository",
    workflowPath: ".github/workflows/validate.yml",
    workflowDigest: DIGEST,
    controlPlaneDigest: DIGEST,
    runId: "10",
    runAttempt: "2",
    artifactName: "validation-resolution-v1-10-2",
    event: "workflow_dispatch",
    ref: "refs/heads/main",
    sha,
  };
  const tasks = [
    {
      gateId: "architecture-compass",
      taskKey: DIGEST,
      keyMaterial: { environment: { ARCHITECTURE_FIXTURE_WORKERS: "3" } },
    },
  ];
  let recomputedInput;
  await attestResolution(
    {
      async resolve(input) {
        recomputedInput = input;
        return { tasks };
      },
    },
    {
      repositoryIdentity: "example/repository",
      plan,
      sourceContext,
      tasks,
    },
    {
      repository: root,
      repositoryIdentity: "example/repository",
      plan: planFile,
      event: "workflow_dispatch",
      ref: "refs/heads/main",
      sha,
      baseSha: "none",
      architectureWorkers: "3",
      runId: "10",
      runAttempt: "2",
      identity: { workflowDigest: DIGEST, controlPlaneDigest: DIGEST },
      candidate: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1 },
    },
    {
      resolvePlan() {
        return plan;
      },
      discoverCurrentToolchain() {
        return {};
      },
    },
  );
  assert.equal(recomputedInput.environment.ARCHITECTURE_FIXTURE_WORKERS, "3");
  assert.equal(recomputedInput.sourceContext.event, "workflow_dispatch");
  assert.equal(recomputedInput.sourceContext.sha, sha);

  await assert.rejects(
    attestResolution(
      {
        async resolve() {
          return { tasks };
        },
      },
      {
        repositoryIdentity: "example/repository",
        plan,
        sourceContext,
        tasks: [
          {
            gateId: "architecture-compass",
            taskKey: DIGEST,
            keyMaterial: { environment: { ARCHITECTURE_FIXTURE_WORKERS: "1" } },
          },
        ],
      },
      {
        repository: root,
        repositoryIdentity: "example/repository",
        plan: planFile,
        event: "workflow_dispatch",
        ref: "refs/heads/main",
        sha,
        baseSha: "none",
        architectureWorkers: "3",
        runId: "10",
        runAttempt: "2",
        identity: { workflowDigest: DIGEST, controlPlaneDigest: DIGEST },
        candidate: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1 },
      },
      {
        resolvePlan() {
          return plan;
        },
        discoverCurrentToolchain() {
          return {};
        },
      },
    ),
    /recomputed different validation task keys/,
  );

  await assert.rejects(
    attestResolution(
      { async resolve() {} },
      {
        repositoryIdentity: "example/repository",
        plan,
        sourceContext: { ...sourceContext, sha: "f".repeat(40) },
        tasks,
      },
      {
        repository: root,
        repositoryIdentity: "example/repository",
        plan: planFile,
        event: "workflow_dispatch",
        ref: "refs/heads/main",
        sha,
        baseSha: "none",
        architectureWorkers: "3",
        runId: "10",
        runAttempt: "2",
        identity: { workflowDigest: DIGEST, controlPlaneDigest: DIGEST },
        candidate: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1 },
      },
    ),
    /provenance differs/,
  );

  const staleSha = "f".repeat(40);
  await assert.rejects(
    attestResolution(
      { async resolve() {} },
      {
        repositoryIdentity: "example/repository",
        plan,
        sourceContext: { ...sourceContext, sha: staleSha },
        tasks,
      },
      {
        repository: root,
        repositoryIdentity: "example/repository",
        plan: planFile,
        event: "workflow_dispatch",
        ref: "refs/heads/main",
        sha: staleSha,
        baseSha: "none",
        architectureWorkers: "3",
        runId: "10",
        runAttempt: "2",
        identity: { workflowDigest: DIGEST, controlPlaneDigest: DIGEST },
        candidate: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1 },
      },
    ),
    /workflow SHA|checkout HEAD/,
  );
});

test("assemble wrapper rejects unexpected current-run task artifact directories", async (context) => {
  const root = temporaryRoot(context);
  const artifactsRoot = path.join(root, "artifacts");
  fs.mkdirSync(path.join(artifactsRoot, "validation-task-v1-surprise"), { recursive: true });
  const resolutionFile = path.join(root, "resolution.json");
  const boundary = path.join(root, "boundary.json");
  writeJson(resolutionFile, {
    repositoryRoot: root,
    repositoryIdentity: "example/repository",
    resolutionDigest: DIGEST,
    controlPlaneDigest: DIGEST,
    sourceContext: { workflowDigest: DIGEST },
    tasks: [],
  });
  writeJson(boundary, { candidateFingerprint: DIGEST, candidateFileCount: 1 });
  await assert.rejects(
    assembleValidationTasks(
      {
        repository: root,
        resolution: resolutionFile,
        taskArtifactsRoot: artifactsRoot,
        index: path.join(root, "index.json"),
        boundary,
        report: path.join(root, "report.json"),
        acceptedOutput: path.join(root, "accepted.json"),
        repositoryIdentity: "example/repository",
        runId: "10",
        runAttempt: "2",
      },
      {
        core: {},
        store: {},
        identity: { workflowDigest: DIGEST, controlPlaneDigest: DIGEST },
        candidate: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1 },
      },
    ),
    /Unexpected current-run task artifact/,
  );
});
