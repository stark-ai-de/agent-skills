import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  architectureAccountingDigest,
  createHostedShardPlan,
} from "../validation/architecture-compass/hosted-shards.mjs";
import { hashBaselineCapsule } from "../validation/architecture-compass/fixture-capsule.mjs";
import { runArchitectureGate } from "./run-architecture-compass-gate.mjs";

const gateProgram = fileURLToPath(new URL("./run-architecture-compass-gate.mjs", import.meta.url));
const repositoryRoot = path.resolve(path.dirname(gateProgram), "..", "..");
const preflightEvidence = Object.freeze({
  schemaVersion: 1,
  parserContract: "passed",
  fixtureSetupContract: "passed",
  baselineValidation: "passed",
});
const planFixtureDirectories = Object.freeze([
  "skills/engineering-workflows/architecture-compass",
  "skill-evals/architecture-compass",
  "docs/adrs",
]);
const planFixtureFiles = Object.freeze([
  "scripts/validation/architecture-compass/decision-lock.tsv",
  "scripts/validation/architecture-compass/decision-lineage.json",
  "scripts/validation/architecture-compass/legacy-reference-source-lock.json",
  "scripts/validation/architecture-compass/legacy-reference-coverage.json",
  "scripts/validation/architecture-compass/test-validator-case-inventory.json",
]);

function createPlanFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-plan-candidate-"));
  for (const relative of planFixtureDirectories) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.cpSync(path.join(repositoryRoot, relative), path.join(root, relative), { recursive: true });
  }
  for (const relative of planFixtureFiles) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, relative), path.join(root, relative));
  }
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function waitForChild(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

function gateFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-gate-lifecycle-"));
  const validationDirectory = path.join(root, "scripts", "validation", "architecture-compass");
  fs.mkdirSync(validationDirectory, { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, validationDirectory };
}

test("Architecture Compass gate runs successful commands in order", async (t) => {
  const { root, validationDirectory } = gateFixture(t);
  const executionLog = path.join(root, "execution.log");
  fs.writeFileSync(
    path.join(root, "scripts", "validate-architecture-compass.mjs"),
    `import fs from "node:fs";\nfs.appendFileSync(${JSON.stringify(executionLog)}, "validator\\n");\n`,
  );
  fs.writeFileSync(
    path.join(validationDirectory, "test-validator.mjs"),
    `import fs from "node:fs";\nfs.appendFileSync(${JSON.stringify(executionLog)}, "fixtures\\n");\n`,
  );

  const child = spawn(process.execPath, [gateProgram], {
    cwd: root,
    env: process.env,
    stdio: "ignore",
  });
  const result = await waitForChild(child);

  assert.equal(result.code, 0);
  assert.equal(result.signal, null);
  assert.equal(fs.readFileSync(executionLog, "utf8"), "validator\nfixtures\n");
});

test("Architecture Compass local rollback forces one worker and ordinary copies", async (t) => {
  const { root, validationDirectory } = gateFixture(t);
  const environmentLog = path.join(root, "environment.log");
  fs.writeFileSync(path.join(root, "scripts", "validate-architecture-compass.mjs"), "");
  fs.writeFileSync(
    path.join(validationDirectory, "test-validator.mjs"),
    `import fs from "node:fs";\nfs.writeFileSync(${JSON.stringify(environmentLog)}, process.env.ARCHITECTURE_FIXTURE_WORKERS + ":" + process.env.ARCHITECTURE_FIXTURE_FORCE_COPY);\n`,
  );

  const child = spawn(process.execPath, [gateProgram, "local", "--force-ordinary-copy"], {
    cwd: root,
    env: process.env,
    stdio: "ignore",
  });
  const result = await waitForChild(child);

  assert.equal(result.code, 0);
  assert.equal(fs.readFileSync(environmentLog, "utf8"), "1:1");
});

test("Architecture Compass gate plan writes a deterministic three-shard plan", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-hosted-plan-"));
  const planFile = path.join(root, "plan.json");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const taskKey = `sha256:${"a".repeat(64)}`;

  const child = spawn(
    process.execPath,
    [gateProgram, "plan", "--task-key", taskKey, "--plan-file", planFile],
    { cwd: path.resolve(path.dirname(gateProgram), "..", ".."), env: process.env, stdio: "ignore" },
  );
  const result = await waitForChild(child);

  assert.equal(result.code, 0);
  assert.equal(result.signal, null);
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  assert.equal(plan.taskKey, taskKey);
  assert.deepEqual(plan.preflightEvidence, preflightEvidence);
  assert.match(plan.preflightEvidenceDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(plan.taskDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(plan.hostedShardCount, 3);
  assert.deepEqual(
    plan.shards.map(({ caseOrdinals }) => caseOrdinals.length),
    [109, 108, 108],
  );
});

test("Architecture Compass gate plan runs its injected shared preflight exactly once", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-hosted-preflight-"));
  const planFile = path.join(root, "plan.json");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let calls = 0;

  await runArchitectureGate(
    ["plan", "--task-key", `sha256:${"a".repeat(64)}`, "--plan-file", planFile],
    repositoryRoot,
    {
      async sharedPreflight(preflightRoot) {
        calls += 1;
        assert.notEqual(preflightRoot, repositoryRoot);
        assert.equal(fs.statSync(preflightRoot).mode & 0o777, 0o555);
        return preflightEvidence;
      },
    },
  );

  assert.equal(calls, 1);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(planFile, "utf8")).preflightEvidence,
    preflightEvidence,
  );
});

test("Architecture Compass gate plan clears undeclared legacy steering before preflight", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-hosted-sanitized-preflight-"));
  const planFile = path.join(root, "plan.json");
  const names = [
    "LEGACY_LINEAGE_TEST_ROOT",
    "LEGACY_LINEAGE_ARCHITECTURE_VALIDATOR",
    "LEGACY_LINEAGE_GUARD_ROOT",
  ];
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  for (const name of names) process.env[name] = path.join(root, `poisoned-${name}`);
  t.after(() => {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    fs.rmSync(root, { recursive: true, force: true });
  });

  await runArchitectureGate(
    ["plan", "--task-key", `sha256:${"a".repeat(64)}`, "--plan-file", planFile],
    repositoryRoot,
    {
      async sharedPreflight() {
        for (const name of names) assert.equal(process.env[name], undefined, name);
        return preflightEvidence;
      },
    },
  );

  assert.equal(JSON.parse(fs.readFileSync(planFile, "utf8")).hostedShardCount, 3);
  for (const name of names) assert.match(process.env[name], /poisoned-/);
});

test("Architecture Compass gate binds preflight evidence to the exact sealed baseline bytes", async (t) => {
  const root = createPlanFixture(t);
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-plan-output-"));
  const planFile = path.join(outputRoot, "plan.json");
  t.after(() => fs.rmSync(outputRoot, { recursive: true, force: true }));
  const liveTarget = path.join(root, "skills/engineering-workflows/architecture-compass/SKILL.md");
  const original = fs.readFileSync(liveTarget, "utf8");
  let preflightDigest = null;
  let preflightRoot = null;

  await runArchitectureGate(
    [
      "plan",
      "--task-key",
      `sha256:${"a".repeat(64)}`,
      "--plan-file",
      planFile,
      "--temporary-parent",
      outputRoot,
    ],
    root,
    {
      async sharedPreflight(sealedRoot) {
        preflightRoot = sealedRoot;
        preflightDigest = hashBaselineCapsule(sealedRoot);
        assert.equal(
          fs.readFileSync(
            path.join(sealedRoot, "skills/engineering-workflows/architecture-compass/SKILL.md"),
            "utf8",
          ),
          original,
        );
        fs.appendFileSync(liveTarget, "\nmutation after baseline capture\n");
        assert.equal(hashBaselineCapsule(sealedRoot), preflightDigest);
        return preflightEvidence;
      },
    },
  );

  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  assert.notEqual(preflightRoot, root);
  assert.equal(plan.baselineDigest, preflightDigest);
  assert.equal(fs.existsSync(preflightRoot), false);
  assert.notEqual(fs.readFileSync(liveTarget, "utf8"), original);
});

test("Architecture Compass gate aggregate consumes exactly three report files", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-hosted-aggregate-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const inventory = JSON.parse(
    fs.readFileSync(
      path.join(
        repositoryRoot,
        "scripts/validation/architecture-compass/test-validator-case-inventory.json",
      ),
      "utf8",
    ),
  );
  const taskKey = `sha256:${"a".repeat(64)}`;
  const baselineDigest = `sha256:${"b".repeat(64)}`;
  const plan = createHostedShardPlan({
    inventory,
    taskKey,
    baselineDigest,
    preflightEvidence,
  });
  const planFile = path.join(root, "plan.json");
  const aggregateFile = path.join(root, "aggregate.json");
  fs.writeFileSync(planFile, JSON.stringify(plan));
  const reportFiles = plan.shards.map((shard) => {
    const results = shard.caseOrdinals.map((ordinal) => ({
      id: inventory.cases[ordinal].id,
      ordinal,
      expectedOutcome: inventory.cases[ordinal].expectedOutcome,
      status: "passed",
      skipBucket: null,
      reason: null,
      durationMs: ordinal,
      phaseTelemetry: {
        materializeMs: 0,
        mutateMs: 0,
        validateMs: ordinal,
        cleanupMs: 0,
      },
    }));
    const report = {
      schemaVersion: 1,
      hostedShardIndex: shard.hostedShardIndex,
      hostedShardCount: 3,
      taskKey,
      taskDigest: plan.taskDigest,
      inventoryDigest: plan.inventoryDigest,
      preflightEvidenceDigest: plan.preflightEvidenceDigest,
      baselineDigest,
      capsuleBeforeDigest: baselineDigest,
      capsuleAfterDigest: baselineDigest,
      localWorkerCount: 3,
      preflight: "passed",
      materializationStrategy: "clone",
      accountingDigest: architectureAccountingDigest(results),
      results,
      phaseTelemetry: { startupMs: 1, mergeMs: 2 },
    };
    const reportFile = path.join(root, `shard-${shard.hostedShardIndex}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report));
    return reportFile;
  });

  const child = spawn(
    process.execPath,
    [
      gateProgram,
      "aggregate",
      "--plan-file",
      planFile,
      ...reportFiles.flatMap((reportFile) => ["--shard-report", reportFile]),
      "--report-file",
      aggregateFile,
    ],
    { cwd: repositoryRoot, env: process.env, stdio: "ignore" },
  );
  const result = await waitForChild(child);

  assert.equal(result.code, 0);
  const gateEvidence = JSON.parse(fs.readFileSync(aggregateFile, "utf8"));
  assert.deepEqual(Object.keys(gateEvidence).sort(), [
    "accountingDigest",
    "capabilityComplete",
    "caseCount",
    "evidenceDigest",
    "gateId",
    "hostedShardCount",
    "inventoryDigest",
    "schemaVersion",
    "status",
    "taskKey",
  ]);
  assert.equal(gateEvidence.gateId, "architecture-compass");
  assert.equal(gateEvidence.caseCount, 325);
  assert.equal(gateEvidence.hostedShardCount, 3);
  assert.equal(gateEvidence.capabilityComplete, true);
});

test("Architecture Compass gate shard forwards every plan binding without running cases", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-hosted-shard-plumbing-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const inventory = JSON.parse(
    fs.readFileSync(
      path.join(
        repositoryRoot,
        "scripts/validation/architecture-compass/test-validator-case-inventory.json",
      ),
      "utf8",
    ),
  );
  const plan = createHostedShardPlan({
    inventory,
    taskKey: `sha256:${"a".repeat(64)}`,
    baselineDigest: `sha256:${"b".repeat(64)}`,
    preflightEvidence,
  });
  const planFile = path.join(root, "plan.json");
  const reportFile = path.join(root, "report.json");
  fs.writeFileSync(planFile, JSON.stringify(plan));
  let received = null;

  await runArchitectureGate(
    [
      "shard",
      "--plan-file",
      planFile,
      "--shard-index",
      "2",
      "--report-file",
      reportFile,
      "--workers",
      "1",
    ],
    repositoryRoot,
    {
      async coordinatorRunner(options) {
        received = options;
      },
    },
  );

  assert.equal(received.hostedShardIndex, 2);
  assert.equal(received.hostedShardCount, 3);
  assert.equal(received.taskKey, plan.taskKey);
  assert.equal(received.taskDigest, plan.taskDigest);
  assert.equal(received.expectedPreflightEvidenceDigest, plan.preflightEvidenceDigest);
  assert.equal(received.expectedBaselineDigest, plan.baselineDigest);
});

test("Architecture Compass gate shard rejects a contradictory plan before case execution", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-hosted-shard-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const planFile = path.join(root, "plan.json");
  const reportFile = path.join(root, "must-not-exist.json");
  fs.writeFileSync(
    planFile,
    JSON.stringify({
      schemaVersion: 1,
      taskKey: `sha256:${"a".repeat(64)}`,
      baselineDigest: `sha256:${"b".repeat(64)}`,
      inventoryDigest: `sha256:${"c".repeat(64)}`,
      hostedShardCount: 3,
      shards: [],
    }),
  );

  const child = spawn(
    process.execPath,
    [
      gateProgram,
      "shard",
      "--plan-file",
      planFile,
      "--shard-index",
      "0",
      "--report-file",
      reportFile,
    ],
    { cwd: repositoryRoot, env: process.env, stdio: "ignore" },
  );
  const result = await waitForChild(child);

  assert.equal(result.code, 1);
  assert.equal(fs.existsSync(reportFile), false);
});

test(
  "Architecture Compass gate rejects a successful leader with a surviving process group",
  { skip: process.platform === "win32" },
  async (t) => {
    const { root, validationDirectory } = gateFixture(t);
    const lateMutation = path.join(root, "late-mutation");
    const secondCommand = path.join(root, "second-command");
    const descendant = `setTimeout(() => require('fs').writeFileSync(${JSON.stringify(lateMutation)}, 'mutated'), 600)`;
    fs.writeFileSync(
      path.join(root, "scripts", "validate-architecture-compass.mjs"),
      `import { spawn } from "node:child_process";\nconst child = spawn(process.execPath, ["-e", ${JSON.stringify(descendant)}], { stdio: "ignore" });\nchild.unref();\n`,
    );
    fs.writeFileSync(
      path.join(validationDirectory, "test-validator.mjs"),
      `import fs from "node:fs";\nfs.writeFileSync(${JSON.stringify(secondCommand)}, "ran");\n`,
    );

    const child = spawn(process.execPath, [gateProgram], {
      cwd: root,
      env: process.env,
      stdio: "ignore",
    });
    const result = await waitForChild(child);
    await new Promise((resolve) => setTimeout(resolve, 750));

    assert.equal(result.code, 1);
    assert.equal(result.signal, null);
    assert.equal(fs.existsSync(secondCommand), false);
    assert.equal(fs.existsSync(lateMutation), false);
  },
);
