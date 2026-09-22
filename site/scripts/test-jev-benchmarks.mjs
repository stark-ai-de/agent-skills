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
});
assert.equal(bench.totalRuns, 2032);
assert.equal(bench.tasks, 80);
assert.equal(bench.speedRatio.toFixed(2), "4.71");
assert.equal(bench.jev.correct, 70);
assert.equal(bench.native.correct, 72);

for (const claim of [
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
  "baseline and candidate variants",
  "not 2,032 unique tasks or passing tests",
  "excludes native process startup, capability loading and task execution",
  "a whole-task speedup has not been demonstrated",
])
  assert.ok(readme.includes(boundary), `Missing claim boundary: ${boundary}`);

console.log("Jev promo claims match the recorded benchmark counts, timings and scope.");
