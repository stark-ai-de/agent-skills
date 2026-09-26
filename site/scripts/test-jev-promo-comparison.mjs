// Synthetic Native fixtures ONLY. This is not measured evidence and must not ship as a report.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NATIVE_SCHEMA, joinNativeNextSkill } from "../src/lib/jev-native-next-skill.mjs";
import {
  promoComparison,
  visibleVariantIds,
  unmeasuredSelectorCandidates,
} from "../src/lib/jev-promo-comparison.mjs";
const report = JSON.parse(
  readFileSync(
    new URL(
      "../../skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-24.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const study = report.studies.find((s) => s.study_id === "next-skill-hidden32");
const hash = "0".repeat(64); // Explicit test-only placeholder digests.
const originals = study.observations.filter((row) => row.arm === "jev_next_skill");
const median = (a) => {
  a = [...a].sort((x, y) => x - y);
  return (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};
function regroup(value) {
  value.groups = {};
  for (const category of ["all", "skill", "none"]) {
    const rows = value.observations.filter((r) => category === "all" || r.category === category);
    const times = rows.map((r) => r.selector_ms).sort((a, b) => a - b);
    value.groups[category] = {
      n: rows.length,
      completed: rows.length,
      missing: 0,
      correct: rows.filter((r) => r.correct).length,
      errors: rows.filter((r) => r.error !== null).length,
      timeouts: rows.filter((r) => r.timed_out).length,
      timed_observations: times.length,
      missing_timing: 0,
      median_ms: median(times),
      p95_ms: times[Math.ceil(times.length * 0.95) - 1],
    };
  }
  return value;
}
const fixture = regroup({
  schema: NATIVE_SCHEMA,
  comparison: {
    study_id: study.study_id,
    ...Object.fromEntries(
      ["freeze_sha256", "tasks_sha256", "catalog_sha256"].map((k) => [k, study.provenance[k]]),
    ),
    source_sha256: structuredClone(study.provenance.source_sha256.next_skill),
  },
  model: { requested: "gpt-6-luna", reasoning: "medium", resolved: null },
  selection_profile: "next_skill",
  additional_work: "unassessed",
  statistics: { p95: "nearest_rank" },
  measurement: {
    started_at: "2026-09-24T12:00:00Z",
    completed_at: "2026-09-24T12:20:00Z",
    separate_measurement_window: true,
    timing_scope: "preparation_plus_model_turn",
    deadline_seconds: 90,
    harness_retries: 0,
    warmup: 0,
    fallbacks: 0,
    jev_api_calls: 0,
  },
  provenance: Object.fromEntries(
    ["freeze", "adapter", "schema", "schedule", "input_proof", "raw_results", "audit"].map((k) => [
      `${k}_sha256`,
      hash,
    ]),
  ),
  audit: Object.fromEntries(
    [
      "passed",
      "source_equivalence",
      "profile",
      "argv",
      "scoring",
      "raw_events",
      "process_cleanup",
    ].map((k) => [k, true]),
  ),
  counting: { planned: 64, completed: 64, missing: 0 },
  observations: originals.map((row, i) => ({
    case_id: row.case_id,
    rep: row.rep,
    category: row.category,
    selector_ms: 2000 + i + 0.125,
    preparation_ms: 5,
    model_turn_ms: 1995 + i + 0.125,
    status: row.category === "skill" ? "next_skill" : "none",
    selected_codes: row.category === "skill" ? ["000"] : [],
    allowed_codes: row.category === "skill" ? ["000"] : [],
    forbidden_codes: [],
    correct: true,
    error: null,
    timed_out: false,
    invariant_violations: [],
  })),
});

const result = joinNativeNextSkill(fixture, study);
assert.equal(result.rows.length, 4);
assert.equal(result.skillObservations, 48);
assert.equal(result.newCompletedExecutions, 64);
for (const row of result.rows.filter((r) => r.id !== "native")) {
  assert.equal(row.factor, fixture.groups.skill.median_ms / row.medianMs);
  assert.equal(row.n, 48);
}
assert.equal(result.rows[0].id, "hussi_session_control");
// Visibility is presentation-only: remove the experiment without changing any remaining data.
const visible = result.rows.filter((r) => r.id !== "hussi_session_control");
assert.equal(visible.length, 3);
assert.equal(visible[0].id, "jev_next_skill");

let negative = 0;
function rejects(change, reason) {
  const copy = structuredClone(fixture);
  change(copy);
  assert.throws(() => joinNativeNextSkill(copy, study), /Native next-skill comparison:/, reason);
  negative++;
}
assert.throws(() => joinNativeNextSkill(null, study), /missing or unsupported/);
negative++;
rejects((x) => (x.comparison.study_id = "next-skill-matched48"), "wrong cohort");
rejects((x) => (x.comparison.freeze_sha256 = hash), "wrong freeze");
rejects((x) => (x.comparison.tasks_sha256 = hash), "wrong tasks");
rejects((x) => (x.comparison.catalog_sha256 = hash), "wrong catalog");
rejects((x) => (x.comparison.source_sha256["jev_advisor.py"] = hash), "different runtime");
rejects((x) => (x.model.requested = "gpt-6-astra"), "no old model substitution");
rejects((x) => (x.model.reasoning = "low"), "no wrong effort");
rejects((x) => delete x.model.resolved, "unknown resolution must be explicit null");
rejects((x) => (x.selection_profile = "general"), "no cardinality contract change");
rejects((x) => (x.additional_work = "complete"), "no complete-task implication");
rejects((x) => (x.measurement.harness_retries = 1), "no retries");
rejects((x) => (x.measurement.jev_api_calls = 1), "no new Jev calls");
rejects((x) => (x.measurement.started_at = "2026-09-23T12:00:00Z"), "no historical timing reuse");
rejects((x) => (x.audit.argv = false), "failed model argument audit");
rejects((x) => delete x.provenance.input_proof_sha256, "missing source proof");
rejects((x) => (x.counting.completed = 63), "incomplete run");
rejects((x) => x.observations.pop(), "missing observation");
rejects((x) => (x.observations[0] = structuredClone(x.observations[1])), "duplicate pair");
rejects((x) => (x.observations[0].case_id = "invented"), "unknown task");
rejects((x) => (x.observations[0].rep = 2), "third repetition");
rejects(
  (x) => (x.observations[0].rep = String(x.observations[0].rep)),
  "repetition must be numeric",
);
rejects((x) => (x.observations[0].category = "compound"), "category mismatch");
rejects((x) => (x.observations[0].selector_ms = null), "no missing timing omission");
rejects((x) => (x.observations[0].timed_out = true), "no censored speed win");
rejects((x) => (x.observations[0].correct = null), "unknown correctness is not false");
rejects((x) => (x.observations[0].model_turn_ms += 100), "wrong timing components");
rejects((x) => (x.observations[0].invariant_violations = ["tool_execution"]), "isolation failure");
rejects(
  (x) => (x.observations.find((r) => r.category === "skill").selected_codes = ["c000"]),
  "old code prefix",
);
rejects(
  (x) => (x.observations.find((r) => r.category === "skill").selected_codes = ["000", "001"]),
  "multiple selections",
);
rejects(
  (x) => (x.observations.find((r) => r.category === "skill").selected_codes = ["001"]),
  "false correct claim",
);
rejects(
  (x) => (x.observations.find((r) => r.category === "none").status = "clarify"),
  "NONE differs from clarification",
);
rejects((x) => (x.groups.skill.n = 80), "old denominator");
rejects((x) => (x.groups.skill.median_ms = Math.round(x.groups.skill.median_ms)), "rounded median");
rejects((x) => (x.groups.skill.correct -= 1), "aggregate mismatch");
rejects((x) => delete x.groups.none, "missing separate NONE evidence");

// A worse Native outcome is valid evidence, not grounds for discarding its time.
const wrong = structuredClone(fixture);
const wrongRow = wrong.observations.find((r) => r.category === "skill");
wrongRow.selected_codes = ["001"];
wrongRow.correct = false;
regroup(wrong);
const wrongResult = joinNativeNextSkill(wrong, study);
assert.equal(wrongResult.nativeGroups.skill.correct, 47);
assert.equal(wrongResult.nativeGroups.skill.median_ms, fixture.groups.skill.median_ms);
const error = structuredClone(fixture);
const errorRow = error.observations.find((r) => r.category === "skill");
Object.assign(errorRow, {
  status: "error",
  selected_codes: [],
  error: "invalid_native_output",
  correct: false,
});
regroup(error);
assert.equal(joinNativeNextSkill(error, study).nativeGroups.skill.errors, 1);
// Faster Native must produce a sub-1 factor, never be clamped to a marketing win.
const faster = structuredClone(fixture);
for (const row of faster.observations) {
  row.selector_ms /= 10;
  row.preparation_ms /= 10;
  row.model_turn_ms /= 10;
}
regroup(faster);
assert.ok(
  joinNativeNextSkill(faster, study).rows.find((r) => r.id === "jev_next_skill").factor < 1,
);
console.log(
  `Native contract: positive joins + ${negative} negative cases passed; synthetic Native fixture only.`,
);

// The public product chart has three choices; the complete results retain the control.
const three = promoComparison(report, fixture);
const nativeWins = promoComparison(report, faster);
assert.ok(
  nativeWins.rows
    .filter((row) => row.id !== "native")
    .every((row) => row.factor < 1 && row.speedLabel === "Native selects faster"),
);
assert.ok(
  three.rows
    .filter((row) => row.id !== "native")
    .every((row) => row.factor > 1 && row.speedLabel === "Faster skill selection"),
);
assert.deepEqual(visibleVariantIds, ["jev_session", "hussi_original", "native"]);
assert.equal(three.rows.length, 3);
assert.deepEqual(three.excludedRows, [], "Error-free public arms remain eligible");
assert.equal(three.allRows.length, 4);
assert.deepEqual(
  three.rows,
  three.allRows.filter((row) => row.id !== "hussi_control"),
);
assert.equal(three.completedNativeExecutions, 64);
assert.equal(three.displayedObservations, 192);
assert.equal(three.hussiFactor.toFixed(2), "1.78");
assert.equal(three.inputSaving.toFixed(1), "6.3");
assert.ok(three.rows.every((row) => row.observations === 48 && row.features.length === 5));
const ours = three.rows.find((row) => row.id === "jev_session");
const hussi = three.rows.find((row) => row.id === "hussi_original");
const experiment = three.allRows.find((row) => row.id === "hussi_control");
assert.ok(experiment.experimental);
assert.ok(experiment.medianSeconds < ours.medianSeconds);
assert.deepEqual(experiment.features, []);
for (const row of three.rows) {
  assert.deepEqual(
    row.features.map((item) => item.label),
    ours.features.map((item) => item.label),
  );
}
assert.ok(ours.features.every((item) => item.status === "supported"));
assert.deepEqual(
  hussi.features.map((item) => item.status),
  ["supported", "supported", "unsupported", "unsupported", "supported"],
);
// Tie the advertised task-text allowance to the actual runtime, not a marketing target.
const advisor = readFileSync(
  new URL(
    "../../skills/skill-maintenance/jev-capability-advisor/scripts/jev_advisor.py",
    import.meta.url,
  ),
  "utf8",
);
const taskLimit = Number(advisor.match(/^MAX_QUERY_CHARS = ([\d_]+)$/m)[1].replaceAll("_", ""));
assert.equal(taskLimit, 16000);
assert.ok(ours.features[2].value.includes(taskLimit.toLocaleString("en-US")));
assert.ok(hussi.features[2].value.includes("600"));
assert.equal(three.rows.find((row) => row.id === "hussi_original").correct, 46);
assert.equal(
  three.rows.find((row) => row.id === "jev_session").sourcePath,
  "skills/skill-maintenance/jev-capability-advisor/SKILL.md",
);
assert.throws(() => promoComparison(report, null), /missing or unsupported/);
console.log(
  "Promo presentation: three public choices, complete control disclosure, invariant factors/samples and features passed.",
);

// The published comparison uses genuine Native observations, never this file's fixture.
const { getJevPromoComparison } = await import("../src/lib/jev-benchmarks.mjs");
const actual = getJevPromoComparison();
const currentReport = JSON.parse(
  readFileSync(
    new URL(
      "../../skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-25.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const nativeReceipt = JSON.parse(
  readFileSync(
    new URL(
      "../../skill-evals/jev-capability-advisor/benchmarks/native-next-skill-2026-09-25.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
assert.ok(!("totalRuns" in actual));
assert.equal(actual.rows.length, 2);
assert.equal(actual.displayedObservations, 128);
assert.deepEqual(
  actual.rows.map((row) => row.id),
  ["jev_session", "native"],
);
assert.deepEqual(
  actual.excludedRows.map((row) => row.id),
  ["hussi_original"],
);
assert.ok(actual.rows.every((row) => row.speedQualified));
assert.equal(actual.allRows.length, 4);
assert.ok(actual.runtime.disclosure.length > 0);
assert.equal(actual.completedNativeExecutions, 64);
assert.equal(
  actual.nativeCachedTurns,
  nativeReceipt.observations.filter((row) => row.usage.cached_input_tokens > 0).length,
);
assert.equal(actual.nativeCachedTurns, 45);
assert.equal(actual.rows.find((row) => row.id === "native").medianSeconds, 3.091701245495642);
assert.equal(actual.rows.find((row) => row.id === "jev_session").factor.toFixed(2), "6.42");
assert.equal(actual.hussiFactor, null, "A retained comparator timeout cannot become a speed claim");
const timedOutHussi = actual.allRows.find((row) => row.id === "hussi_original");
assert.equal(timedOutHussi.factor, null);
assert.equal(timedOutHussi.correct, 45);
assert.equal(timedOutHussi.errorLabel, "1 timeout");
assert.equal(timedOutHussi.speedLabel, "Speed factor withheld");
assert.match(timedOutHussi.info, /2 abstentions and 1 timeout/);
assert.equal(actual.runtime.measuredRevision, "095de174e8eb345b27a726631c6a2215168958df");
assert.equal(
  actual.evidencePath,
  "skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-25.json",
);
assert.equal(actual.previouslyExposed, true);
assert.equal(
  nativeReceipt.provenance.raw_results_sha256,
  "974a199354e8a2db38b775ce8ff90330736502d1bf19a63ed962b41f9ec95adf",
);
assert.equal(nativeReceipt.groups.skill.p95_ms, 5916.691621998325);
assert.equal(nativeReceipt.source_export_groups.skill.timing.selector_ms.p95_ms, 5916.692);
const historicalNative = JSON.parse(
  readFileSync(
    new URL(
      "../../skill-evals/jev-capability-advisor/benchmarks/native-next-skill-2026-09-24.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
assert.equal(
  promoComparison(report, historicalNative)
    .rows.find((r) => r.id === "jev_session")
    .factor.toFixed(2),
  "6.40",
);
assert.throws(() => promoComparison(report, nativeReceipt), /Native freeze_sha256 mismatch/);
assert.throws(
  () => promoComparison(currentReport, historicalNative),
  /Native freeze_sha256 mismatch/,
);
assert.equal(
  joinNativeNextSkill(
    nativeReceipt,
    currentReport.studies.find((s) => s.study_id === "next-skill-hidden32"),
  ).rows.find((r) => r.id === "hussi_original").factor,
  null,
);
const wrongQuantile = structuredClone(nativeReceipt);
wrongQuantile.statistics.p95 = "linear_interpolation";
assert.throws(() => promoComparison(currentReport, wrongQuantile), /percentile convention/);
const readme = readFileSync(
  new URL("../../docs/skills/jev-capability-advisor/benchmarks/README.md", import.meta.url),
  "utf8",
);
const currentReadme = readme
  .split("## Current next-skill comparison\n")[1]
  .split("\n## Product features")[0];
const productReadme = readme
  .split("## Product features and measured selection\n")[1]
  .split("\n## Next-skill input efficiency")[0]
  .replace(/\s+/g, " ");
for (let index = 0; index < ours.features.length; index++) {
  const left = ours.features[index];
  const right = hussi.features[index];
  assert.ok(
    productReadme.includes(
      `| ${left.label} | ✓ ${left.value} | ${right.status === "supported" ? "✓" : "✕"} ${right.value} |`,
    ),
    `Product README differs: ${left.label}`,
  );
}
for (const row of actual.allRows) {
  const expected = `| ${row.label}${row.experimental ? " (internal, unpublished)" : ""} | ${row.medianSeconds.toFixed(6)} s | ${row.p95Seconds.toFixed(6)} s | ${row.id === "native" ? "Baseline" : row.factor === null ? "Withheld (timeout)" : row.factor.toFixed(2) + "×"} | ${row.correct}/${row.observations} | ${row.noneCorrect}/${row.noneObservations} | ${row.errors} |`;
  assert.ok(
    currentReadme.replace(/\s+/g, " ").includes(expected),
    `Current README row differs: ${row.id}`,
  );
}
for (const value of [
  actual.nativeModel,
  "reasoning " + actual.nativeReasoning,
  actual.nativeWindow.started_at,
  actual.nativeWindow.summary_written_at,
  actual.jevWindow.started_at,
  `${actual.rows.find((r) => r.id === "jev_session").factor.toFixed(2)}×`,
])
  assert.ok(currentReadme.includes(value), `README missing current value: ${value}`);
assert.ok(!/80\/80|9\.54/.test(currentReadme));
assert.ok(!/\/home\/|\/tmp\/|servrox|Bearer /.test(JSON.stringify(nativeReceipt)));
console.log(
  "Actual Native import: full-precision factors, 48/16 cohorts, quantile provenance, runtime disclosure and README parity passed.",
);

// Discovery candidates cannot acquire fabricated timing bars or Native factors.
assert.deepEqual(
  unmeasuredSelectorCandidates.map((row) => row.label),
  ["skill-picker", "jev-skill-suggester", "SkillRanker", "skill-router (Lomesh)"],
);
for (const candidate of unmeasuredSelectorCandidates) {
  assert.match(candidate.sourceUrl, /^https:\/\/github\.com\/[^/]+\/[^/]+$/);
  assert.equal(candidate.medianSeconds, undefined);
  assert.equal(candidate.factor, undefined);
}
console.log(
  "Chart eligibility: failed Hussi timing excluded, complete evidence retained, candidates unmeasured.",
);
