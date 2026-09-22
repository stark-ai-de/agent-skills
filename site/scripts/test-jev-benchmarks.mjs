import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { jevBenchmarks as bench } from "../src/lib/jev-benchmarks.mjs";

const readme = readFileSync(new URL(`../../${bench.readmePath}`, import.meta.url), "utf8");

// This is a reviewed claim ledger, not a test-count inflation mechanism.
assert.deepEqual(bench.runCounts, {
  retrieval: 1080,
  runtime: 400,
  liveSelection: 452,
  replay: 100,
  sessionDevelopment: 4418,
});
assert.equal(bench.totalRuns, 6450);
assert.equal(bench.development.experiment_count, 37);
assert.equal(
  bench.development.experiments.reduce((n, run) => n + run.recorded_executions, 0),
  bench.runCounts.sessionDevelopment,
);
assert.equal(bench.development.cumulative_recorded_executions, bench.totalRuns);
assert.equal(new Set(bench.development.experiments.map((run) => run.freeze_sha256)).size, 37);
assert.equal(bench.tasks, 80);
assert.equal(bench.speedRatio.toFixed(2), "4.71");
assert.equal(bench.jev.correct, 70);
assert.equal(bench.native.correct, 72);

assert.equal(bench.session.tasks, 48);
assert.equal(bench.session.correct, 96);
assert.equal(bench.session.observations, 96);
assert.equal(bench.session.evidence.experiment.displayed_observations, 192);
assert.equal(bench.session.evidence.experiment.completed_observations, 384);
assert.equal(bench.session.evidence.validation.independent_audit_passed, true);
assert.equal(bench.session.evidence.groups.all.arms.jev_cold.correct, 96);
assert.equal(bench.session.evidence.lifecycle.connection_states.jev_session.cold, 2);
assert.equal(bench.session.evidence.lifecycle.connection_states.jev_session.reused, 94);
const sessionCount = bench.development.experiments.find(
  (run) => run.freeze_sha256 === bench.session.evidence.provenance.freeze_sha256,
);
assert.equal(sessionCount?.recorded_executions, 384);

for (const claim of [
  `${bench.session.speedRatio.toFixed(2)}× faster with a reusable session`,
  `${bench.session.medianSeconds.toFixed(2)} seconds with a Jev session`,
  `${bench.session.coldMedianSeconds.toFixed(2)} seconds with a fresh connection`,
  `${bench.session.reductionPercent.toFixed(0)}%`,
  `${bench.session.correct}/${bench.session.observations} correct results`,
  `${bench.speedRatio.toFixed(2)}× faster median selection`,
  `${bench.jev.medianSeconds.toFixed(2)} seconds`,
  `${bench.native.medianSeconds.toFixed(2)} seconds`,
  `${bench.jev.correct}/${bench.tasks} for Jev`,
  `${bench.native.correct}/${bench.tasks} for native`,
  `${bench.totalRuns.toLocaleString("en-US")} completed benchmark executions`,
  `${bench.compactReduction.toFixed(1)}% less returned JSON`,
  `${bench.preparationReduction.toFixed(0)}% less local preparation time`,
])
  assert.ok(readme.includes(claim), `Benchmark README differs from evidence: ${claim}`);

for (const boundary of [
  "across development iterations",
  "48 previously untested tasks",
  "first connection in each repetition is included",
  "did not test fresh MCP, compound or clarification tasks",
  "proxy environments use the existing unpooled fallback",
  "its timings must not be combined with these results",
  "baseline and candidate variants",
  "not 6,450 unique tasks or passing tests",
  "excludes native process startup, capability loading and task execution",
  "a whole-task speedup has not been demonstrated",
])
  assert.ok(readme.includes(boundary), `Missing claim boundary: ${boundary}`);

console.log("Jev promo claims match the recorded benchmark counts, timings and scope.");
