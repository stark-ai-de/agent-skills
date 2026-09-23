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
  nativeSupplement: 96,
});
assert.equal(bench.totalRuns, 6546);
assert.equal(bench.development.experiment_count, 37);
assert.equal(
  bench.development.experiments.reduce((n, run) => n + run.recorded_executions, 0),
  bench.runCounts.sessionDevelopment,
);
assert.equal(
  bench.development.cumulative_recorded_executions + bench.runCounts.nativeSupplement,
  bench.totalRuns,
);
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

const current = bench.current;
const data = current.evidence;
assert.equal(current.defaultId, "jev_session");
assert.equal(current.baselineId, "native");
assert.deepEqual(
  current.rows.map((row) => row.id),
  ["jev_session", "jev_cold", "hussi_original", "native"],
);
assert.equal(new Set(current.rows.map((row) => row.id)).size, 4);
assert.equal(data.experiment.unique_tasks, 48);
assert.equal(data.experiment.repetitions_per_task, 2);
assert.equal(data.experiment.reused_observations, 288);
assert.equal(data.experiment.new_observations, 96);
assert.equal(data.experiment.displayed_observations, 384);
assert.equal(data.experiment.concurrent_four_arm_run, false);
assert.equal(
  data.count_ledger.previous_recorded_executions,
  bench.development.cumulative_recorded_executions,
);
assert.equal(data.count_ledger.new_completed_executions, bench.runCounts.nativeSupplement);
assert.equal(data.count_ledger.cumulative_recorded_executions, bench.totalRuns);
assert.deepEqual(data.measurement_dates, ["2026-09-22", "2026-09-23"]);
assert.equal(data.provenance.dataset_sha256, bench.session.evidence.provenance.dataset_sha256);
assert.equal(data.provenance.catalog_sha256, bench.session.evidence.provenance.catalog_sha256);
assert.equal(data.provenance.reused_freeze_sha256, bench.session.evidence.provenance.freeze_sha256);
assert.equal(data.validation.independent_audit_passed, true);
assert.equal(data.validation.payloads_matched, 48);
assert.equal(current.nativeModel, "gpt-6-astra");
assert.equal(current.nativeReasoning, "low");
assert.equal(data.models.native.resolved, null);
assert.equal(current.jevModel, "jev-1.13.0");
assert.ok(current.hussiSource.includes("/652953a0cbb423d4bb7f62de83db15ad4ca9b16e/"));

const baseline = current.rows.find((row) => row.id === current.baselineId);
for (const row of current.rows) {
  const positive = data.groups.primary_positive.arms[row.id];
  const none = data.groups.none.arms[row.id];
  const all = data.groups.all.arms[row.id];
  assert.equal(row.observations, 80);
  assert.equal(row.noneObservations, 16);
  assert.equal(all.n, positive.n + none.n);
  assert.equal(all.correct, positive.correct + none.correct);
  assert.equal(all.errors, positive.errors + none.errors);
  for (const group of [positive, none, all]) {
    assert.ok(group.correct >= 0 && group.correct + group.errors <= group.n);
    assert.equal(
      group.timed_observations,
      group.n,
      "Headline must not silently omit missing timings",
    );
    assert.ok(Number.isFinite(group.median_ms) && group.median_ms > 0);
    assert.ok(group.p95_ms >= group.median_ms);
  }
  assert.equal(row.medianSeconds, positive.median_ms / 1000);
  if (row.id === "native") assert.equal(row.factor, null);
  else assert.ok(Math.abs(row.factor - baseline.medianSeconds / row.medianSeconds) < 1e-12);
  const expectedRow = `| ${row.label} | ${row.medianSeconds.toFixed(3)} s | ${row.p95Seconds.toFixed(3)} s | ${row.correct}/${row.observations} | ${row.noneCorrect}/${row.noneObservations} | ${row.errors} |`;
  assert.ok(readme.replace(/\s+/g, " ").includes(expectedRow), `README row differs: ${row.label}`);
}
for (const id of ["jev_session", "jev_cold"]) {
  assert.equal(
    data.groups.primary_positive.arms[id].median_ms,
    bench.session.evidence.groups.primary_positive.arms[id].median_ms,
  );
  assert.equal(data.groups.all.arms[id].correct, 96);
}
assert.equal(data.groups.primary_positive.arms.hussi_original.correct, 76);
assert.equal(data.groups.primary_positive.arms.hussi_original.median_ms, 883.8034854925354);
assert.equal(current.rows.at(-1).factor, null);

// Keep the visible technical comparison and repository documentation in agreement.
const technical = current.technical;
const audit = data.technical_audit;
assert.equal(audit.new_api_calls, 0);
assert.equal(audit.additional_benchmark_executions, 0);
assert.equal(audit.task_set_sha256, data.provenance.dataset_sha256);
for (const [id, arm] of Object.entries(audit.arms)) {
  assert.equal(arm.observations, data.groups.primary_positive.arms[id].n);
  assert.equal(arm.all_observations, data.groups.all.arms[id].n);
  assert.equal(arm.one_request_observations, arm.all_observations);
}
for (const metric of ["median_local_prep_ms", "median_wire_request_bytes"]) {
  assert.ok(audit.arms.hussi_original[metric] < audit.arms.jev_cold[metric]);
}
const withheld = audit.hussi_positive_outcomes;
assert.equal(withheld.correct_accepted, data.groups.primary_positive.arms.hussi_original.correct);
assert.equal(withheld.correct_accepted + withheld.correct_suggestions_below_route_threshold, 80);
assert.equal(
  withheld.withheld_confidences.length,
  withheld.correct_suggestions_below_route_threshold,
);
assert.ok(withheld.withheld_confidences.every((value) => value < withheld.route_threshold));
assert.equal(withheld.wrong_raw_skill_choices, 0);
assert.equal(withheld.full_fallback_measured, false);
assert.ok(readme.includes(`### ${technical.title}`));
assert.ok(readme.includes(technical.introduction));
for (const row of technical.rows) {
  assert.ok(
    readme.replace(/\s+/g, " ").includes(`| ${row.topic} | ${row.hussi} | ${row.jev} |`),
    `Technical README row differs: ${row.topic}`,
  );
}
for (const note of technical.notes) {
  assert.ok(
    readme.includes(`**${note.title}.** ${note.text}`),
    `Technical note differs: ${note.title}`,
  );
}

for (const claim of [
  `${current.rows[0].factor.toFixed(2)}× the native selector's speed`,
  `${bench.session.speedRatio.toFixed(2)}× faster with a reusable session`,
  `${bench.speedRatio.toFixed(2)}× faster median selection`,
  `${bench.jev.medianSeconds.toFixed(2)} seconds`,
  `${bench.native.medianSeconds.toFixed(2)} seconds`,
  `${bench.jev.correct}/${bench.tasks} for Jev`,
  `${bench.native.correct}/${bench.tasks} for native`,
  `${bench.totalRuns.toLocaleString("en-US")} completed benchmark executions`,
  `${bench.compactReduction.toFixed(1)}% less returned JSON`,
  `${bench.preparationReduction.toFixed(0)}% less local preparation time`,
  current.nativeModel,
  current.jevModel,
  current.hussiSource,
])
  assert.ok(readme.includes(claim), `Benchmark README differs from evidence: ${claim}`);

for (const boundary of [
  "across development iterations",
  "same tasks and catalog, separate measurement runs",
  "80 skill-selection observations per variant",
  "first connection in each repetition is included",
  "did not test fresh MCP, compound or clarification tasks",
  "proxy environments use the existing unpooled fallback",
  "its timings must not be combined with these results",
  "baseline and candidate variants",
  "not 6,546 unique tasks or passing tests",
  "excludes native process startup, capability loading and task execution",
  "a whole-task speedup has not been demonstrated",
  "modified persistent-transport control",
])
  assert.ok(readme.includes(boundary), `Missing claim boundary: ${boundary}`);

console.log("Jev four-variant claims match counts, provenance, timings, models and scope.");
