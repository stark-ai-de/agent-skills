import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { jevBenchmarks as bench } from "../src/lib/jev-benchmarks.mjs";

const current = bench.current;
const native = current.nativeEvidence;
const proof = current.parity;
const readme = readFileSync(new URL(`../../${bench.readmePath}`, import.meta.url), "utf8");
const normalized = readme.replace(/\s+/g, " ");
const totals = current.evidence.benchmark_totals;
assert.equal(totals.planned_executions, 880);
assert.equal(totals.completed_executions, 880);
assert.equal(totals.missing_executions, 0);
assert.equal(bench.resumed.benchmark_totals.completed_executions, 2540);
assert.equal(bench.resumed.completed_health_checks, 1);
assert.equal(bench.resumed.studies.filter((study) => study.role !== "health").length, 10);
assert.equal(native.observations, 96);
assert.equal(native.complete, true);
assert.equal(native.all_invariants_passed, true);
assert.equal(native.requested_model, "gpt-6-astra");
assert.equal(native.requested_reasoning_effort, "low");
assert.equal(native.resolved_backend_model, null);
assert.equal(native.separate_measurement_window, true);
assert.equal(native.common_dataset_sha256, current.study.provenance.tasks_sha256);
assert.equal(native.common_catalog_sha256, current.study.provenance.normalized_catalog_sha256);
assert.deepEqual(native.source_sha256, current.study.provenance.runtime_sha256.baseline);
assert.equal(proof.native_input_identity.all_checks_passed, true);
assert.equal(proof.native_input_identity.unique_tasks, 48);
assert.equal(proof.native_input_identity.native_prompt_comparisons, 96);
assert.equal(
  proof.native_input_identity.freeze_sha256["memo-matched48"],
  current.study.provenance.freeze_sha256,
);
assert.equal(proof.native_input_identity.freeze_sha256["baseline48-native"], native.freeze_sha256);
assert.equal(proof.replay.all_checks_passed, true);
assert.equal(proof.replay.observations_replayed, 676);
assert.equal(proof.replay.recorded_requests_replayed, 868);
assert.equal(proof.replay.new_api_calls, 0);
assert.equal(proof.new_live_executions, 0);
assert.equal(proof.decision.fastest_claim, false);
assert.equal(proof.unit_tests, 149);
assert.equal(proof.independent_audit.all_checks_passed, true);
assert.deepEqual(proof.independent_audit.native_audit.groups, native.groups);
assert.equal(proof.independent_audit.counts.total_new_live_observations, 976);
assert.equal(
  proof.independent_audit.native_audit.observations_with_reported_cached_input_tokens,
  51,
);
assert.equal(proof.package_qualification.skill_file_count, 13);
for (const result of proof.package_qualification.results) {
  assert.equal(result.exact_skill_files, 13);
  assert.equal(result.network_attempts, 0);
}
assert.deepEqual(proof.replay.source_sha256, current.study.provenance.runtime_sha256.candidate);

for (const [file, hash] of Object.entries(proof.replay.source_sha256)) {
  const source = readFileSync(
    new URL(
      `../../skills/skill-maintenance/jev-capability-advisor/scripts/${file}`,
      import.meta.url,
    ),
  );
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    hash,
    `Qualified runtime drift: ${file}`,
  );
}
for (const study of current.evidence.studies) {
  assert.equal(study.comparison_valid, true);
  assert.equal(
    study.completed_executions,
    study.task_count * study.repetitions * study.arms.length,
  );
  assert.equal(study.missing_executions, 0);
  assert.equal(study.harness_retries, 0);
  assert.equal(study.all_recorded_invariants_passed, true);
  assert.equal(study.cpu_overlap_disclosed, false);
  assert.equal(
    Object.values(study.groups.all).reduce((n, arm) => n + arm.completed, 0),
    study.completed_executions,
  );
  for (const group of Object.values(study.groups)) {
    for (const arm of Object.values(group)) {
      assert.equal(arm.missing, 0);
      assert.equal(arm.completed, arm.n);
      assert.equal(arm.timed_observations, arm.n);
      assert.ok(arm.correct + arm.errors <= arm.n);
      assert.ok(arm.median_ms > 0 && arm.p95_ms >= arm.median_ms);
    }
  }
}
assert.equal(current.study.groups.skill.jev_baseline.correct, 80);
assert.equal(current.study.groups.skill.jev_candidate.correct, 79);
assert.equal(current.mixed.groups.all.jev_baseline.correct, 174);
assert.equal(current.mixed.groups.all.jev_candidate.correct, 173);
assert.ok(
  current.optimization.smallCatalogChangePercent > 0,
  "Retain the slower small-catalog result",
);
assert.equal(current.optimization.reductionPercent.toFixed(1), "13.6");
assert.equal(current.displayedObservations, 480);
assert.equal(current.rows.length, 5);
assert.equal(new Set(current.rows.map((row) => row.id)).size, 5);
assert.equal(current.defaultId, "jev_session");
assert.equal(current.baselineId, "native");
let previousReadmeRow = -1;
for (const [index, row] of current.rows.entries()) {
  assert.ok(index === 0 || row.medianSeconds >= current.rows[index - 1].medianSeconds);
  assert.equal(row.observations, 80);
  assert.equal(row.noneObservations, 16);
  const positive = current.groups.primary_positive.arms[row.id];
  const none = current.groups.none.arms[row.id];
  const all = current.groups.all.arms[row.id];
  assert.equal(positive.correct + none.correct, all.correct);
  assert.equal(positive.errors + none.errors, all.errors);
  assert.equal(positive.timed_observations, positive.n);
  assert.equal(
    row.factor,
    row.id === "native"
      ? null
      : native.groups.primary_positive.native.median_ms / positive.median_ms,
  );
  assert.equal(row.experimental, row.id === "hussi_control");
  const text = `| ${row.label} | ${row.medianSeconds.toFixed(3)} s | ${row.p95Seconds.toFixed(3)} s | ${row.correct}/${row.observations} | ${row.noneCorrect}/${row.noneObservations} | ${row.errors} |`;
  const at = normalized.indexOf(text);
  assert.ok(at > previousReadmeRow, `Current README row missing or unordered: ${row.id}`);
  previousReadmeRow = at;
}
for (const row of current.optimization.rows) {
  assert.ok(
    normalized.includes(
      `| ${row.label} | ${row.median_ms.toFixed(0)} ms | ${row.correct}/${row.n} | ${row.errors} |`,
    ),
  );
}
for (const section of [current.technical, current.experiment, current.optimization]) {
  assert.ok(readme.includes(section.title));
  for (const note of section.notes) assert.ok(readme.includes(`**${note.title}.** ${note.text}`));
}
for (const row of current.technical.rows)
  assert.ok(normalized.includes(`| ${row.topic} | ${row.hussi} | ${row.jev} |`));
for (const text of [
  "13.6%",
  "79/80",
  "173/200",
  "676 recorded-response replays",
  "11,308 completed benchmark executions",
  "Native uses baseline preparation",
])
  assert.ok(readme.includes(text), `Missing current scope: ${text}`);
console.log(
  "Current Session evidence matches live counts, source identity, Native inputs, quality tradeoffs and documentation.",
);
