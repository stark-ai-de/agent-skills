import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  aggregateHostedShardReports,
  architectureAccountingDigest,
  createHostedShardPlan,
  resolveLocalWorkerCount,
} from "./hosted-shards.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const inventory = JSON.parse(
  fs.readFileSync(path.join(scriptDirectory, "test-validator-case-inventory.json"), "utf8"),
);
const taskKey = `sha256:${"a".repeat(64)}`;
const baselineDigest = `sha256:${"b".repeat(64)}`;
const preflightEvidence = {
  schemaVersion: 1,
  parserContract: "passed",
  fixtureSetupContract: "passed",
  baselineValidation: "passed",
};

function resultFor(entry, ordinal, durationMs = ordinal) {
  return {
    id: entry.id,
    ordinal,
    expectedOutcome: entry.expectedOutcome,
    status: "passed",
    skipBucket: null,
    reason: null,
    durationMs,
    phaseTelemetry: {
      materializeMs: durationMs,
      mutateMs: durationMs,
      validateMs: durationMs,
      cleanupMs: durationMs,
    },
  };
}

function passingReports(plan, telemetryOffset = 0) {
  return plan.shards.map((shard) => {
    const results = shard.caseOrdinals.map((ordinal) =>
      resultFor(inventory.cases[ordinal], ordinal, ordinal + telemetryOffset),
    );
    return {
      schemaVersion: 1,
      hostedShardIndex: shard.hostedShardIndex,
      hostedShardCount: plan.hostedShardCount,
      taskKey: plan.taskKey,
      taskDigest: plan.taskDigest,
      inventoryDigest: plan.inventoryDigest,
      preflightEvidenceDigest: plan.preflightEvidenceDigest,
      baselineDigest: plan.baselineDigest,
      capsuleBeforeDigest: plan.baselineDigest,
      capsuleAfterDigest: plan.baselineDigest,
      localWorkerCount: 3,
      preflight: "passed",
      accountingDigest: architectureAccountingDigest(results),
      results,
      phaseTelemetry: {
        startupMs: telemetryOffset + shard.hostedShardIndex,
        mergeMs: telemetryOffset + shard.hostedShardIndex,
      },
      materializationStrategy: telemetryOffset === 0 ? "clone" : "copy",
    };
  });
}

test("hosted shard plan binds typed preflight evidence and assigns ordinal modulo three", () => {
  const plan = createHostedShardPlan({ inventory, taskKey, baselineDigest, preflightEvidence });

  assert.equal(plan.hostedShardCount, 3);
  assert.deepEqual(
    plan.shards.map(({ caseOrdinals }) => caseOrdinals.length),
    [109, 108, 108],
  );
  assert.deepEqual(plan.shards[0].caseOrdinals.slice(0, 4), [0, 3, 6, 9]);
  assert.deepEqual(plan.shards[1].caseOrdinals.slice(0, 4), [1, 4, 7, 10]);
  assert.deepEqual(plan.shards[2].caseOrdinals.slice(0, 4), [2, 5, 8, 11]);
  assert.equal(new Set(plan.shards.flatMap(({ caseIds }) => caseIds)).size, 325);
  assert.deepEqual(plan.preflightEvidence, preflightEvidence);
  assert.match(plan.preflightEvidenceDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(plan.taskDigest, /^sha256:[a-f0-9]{64}$/);
});

test("hosted aggregate accounts for exactly 325 cases and emits one gate evidence result", () => {
  const plan = createHostedShardPlan({ inventory, taskKey, baselineDigest, preflightEvidence });
  const aggregate = aggregateHostedShardReports({ inventory, plan, reports: passingReports(plan) });

  assert.equal(aggregate.results.length, 325);
  assert.equal(new Set(aggregate.results.map(({ id }) => id)).size, 325);
  assert.equal(aggregate.capabilityComplete, true);
  assert.deepEqual(aggregate.gateEvidence, {
    schemaVersion: 1,
    gateId: "architecture-compass",
    status: "passed",
    taskKey,
    inventoryDigest: plan.inventoryDigest,
    accountingDigest: aggregate.accountingDigest,
    evidenceDigest: aggregate.gateEvidence.evidenceDigest,
    caseCount: 325,
    hostedShardCount: 3,
    capabilityComplete: true,
  });
});

test("hosted aggregate rejects missing, duplicate, unexpected, and wrong-shard IDs", async (t) => {
  const plan = createHostedShardPlan({ inventory, taskKey, baselineDigest, preflightEvidence });
  const mutations = [
    ["missing", (reports) => reports[0].results.pop()],
    ["duplicate", (reports) => reports[0].results.push(reports[0].results[0])],
    [
      "unexpected",
      (reports) => {
        reports[0].results[0] = { ...reports[0].results[0], id: "unexpected-case" };
      },
    ],
    [
      "wrong-shard",
      (reports) => {
        reports[0].results[0] = { ...reports[1].results[0] };
      },
    ],
  ];

  for (const [name, mutate] of mutations) {
    await t.test(name, () => {
      const reports = passingReports(plan);
      mutate(reports);
      reports[0].accountingDigest = architectureAccountingDigest(reports[0].results);
      assert.throws(
        () => aggregateHostedShardReports({ inventory, plan, reports }),
        /missing, duplicate, unexpected, or wrong-shard IDs/,
      );
    });
  }
});

test("phase and duration telemetry do not affect accounting or evidence digests", () => {
  const plan = createHostedShardPlan({ inventory, taskKey, baselineDigest, preflightEvidence });
  const first = aggregateHostedShardReports({ inventory, plan, reports: passingReports(plan, 0) });
  const second = aggregateHostedShardReports({
    inventory,
    plan,
    reports: passingReports(plan, 10_000),
  });

  assert.equal(first.accountingDigest, second.accountingDigest);
  assert.equal(first.gateEvidence.evidenceDigest, second.gateEvidence.evidenceDigest);
});

test("hosted aggregate rejects a capability skip instead of publishing a passing gate", () => {
  const plan = createHostedShardPlan({ inventory, taskKey, baselineDigest, preflightEvidence });
  const reports = passingReports(plan);
  reports[0].results[0] = {
    ...reports[0].results[0],
    status: "skipped",
    skipBucket: "capability",
    reason: "required capability unavailable",
  };
  reports[0].accountingDigest = architectureAccountingDigest(reports[0].results);

  assert.throws(
    () => aggregateHostedShardReports({ inventory, plan, reports }),
    /not capability-complete/,
  );
});

test("hosted aggregate rejects contradictory preflight and task bindings", async (t) => {
  const plan = createHostedShardPlan({ inventory, taskKey, baselineDigest, preflightEvidence });
  for (const [name, mutate] of [
    ["preflight", (report) => (report.preflightEvidenceDigest = `sha256:${"f".repeat(64)}`)],
    ["task-key", (report) => (report.taskKey = `sha256:${"e".repeat(64)}`)],
    ["task-digest", (report) => (report.taskDigest = `sha256:${"d".repeat(64)}`)],
  ]) {
    await t.test(name, () => {
      const reports = passingReports(plan);
      mutate(reports[0]);
      assert.throws(
        () => aggregateHostedShardReports({ inventory, plan, reports }),
        /invalid report/,
      );
    });
  }
});

test("materialization strategy is diagnostic and excluded from aggregate evidence identity", () => {
  const plan = createHostedShardPlan({ inventory, taskKey, baselineDigest, preflightEvidence });
  const cloneReports = passingReports(plan, 0);
  const copyReports = passingReports(plan, 10_000);

  const clone = aggregateHostedShardReports({ inventory, plan, reports: cloneReports });
  const copy = aggregateHostedShardReports({ inventory, plan, reports: copyReports });

  assert.equal(clone.gateEvidence.evidenceDigest, copy.gateEvidence.evidenceDigest);
  assert.deepEqual(
    clone.hostedShards.map(({ materializationStrategy }) => materializationStrategy),
    ["clone", "clone", "clone"],
  );
  assert.deepEqual(
    copy.hostedShards.map(({ materializationStrategy }) => materializationStrategy),
    ["copy", "copy", "copy"],
  );
});

test("local worker count uses at most three workers and leaves one CPU available", () => {
  assert.equal(resolveLocalWorkerCount({ availableParallelism: 1 }), 1);
  assert.equal(resolveLocalWorkerCount({ availableParallelism: 2 }), 1);
  assert.equal(resolveLocalWorkerCount({ availableParallelism: 3 }), 2);
  assert.equal(resolveLocalWorkerCount({ availableParallelism: 64 }), 3);
  assert.equal(resolveLocalWorkerCount({ availableParallelism: 64, configured: "2" }), 2);
  assert.equal(
    resolveLocalWorkerCount({ availableParallelism: 64, configured: "3", assignedCaseCount: 2 }),
    2,
  );
});

test("hosted planning rejects an inventory that is not frozen in stable ID order", () => {
  const unsortedInventory = structuredClone(inventory);
  [unsortedInventory.cases[0], unsortedInventory.cases[1]] = [
    unsortedInventory.cases[1],
    unsortedInventory.cases[0],
  ];

  assert.throws(
    () =>
      createHostedShardPlan({
        inventory: unsortedInventory,
        taskKey,
        baselineDigest,
        preflightEvidence,
      }),
    /stable ID order/,
  );
});
