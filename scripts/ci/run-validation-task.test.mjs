import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";
import { digestJson, writeJsonAtomic } from "./validation-contract.mjs";
import {
  createMemoryStore,
  finalizePublication,
  record,
  resolve,
} from "./validation-task-graph.mjs";
import {
  createExecutionRuntime,
  executeValidationTask,
  executionPathDigest,
  observeSystemToolIdentity,
  systemToolPolicyIdentity,
} from "./run-validation-task.mjs";

const SHA_A = `sha256:${"a".repeat(64)}`;
const SHA_B = `sha256:${"b".repeat(64)}`;
const PATH_DIGEST = executionPathDigest(process.env.PATH);

test("system shell and archive identities bind exact executable bytes", () => {
  for (const tool of ["bash", "env", "git", "python3", "script", "sh", "mkfifo", "sleep", "tar"]) {
    const identity = observeSystemToolIdentity(tool, process.cwd());
    assert.match(identity, new RegExp(`^${tool}:.+@sha256:[a-f0-9]{64}(?:\\+.+)?$`));
  }
});

function git(repository, arguments_) {
  const result = spawnSync("git", arguments_, { cwd: repository, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

function gate(id, command, overrides = {}) {
  return {
    id,
    command,
    selection: { paths: ["input.txt"], deriveFromExecutionInputs: true },
    execution: {
      entrypoints: ["gate.mjs"],
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
    timeoutMs: 2_000,
    prerequisites: [],
    aggregate: true,
    trustedProofRequired: true,
    ...overrides,
  };
}

async function fixture(t, gates = null) {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), "validation-task-runner-repo-"));
  const transport = fs.mkdtempSync(path.join(os.tmpdir(), "validation-task-runner-transport-"));
  t.after(() => fs.rmSync(repository, { recursive: true, force: true }));
  t.after(() => fs.rmSync(transport, { recursive: true, force: true }));
  const actionlintBytes = Buffer.from("#!/bin/sh\nprintf '1.7.12\\n'\n");
  const actionlintBinary = path.join(transport, "actionlint");
  fs.writeFileSync(actionlintBinary, actionlintBytes, { mode: 0o700 });
  const actionlintIdentity = `actionlint@1.7.12+sha256:${crypto
    .createHash("sha256")
    .update(actionlintBytes)
    .digest("hex")}`;
  fs.writeFileSync(path.join(repository, "AGENTS.md"), "stable policy\n");
  fs.writeFileSync(path.join(repository, "input.txt"), "stable input\n");
  fs.writeFileSync(
    path.join(repository, "gate.mjs"),
    [
      "if (process.env.VALIDATION_HIDDEN_SECRET) process.exit(20);",
      "if (!process.env.HOME || !process.env.TMPDIR) process.exit(21);",
      'if (process.env.MUTATE_CANDIDATE === "1")',
      '  (await import("node:fs")).writeFileSync("input.txt", "mutated\\n");',
    ].join("\n") + "\n",
  );
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "validation@example.invalid"]);
  git(repository, ["config", "user.name", "Validation Test"]);
  git(repository, ["add", "."]);
  git(repository, ["commit", "--quiet", "-m", "fixture"]);

  const selectedGates = gates ?? [gate("example", [process.execPath, "gate.mjs"])];
  const manifest = {
    schemaVersion: 2,
    taskKeySchemaVersion: 1,
    packageProfiles: {},
    globalInvalidators: ["AGENTS.md"],
    knownPaths: ["**"],
    gates: selectedGates,
  };
  const candidate = fingerprintGitCandidateRepository(repository);
  const plan = {
    schemaVersion: 1,
    scope: "full",
    reason: "test",
    baseSha: "",
    candidateSha: "candidate",
    changedPaths: [],
    selectedGates: selectedGates.map(({ id }) => id),
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
  const common = {
    manifest,
    plan,
    repository,
    repositoryIdentity: sourceContext.repository,
    mode: "off",
    environment: {
      CI: "true",
      MUTATE_CANDIDATE: "1",
      SKILLS_SMOKE_FORCE_TTY: "1",
      SKILLS_SMOKE_OVERRIDE_STATE: "exact-installed-cli",
    },
    toolchain: {
      node: `node@${process.versions.node}`,
      actionlint: actionlintIdentity,
      "skills-cli": "skills@1.5.22",
      pathDigest: PATH_DIGEST,
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
  const resolution = await resolve(common, { store: createMemoryStore() });
  if (selectedGates.some(({ execution }) => execution.tools.includes("skills-cli"))) {
    const skillsPackage = path.join(repository, "node_modules", "skills");
    const binaryDirectory = path.join(repository, "node_modules", ".bin");
    fs.mkdirSync(skillsPackage, { recursive: true });
    fs.mkdirSync(binaryDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(skillsPackage, "package.json"),
      JSON.stringify({ name: "skills", version: "1.5.22" }),
    );
    fs.writeFileSync(
      path.join(binaryDirectory, "skills"),
      "#!/bin/sh\nprintf 'skills 1.5.22\\n'\n",
      { mode: 0o700 },
    );
  }
  const boundaryFile = path.join(transport, "before.json");
  const runtimeFile = path.join(transport, "runtime.json");
  const outcomeFile = path.join(transport, "outcome.json");
  writeJsonAtomic(boundaryFile, {
    schemaVersion: 1,
    candidateFingerprint: common.candidateFingerprint,
    candidateFileCount: common.candidateFileCount,
  });
  writeJsonAtomic(
    runtimeFile,
    createExecutionRuntime({
      resolution,
      gateId: selectedGates[0].id,
      repository,
      environment: {
        ...process.env,
        ACTIONLINT: actionlintBinary,
        ImageOS: common.toolchain.imageOS,
        ImageVersion: common.toolchain.imageVersion,
      },
    }),
  );
  return {
    boundaryFile,
    actionlintBinary,
    actionlintBytes,
    actionlintIdentity,
    common,
    manifest,
    outcomeFile,
    repository,
    resolution,
    runtimeFile,
    transport,
  };
}

test("executes exactly one resolved miss with a sanitized task-owned environment", async (t) => {
  const fixture_ = await fixture(t);
  process.env.VALIDATION_HIDDEN_SECRET = "must-not-reach-the-gate";
  t.after(() => delete process.env.VALIDATION_HIDDEN_SECRET);

  const result = await executeValidationTask({
    resolution: fixture_.resolution,
    gateId: "example",
    repository: fixture_.repository,
    outcomeFile: fixture_.outcomeFile,
    runtime: JSON.parse(fs.readFileSync(fixture_.runtimeFile, "utf8")),
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
  });

  assert.equal(result.failed, false);
  assert.equal(result.envelope.outcome.status, "passed");
  assert.deepEqual(result.envelope.outcome.evidence, { exitCode: 0 });
  assert.equal(result.envelope.taskKey, fixture_.resolution.tasks[0].taskKey);
  assert.equal(result.envelope.resolutionDigest, fixture_.resolution.resolutionDigest);
  assert.deepEqual(JSON.parse(fs.readFileSync(fixture_.outcomeFile, "utf8")), result.envelope);
  assert.equal(Object.hasOwn(result.envelope, "sourceContext"), false);

  await assert.rejects(
    executeValidationTask({
      resolution: fixture_.resolution,
      gateId: "example",
      repository: fixture_.repository,
      outcomeFile: path.join(fixture_.transport, "wrong-path-outcome.json"),
      runtime: {
        ...JSON.parse(fs.readFileSync(fixture_.runtimeFile, "utf8")),
        path: `${process.env.PATH}${path.delimiter}/unverified`,
      },
      beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
    }),
    /search path/i,
  );
});

test("post-install PATH changes are runtime-witnessed without changing task-key identity", async (t) => {
  const fixture_ = await fixture(t);
  const taskKey = fixture_.resolution.tasks[0].taskKey;
  const postInstallBin = fs.mkdtempSync(path.join(fixture_.transport, "post-install-bin-"));
  const changedPath = `${postInstallBin}${path.delimiter}${process.env.PATH}`;
  const runtime = createExecutionRuntime({
    resolution: fixture_.resolution,
    gateId: "example",
    repository: fixture_.repository,
    environment: {
      ...process.env,
      PATH: changedPath,
      ImageOS: fixture_.common.toolchain.imageOS,
      ImageVersion: fixture_.common.toolchain.imageVersion,
    },
  });

  assert.equal(runtime.path, changedPath);
  assert.equal(runtime.pathDigest, executionPathDigest(changedPath));
  assert.equal(fixture_.resolution.tasks[0].taskKey, taskKey);
  const result = await executeValidationTask({
    resolution: fixture_.resolution,
    gateId: "example",
    repository: fixture_.repository,
    outcomeFile: fixture_.outcomeFile,
    runtime,
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
  });
  assert.equal(result.failed, false);
});

test("hosted image and system-tool drift are observed without changing the runner-policy key", async (t) => {
  const gates = [
    gate("example", [process.execPath, "gate.mjs"], {
      execution: {
        ...gate("unused", []).execution,
        entrypoints: ["gate.mjs"],
        workspaceInputs: ["input.txt"],
        tools: ["node", "sh"],
      },
    }),
  ];
  const fixture_ = await fixture(t, gates);
  fixture_.common.toolchain.sh = systemToolPolicyIdentity("sh");
  fixture_.resolution = await resolve(fixture_.common, { store: createMemoryStore() });
  const runtime = createExecutionRuntime({
    resolution: fixture_.resolution,
    gateId: "example",
    repository: fixture_.repository,
    environment: {
      ...process.env,
      ImageOS: "ubuntu24",
      ImageVersion: "20260808.1",
    },
  });

  assert.equal(fixture_.resolution.tasks[0].keyMaterial.toolchain.tools.sh, "sh@ubuntu-24.04");
  assert.match(runtime.observedTools.sh, /^sh:.+@sha256:[a-f0-9]{64}/);
  assert.equal(runtime.platform.imageVersion, "20260808.1");
  const result = await executeValidationTask({
    resolution: fixture_.resolution,
    gateId: "example",
    repository: fixture_.repository,
    outcomeFile: fixture_.outcomeFile,
    runtime,
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
  });
  assert.equal(result.failed, false);
});

test("cache-ineligible misses still execute fresh and remain non-reusable", async (t) => {
  const fixture_ = await fixture(t);
  const resolution = await resolve(
    { ...fixture_.common, toolchain: { ...fixture_.common.toolchain, node: null } },
    { store: createMemoryStore() },
  );
  assert.equal(resolution.tasks[0].cacheEligible, false);
  const result = await executeValidationTask({
    resolution,
    gateId: "example",
    repository: fixture_.repository,
    outcomeFile: fixture_.outcomeFile,
    runtime: createExecutionRuntime({
      resolution,
      gateId: "example",
      repository: fixture_.repository,
      environment: {
        ...process.env,
        ImageOS: fixture_.common.toolchain.imageOS,
        ImageVersion: fixture_.common.toolchain.imageVersion,
      },
    }),
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
  });
  assert.equal(result.failed, false);
  assert.equal(result.envelope.outcome.status, "passed");
});

test("rejects hits, unknown gates, and unsatisfied prerequisite outcomes", async (t) => {
  const gates = [
    gate("foundation", [process.execPath, "gate.mjs"]),
    gate("dependent", [process.execPath, "gate.mjs"], { prerequisites: ["foundation"] }),
  ];
  const fixture_ = await fixture(t, gates);
  const options = {
    resolution: fixture_.resolution,
    repository: fixture_.repository,
    outcomeFile: fixture_.outcomeFile,
    runtime: JSON.parse(fs.readFileSync(fixture_.runtimeFile, "utf8")),
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
  };
  await assert.rejects(
    executeValidationTask({ ...options, gateId: "not-selected" }),
    /not in the task resolution/,
  );
  await assert.rejects(
    executeValidationTask({ ...options, gateId: "dependent" }),
    /prerequisite foundation.*not proven/i,
  );

  const foundationFile = path.join(fixture_.transport, "foundation.json");
  const foundation = await executeValidationTask({
    ...options,
    gateId: "foundation",
    outcomeFile: foundationFile,
  });
  const dependent = await executeValidationTask({
    ...options,
    gateId: "dependent",
    prerequisiteOutcomes: [foundation.envelope],
  });
  assert.equal(dependent.failed, false);

  const store = createMemoryStore();
  const reusableMiss = await resolve(fixture_.common, { store });
  const publicationDirectory = path.join(fixture_.transport, "foundation-publication");
  const provisional = await record(
    {
      resolution: reusableMiss,
      gateId: "foundation",
      repository: fixture_.repository,
      publicationDirectory,
      outcome: foundation.envelope.outcome,
      sourceContext: fixture_.common.sourceContext,
      candidateFingerprintBefore: fixture_.common.candidateFingerprint,
      candidateFingerprintAfter: fixture_.common.candidateFingerprint,
      candidateFileCountBefore: fixture_.common.candidateFileCount,
      candidateFileCountAfter: fixture_.common.candidateFileCount,
      now: fixture_.common.now,
    },
    { store },
  );
  const locator = await store.upload(provisional);
  await finalizePublication(
    { recorded: provisional, locator, resolution: reusableMiss, now: fixture_.common.now },
    { store },
  );
  const reusedResolution = await resolve(
    { ...fixture_.common, mode: "auto", now: "2026-08-13T12:01:00.000Z" },
    { store },
  );
  await assert.rejects(
    executeValidationTask({ ...options, resolution: reusedResolution, gateId: "foundation" }),
    /already reused/,
  );
});

test("candidate mutation is emitted as a failed record-ready outcome", async (t) => {
  const mutating = gate("example", [process.execPath, "gate.mjs"], {
    execution: {
      entrypoints: ["gate.mjs"],
      helpers: [],
      workspaceInputs: ["input.txt"],
      packageProfiles: [],
      tools: ["node"],
      environment: ["CI", "MUTATE_CANDIDATE"],
      gitInputs: [],
    },
  });
  const fixture_ = await fixture(t, [mutating]);
  const result = await executeValidationTask({
    resolution: fixture_.resolution,
    gateId: "example",
    repository: fixture_.repository,
    outcomeFile: fixture_.outcomeFile,
    runtime: JSON.parse(fs.readFileSync(fixture_.runtimeFile, "utf8")),
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
  });
  assert.equal(result.failed, true);
  assert.equal(result.envelope.outcome.status, "failed");
  assert.match(result.envelope.outcome.reason, /candidate changed/i);
  assert.notEqual(
    result.envelope.candidateFingerprintAfter,
    result.envelope.candidateFingerprintBefore,
  );
});

test("witnesses declared outputs and derives output-tree evidence", async (t) => {
  const outputGate = gate(
    "site-build",
    [
      process.execPath,
      "-e",
      'const fs=require("node:fs"); fs.mkdirSync("site/dist",{recursive:true}); fs.writeFileSync("site/dist/index.html","ok\\n")',
    ],
    {
      evidence: { kind: "output-tree" },
      restoreOutputs: [{ id: "site-dist", kind: "directory", path: "site/dist" }],
    },
  );
  const fixture_ = await fixture(t, [outputGate]);
  const result = await executeValidationTask({
    resolution: fixture_.resolution,
    gateId: "site-build",
    repository: fixture_.repository,
    outcomeFile: fixture_.outcomeFile,
    runtime: JSON.parse(fs.readFileSync(fixture_.runtimeFile, "utf8")),
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
  });
  assert.equal(result.failed, false);
  assert.equal(
    result.envelope.outcome.outputs[0].sourcePath,
    path.join(fixture_.repository, "site/dist"),
  );
  assert.equal(
    result.envelope.outcome.evidence.outputDigests["site-dist"],
    result.envelope.outcome.outputs[0].digest,
  );
});

test("architecture evidence-only mode validates the hosted aggregate without rerunning fixtures", async (t) => {
  const architectureGate = gate("architecture-compass", ["must-not-execute"], {
    evidence: {
      kind: "architecture-compass-accounting-v1",
      expectedCaseCount: 325,
      expectedHostedShardCount: 3,
    },
  });
  const fixture_ = await fixture(t, [architectureGate]);
  const task = fixture_.resolution.tasks[0];
  const evidence = {
    schemaVersion: 1,
    gateId: "architecture-compass",
    status: "passed",
    taskKey: task.taskKey,
    inventoryDigest: SHA_A,
    accountingDigest: SHA_B,
    evidenceDigest: `sha256:${"c".repeat(64)}`,
    caseCount: 325,
    hostedShardCount: 3,
    capabilityComplete: true,
  };
  const result = await executeValidationTask({
    resolution: fixture_.resolution,
    gateId: "architecture-compass",
    repository: fixture_.repository,
    outcomeFile: fixture_.outcomeFile,
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
    evidenceOnly: { durationMs: 1234, evidence },
  });
  assert.equal(result.failed, false);
  assert.deepEqual(result.envelope.outcome.evidence, evidence);
  await assert.rejects(
    executeValidationTask({
      resolution: fixture_.resolution,
      gateId: "architecture-compass",
      repository: fixture_.repository,
      outcomeFile: path.join(fixture_.transport, "nested-aggregate.json"),
      beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
      evidenceOnly: { durationMs: 1234, evidence: { gateEvidence: evidence } },
    }),
    /Architecture Compass evidence fields are invalid/i,
  );
});

test("pinned actionlint evidence comes from the exact installed executable", async (t) => {
  const actionlintGate = gate(
    "actions",
    [
      process.execPath,
      "-e",
      'if (!process.env.ACTIONLINT || process.env.ACTIONLINT.includes("node_modules")) process.exit(31)',
    ],
    {
      execution: {
        entrypoints: ["gate.mjs"],
        helpers: [],
        workspaceInputs: ["input.txt"],
        packageProfiles: [],
        tools: ["actionlint", "node"],
        environment: ["CI"],
        gitInputs: [],
      },
      evidence: { kind: "pinned-actionlint-exit-code" },
    },
  );
  const fixture_ = await fixture(t, [actionlintGate]);

  const result = await executeValidationTask({
    resolution: fixture_.resolution,
    gateId: "actions",
    repository: fixture_.repository,
    outcomeFile: fixture_.outcomeFile,
    runtime: createExecutionRuntime({
      resolution: fixture_.resolution,
      gateId: "actions",
      repository: fixture_.repository,
      environment: {
        ...process.env,
        ACTIONLINT: fixture_.actionlintBinary,
        ImageOS: fixture_.common.toolchain.imageOS,
        ImageVersion: fixture_.common.toolchain.imageVersion,
      },
    }),
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
  });
  assert.equal(result.failed, false);
  assert.deepEqual(result.envelope.outcome.evidence, {
    exitCode: 0,
    actionlintIdentity: fixture_.actionlintIdentity,
    executableDigest: fixture_.actionlintIdentity.split("+")[1],
  });

  fs.appendFileSync(fixture_.actionlintBinary, "# tampered\n");
  assert.throws(
    () =>
      createExecutionRuntime({
        resolution: fixture_.resolution,
        gateId: "actions",
        repository: fixture_.repository,
        environment: {
          ...process.env,
          ACTIONLINT: fixture_.actionlintBinary,
          ImageOS: fixture_.common.toolchain.imageOS,
          ImageVersion: fixture_.common.toolchain.imageVersion,
        },
      }),
    /binary digest/i,
  );
  fs.writeFileSync(fixture_.actionlintBinary, fixture_.actionlintBytes, { mode: 0o700 });
  const cacheIneligibleResolution = await resolve(
    {
      ...fixture_.common,
      toolchain: { ...fixture_.common.toolchain, actionlint: null },
    },
    { store: createMemoryStore() },
  );
  assert.equal(cacheIneligibleResolution.tasks[0].cacheEligible, false);
  const cacheIneligible = await executeValidationTask({
    resolution: cacheIneligibleResolution,
    gateId: "actions",
    repository: fixture_.repository,
    outcomeFile: path.join(fixture_.transport, "actionlint-cache-ineligible.json"),
    runtime: createExecutionRuntime({
      resolution: cacheIneligibleResolution,
      gateId: "actions",
      repository: fixture_.repository,
      environment: {
        ...process.env,
        ACTIONLINT: fixture_.actionlintBinary,
        ImageOS: fixture_.common.toolchain.imageOS,
        ImageVersion: fixture_.common.toolchain.imageVersion,
      },
    }),
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
  });
  assert.equal(cacheIneligible.failed, false);
  assert.equal(
    cacheIneligible.envelope.outcome.evidence.actionlintIdentity,
    fixture_.actionlintIdentity,
  );
});

test("smoke execution verifies the exact CLI identity before running the gate", async (t) => {
  const marker = path.join(os.tmpdir(), `validation-smoke-marker-${process.pid}-${Date.now()}`);
  t.after(() => fs.rmSync(marker, { force: true }));
  const smokeGate = gate(
    "smoke-install",
    [process.execPath, "-e", `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran")`],
    {
      execution: {
        entrypoints: ["gate.mjs"],
        helpers: [],
        workspaceInputs: ["input.txt"],
        packageProfiles: [],
        tools: ["node", "skills-cli"],
        environment: ["CI", "SKILLS_SMOKE_FORCE_TTY", "SKILLS_SMOKE_OVERRIDE_STATE"],
        gitInputs: [],
      },
      evidence: { kind: "smoke-candidate-and-cli" },
    },
  );
  const fixture_ = await fixture(t, [smokeGate]);
  const binaryDirectory = path.join(fixture_.repository, "node_modules", ".bin");
  fs.mkdirSync(binaryDirectory, { recursive: true });
  const fakeCli = path.join(binaryDirectory, "skills");
  fs.writeFileSync(fakeCli, "#!/bin/sh\nprintf 'skills 9.9.9\\n'\n", { mode: 0o700 });
  const runtime = JSON.parse(fs.readFileSync(fixture_.runtimeFile, "utf8"));
  const result = await executeValidationTask({
    resolution: fixture_.resolution,
    gateId: "smoke-install",
    repository: fixture_.repository,
    outcomeFile: fixture_.outcomeFile,
    runtime,
    beforeFingerprint: JSON.parse(fs.readFileSync(fixture_.boundaryFile, "utf8")),
  });
  assert.equal(result.failed, true);
  assert.match(result.envelope.outcome.reason, /skills CLI.*version/i);
  assert.equal(fs.existsSync(marker), false);
});
