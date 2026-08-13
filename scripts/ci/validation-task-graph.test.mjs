import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";
import { ACTIONLINT_CONTRACT, ACTIONLINT_IDENTITY } from "./actionlint-contract.mjs";
import {
  assemble,
  createFailedTaskOutcome,
  createMemoryStore,
  digestOutput,
  finalizePublication,
  _internal,
  record as recordCore,
  resolve,
  sanitizeExecutionEnvironment,
} from "./validation-task-graph.mjs";
import { digestJson, validateManifest } from "./validation-contract.mjs";

const SHA_A = `sha256:${"a".repeat(64)}`;
const SHA_B = `sha256:${"b".repeat(64)}`;

async function record(options, adapters) {
  const publicationRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validation-publication-"));
  try {
    const recorded = await recordCore(
      { ...options, publicationDirectory: path.join(publicationRoot, "bundle") },
      adapters,
    );
    const locator = await adapters.store.upload(recorded);
    return await finalizePublication(
      { recorded, locator, resolution: options.resolution, now: options.now },
      adapters,
    );
  } finally {
    fs.rmSync(publicationRoot, { recursive: true, force: true });
  }
}

function fixture(t) {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), "validation-task-graph-"));
  fs.writeFileSync(path.join(repository, "input.txt"), "stable input\n");
  fs.writeFileSync(path.join(repository, "example.mjs"), "process.exitCode = 0;\n");
  fs.writeFileSync(path.join(repository, "AGENTS.md"), "stable policy\n");
  for (const arguments_ of [
    ["init", "--quiet"],
    ["config", "user.email", "validation@example.invalid"],
    ["config", "user.name", "Validation Test"],
    ["add", "."],
    ["commit", "--quiet", "-m", "fixture"],
  ]) {
    const result = spawnSync("git", arguments_, { cwd: repository, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  t.after(() => fs.rmSync(repository, { recursive: true, force: true }));
  const manifest = {
    schemaVersion: 2,
    taskKeySchemaVersion: 1,
    packageProfiles: {},
    globalInvalidators: ["AGENTS.md"],
    knownPaths: ["**"],
    gates: [
      {
        id: "example",
        command: ["node", "example.mjs"],
        selection: { paths: ["input.txt"], deriveFromExecutionInputs: true },
        execution: {
          entrypoints: ["example.mjs"],
          helpers: [],
          workspaceInputs: ["input.txt"],
          packageProfiles: [],
          tools: ["node"],
          environment: ["CI"],
          gitInputs: [],
        },
        evidence: { kind: "exit-code" },
        restoreOutputs: [],
        epoch: 1,
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
    reason: "test",
    baseSha: "",
    candidateSha: "candidate",
    changedPaths: [],
    selectedGates: ["example"],
    installProfiles: [],
    manifestDigest: digestJson(manifest),
    basePlanDigest: null,
    candidatePlanDigest: SHA_B,
  };
  const sourceContext = {
    repository: "stark-ai-de/agent-skills",
    workflowPath: ".github/workflows/validate.yml",
    workflowDigest: SHA_A,
    controlPlaneDigest: SHA_A,
    runId: "100",
    runAttempt: "1",
    jobId: "200",
    jobName: "example",
    jobConclusion: "success",
    artifactName: "validation-task-v1-example-key-100-1",
    event: "workflow_dispatch",
    ref: "refs/heads/example",
    sha: "candidate",
  };
  const candidate = fingerprintGitCandidateRepository(repository);
  const common = {
    manifest,
    plan,
    repository,
    repositoryIdentity: "stark-ai-de/agent-skills",
    mode: "auto",
    environment: { CI: "true", UNDECLARED_SECRET: "must-not-be-keyed" },
    toolchain: {
      node: "22.20.0",
      pathDigest: SHA_A,
      runnerLabel: "ubuntu-24.04",
      imageOS: "ubuntu24",
      imageVersion: "20260801.1",
    },
    gitInputs: {},
    controlPlaneDigest: SHA_A,
    candidateFingerprint: `sha256:${candidate.digest}`,
    candidateFileCount: candidate.fileCount,
    sourceContext,
    now: "2026-08-13T12:00:00.000Z",
  };
  return { common, manifest, plan, repository, sourceContext };
}

function withManifest(common, transform) {
  const manifest = structuredClone(common.manifest);
  transform(manifest);
  return {
    ...common,
    manifest,
    plan: { ...common.plan, manifestDigest: digestJson(manifest) },
  };
}

async function passTask(common, store, overrides = {}) {
  const resolution = await resolve(common, { store });
  const outcomeOverrides = { ...overrides.outcome };
  if (typeof overrides.evidenceFactory === "function") {
    outcomeOverrides.evidence = overrides.evidenceFactory(resolution.tasks[0]);
  }
  const recorded = await record(
    {
      resolution,
      gateId: "example",
      repository: common.repository,
      outcome: {
        status: "passed",
        durationMs: 42,
        reason: null,
        capabilityComplete: true,
        evidence: { exitCode: 0 },
        outputs: [],
        ...outcomeOverrides,
      },
      sourceContext: { ...common.sourceContext, ...overrides.sourceContext },
      candidateFingerprintBefore:
        overrides.candidateFingerprintBefore ?? common.candidateFingerprint,
      candidateFingerprintAfter: overrides.candidateFingerprintAfter ?? common.candidateFingerprint,
      candidateFileCountBefore: overrides.candidateFileCountBefore ?? common.candidateFileCount,
      candidateFileCountAfter: overrides.candidateFileCountAfter ?? common.candidateFileCount,
      now: overrides.now ?? common.now,
    },
    { store },
  );
  return { resolution, recorded };
}

test("a successful task result is reused for the same declared inputs", async (t) => {
  const { common, sourceContext } = fixture(t);
  const store = createMemoryStore();
  const first = await resolve(common, { store });
  assert.deepEqual(first.hits, []);
  assert.deepEqual(first.misses, ["example"]);

  const recorded = await record(
    {
      resolution: first,
      gateId: "example",
      repository: common.repository,
      outcome: {
        status: "passed",
        durationMs: 42,
        reason: null,
        capabilityComplete: true,
        evidence: { exitCode: 0 },
        outputs: [],
      },
      sourceContext,
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
      now: common.now,
    },
    { store },
  );
  assert.equal(recorded.kind, "result");

  const second = await resolve(
    {
      ...common,
      sourceContext: { ...sourceContext, runId: "101", jobId: "201" },
      now: "2026-08-13T12:01:00.000Z",
    },
    { store },
  );
  assert.deepEqual(second.hits, ["example"]);
  assert.deepEqual(second.misses, []);
  assert.equal(second.tasks[0].status, "reused");
  assert.equal(second.tasks[0].taskKey, first.tasks[0].taskKey);
  assert.equal(second.tasks[0].receipt.source.runId, "100");
});

test("canonical pre-execution failure outcomes are record-ready tombstones", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  const resolution = await resolve(common, { store });
  const envelope = createFailedTaskOutcome({
    resolution,
    gateId: "example",
    reason: "dependency installation failed",
    durationMs: 17,
  });
  assert.deepEqual(envelope, {
    schemaVersion: 1,
    gateId: "example",
    taskKey: resolution.tasks[0].taskKey,
    resolutionDigest: resolution.resolutionDigest,
    candidateFingerprintBefore: resolution.candidateFingerprint,
    candidateFileCountBefore: resolution.candidateFileCount,
    candidateFingerprintAfter: resolution.candidateFingerprint,
    candidateFileCountAfter: resolution.candidateFileCount,
    outcome: {
      status: "failed",
      durationMs: 17,
      reason: "dependency installation failed",
      evidence: { exitCode: null },
      outputs: [],
    },
  });
});

test("record stages a provisional immutable bundle that assembly cannot trust before publication", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  const resolution = await resolve(common, { store });
  const publicationRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validation-publication-"));
  t.after(() => fs.rmSync(publicationRoot, { recursive: true, force: true }));
  const recorded = await recordCore(
    {
      resolution,
      gateId: "example",
      repository: common.repository,
      publicationDirectory: path.join(publicationRoot, "bundle"),
      outcome: {
        status: "passed",
        durationMs: 1,
        evidence: { exitCode: 0 },
        outputs: [],
      },
      sourceContext: common.sourceContext,
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
      now: common.now,
    },
    { store },
  );
  assert.equal(recorded.publication.state, "provisional");
  assert.equal(recorded.locator, undefined);
  assert.deepEqual(fs.readdirSync(recorded.publication.directory).sort(), [
    "bundle.json",
    "receipt.json",
  ]);
  await assert.rejects(
    assemble(
      {
        resolution,
        repository: common.repository,
        records: { example: recorded },
        candidateFingerprintBefore: common.candidateFingerprint,
        candidateFingerprintAfter: common.candidateFingerprint,
        candidateFileCountBefore: common.candidateFileCount,
        candidateFileCountAfter: common.candidateFileCount,
      },
      { store },
    ),
    /published task record/,
  );
  const locator = await store.upload(recorded);
  const published = await finalizePublication(
    { recorded, locator, resolution, now: common.now },
    { store },
  );
  assert.equal(published.publication.state, "published");
  assert.equal((await resolve(common, { store })).tasks[0].status, "reused");
});

test("task keys change only for declared command, workspace, environment, tool, prerequisite, epoch, Git, and output contracts", async (t) => {
  const { common, repository } = fixture(t);
  const store = createMemoryStore();
  const key = async (options) => (await resolve(options, { store })).tasks[0].taskKey;
  const originalResolution = await resolve(common, { store });
  const original = originalResolution.tasks[0].taskKey;
  const originalWitness = _internal.workspaceWitness(repository, ["example.mjs", "input.txt"]);
  const originalInputMode = fs.statSync(path.join(repository, "input.txt")).mode & 0o7777;

  fs.writeFileSync(path.join(repository, "untracked-ignored.txt"), "ignored\n");
  assert.equal(await key(common), original, "undeclared files must not invalidate a task");

  fs.writeFileSync(path.join(repository, "input.txt"), "changed input\n");
  assert.notEqual(await key(common), original, "content changes must invalidate");
  fs.writeFileSync(path.join(repository, "input.txt"), "stable input\n");
  fs.chmodSync(path.join(repository, "input.txt"), 0o755);
  assert.notEqual(await key(common), original, "mode changes must invalidate");
  fs.chmodSync(path.join(repository, "input.txt"), originalInputMode);
  fs.renameSync(path.join(repository, "input.txt"), path.join(repository, "renamed.txt"));
  assert.notEqual(await key(common), original, "deletion or rename must invalidate");
  fs.renameSync(path.join(repository, "renamed.txt"), path.join(repository, "input.txt"));

  fs.writeFileSync(path.join(repository, "example.mjs"), "process.exitCode = 1;\n");
  assert.notEqual(await key(common), original, "entrypoint changes must invalidate");
  fs.writeFileSync(path.join(repository, "example.mjs"), "process.exitCode = 0;\n");

  const cases = [
    withManifest(common, (manifest) => manifest.gates[0].command.push("--strict")),
    { ...common, environment: { ...common.environment, CI: "false" } },
    { ...common, toolchain: { ...common.toolchain, node: "24.18.0" } },
    withManifest(common, (manifest) => {
      manifest.gates[0].epoch = 2;
    }),
    withManifest(common, (manifest) => {
      manifest.gates[0].evidence = {
        kind: "capability-complete-exit-code",
        requiredCapabilities: ["semantic-json"],
        outputMarkers: { "semantic-json": "semantic JSON validated" },
      };
    }),
  ];
  for (const changed of cases) assert.notEqual(await key(changed), original);

  const rolledHostedImage = {
    ...common,
    toolchain: {
      ...common.toolchain,
      imageOS: "ubuntu24",
      imageVersion: "20260808.1",
      observedRunner: "ubuntu24@20260808.1",
    },
  };
  assert.equal(
    await key(rolledHostedImage),
    original,
    "rollout-specific hosted image observations must not split a pinned-runner task key",
  );

  const selectionOnly = withManifest(common, (manifest) => {
    manifest.gates[0].selection.paths = ["docs/**"];
  });
  const selectionResolution = await resolve(selectionOnly, { store });
  assert.deepEqual(
    _internal.workspaceWitness(repository, ["example.mjs", "input.txt"]),
    originalWitness,
  );
  assert.deepEqual(
    selectionResolution.tasks[0].keyMaterial,
    originalResolution.tasks[0].keyMaterial,
    "selection-only changes must not invalidate execution evidence",
  );

  const gitManifest = withManifest(common, (manifest) => {
    manifest.gates[0].execution.gitInputs = ["baseTree"];
  });
  const gitOne = { ...gitManifest, gitInputs: { baseTree: SHA_A } };
  const gitTwo = { ...gitManifest, gitInputs: { baseTree: SHA_B } };
  assert.notEqual(await key(gitOne), await key(gitTwo), "logical Git inputs must invalidate");

  const prerequisiteManifest = withManifest(common, (manifest) => {
    manifest.gates.unshift({
      ...structuredClone(manifest.gates[0]),
      id: "foundation",
      command: ["node", "foundation.mjs"],
    });
    manifest.gates[1].prerequisites = ["foundation"];
  });
  prerequisiteManifest.plan = {
    ...prerequisiteManifest.plan,
    selectedGates: ["foundation", "example"],
    manifestDigest: digestJson(prerequisiteManifest.manifest),
  };
  const prerequisiteResolution = await resolve(prerequisiteManifest, { store });
  assert.equal(
    prerequisiteResolution.tasks[1].prerequisiteKeys[0],
    prerequisiteResolution.tasks[0].taskKey,
  );
  assert.notEqual(prerequisiteResolution.tasks[1].taskKey, original);
});

test("added paths invalidate globbed inputs and workspace symlinks are rejected", async (t) => {
  const { common, repository } = fixture(t);
  const store = createMemoryStore();
  const globbed = withManifest(common, (manifest) => {
    manifest.gates[0].execution.workspaceInputs = ["inputs/**"];
  });
  const missing = (await resolve(globbed, { store })).tasks[0];
  const before = missing.taskKey;
  assert.equal(missing.cacheEligible, false);
  assert.match(missing.missReason, /workspace-input:inputs\/\*\*/);
  const optional = withManifest(common, (manifest) => {
    manifest.gates[0].execution.workspaceInputs = [{ path: "inputs/**", allowEmpty: true }];
  });
  assert.equal((await resolve(optional, { store })).tasks[0].cacheEligible, true);
  fs.mkdirSync(path.join(repository, "inputs"));
  fs.writeFileSync(path.join(repository, "inputs", "added.txt"), "added\n");
  const after = (await resolve(globbed, { store })).tasks[0].taskKey;
  assert.notEqual(after, before);
  fs.rmSync(path.join(repository, "inputs", "added.txt"));
  fs.symlinkSync("../input.txt", path.join(repository, "inputs", "link.txt"));
  await assert.rejects(resolve(globbed, { store }), /symlinks are not cacheable/);
});

test("global invalidator bytes change every selected task key", async (t) => {
  const { common, repository } = fixture(t);
  const manifest = structuredClone(common.manifest);
  manifest.gates.push({
    ...structuredClone(manifest.gates[0]),
    id: "second",
    command: ["node", "second.mjs"],
  });
  const expanded = {
    ...common,
    manifest,
    plan: {
      ...common.plan,
      selectedGates: ["example", "second"],
      manifestDigest: digestJson(manifest),
    },
  };
  const store = createMemoryStore();
  const before = (await resolve(expanded, { store })).tasks.map(({ taskKey }) => taskKey);
  fs.writeFileSync(path.join(repository, "AGENTS.md"), "changed policy\n");
  const after = (await resolve(expanded, { store })).tasks.map(({ taskKey }) => taskKey);
  assert.equal(before.length, after.length);
  for (let index = 0; index < before.length; index += 1)
    assert.notEqual(after[index], before[index]);
});

test("reuse modes, newest tombstones, and store outages fail safe", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  await passTask(common, store);

  const off = await resolve({ ...common, mode: "off" }, { store });
  assert.equal(off.tasks[0].status, "miss");
  assert.match(off.tasks[0].missReason, /disabled/);

  const verify = await resolve({ ...common, mode: "verify" }, { store });
  assert.equal(verify.tasks[0].status, "verify");
  assert.equal(verify.tasks[0].comparisonReceipt.kind, "result");

  const failureResolution = await resolve({ ...common, mode: "off" }, { store });
  await record(
    {
      resolution: failureResolution,
      gateId: "example",
      repository: common.repository,
      outcome: {
        status: "failed",
        durationMs: 2,
        reason: "current execution failed",
        capabilityComplete: true,
        evidence: { exitCode: 1 },
        outputs: [],
      },
      sourceContext: { ...common.sourceContext, runId: "102", jobId: "202" },
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
      now: "2026-08-13T12:02:00.000Z",
    },
    { store },
  );
  const tombstoned = await resolve(common, { store });
  assert.equal(tombstoned.tasks[0].status, "miss");
  assert.match(tombstoned.tasks[0].missReason, /tombstone/);

  const unavailable = await resolve(common, {
    store: {
      async lookup() {
        const error = new Error("offline");
        error.code = "ERR_STORE_UNAVAILABLE";
        throw error;
      },
    },
  });
  assert.equal(unavailable.tasks[0].status, "miss");
  assert.match(unavailable.tasks[0].missReason, /offline/);
});

test("a dependent result is reusable only after every prerequisite is a verified hit", async (t) => {
  const { common } = fixture(t);
  const configured = withManifest(common, (manifest) => {
    manifest.gates.unshift({
      ...structuredClone(manifest.gates[0]),
      id: "foundation",
      command: ["node", "example.mjs", "--foundation"],
    });
    manifest.gates[1].prerequisites = ["foundation"];
  });
  configured.plan = {
    ...configured.plan,
    selectedGates: ["foundation", "example"],
    manifestDigest: digestJson(configured.manifest),
  };
  const store = createMemoryStore();
  const seed = await resolve(configured, { store });
  for (const [index, gateId] of ["foundation", "example"].entries()) {
    await record(
      {
        resolution: seed,
        gateId,
        repository: configured.repository,
        outcome: {
          status: "passed",
          durationMs: 1,
          evidence: { exitCode: 0 },
          outputs: [],
        },
        sourceContext: {
          ...configured.sourceContext,
          jobId: String(300 + index),
          jobName: gateId,
          artifactName: `validation-task-v1-${gateId}-seed`,
        },
        candidateFingerprintBefore: configured.candidateFingerprint,
        candidateFingerprintAfter: configured.candidateFingerprint,
        candidateFileCountBefore: configured.candidateFileCount,
        candidateFileCountAfter: configured.candidateFileCount,
        now: `2026-08-13T12:0${index}:00.000Z`,
      },
      { store },
    );
  }
  assert.deepEqual((await resolve(configured, { store })).hits, ["foundation", "example"]);

  const failureResolution = await resolve({ ...configured, mode: "off" }, { store });
  await record(
    {
      resolution: failureResolution,
      gateId: "foundation",
      repository: configured.repository,
      outcome: {
        status: "failed",
        durationMs: 1,
        reason: "current prerequisite failure",
        evidence: { exitCode: 1 },
        outputs: [],
      },
      sourceContext: {
        ...configured.sourceContext,
        runId: "200",
        jobId: "400",
        jobName: "foundation",
        artifactName: "validation-task-v1-foundation-failure",
      },
      candidateFingerprintBefore: configured.candidateFingerprint,
      candidateFingerprintAfter: configured.candidateFingerprint,
      candidateFileCountBefore: configured.candidateFileCount,
      candidateFileCountAfter: configured.candidateFileCount,
      now: "2026-08-13T12:10:00.000Z",
    },
    { store },
  );
  const blocked = await resolve(configured, { store });
  assert.deepEqual(blocked.hits, []);
  assert.deepEqual(blocked.misses, ["foundation", "example"]);
  assert.match(blocked.tasks[1].missReason, /prerequisite.*verified reusable success/i);
});

test("contradictory receipts hard-fail instead of becoming cache misses", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  const { recorded } = await passTask(common, store);
  const receipt = { ...recorded.receipt, evidenceDigest: SHA_A };
  await assert.rejects(
    resolve(common, {
      store: {
        async lookup() {
          return {
            schemaVersion: 1,
            order: "newest-first",
            complete: true,
            observations: [
              {
                observedAt: common.now,
                locator: {
                  kind: "github-artifact",
                  id: "1",
                  name: "validation-task-v1-example-key-100-1",
                  digest: SHA_A,
                  runId: "100",
                  runAttempt: "1",
                  jobId: "200",
                  jobName: "example",
                  repository: "stark-ai-de/agent-skills",
                  size: 123,
                },
                receipt,
              },
            ],
          };
        },
      },
    }),
    /digest contradicts/,
  );
});

test("authoritative lookup must prove complete newest-first ordering", async (t) => {
  const { common } = fixture(t);
  await assert.rejects(
    resolve(common, {
      store: {
        async lookup() {
          return [];
        },
      },
    }),
    /complete newest-first observation order/,
  );
});

test("lookup rejects duplicate identities and requires a strict authoritative total order", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  await passTask(common, store);
  const observation = store.snapshot()[0];
  const canonical = {
    receipt: observation.receipt,
    locator: observation.locator,
    observedAt: observation.observedAt,
  };
  await assert.rejects(
    resolve(common, {
      store: {
        ...store,
        async lookup() {
          return {
            schemaVersion: 1,
            order: "newest-first",
            complete: true,
            observations: [canonical, structuredClone(canonical)],
          };
        },
      },
    }),
    /duplicate artifact|strict total order/i,
  );

  const second = structuredClone(canonical);
  second.locator.id = String(Number(canonical.locator.id) + 1);
  second.locator.runId = String(Number(canonical.locator.runId) + 1);
  second.receipt.source.runId = second.locator.runId;
  second.receipt.source.artifactName = `${second.receipt.source.artifactName}-newer`;
  second.locator.name = second.receipt.source.artifactName;
  second.receipt.receiptDigest = _internal.receiptDigest(second.receipt);
  await assert.rejects(
    resolve(common, {
      store: {
        ...store,
        async lookup() {
          return {
            schemaVersion: 1,
            order: "newest-first",
            complete: true,
            observations: [canonical, second],
          };
        },
      },
    }),
    /not in verified newest-first total order/i,
  );
});

test("result-store metadata is verified with bounded trust context and cross-correlated", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  await passTask(common, store);
  const calls = [];
  const trackingStore = {
    ...store,
    async lookup(input) {
      calls.push({ operation: "lookup", input });
      return store.lookup(input);
    },
    async verify(input) {
      calls.push({ operation: "verify", input });
      return store.verify(input);
    },
  };
  const reused = await resolve(common, { store: trackingStore });
  assert.equal(reused.tasks[0].status, "reused");
  assert.equal(calls[0].input.limit, 1000);
  assert.equal(calls[0].input.timeoutMs, 20_000);
  assert.deepEqual(calls[0].input.trustContext, {
    repository: common.repositoryIdentity,
    workflowPath: common.sourceContext.workflowPath,
    workflowDigest: common.sourceContext.workflowDigest,
    controlPlaneDigest: common.controlPlaneDigest,
  });
  assert.equal(calls[1].operation, "verify");

  const observation = store.snapshot()[0];
  const mismatchedLocator = structuredClone({
    receipt: observation.receipt,
    locator: observation.locator,
    observedAt: observation.observedAt,
  });
  mismatchedLocator.locator.runId = "999";
  await assert.rejects(
    resolve(common, {
      store: {
        ...store,
        async lookup() {
          return {
            schemaVersion: 1,
            order: "newest-first",
            complete: true,
            observations: [mismatchedLocator],
          };
        },
      },
    }),
    /locator runId contradicts receipt source/,
  );

  await assert.rejects(
    resolve(common, {
      store: {
        ...store,
        async verify(input) {
          const metadata = await store.verify(input);
          return { ...metadata, runId: "wrong" };
        },
      },
    }),
    /Verified metadata runId contradicts receipt source/,
  );

  const expired = await resolve(common, {
    store: {
      ...store,
      async verify(input) {
        const metadata = await store.verify(input);
        return { ...metadata, artifact: { ...metadata.artifact, expired: true } };
      },
    },
  });
  assert.equal(expired.tasks[0].status, "miss");
  assert.match(expired.tasks[0].missReason, /expired/);

  const untrusted = structuredClone({
    receipt: observation.receipt,
    locator: observation.locator,
    observedAt: observation.observedAt,
  });
  untrusted.receipt.source.workflowPath = ".github/workflows/untrusted.yml";
  untrusted.receipt.source.workflowDigest = SHA_B;
  untrusted.receipt.receiptDigest = _internal.receiptDigest(untrusted.receipt);
  await assert.rejects(
    resolve(common, {
      store: {
        ...store,
        async lookup() {
          return {
            schemaVersion: 1,
            order: "newest-first",
            complete: true,
            observations: [untrusted],
          };
        },
        async verify(input) {
          const metadata = await store.verify({ ...input, locator: observation.locator });
          return {
            ...metadata,
            workflowPath: untrusted.receipt.source.workflowPath,
            workflowDigest: untrusted.receipt.source.workflowDigest,
          };
        },
      },
    }),
    /workflow path|workflow digest/i,
  );

  const wrongOrderingEvidence = structuredClone({
    receipt: observation.receipt,
    locator: observation.locator,
    observedAt: "2026-08-13T12:59:00.000Z",
  });
  await assert.rejects(
    resolve(common, {
      store: {
        ...store,
        async lookup() {
          return {
            schemaVersion: 1,
            order: "newest-first",
            complete: true,
            observations: [wrongOrderingEvidence],
          };
        },
      },
    }),
    /creation time contradicts lookup ordering evidence/,
  );
});

test("resolution lookup shares one absolute deadline and one total observation budget", async (t) => {
  const { common } = fixture(t);
  const configured = withManifest(common, (manifest) => {
    manifest.gates.push({
      ...structuredClone(manifest.gates[0]),
      id: "second",
      command: ["node", "example.mjs", "--second"],
    });
  });
  configured.plan = {
    ...configured.plan,
    selectedGates: ["example", "second"],
    manifestDigest: digestJson(configured.manifest),
  };
  const store = createMemoryStore();
  await passTask(configured, store);
  const calls = [];
  await resolve(configured, {
    store: {
      ...store,
      async lookup(input) {
        calls.push(input);
        return store.lookup(input);
      },
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].deadline, calls[1].deadline);
  assert.equal(calls[0].limit, 1000);
  assert.equal(calls[1].limit, 999);

  const overloaded = withManifest(common, (manifest) => {
    manifest.gates.push({
      ...structuredClone(manifest.gates[0]),
      id: "second",
      command: ["node", "example.mjs", "--second"],
    });
  });
  overloaded.plan = {
    ...overloaded.plan,
    selectedGates: ["example", "second"],
    manifestDigest: digestJson(overloaded.manifest),
  };
  await assert.rejects(
    resolve(overloaded, {
      store: {
        async lookup() {
          return {
            schemaVersion: 1,
            order: "newest-first",
            complete: true,
            observations: Array(1001).fill(null),
          };
        },
      },
    }),
    /total.*1000-observation|observation budget/i,
  );
});

test("execution environment excludes undeclared secrets", () => {
  const environment = sanitizeExecutionEnvironment(
    {
      PATH: "/bin",
      HOME: "/tmp/home",
      CI: "true",
      DECLARED: "kept",
      TOP_SECRET: "dropped",
    },
    ["DECLARED"],
    { VALIDATION_EVENT: "push" },
  );
  assert.equal(environment.DECLARED, "kept");
  assert.equal(environment.TOP_SECRET, undefined);
  assert.equal(environment.VALIDATION_EVENT, "push");
  assert.equal(environment.TZ, "UTC");
});

test("manifest v2 rejects escaping and overlapping restored outputs", (t) => {
  const { manifest } = fixture(t);
  const escaping = structuredClone(manifest);
  escaping.gates[0].restoreOutputs = [{ id: "escape", path: "../outside", kind: "directory" }];
  assert.throws(() => validateManifest(escaping), /escapes the repository/);
  const overlapping = structuredClone(manifest);
  overlapping.gates[0].restoreOutputs = [
    { id: "parent", path: "site/dist", kind: "directory" },
    { id: "child", path: "site/dist/assets", kind: "directory" },
  ];
  assert.throws(() => validateManifest(overlapping), /paths overlap/);
  for (const unsafePath of ["foo/..", "site\\dist", "site//dist", "site/./dist"]) {
    const unsafe = structuredClone(manifest);
    unsafe.gates[0].restoreOutputs = [{ id: "unsafe", path: unsafePath, kind: "directory" }];
    assert.throws(() => validateManifest(unsafe), /escapes the repository/);
  }
  const typo = structuredClone(manifest);
  typo.gates[0].execution.workspaceInput = ["input.txt"];
  assert.throws(() => validateManifest(typo), /unknown: workspaceInput/);
  const unapprovedEmpty = structuredClone(manifest);
  unapprovedEmpty.gates[0].execution.workspaceInputs = [{ path: "optional/**", allowEmpty: false }];
  assert.throws(() => validateManifest(unapprovedEmpty), /allowEmpty: true/);
});

test("restorable output witnesses reject hard links", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "validation-hardlink-output-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, "first.txt"), "shared bytes\n");
  fs.linkSync(path.join(directory, "first.txt"), path.join(directory, "second.txt"));
  assert.throws(() => digestOutput(directory, "directory"), /hard-linked file/);
});

test("candidate mutation and verify divergence record tombstones", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  const mutated = await passTask(common, store, { candidateFingerprintAfter: SHA_A });
  assert.equal(mutated.recorded.kind, "tombstone");
  assert.match(mutated.recorded.receipt.reason, /candidate changed/);

  const cleanStore = createMemoryStore();
  await passTask(common, cleanStore);
  const verification = await resolve({ ...common, mode: "verify" }, { store: cleanStore });
  const diverged = await record(
    {
      resolution: verification,
      gateId: "example",
      repository: common.repository,
      outcome: {
        status: "passed",
        durationMs: 3,
        reason: null,
        capabilityComplete: true,
        evidence: { exitCode: 0, changed: true },
        outputs: [],
      },
      sourceContext: { ...common.sourceContext, runId: "103", jobId: "203" },
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
      now: "2026-08-13T12:03:00.000Z",
    },
    { store: cleanStore },
  );
  assert.equal(diverged.kind, "tombstone");
  assert.match(diverged.receipt.reason, /verification mismatch/);
});

test("record and assemble bind the current candidate fingerprint and file count to resolution", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  const wrongIdentity = await passTask(common, store, {
    candidateFingerprintBefore: SHA_A,
    candidateFingerprintAfter: SHA_A,
    candidateFileCountBefore: common.candidateFileCount + 1,
    candidateFileCountAfter: common.candidateFileCount + 1,
  });
  assert.equal(wrongIdentity.recorded.kind, "tombstone");
  assert.match(wrongIdentity.recorded.receipt.reason, /resolution candidate identity/);

  const materializedMutationStore = createMemoryStore();
  fs.writeFileSync(path.join(common.repository, "input.txt"), "mutated behind caller boundary\n");
  const concealedMutation = await passTask(common, materializedMutationStore);
  assert.equal(concealedMutation.recorded.kind, "tombstone");
  assert.match(concealedMutation.recorded.receipt.reason, /candidate changed/i);
  assert.notEqual(
    concealedMutation.recorded.receipt.candidateFingerprintAfter,
    common.candidateFingerprint,
  );
  fs.writeFileSync(path.join(common.repository, "input.txt"), "stable input\n");

  const cleanStore = createMemoryStore();
  const { resolution, recorded } = await passTask(common, cleanStore);
  const assembled = await assemble(
    {
      resolution,
      records: { example: recorded },
      candidateFingerprintBefore: SHA_A,
      candidateFingerprintAfter: SHA_A,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
      repository: common.repository,
    },
    { store: cleanStore },
  );
  assert.equal(assembled.failed, true);
  assert.match(assembled.report.fingerprintError, /resolution candidate identity/);
});

test("record and assemble reject a task resolution whose digest or derived accounting was tampered", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  const resolution = await resolve(common, { store });
  const tampered = structuredClone(resolution);
  tampered.tasks[0].taskKey = SHA_A;
  await assert.rejects(
    record(
      {
        resolution: tampered,
        gateId: "example",
        outcome: {
          status: "passed",
          durationMs: 1,
          reason: null,
          capabilityComplete: true,
          evidence: { exitCode: 0 },
          outputs: [],
        },
        sourceContext: common.sourceContext,
        candidateFingerprintBefore: common.candidateFingerprint,
        candidateFingerprintAfter: common.candidateFingerprint,
        candidateFileCountBefore: common.candidateFileCount,
        candidateFileCountAfter: common.candidateFileCount,
        now: common.now,
        repository: common.repository,
      },
      { store },
    ),
    /resolution digest contradicts/,
  );

  const recomputed = structuredClone(resolution);
  recomputed.hits = ["example"];
  const { resolutionDigest: ignored, ...withoutDigest } = recomputed;
  void ignored;
  recomputed.resolutionDigest = digestJson(withoutDigest);
  await assert.rejects(
    assemble(
      {
        resolution: recomputed,
        records: {},
        candidateFingerprintBefore: common.candidateFingerprint,
        candidateFingerprintAfter: common.candidateFingerprint,
        candidateFileCountBefore: common.candidateFileCount,
        candidateFileCountAfter: common.candidateFileCount,
        repository: common.repository,
      },
      { store },
    ),
    /hit accounting contradicts/,
  );
});

test("a task with unavailable hosted identities cannot seed a reusable success", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  const resolution = await resolve({ ...common, toolchain: {} }, { store });
  assert.equal(resolution.tasks[0].cacheEligible, false);
  assert.match(resolution.tasks[0].missReason, /unavailable key inputs/);
  const recorded = await record(
    {
      resolution,
      gateId: "example",
      repository: common.repository,
      outcome: {
        status: "passed",
        durationMs: 1,
        reason: null,
        capabilityComplete: true,
        evidence: { exitCode: 0 },
        outputs: [],
      },
      sourceContext: common.sourceContext,
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
      now: common.now,
    },
    { store },
  );
  assert.equal(recorded.kind, "result");
  assert.equal(recorded.receipt.status, "passed");
  assert.equal(recorded.receipt.reusable, false);
  assert.equal(recorded.publication.indexPublished, false);
  assert.match(recorded.publication.warnings.join("\n"), /key inputs were unavailable/i);
  assert.deepEqual(store.snapshot(), []);

  for (const [label, configured, expectedReason] of [
    ["tool identity", { ...common, toolchain: { ...common.toolchain, node: null } }, /tool:node/],
    [
      "declared environment",
      withManifest(common, (manifest) => {
        manifest.gates[0].execution.environment.push("REQUIRED_GATE_MODE");
      }),
      /environment:REQUIRED_GATE_MODE/,
    ],
    [
      "hosted runner",
      { ...common, toolchain: { ...common.toolchain, runnerLabel: null } },
      /platform:runnerLabel/,
    ],
  ]) {
    const unavailableResolution = await resolve(configured, { store: createMemoryStore() });
    assert.equal(unavailableResolution.tasks[0].cacheEligible, false, label);
    assert.match(unavailableResolution.tasks[0].missReason, expectedReason, label);
  }
});

test("verified immutable publication remains assembly-eligible when index publication is unavailable", async (t) => {
  const { common } = fixture(t);
  const memory = createMemoryStore();
  const resolution = await resolve(common, { store: memory });
  const publicationRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validation-publish-outage-"));
  t.after(() => fs.rmSync(publicationRoot, { recursive: true, force: true }));
  const provisional = await recordCore(
    {
      resolution,
      gateId: "example",
      repository: common.repository,
      publicationDirectory: path.join(publicationRoot, "bundle"),
      outcome: {
        status: "passed",
        durationMs: 1,
        evidence: { exitCode: 0 },
        outputs: [],
      },
      sourceContext: common.sourceContext,
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
      now: common.now,
    },
    { store: memory },
  );
  const locator = await memory.upload(provisional);
  const unavailableIndex = {
    ...memory,
    async publish() {
      const error = new Error("cache index offline");
      error.code = "ERR_STORE_UNAVAILABLE";
      throw error;
    },
  };
  const published = await finalizePublication(
    { recorded: provisional, locator, resolution, now: common.now },
    { store: unavailableIndex },
  );
  assert.equal(published.publication.state, "published");
  assert.equal(published.publication.indexPublished, false);
  assert.match(published.publication.warnings.join("\n"), /cache index offline/);
  const assembled = await assemble(
    {
      resolution,
      records: { example: published },
      repository: common.repository,
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
    },
    { store: memory },
  );
  assert.equal(assembled.failed, false);
});

test("typed gate evidence, not a caller capability flag, determines reusable success", async (t) => {
  const { common } = fixture(t);
  const cases = [
    {
      kind: "exit-code",
      contract: {},
      valid: { exitCode: 0 },
      invalid: {},
    },
    {
      kind: "pinned-actionlint-exit-code",
      contract: {},
      tools: ["node", "actionlint"],
      toolchain: { actionlint: ACTIONLINT_IDENTITY },
      valid: {
        exitCode: 0,
        actionlintIdentity: ACTIONLINT_IDENTITY,
        executableDigest: ACTIONLINT_CONTRACT.binaryDigest,
      },
      invalid: { exitCode: 0, actionlintIdentity: "unpinned" },
    },
    {
      kind: "capability-complete-exit-code",
      contract: {
        requiredCapabilities: ["contract", "visual"],
        outputMarkers: { contract: "contract passed", visual: "visual passed" },
      },
      valid: { exitCode: 0, capabilities: { contract: true, visual: true } },
      invalid: { exitCode: 0, capabilities: {} },
    },
    {
      kind: "architecture-compass-accounting-v1",
      contract: { expectedCaseCount: 325, expectedHostedShardCount: 3 },
      valid: (task) => ({
        schemaVersion: 1,
        gateId: "example",
        status: "passed",
        taskKey: task.taskKey,
        caseCount: 325,
        hostedShardCount: 3,
        capabilityComplete: true,
        inventoryDigest: SHA_A,
        accountingDigest: SHA_B,
        evidenceDigest: SHA_A,
      }),
      invalid: { schemaVersion: 1, gateId: "example", status: "passed", caseCount: 325 },
    },
    {
      kind: "smoke-candidate-and-cli",
      contract: {},
      tools: ["node", "skills-cli"],
      environment: ["CI", "SKILLS_SMOKE_FORCE_TTY", "SKILLS_SMOKE_OVERRIDE_STATE"],
      toolchain: { "skills-cli": "skills@1.5.22" },
      ambientEnvironment: {
        SKILLS_SMOKE_FORCE_TTY: "1",
        SKILLS_SMOKE_OVERRIDE_STATE: "exact-installed-cli",
      },
      valid: {
        exitCode: 0,
        candidateFingerprint: common.candidateFingerprint,
        candidateFileCount: common.candidateFileCount,
        skillsCliIdentity: "skills@1.5.22",
        skillsCliExecutableDigest: SHA_B,
        forceTty: "1",
        overrideState: "exact-installed-cli",
      },
      invalid: {
        exitCode: 0,
        candidateFingerprint: SHA_A,
        candidateFileCount: common.candidateFileCount,
        skillsCliIdentity: "skills@1.5.22",
        skillsCliExecutableDigest: SHA_B,
        forceTty: "1",
        overrideState: "exact-installed-cli",
      },
    },
    {
      kind: "release-metadata",
      contract: {},
      gitInputs: ["eventClass", "baseCommit", "baseTree", "baseDiff", "baseReleaseMetadata"],
      logicalGitInputs: {
        eventClass: "release",
        baseCommit: SHA_A,
        baseTree: SHA_B,
        baseDiff: SHA_A,
        baseReleaseMetadata: SHA_B,
      },
      valid: {
        exitCode: 0,
        eventClass: "release",
        baseCommit: SHA_A,
        baseTree: SHA_B,
        baseDiff: SHA_A,
        baseReleaseMetadata: SHA_B,
      },
      invalid: {
        exitCode: 0,
        eventClass: "release",
        baseCommit: SHA_A,
        baseTree: SHA_B,
        baseDiff: SHA_A,
        baseReleaseMetadata: SHA_A,
      },
    },
  ];

  for (const testCase of cases) {
    const configured = withManifest(common, (manifest) => {
      manifest.gates[0].evidence = { kind: testCase.kind, ...testCase.contract };
      if (testCase.tools) manifest.gates[0].execution.tools = testCase.tools;
      if (testCase.environment) manifest.gates[0].execution.environment = testCase.environment;
      if (testCase.gitInputs) manifest.gates[0].execution.gitInputs = testCase.gitInputs;
    });
    configured.toolchain = { ...configured.toolchain, ...testCase.toolchain };
    configured.environment = { ...configured.environment, ...testCase.ambientEnvironment };
    configured.gitInputs = { ...configured.gitInputs, ...testCase.logicalGitInputs };

    const invalidStore = createMemoryStore();
    const invalid = await passTask(configured, invalidStore, {
      outcome: { capabilityComplete: true, evidence: testCase.invalid },
    });
    assert.equal(invalid.recorded.kind, "tombstone", `${testCase.kind}: invalid evidence`);
    assert.match(invalid.recorded.receipt.reason, /evidence/i);

    const validStore = createMemoryStore();
    const valid = await passTask(configured, validStore, {
      outcome: {
        capabilityComplete: false,
        ...(typeof testCase.valid === "function" ? {} : { evidence: testCase.valid }),
      },
      ...(typeof testCase.valid === "function" ? { evidenceFactory: testCase.valid } : {}),
    });
    assert.equal(
      valid.recorded.kind,
      "result",
      `${testCase.kind}: valid evidence (${valid.recorded.receipt.reason ?? "no reason"})`,
    );
    assert.equal(valid.recorded.receipt.capabilityComplete, true);
  }
});

test("assembly combines executed and reused results into report v2 task receipts", async (t) => {
  const { common } = fixture(t);
  const manifest = structuredClone(common.manifest);
  manifest.gates.push({
    ...structuredClone(manifest.gates[0]),
    id: "second",
    command: ["node", "second.mjs"],
  });
  const expanded = {
    ...common,
    manifest,
    plan: {
      ...common.plan,
      selectedGates: ["example", "second"],
      manifestDigest: digestJson(manifest),
    },
  };
  const store = createMemoryStore();
  const seeded = await resolve(expanded, { store });
  const reused = await record(
    {
      resolution: seeded,
      gateId: "example",
      repository: expanded.repository,
      outcome: {
        status: "passed",
        durationMs: 7,
        reason: null,
        capabilityComplete: true,
        evidence: { exitCode: 0 },
        outputs: [],
      },
      sourceContext: expanded.sourceContext,
      candidateFingerprintBefore: expanded.candidateFingerprint,
      candidateFingerprintAfter: expanded.candidateFingerprint,
      candidateFileCountBefore: expanded.candidateFileCount,
      candidateFileCountAfter: expanded.candidateFileCount,
      now: expanded.now,
    },
    { store },
  );
  const resolution = await resolve(
    { ...expanded, sourceContext: { ...expanded.sourceContext, runId: "110", jobId: "210" } },
    { store },
  );
  assert.deepEqual(resolution.hits, ["example"]);
  assert.deepEqual(resolution.misses, ["second"]);
  const fresh = await record(
    {
      resolution,
      gateId: "second",
      repository: expanded.repository,
      outcome: {
        status: "passed",
        durationMs: 9,
        reason: null,
        capabilityComplete: true,
        evidence: { exitCode: 0 },
        outputs: [],
      },
      sourceContext: { ...expanded.sourceContext, runId: "110", jobId: "211" },
      candidateFingerprintBefore: expanded.candidateFingerprint,
      candidateFingerprintAfter: expanded.candidateFingerprint,
      candidateFileCountBefore: expanded.candidateFileCount,
      candidateFileCountAfter: expanded.candidateFileCount,
      now: "2026-08-13T12:10:00.000Z",
    },
    { store },
  );
  const assembled = await assemble(
    {
      resolution,
      records: { second: fresh },
      repository: expanded.repository,
      candidateFingerprintBefore: expanded.candidateFingerprint,
      candidateFingerprintAfter: expanded.candidateFingerprint,
      candidateFileCountBefore: expanded.candidateFileCount,
      candidateFileCountAfter: expanded.candidateFileCount,
    },
    { store },
  );
  assert.equal(assembled.failed, false);
  assert.equal(assembled.report.schemaVersion, 2);
  assert.deepEqual(assembled.report.counts, {
    executed: 1,
    reused: 1,
    passed: 2,
    failed: 0,
    misses: 1,
    rejects: 0,
  });
  assert.deepEqual(
    assembled.report.gates.map(({ source }) => source),
    ["reused", "executed"],
  );
  assert.equal(assembled.receipt, undefined);
  assert.equal(
    assembled.acceptedTaskReceipts[0].receipt.receiptDigest,
    reused.receipt.receiptDigest,
  );
  assert.equal(assembled.report.gates[0].producerLocator.kind, "memory");
  assert.ok(Number.isSafeInteger(assembled.report.gates[0].lookupDurationMs));
  assert.equal(assembled.report.gates[0].lookupResult, "hit");
  assert.equal(assembled.report.gates[1].lookupResult, "miss");
});

test("assembly rejects duplicate and unexpected task results", async (t) => {
  const { common } = fixture(t);
  const store = createMemoryStore();
  const resolution = await resolve(common, { store });
  const recorded = await record(
    {
      resolution,
      gateId: "example",
      repository: common.repository,
      outcome: {
        status: "passed",
        durationMs: 1,
        reason: null,
        capabilityComplete: true,
        evidence: { exitCode: 0 },
        outputs: [],
      },
      sourceContext: common.sourceContext,
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
      now: common.now,
    },
    { store },
  );
  const assembly = {
    resolution,
    repository: common.repository,
    candidateFingerprintBefore: common.candidateFingerprint,
    candidateFingerprintAfter: common.candidateFingerprint,
    candidateFileCountBefore: common.candidateFileCount,
    candidateFileCountAfter: common.candidateFileCount,
  };
  await assert.rejects(
    assemble({ ...assembly, records: [recorded, recorded] }, { store }),
    /Duplicate task result/,
  );
  await assert.rejects(
    assemble({ ...assembly, records: { unexpected: recorded } }, { store }),
    /Unexpected task result/,
  );
});

test("site outputs omit local paths, are independently verified, and replace destinations only after verification", async (t) => {
  const { common, repository } = fixture(t);
  const outputSource = path.join(repository, "site", "dist");
  fs.mkdirSync(path.dirname(outputSource));
  fs.mkdirSync(outputSource);
  fs.writeFileSync(path.join(outputSource, "index.html"), "trusted site\n");
  const outputWitness = digestOutput(outputSource, "directory");
  const site = withManifest(common, (manifest) => {
    manifest.gates[0].restoreOutputs = [{ id: "site-dist", path: "site/dist", kind: "directory" }];
    manifest.gates[0].evidence = { kind: "output-tree" };
  });
  const store = createMemoryStore();
  const first = await resolve(site, { store });
  const arbitrarySource = path.join(repository, "arbitrary-output");
  fs.mkdirSync(arbitrarySource);
  fs.writeFileSync(path.join(arbitrarySource, "index.html"), "arbitrary\n");
  await assert.rejects(
    record(
      {
        resolution: first,
        gateId: "example",
        repository,
        outcome: {
          status: "passed",
          durationMs: 1,
          evidence: {
            exitCode: 0,
            outputDigests: {
              "site-dist": digestOutput(arbitrarySource, "directory").digest,
            },
          },
          outputs: [
            {
              id: "site-dist",
              kind: "directory",
              digest: digestOutput(arbitrarySource, "directory").digest,
              sourcePath: arbitrarySource,
            },
          ],
        },
        sourceContext: common.sourceContext,
        candidateFingerprintBefore: common.candidateFingerprint,
        candidateFingerprintAfter: common.candidateFingerprint,
        candidateFileCountBefore: common.candidateFileCount,
        candidateFileCountAfter: common.candidateFileCount,
        now: common.now,
      },
      { store },
    ),
    /source must equal declared repository path/,
  );
  fs.rmSync(arbitrarySource, { recursive: true });
  const recorded = await record(
    {
      resolution: first,
      gateId: "example",
      repository,
      outcome: {
        status: "passed",
        durationMs: 12,
        reason: null,
        evidence: { exitCode: 0, outputDigests: { "site-dist": outputWitness.digest } },
        outputs: [
          {
            id: "site-dist",
            kind: "directory",
            digest: outputWitness.digest,
            sourcePath: outputSource,
          },
        ],
      },
      sourceContext: common.sourceContext,
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
      now: common.now,
    },
    { store },
  );
  assert.equal(recorded.receipt.outputs[0].sourcePath, undefined);
  assert.doesNotMatch(JSON.stringify(recorded.receipt), new RegExp(outputSource));
  fs.rmSync(outputSource, { recursive: true });
  const freshAssembled = await assemble(
    {
      resolution: first,
      records: { example: recorded },
      repository,
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
    },
    { store },
  );
  assert.equal(freshAssembled.failed, false);
  assert.equal(fs.readFileSync(path.join(outputSource, "index.html"), "utf8"), "trusted site\n");

  fs.rmSync(outputSource, { recursive: true });
  fs.mkdirSync(outputSource);
  fs.writeFileSync(path.join(outputSource, "old.html"), "old\n");
  const reused = await resolve(site, { store });
  const assembled = await assemble(
    {
      resolution: reused,
      records: {},
      repository,
      candidateFingerprintBefore: common.candidateFingerprint,
      candidateFingerprintAfter: common.candidateFingerprint,
      candidateFileCountBefore: common.candidateFileCount,
      candidateFileCountAfter: common.candidateFileCount,
    },
    { store },
  );
  assert.equal(assembled.failed, false);
  assert.equal(fs.readFileSync(path.join(outputSource, "index.html"), "utf8"), "trusted site\n");
  assert.equal(fs.existsSync(path.join(outputSource, "old.html")), false);

  fs.rmSync(outputSource, { recursive: true });
  fs.mkdirSync(outputSource);
  fs.writeFileSync(path.join(outputSource, "keep.html"), "keep\n");
  const tamperingStore = {
    ...store,
    async restore({ destination: staging }) {
      fs.mkdirSync(staging);
      fs.writeFileSync(path.join(staging, "index.html"), "tampered\n");
    },
  };
  await assert.rejects(
    assemble(
      {
        resolution: reused,
        records: {},
        repository,
        candidateFingerprintBefore: common.candidateFingerprint,
        candidateFingerprintAfter: common.candidateFingerprint,
        candidateFileCountBefore: common.candidateFileCount,
        candidateFileCountAfter: common.candidateFileCount,
      },
      { store: tamperingStore },
    ),
    /digest contradicts/,
  );
  assert.equal(fs.readFileSync(path.join(outputSource, "keep.html"), "utf8"), "keep\n");

  fs.rmSync(outputSource, { recursive: true });
  fs.mkdirSync(outputSource);
  fs.writeFileSync(path.join(outputSource, "keep.html"), "keep\n");
  const escapingStore = {
    ...store,
    async restore(input) {
      await store.restore(input);
      fs.writeFileSync(path.join(repository, "input.txt"), "malicious restore mutation\n");
    },
  };
  await assert.rejects(
    assemble(
      {
        resolution: reused,
        records: {},
        repository,
        candidateFingerprintBefore: common.candidateFingerprint,
        candidateFingerprintAfter: common.candidateFingerprint,
        candidateFileCountBefore: common.candidateFileCount,
        candidateFileCountAfter: common.candidateFileCount,
      },
      { store: escapingStore },
    ),
    /candidate changed during output restoration|outside declared output/i,
  );
  fs.writeFileSync(path.join(repository, "input.txt"), "stable input\n");

  await assert.rejects(
    assemble(
      {
        resolution: reused,
        records: {},
        repository: path.dirname(repository),
        candidateFingerprintBefore: common.candidateFingerprint,
        candidateFingerprintAfter: common.candidateFingerprint,
        candidateFileCountBefore: common.candidateFileCount,
        candidateFileCountAfter: common.candidateFileCount,
      },
      { store },
    ),
    /repository root contradicts/,
  );

  fs.rmSync(outputSource, { recursive: true });
  const escapedOutput = fs.mkdtempSync(path.join(os.tmpdir(), "validation-output-escape-"));
  t.after(() => fs.rmSync(escapedOutput, { recursive: true, force: true }));
  fs.symlinkSync(escapedOutput, outputSource);
  await assert.rejects(
    assemble(
      {
        resolution: reused,
        records: {},
        repository,
        candidateFingerprintBefore: common.candidateFingerprint,
        candidateFingerprintAfter: common.candidateFingerprint,
        candidateFileCountBefore: common.candidateFileCount,
        candidateFileCountAfter: common.candidateFileCount,
      },
      { store },
    ),
    /crosses a symlink/,
  );
});

test("the checked-in manifest resolves every full-scope gate when hosted identities are complete", async () => {
  const repository = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
  const manifest = validateManifest(
    JSON.parse(
      fs.readFileSync(path.join(repository, "scripts/ci/validation-manifest.json"), "utf8"),
    ),
  );
  const selectedGates = manifest.gates.map(({ id }) => id);
  const plan = {
    schemaVersion: 1,
    scope: "full",
    reason: "manifest contract smoke",
    baseSha: "",
    candidateSha: "candidate",
    changedPaths: [],
    selectedGates,
    installProfiles: ["root", "site"],
    manifestDigest: digestJson(manifest),
    basePlanDigest: null,
    candidatePlanDigest: SHA_B,
  };
  const toolNames = [...new Set(manifest.gates.flatMap((gate) => gate.execution.tools))];
  const gitInputNames = [...new Set(manifest.gates.flatMap((gate) => gate.execution.gitInputs))];
  const resolution = await resolve(
    {
      manifest,
      plan,
      repository,
      repositoryIdentity: "stark-ai-de/agent-skills",
      mode: "off",
      environment: {
        CI: "true",
        TZ: "UTC",
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
        ARCHITECTURE_FIXTURE_WORKERS: "3",
        ARCHITECTURE_SHARD_COUNT: "3",
        ARCHITECTURE_SHARD_INDEX: "0",
        VALIDATION_EVENT: "workflow_dispatch",
        VALIDATION_BASE_SHA: "",
        SKILLS_SMOKE_FORCE_TTY: "1",
        SKILLS_SMOKE_OVERRIDE_STATE: "exact-installed-cli",
      },
      toolchain: Object.fromEntries([
        ...toolNames.map((name) => [name, `${name}@fixture`]),
        ["runnerLabel", "ubuntu-24.04"],
        ["imageOS", "ubuntu24"],
        ["imageVersion", "20260801.1"],
      ]),
      gitInputs: Object.fromEntries(gitInputNames.map((name) => [name, SHA_A])),
      controlPlaneDigest: SHA_A,
      candidateFingerprint: SHA_B,
      candidateFileCount: 1,
      sourceContext: {
        repository: "stark-ai-de/agent-skills",
        workflowPath: ".github/workflows/validate.yml",
        workflowDigest: SHA_A,
        controlPlaneDigest: SHA_A,
        runId: "1",
        runAttempt: "1",
        jobId: "1",
        jobName: "resolve",
        jobConclusion: "success",
        artifactName: "validation-resolution-v1-1-1",
        event: "workflow_dispatch",
        ref: "refs/heads/example",
        sha: "candidate",
      },
      now: "2026-08-13T12:00:00.000Z",
    },
    { store: createMemoryStore() },
  );
  assert.equal(resolution.tasks.length, 15);
  assert.deepEqual(resolution.misses, selectedGates);
  assert.deepEqual(
    resolution.tasks.filter(({ cacheEligible }) => !cacheEligible),
    [],
    "every checked-in execution input is present or explicitly allowEmpty",
  );
  assert.deepEqual(
    [...new Set(resolution.tasks.flatMap(({ installProfiles }) => installProfiles))].sort(),
    ["root", "site"],
  );
  assert.deepEqual(resolution.executionGroups.architectureCompass.gateId, "architecture-compass");
  assert.deepEqual(resolution.executionGroups.smokeInstall.prerequisiteKeys, [
    resolution.tasks[0].taskKey,
  ]);
});
