// Synthetic in-memory fixtures only. These numbers are never public measurements.
import assert from "node:assert/strict";
import { getJevPromoComparison } from "../src/lib/jev-benchmarks.mjs";
import {
  selectorComparison,
  selectorArms,
  SELECTOR_SCHEMA,
} from "../src/lib/jev-selector-comparison.mjs";
const hash = "a".repeat(64);
const cases = Array.from({ length: 32 }, (_, i) => ({
  id: `test-${i}`,
  category: i < 24 ? "skill" : "none",
  allowed_ids: i < 24 ? [`fixture-skill-${i}`] : [],
  forbidden_ids: [],
}));
const fixture = {
  schema: SELECTOR_SCHEMA,
  protocol: {
    catalog_size: 132,
    skill_tasks: 24,
    none_tasks: 8,
    repetitions: 2,
    native_model: "gpt-6-luna",
    native_reasoning: "low",
    harness_retries: 0,
    warmups: 0,
    decision_cache: false,
    concurrent_jev_calls: 1,
    p95: "nearest_rank",
    timing_scope: "full_selection_without_process_startup",
  },
  audit: {
    passed: true,
    independent: true,
    source_equivalence: true,
    raw_reconstruction: true,
    protocol_compliance: true,
  },
  provenance: Object.fromEntries(
    ["catalog_sha256", "tasks_sha256", "freeze_sha256", "raw_manifest_sha256", "audit_sha256"].map(
      (k) => [k, hash],
    ),
  ),
  cases,
  selectors: selectorArms.map((arm) => ({
    arm,
    label: arm,
    info: "Synthetic test",
    requested_model: arm === "native" ? "gpt-6-luna" : "jev-latest",
    resolved_model: null,
    revision: "a".repeat(40),
    sourceUrl: "https://github.com/example/fixture",
    features: Array.from({ length: 5 }, (_, i) => ({
      label: `Feature ${i}`,
      value: "Not checked",
      status: "neutral",
    })),
  })),
  observations: selectorArms.flatMap((arm, a) =>
    cases.flatMap((task, i) =>
      [0, 1].map((rep) => ({
        arm,
        case_id: task.id,
        category: task.category,
        rep,
        status: task.category === "skill" ? "selected" : "none",
        selected_ids: task.allowed_ids,
        correct: true,
        error: null,
        selector_ms: 100 + a * 80 + i + rep * 0.125,
        raw_sha256: hash,
        input_tokens: arm === "native" ? null : 10 + a,
        output_tokens: 1,
        requests: arm === "native" ? null : 1,
        started_at: "2026-09-26T12:00:00Z",
        completed_at: "2026-09-26T12:00:01Z",
      })),
    ),
  ),
};
const result = selectorComparison(fixture);
assert.equal(result.rows.length, 6);
assert.equal(result.allRows.length, 7);
assert.equal(result.displayedObservations, 384);
assert.equal(result.measuredObservations, 448);
assert.equal(result.defaultId, "jev_session");
const native = result.rows.find((row) => row.arm === "native");
for (const row of result.rows) {
  assert.equal(row.observations, 48);
  assert.equal(row.noneObservations, 16);
  if (row.arm !== "native")
    assert.equal(row.factor, native.groups.skill.medianMs / row.groups.skill.medianMs);
}
assert.equal(native.groups.skill.inputTokens, null);
assert.equal(native.groups.all.requests, null);
assert.equal(result.rows[0].groups.skill.medianMs, 111.5625);
assert.equal(result.rows[0].groups.skill.p95Ms, 122.125);
let negative = 0;
function rejects(change) {
  const copy = structuredClone(fixture);
  change(copy);
  assert.throws(() => selectorComparison(copy), /Jev selector comparison:/);
  negative++;
}
rejects((x) => x.observations.pop());
rejects((x) => (x.observations[0] = x.observations[1]));
rejects((x) => (x.observations[0].error = "timeout"));
rejects((x) => (x.observations[0].selector_ms = null));
rejects((x) => (x.observations[0].selector_ms = NaN));
rejects((x) => (x.observations[0].selector_ms = 0));
rejects((x) => (x.observations[0].correct = false));
rejects((x) => (x.observations[0].selected_ids = ["wrong"]));
rejects((x) => (x.observations[0].status = "abstained"));
rejects((x) => (x.observations[0].raw_sha256 = "missing"));
rejects((x) => (x.observations[0].input_tokens = undefined));
rejects((x) => (x.observations[0].requests = -1));
rejects((x) => (x.observations[0].rep = 2));
rejects((x) => (x.observations[0].completed_at = "yesterday"));
rejects((x) => (x.protocol.native_reasoning = "medium"));
rejects((x) => (x.protocol.catalog_size = 64));
rejects((x) => (x.protocol.concurrent_jev_calls = 2));
rejects((x) => (x.protocol.harness_retries = 1));
rejects((x) => (x.audit.independent = false));
rejects((x) => (x.audit.protocol_compliance = false));
rejects((x) => delete x.audit.protocol_compliance);
rejects((x) => (x.selectors[0].requested_model = "gpt-6-luna"));
rejects((x) => (x.selectors[0].resolved_model = undefined));
rejects((x) => (x.selectors[0].features[0].status = "supported"));
rejects((x) => x.selectors[1].features.reverse());
const incomplete = structuredClone(fixture);
const incompleteRows = incomplete.observations
  .filter((row) => row.arm === "suggester")
  .slice(0, 24);
for (const row of incompleteRows)
  Object.assign(row, {
    status: "error",
    selected_ids: [],
    correct: false,
    error: "too_many_batch_candidates; narrow catalog",
  });
const incompleteResult = selectorComparison(incomplete);
assert.equal(incompleteResult.rows.length, 6);
assert.equal(incompleteResult.excludedRows.length, 1);
const excluded = incompleteResult.excludedRows[0];
assert.equal(excluded.arm, "suggester");
assert.equal(excluded.errors, 24);
assert.equal(excluded.factor, null);
assert.equal(excluded.medianSeconds, null);
assert.equal(excluded.p95Seconds, null);
assert.equal(excluded.groups.skill.medianMs, null);
assert.match(excluded.exclusionReason, /24 of 64/);
incompleteRows[0].selector_ms = null;
assert.doesNotThrow(() => selectorComparison(incomplete));
incompleteRows[0].error = "timeout";
assert.throws(() => selectorComparison(incomplete), /Jev selector comparison:/);
const imperfect = structuredClone(fixture);
imperfect.observations[0].selected_ids = ["incorrect-fixture-skill"];
imperfect.observations[0].correct = false;
imperfect.observations[2].status = "abstained";
imperfect.observations[2].selected_ids = [];
imperfect.observations[2].correct = false;
const weaker = selectorComparison(imperfect).rows.find((row) => row.arm === "jev");
assert.equal(weaker.correct, 46);
assert.equal(weaker.abstentions, 1);
assert.equal(weaker.medianSeconds, result.rows[0].medianSeconds);
const slower = structuredClone(fixture);
slower.observations.filter((row) => row.arm === "jev").forEach((row) => (row.selector_ms *= 10));
const slowerResult = selectorComparison(slower);
assert.notEqual(slowerResult.rows[0].arm, "jev");
assert.ok(slowerResult.rows.find((row) => row.arm === "jev").factor < 1);
assert.equal(
  slowerResult.rows.find((row) => row.arm === "jev").speedLabel,
  "Native selects faster",
);
const repaired = structuredClone(fixture);
Object.assign(repaired.audit, {
  qualification: "qualified_with_disclosed_deviations",
  protocol_compliance: false,
  repair_protocol_compliance: true,
  deviations_reviewed: true,
});
Object.assign(repaired.provenance, { repair_freeze_sha256: hash, source_audit_sha256: hash });
repaired.deviations = [
  "original_quota_stop_missed",
  "original_cli_identity_unrecorded",
  "separate_repair_window",
].map((code) => ({ code, detail: "Synthetic disclosure", evidence_sha256: hash }));
repaired.attempt_history = {
  total: 520,
  selected: 448,
  superseded: 72,
  original_errors: 96,
  repair_errors: 0,
};
repaired.measurement_windows = [
  {
    id: "original",
    attempts: 448,
    started_at: "2026-09-26T12:00:00Z",
    completed_at: "2026-09-26T12:00:01Z",
  },
  {
    id: "repair",
    attempts: 72,
    started_at: "2026-09-26T18:00:00Z",
    completed_at: "2026-09-26T18:00:01Z",
  },
];
let repairedNative = 0;
for (const row of repaired.observations) {
  const replaced = row.arm === "lomesh" || (row.arm === "native" && repairedNative++ < 8);
  row.window_id = replaced ? "repair" : "original";
  if (replaced) {
    row.started_at = repaired.measurement_windows[1].started_at;
    row.completed_at = repaired.measurement_windows[1].completed_at;
  }
}
assert.equal(selectorComparison(repaired).repaired, true);
for (const change of [
  (x) => (x.audit.protocol_compliance = true),
  (x) => (x.audit.repair_protocol_compliance = false),
  (x) => (x.audit.deviations_reviewed = false),
  (x) => x.deviations.pop(),
  (x) => (x.deviations[0].evidence_sha256 = "missing"),
  (x) => (x.attempt_history.total = 448),
  (x) => (x.attempt_history.repair_errors = 1),
  (x) => (x.measurement_windows[1].attempts = 71),
  (x) => (x.observations[0].window_id = "repair"),
  (x) => (x.observations.find((r) => r.arm === "lomesh").window_id = "original"),
]) {
  const copy = structuredClone(repaired);
  change(copy);
  assert.throws(() => selectorComparison(copy), /Jev selector comparison:/);
  negative++;
}
console.log(
  `Seven-selector admission: 448 synthetic rows; ${negative} rejection checks and valid imperfect outcomes pass.`,
);
// The actual published comparison must also reconcile to its independent calculation.
const actual = getJevPromoComparison();
assert.equal(actual.rows.length, 6);
assert.equal(actual.excludedRows[0].arm, "suggester");
assert.equal(actual.excludedRows[0].errors, 24);
assert.equal(actual.repaired, true);
assert.equal(actual.sourceReport.attempt_history.total, 520);
for (const row of actual.allRows) {
  for (const category of ["all", "skill", "none"]) {
    const computed = row.groups[category];
    const audited = actual.sourceReport.groups[row.arm][category];
    for (const key of ["n", "correct", "errors", "abstentions"])
      assert.equal(computed[key], audited[key]);
    for (const [computedKey, auditedKey] of [
      ["medianMs", "median_ms"],
      ["p95Ms", "p95_ms"],
      ["inputTokens", "input_tokens"],
      ["outputTokens", "output_tokens"],
      ["requests", "requests"],
    ])
      assert.equal(computed[computedKey], audited[auditedKey]);
  }
}
assert.equal(actual.rows.find((row) => row.arm === "hussi").errors, 0);
console.log(
  "Published comparison: six complete timing series, 520 retained attempts, two disclosed windows, independent factors and seven result rows verified.",
);
