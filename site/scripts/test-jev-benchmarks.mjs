import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  compactDevelopment: 1246,
});
assert.equal(bench.totalRuns, 7792);
assert.equal(bench.development.experiment_count, 37);
assert.equal(
  bench.development.experiments.reduce((n, run) => n + run.recorded_executions, 0),
  bench.runCounts.sessionDevelopment,
);
assert.equal(
  bench.development.cumulative_recorded_executions +
    bench.runCounts.nativeSupplement +
    bench.runCounts.compactDevelopment,
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
assert.equal(
  data.count_ledger.cumulative_recorded_executions,
  bench.totalRuns - bench.runCounts.compactDevelopment,
);
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
  "not 7,792 unique tasks or passing tests",
  "excludes native process startup, capability loading and task execution",
  "a whole-task speedup has not been demonstrated",
  "modified persistent-transport control",
])
  assert.ok(readme.includes(boundary), `Missing claim boundary: ${boundary}`);

console.log("Jev five-variant claims match counts, provenance, timings, models and scope.");

// Keep the later experiment separate from archived native ratios and retain every failed cohort.
const compact = bench.compact;
const compactData = compact.evidence;
assert.equal(compactData.schema, "jev-compact-qualification/v2");
assert.equal(compactData.studies.length, 8);
assert.equal(new Set(compactData.studies.map((study) => study.provenance.freeze_sha256)).size, 8);
assert.equal(
  compactData.studies.reduce((n, study) => n + study.completed_executions, 0),
  1246,
);
assert.equal(
  compactData.studies.reduce((n, study) => n + study.actual_api_attempts, 0),
  1469,
);
assert.equal(compactData.completed_executions, bench.runCounts.compactDevelopment);
assert.equal(
  compactData.qualified_comparison_executions + compactData.invalid_provider_failure_executions,
  compactData.completed_executions,
);
for (const study of compactData.studies) {
  assert.equal(study.completed_executions, study.planned_executions);
  assert.equal(
    study.completed_executions,
    study.task_count * study.repetitions * study.arms.length,
  );
  assert.equal(study.harness_retries, 0);
  assert.equal(study.all_invariants_passed, true);
  assert.equal(
    Object.values(study.groups.all).reduce((n, arm) => n + arm.n, 0),
    study.completed_executions,
  );
  assert.equal(
    Object.values(study.groups.all).reduce((n, arm) => n + arm.actual_api_attempts, 0),
    study.actual_api_attempts,
  );
  for (const group of Object.values(study.groups))
    for (const arm of Object.values(group)) {
      assert.equal(arm.missing, 0);
      assert.equal(arm.completed, arm.n);
      if (study.comparison_valid === false) {
        assert.equal(arm.correct, null);
        assert.equal(arm.median_ms, null);
        assert.equal(arm.p95_ms, null);
        assert.equal(arm.errors, arm.n);
      } else {
        assert.equal(arm.timed_observations, arm.n);
        assert.ok(arm.correct + arm.errors <= arm.n);
        assert.ok(arm.median_ms > 0 && arm.p95_ms >= arm.median_ms);
      }
    }
}
const rejected = compactData.studies.find((study) => study.study_id === "first-small-dev");
assert.equal(rejected.comparison_valid, false);
assert.deepEqual(rejected.provider_http_status_counts, { 402: 150 });
assert.equal(rejected.usable_model_answers, 0);
assert.deepEqual(rejected.matched_pairwise_comparisons, {});
assert.equal(compactData.production_candidate_decision.shorter_variants_adopted, false);
for (const studyId of [
  "first-regression100",
  "first-challenge14",
  "first-fresh64",
  "first-restrictions16",
]) {
  const study = compactData.studies.find((entry) => entry.study_id === studyId);
  assert.equal(study.groups.all.jev_baseline.correct, study.groups.all.jev_compact_first.correct);
  const changes = study.changes_vs_concurrent_baseline.jev_compact_first;
  assert.deepEqual(changes.lost_correct_observations, []);
  assert.deepEqual(changes.gained_correct_observations, []);
}
// Packaging or future refactors must not silently claim this frozen runtime's qualification.
for (const [file, hash] of Object.entries(compact.study.provenance.runtime_sha256.compact_first)) {
  const bytes = readFileSync(
    new URL(
      `../../skills/skill-maintenance/jev-capability-advisor/scripts/${file}`,
      import.meta.url,
    ),
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    hash,
    `Compact benchmark revision drift: ${file}`,
  );
}
assert.ok(!("native" in compact.study.groups.all));
assert.equal(compact.study.completed_executions, 288);
assert.equal(compact.study.actual_api_attempts, 289);
assert.equal(compact.reductionPercent.toFixed(1), "6.3");
assert.equal(compact.remainingGapMs.toFixed(0), "33");
for (const row of compact.rows) {
  assert.equal(row.n, 80);
  assert.equal(row.none.n, 16);
  assert.equal(row.none.correct, 16);
  assert.equal(row.errors, 0);
  const text = `| ${row.label} | ${row.median_ms.toFixed(0)} ms | ${row.correct}/${row.n} | ${row.none.correct}/${row.none.n} |`;
  assert.ok(readme.replace(/\s+/g, " ").includes(text), `Compact README mismatch: ${row.id}`);
}
for (const note of compact.notes) assert.ok(readme.includes(`**${note.title}.** ${note.text}`));
assert.ok(readme.includes("150-observation cohort received only HTTP 402"));
assert.ok(readme.includes("historical timings stay separate"));
console.log(
  "Compact qualification matches all eight cohorts, exact runtime, failures and documentation.",
);
