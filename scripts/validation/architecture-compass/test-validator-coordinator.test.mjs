import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createSealedBaselineCapsule, removeSealedBaselineCapsule } from "./fixture-capsule.mjs";
import {
  architectureFixtureEntries,
  runFixtureCoordinator as runCoordinator,
} from "./fixture-coordinator.mjs";

const taskKey = `sha256:${"a".repeat(64)}`;
const taskDigest = `sha256:${"c".repeat(64)}`;
const preflightEvidenceDigest = `sha256:${"d".repeat(64)}`;
const preflightEvidence = Object.freeze({
  schemaVersion: 1,
  parserContract: "passed",
  fixtureSetupContract: "passed",
  baselineValidation: "passed",
});
const frozenInventory = JSON.parse(
  fs.readFileSync(new URL("./test-validator-case-inventory.json", import.meta.url), "utf8"),
);

const fakeWorkerSource = `
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const values = {};
for (let index = 2; index < process.argv.length; index += 2) {
  values[process.argv[index]] = process.argv[index + 1];
}
const workerIndex = Number(values["--worker-index"]);
const workerCount = Number(values["--worker-count"]);
const hostedShardIndex = Number(values["--hosted-shard-index"] ?? 0);
const hostedShardCount = Number(values["--hosted-shard-count"] ?? 1);
const taskKey = values["--task-key"];
const taskDigest = values["--task-digest"];
const preflightEvidenceDigest = values["--preflight-evidence-digest"];
const reportFile = values["--worker-report"];
const mode = process.env.FAKE_ARCHITECTURE_WORKER_MODE ?? "pass";
if (workerIndex === 0 && process.env.FAKE_ARCHITECTURE_CAPTURE_LEGACY_ENV) {
  fs.writeFileSync(
    process.env.FAKE_ARCHITECTURE_CAPTURE_LEGACY_ENV,
    JSON.stringify({
      testRoot: process.env.LEGACY_LINEAGE_TEST_ROOT ?? null,
      validator: process.env.LEGACY_LINEAGE_ARCHITECTURE_VALIDATOR ?? null,
      guardRoot: process.env.LEGACY_LINEAGE_GUARD_ROOT ?? null,
    }),
  );
}
function writeReport(report) {
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, JSON.stringify(report));
  if (workerIndex === 0 && process.env.FAKE_ARCHITECTURE_CAPTURE_WORKER_REPORT) {
    fs.writeFileSync(
      process.env.FAKE_ARCHITECTURE_CAPTURE_WORKER_REPORT,
      JSON.stringify(report),
    );
  }
}

if (mode === "hang-until-timeout") {
  setTimeout(
    () => fs.writeFileSync(process.env.FAKE_ARCHITECTURE_TIMEOUT_MARKER, "survived"),
    600,
  );
  setInterval(() => {}, 1000);
} else if (mode === "fail-after-observed-preflight") {
  const marker = process.env.FAKE_ARCHITECTURE_PREFLIGHT_MARKER;
  const eventLog = process.env.FAKE_ARCHITECTURE_EVENT_LOG;
  fs.appendFileSync(
    eventLog,
    fs.existsSync(marker) ? "worker-after-preflight\\n" : "worker-before-preflight\\n",
  );
  process.exitCode = 7;
} else if (mode === "structured-failure-with-lower-index-hanging-sibling") {
  if (workerIndex === 0) {
    setInterval(() => {}, 1000);
  } else {
    const inventory = JSON.parse(
      fs.readFileSync(process.env.ARCHITECTURE_FIXTURE_INVENTORY_PATH, "utf8"),
    );
    const ordinal = inventory.cases.findIndex(
      (_, ordinal) =>
        ordinal % hostedShardCount === hostedShardIndex &&
        Math.floor(ordinal / hostedShardCount) % workerCount === workerIndex,
    );
    const failedCase = inventory.cases[ordinal];
    const reason = "sentinel structured fixture failure";
    writeReport({
        schemaVersion: 1,
        workerIndex,
        workerCount,
        hostedShardIndex,
        hostedShardCount,
        taskKey,
        taskDigest,
        preflightEvidenceDigest,
        inventoryDigest: process.env.ARCHITECTURE_FIXTURE_INVENTORY_DIGEST,
        results: [
          {
            id: failedCase.id,
            ordinal,
            expectedOutcome: failedCase.expectedOutcome,
            status: "failed",
            skipBucket: null,
            reason,
            durationMs: 0,
          },
        ],
        fatal: { message: reason, stack: null },
        phaseTelemetry: { startupMs: 0 },
        materializationStrategy: "clone",
      });
    process.exitCode = 1;
  }
} else if (mode === "failure-with-hanging-sibling") {
  if (workerIndex === 0) process.exit(7);
  setInterval(() => {}, 1000);
} else if (mode === "leader-exits-descendant-ignores-term") {
  if (workerIndex === 0) {
    const readyFile = process.env.FAKE_ARCHITECTURE_DESCENDANT_READY;
    const deadline = Date.now() + 5000;
    while (!fs.existsSync(readyFile)) {
      if (Date.now() >= deadline) throw new Error("descendant did not become ready");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    process.exit(7);
  }

  process.on("SIGTERM", () => process.exit(0));
  const descendantSource = [
    'import fs from "node:fs";',
    'process.on("SIGTERM", () => {});',
    'fs.writeFileSync(process.env.FAKE_ARCHITECTURE_DESCENDANT_READY, "ready");',
    'setTimeout(() => fs.writeFileSync(process.env.FAKE_ARCHITECTURE_DESCENDANT_MARKER, "survived"), 600);',
    'setInterval(() => {}, 1000);',
  ].join("\\n");
  spawn(process.execPath, ["--input-type=module", "-e", descendantSource], {
    env: process.env,
    stdio: ["ignore", "inherit", "inherit"],
  });
  setInterval(() => {}, 1000);
} else {
  if (mode === "mutate-baseline" && workerIndex === 0) {
    const target = path.join(
      process.env.ARCHITECTURE_FIXTURE_BASELINE,
      "skills/engineering-workflows/architecture-compass/SKILL.md",
    );
    fs.chmodSync(target, 0o600);
    fs.appendFileSync(target, "\\nmutated by fake worker\\n");
  }
  const inventory = JSON.parse(
    fs.readFileSync(process.env.ARCHITECTURE_FIXTURE_INVENTORY_PATH, "utf8"),
  );
  const results = inventory.cases
    .map((entry, ordinal) => ({ ...entry, ordinal }))
    .filter(
      ({ ordinal }) =>
        ordinal % hostedShardCount === hostedShardIndex &&
        Math.floor(ordinal / hostedShardCount) % workerCount === workerIndex,
    )
    .map(({ id, ordinal, expectedOutcome, applicability }) => {
      const notApplicable = process.platform === "win32" && applicability === "posix";
      return {
        id,
        ordinal,
        expectedOutcome,
        status: notApplicable ? "not-applicable" : "passed",
        skipBucket: notApplicable ? "platform" : null,
        reason: notApplicable ? "POSIX fixture is not applicable on Windows" : null,
        durationMs: 0,
        phaseTelemetry: {
          materializeMs: 0,
          mutateMs: 0,
          validateMs: 0,
          cleanupMs: 0,
        },
      };
    });
  writeReport({
      schemaVersion: 1,
      workerIndex,
      workerCount,
      hostedShardIndex,
      hostedShardCount,
      taskKey: mode === "wrong-task-binding" ? "sha256:" + "e".repeat(64) : taskKey,
      taskDigest,
      preflightEvidenceDigest,
      inventoryDigest:
        mode === "malformed" ? "sha256:invalid" : process.env.ARCHITECTURE_FIXTURE_INVENTORY_DIGEST,
      results,
      fatal: null,
      phaseTelemetry: { startupMs: 0 },
      materializationStrategy:
        process.env.ARCHITECTURE_FIXTURE_FORCE_COPY === "1" ? "copy" : "clone",
    });
}
`;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-coordinator-test-"));
  const worker = path.join(root, "fake-worker.mjs");
  fs.writeFileSync(worker, fakeWorkerSource);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, worker };
}

function expectedBaselineDigest(t) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-baseline-digest-"));
  const capsuleRoot = path.join(temporaryRoot, "sealed-baseline");
  const baseline = createSealedBaselineCapsule({
    sourceRoot: path.resolve(new URL("../../..", import.meta.url).pathname),
    destinationRoot: capsuleRoot,
    entries: architectureFixtureEntries,
  });
  removeSealedBaselineCapsule(capsuleRoot);
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  return baseline.digest;
}

test("coordinator merges equivalent exact accounting for one, two, and three workers", async (t) => {
  const accountingDigests = new Set();
  for (const workerCount of [1, 2, 3]) {
    const { root, worker } = fixture(t);
    const reportFile = path.join(root, `coordinator-${workerCount}.json`);
    const capturedWorkerReport = path.join(root, `worker-${workerCount}.json`);
    await runCoordinator({
      workerProgram: worker,
      workerCount,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => preflightEvidence,
      workerEnvironment: {
        FAKE_ARCHITECTURE_CAPTURE_WORKER_REPORT: capturedWorkerReport,
      },
    });
    const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
    const workerReport = JSON.parse(fs.readFileSync(capturedWorkerReport, "utf8"));
    assert.equal(report.workerCount, workerCount);
    assert.equal(report.preflight, "passed");
    assert.equal(report.results.length, 325);
    assert.equal(new Set(report.results.map(({ id }) => id)).size, 325);
    assert.equal(Object.hasOwn(workerReport, "preflight"), false);
    accountingDigests.add(report.accountingDigest);
    assert.deepEqual(fs.readdirSync(root).sort(), [
      `coordinator-${workerCount}.json`,
      "fake-worker.mjs",
      `worker-${workerCount}.json`,
    ]);
  }
  assert.equal(accountingDigests.size, 1);
});

test("coordinator removes poisoned legacy steering from preflight and worker environments", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "coordinator.json");
  const capturedEnvironment = path.join(root, "legacy-environment.json");
  const poisonedEnvironment = {
    ...process.env,
    LEGACY_LINEAGE_TEST_ROOT: path.join(root, "poisoned-test-root"),
    LEGACY_LINEAGE_ARCHITECTURE_VALIDATOR: path.join(root, "poisoned-validator.mjs"),
    LEGACY_LINEAGE_GUARD_ROOT: path.join(root, "poisoned-guard-root"),
  };

  await runCoordinator({
    workerProgram: worker,
    workerCount: 1,
    temporaryParent: root,
    reportFile,
    executionEnvironment: poisonedEnvironment,
    coordinatorPreflight: () => {
      assert.equal(process.env.LEGACY_LINEAGE_TEST_ROOT, undefined);
      assert.equal(process.env.LEGACY_LINEAGE_ARCHITECTURE_VALIDATOR, undefined);
      assert.equal(process.env.LEGACY_LINEAGE_GUARD_ROOT, undefined);
      return preflightEvidence;
    },
    workerEnvironment: {
      FAKE_ARCHITECTURE_CAPTURE_LEGACY_ENV: capturedEnvironment,
    },
  });

  assert.deepEqual(JSON.parse(fs.readFileSync(capturedEnvironment, "utf8")), {
    testRoot: null,
    validator: null,
    guardRoot: null,
  });
  assert.equal(JSON.parse(fs.readFileSync(reportFile, "utf8")).results.length, 325);
});

test("coordinator verifies a plan-bound hosted shard without rerunning shared preflight", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "hosted-shard.json");
  let sharedPreflightCalls = 0;
  await runCoordinator({
    workerProgram: worker,
    workerCount: 3,
    hostedShardIndex: 1,
    hostedShardCount: 3,
    taskKey,
    taskDigest,
    expectedPreflightEvidenceDigest: preflightEvidenceDigest,
    expectedBaselineDigest: expectedBaselineDigest(t),
    temporaryParent: root,
    reportFile,
    coordinatorPreflight() {
      sharedPreflightCalls += 1;
      throw new Error("hosted shards must not rerun shared preflight");
    },
  });

  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  assert.equal(report.hostedShardIndex, 1);
  assert.equal(report.hostedShardCount, 3);
  assert.equal(report.localWorkerCount, 3);
  assert.equal(report.taskKey, taskKey);
  assert.equal(report.taskDigest, taskDigest);
  assert.equal(report.preflightEvidenceDigest, preflightEvidenceDigest);
  assert.equal(sharedPreflightCalls, 0);
  assert.equal(report.results.length, 108);
  assert.ok(report.results.every(({ ordinal }) => ordinal % 3 === 1));
  assert.match(report.baselineDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(report.capsuleBeforeDigest, report.baselineDigest);
  assert.equal(report.capsuleAfterDigest, report.baselineDigest);
  assert.equal(report.materializationStrategy, "clone");
});

test("coordinator rejects a worker report bound to another task", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 1,
      hostedShardIndex: 0,
      hostedShardCount: 3,
      taskKey,
      taskDigest,
      expectedPreflightEvidenceDigest: preflightEvidenceDigest,
      expectedBaselineDigest: expectedBaselineDigest(t),
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => {
        throw new Error("hosted shards must not rerun shared preflight");
      },
      workerEnvironment: { FAKE_ARCHITECTURE_WORKER_MODE: "wrong-task-binding" },
    }),
    /invalid report/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test("coordinator rejects baseline mutation and withholds hosted shard evidence", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 1,
      hostedShardIndex: 0,
      hostedShardCount: 3,
      taskKey,
      taskDigest,
      expectedPreflightEvidenceDigest: preflightEvidenceDigest,
      expectedBaselineDigest: expectedBaselineDigest(t),
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => {
        throw new Error("hosted shards must not rerun shared preflight");
      },
      workerEnvironment: { FAKE_ARCHITECTURE_WORKER_MODE: "mutate-baseline" },
    }),
    /sealed baseline capsule changed during execution/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test("coordinator rejects a hosted plan baseline mismatch before spawning workers", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 1,
      hostedShardIndex: 0,
      hostedShardCount: 3,
      taskKey,
      taskDigest,
      expectedPreflightEvidenceDigest: preflightEvidenceDigest,
      expectedBaselineDigest: `sha256:${"f".repeat(64)}`,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => {
        throw new Error("hosted shards must not rerun shared preflight");
      },
    }),
    /sealed baseline contradicts the hosted plan/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test("coordinator terminates a hanging sibling and cleans its exact run root", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 2,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => preflightEvidence,
      workerEnvironment: { FAKE_ARCHITECTURE_WORKER_MODE: "failure-with-hanging-sibling" },
    }),
    /worker 0 failed/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test("coordinator surfaces a structured fatal over a lower-index cancelled sibling", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 2,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => preflightEvidence,
      workerEnvironment: {
        FAKE_ARCHITECTURE_WORKER_MODE: "structured-failure-with-lower-index-hanging-sibling",
      },
    }),
    (error) => {
      assert.equal(
        error.message,
        "Architecture Compass fixture worker 1 failed case local-negative:HTML-comment-only legacy-case target marker: sentinel structured fixture failure",
      );
      return true;
    },
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test("hosted structured fatal uses the two-level shard and worker assignment", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  const expectedCase = frozenInventory.cases[5];
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 2,
      hostedShardIndex: 2,
      hostedShardCount: 3,
      taskKey,
      taskDigest,
      expectedPreflightEvidenceDigest: preflightEvidenceDigest,
      expectedBaselineDigest: expectedBaselineDigest(t),
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => {
        throw new Error("hosted shards must not rerun shared preflight");
      },
      workerEnvironment: {
        FAKE_ARCHITECTURE_WORKER_MODE: "structured-failure-with-lower-index-hanging-sibling",
      },
    }),
    (error) => {
      assert.equal(
        error.message,
        `Architecture Compass fixture worker 1 failed case ${expectedCase.id}: sentinel structured fixture failure`,
      );
      return true;
    },
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test(
  "coordinator escalates after a worker leader exits and awaits descendant cleanup",
  { skip: process.platform === "win32" },
  async (t) => {
    const { root, worker } = fixture(t);
    const reportFile = path.join(root, "must-not-exist.json");
    const readyFile = path.join(root, "descendant-ready");
    const markerFile = path.join(root, "descendant-survived");
    await assert.rejects(
      runCoordinator({
        workerProgram: worker,
        workerCount: 2,
        temporaryParent: root,
        reportFile,
        coordinatorPreflight: () => preflightEvidence,
        workerEnvironment: {
          FAKE_ARCHITECTURE_WORKER_MODE: "leader-exits-descendant-ignores-term",
          FAKE_ARCHITECTURE_DESCENDANT_READY: readyFile,
          FAKE_ARCHITECTURE_DESCENDANT_MARKER: markerFile,
        },
        terminationGraceMs: 100,
        killGraceMs: 1000,
        settlementPollMs: 10,
      }),
      /worker 0 failed/,
    );
    assert.equal(fs.existsSync(reportFile), false);
    assert.equal(fs.existsSync(markerFile), false);
    assert.deepEqual(fs.readdirSync(root).sort(), ["descendant-ready", "fake-worker.mjs"]);

    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.equal(fs.existsSync(markerFile), false);
  },
);

test("coordinator rejects malformed worker proof and does not publish success", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 2,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => preflightEvidence,
      workerEnvironment: { FAKE_ARCHITECTURE_WORKER_MODE: "malformed" },
    }),
    /invalid report/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test("coordinator times out a lone worker, settles its process group, and withholds success", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  const markerFile = path.join(root, "timed-out-worker-survived");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 1,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => preflightEvidence,
      workerEnvironment: {
        FAKE_ARCHITECTURE_WORKER_MODE: "hang-until-timeout",
        FAKE_ARCHITECTURE_TIMEOUT_MARKER: markerFile,
      },
      workerTimeoutMs: 100,
      terminationGraceMs: 100,
      killGraceMs: 1000,
      settlementPollMs: 10,
    }),
    (error) => {
      assert.equal(error.message, "Architecture Compass fixture workers timed out after 100ms.");
      return true;
    },
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.equal(fs.existsSync(markerFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);

  await new Promise((resolve) => setTimeout(resolve, 650));
  assert.equal(fs.existsSync(markerFile), false);
});

test("coordinator completes shared preflight before spawning a failing worker", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  const markerFile = path.join(root, "preflight-complete");
  const eventLog = path.join(root, "events.log");
  let preflightCalls = 0;
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 1,
      temporaryParent: root,
      reportFile,
      async coordinatorPreflight(preflightRoot) {
        preflightCalls += 1;
        assert.equal(path.basename(preflightRoot), "sealed-baseline");
        const frozenInventoryFile = path.join(
          preflightRoot,
          "scripts/validation/architecture-compass/test-validator-case-inventory.json",
        );
        assert.equal(fs.statSync(frozenInventoryFile).mode & 0o222, 0);
        assert.deepEqual(JSON.parse(fs.readFileSync(frozenInventoryFile, "utf8")), frozenInventory);
        fs.appendFileSync(eventLog, "preflight-started\n");
        await new Promise((resolve) => setTimeout(resolve, 25));
        fs.writeFileSync(markerFile, "complete");
        fs.appendFileSync(eventLog, "preflight-complete\n");
        return preflightEvidence;
      },
      workerEnvironment: {
        FAKE_ARCHITECTURE_WORKER_MODE: "fail-after-observed-preflight",
        FAKE_ARCHITECTURE_PREFLIGHT_MARKER: markerFile,
        FAKE_ARCHITECTURE_EVENT_LOG: eventLog,
      },
    }),
    /worker 0 failed/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.equal(preflightCalls, 1);
  assert.equal(
    fs.readFileSync(eventLog, "utf8"),
    "preflight-started\npreflight-complete\nworker-after-preflight\n",
  );
  assert.deepEqual(fs.readdirSync(root).sort(), [
    "events.log",
    "fake-worker.mjs",
    "preflight-complete",
  ]);
});

test("coordinator installs cancellation ownership before capsule materialization", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  const listenersBefore = process.listenerCount("SIGTERM");
  let capsuleCreatorCalled = false;
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 1,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => preflightEvidence,
      baselineCapsuleCreator(options) {
        capsuleCreatorCalled = true;
        assert.equal(process.listenerCount("SIGTERM"), listenersBefore + 1);
        createSealedBaselineCapsule(options);
        throw new Error("sentinel interruption during capsule materialization");
      },
    }),
    /sentinel interruption during capsule materialization/,
  );
  assert.equal(capsuleCreatorCalled, true);
  assert.equal(process.listenerCount("SIGTERM"), listenersBefore);
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test("coordinator cleans the whole owned root when interrupted during capsule materialization", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  let rethrownSignal = null;

  await runCoordinator({
    workerProgram: worker,
    workerCount: 1,
    temporaryParent: root,
    reportFile,
    coordinatorPreflight: () => preflightEvidence,
    baselineCapsuleCreator(options) {
      const baseline = createSealedBaselineCapsule(options);
      process.emit("SIGTERM");
      return baseline;
    },
    signalRethrow(signal) {
      rethrownSignal = signal;
    },
  });

  assert.equal(rethrownSignal, "SIGTERM");
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test("coordinator removes an owned run root when restrictive-mode setup fails", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 1,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => preflightEvidence,
      runRootModeSetter() {
        throw new Error("sentinel restrictive-mode setup failure");
      },
    }),
    /sentinel restrictive-mode setup failure/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});
