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
  ["hussi_control", "jev_session", "hussi_original", "jev_cold", "native"],
);
assert.ok(
  current.rows.every(
    (row, index) => index === 0 || current.rows[index - 1].medianSeconds <= row.medianSeconds,
  ),
);
assert.ok(current.rows.every((row) => typeof row.info === "string" && row.info.length > 0));
assert.equal(
  current.rows.find((row) => row.id === "hussi_original").sourceUrl,
  "https://github.com/hussi9/skill-router",
);
assert.ok(
  current.rows.filter((row) => row.id !== "hussi_original").every((row) => row.sourceUrl === null),
);
assert.equal(new Set(current.rows.map((row) => row.id)).size, 5);
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
let previousReadmeRow = -1;
for (const row of current.rows) {
  const positive = current.groups.primary_positive.arms[row.id];
  const none = current.groups.none.arms[row.id];
  const all = current.groups.all.arms[row.id];
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
  const readmeRow = readme.replace(/\s+/g, " ").indexOf(expectedRow);
  assert.ok(readmeRow > previousReadmeRow, `README row missing or out of time order: ${row.label}`);
  previousReadmeRow = readmeRow;
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

// Displaying a previously archived control must not create new measurement claims.
const control = current.rows.find((row) => row.id === "hussi_control");
const controlAudit = data.modified_control.projection_audit;
assert.equal(control.factor.toFixed(2), "8.52");
assert.equal(current.rows.find((row) => row.id === current.defaultId).factor.toFixed(2), "5.89");
assert.equal(control.experimental, true);
assert.equal(control.correct, 80);
assert.equal(control.noneCorrect, 16);
assert.ok(control.description.includes("not a released skill"));
assert.ok(control.announcement.includes("our internal experiment"));
assert.ok(current.rows.filter((row) => row.id !== control.id).every((row) => !row.experimental));
assert.equal(current.displayedObservations, 480);
assert.equal(
  current.displayedObservations,
  data.experiment.displayed_observations + data.modified_control.all.n,
);
assert.equal(controlAudit.freeze_sha256, sessionCount.freeze_sha256);
assert.equal(controlAudit.results_sha256, data.technical_audit.source_results_sha256);
assert.equal(controlAudit.runner_sha256, data.technical_audit.instrumentation_sha256);
assert.equal(controlAudit.frozen_files_verified, 197);
assert.equal(controlAudit.new_api_calls, 0);
assert.equal(controlAudit.additional_benchmark_executions, 0);
assert.equal(controlAudit.api_requests, data.modified_control.all.n);
assert.equal(controlAudit.cold_calls + controlAudit.reused_calls, controlAudit.api_requests);
for (const name of ["primary_positive", "none", "all"]) {
  assert.equal(current.groups[name].arms.hussi_control, data.modified_control[name]);
  assert.equal(data.modified_control[name].missing_timing, 0);
  assert.equal(Object.keys(data.groups[name].arms).length, 4, "Preserve historical supplement");
}
assert.ok(readme.includes(`### ${current.experiment.title}`));
for (const note of current.experiment.notes) {
  assert.ok(
    readme.includes(`**${note.title}.** ${note.text}`),
    `Experiment note differs: ${note.title}`,
  );
}

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
  `${current.rows.find((row) => row.id === current.defaultId).factor.toFixed(2)}× the native selector's speed`,
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

console.log("Jev five-variant claims match counts, provenance, timings, models and scope.");
