import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { nextSkillComparison } from "../src/lib/jev-next-skill-benchmarks.mjs";

const reportPath =
  process.argv[2] ??
  new URL(
    "../../skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-24.json",
    import.meta.url,
  );
const report = JSON.parse(readFileSync(reportPath, "utf8"));
const comparison = nextSkillComparison(report);
const runtimeDirectory =
  process.argv[3] ??
  fileURLToPath(
    new URL("../../skills/skill-maintenance/jev-capability-advisor/scripts/", import.meta.url),
  );
assert.deepEqual(
  Object.keys(comparison.source).sort(),
  [
    "decision_cache.py",
    "https_transport.py",
    "index_cache.py",
    "jev_advisor.py",
    "jev_session.py",
    "retrieval.py",
    "routing_metadata.py",
  ],
  "Bind every qualified runtime module, and accept no arbitrary source path",
);
for (const [file, expectedHash] of Object.entries(comparison.source)) {
  assert.equal(
    createHash("sha256")
      .update(readFileSync(join(runtimeDirectory, file)))
      .digest("hex"),
    expectedHash,
    `Current canonical runtime differs from the qualified next-skill source: ${file}`,
  );
}
assert.equal(comparison.cohorts.length, 2);
assert.equal(comparison.confirmationExecutions, 480);
assert.equal(comparison.developmentExecutions, 9);
assert.equal(comparison.completedExecutions, 489);
assert.deepEqual(
  comparison.cohorts.map((cohort) => cohort.skillObservations),
  [80, 48],
);
assert.deepEqual(
  comparison.cohorts.map((cohort) => cohort.noneObservations),
  [16, 16],
);
assert.deepEqual(
  comparison.cohorts[0].rows.map((row) => row.id),
  ["jev_next_skill", "hussi_original", "hussi_session_control"],
);
for (const cohort of comparison.cohorts) {
  assert.equal(cohort.rows.length, 3);
  assert.equal(cohort.rows[0].skillCorrect, cohort.skillObservations);
  assert.equal(cohort.rows[0].noneCorrect, cohort.noneObservations);
  assert.equal(
    cohort.reductionVsPublished,
    (1 - cohort.rows[0].totalInputTokens / cohort.rows[1].totalInputTokens) * 100,
  );
  assert.equal(
    cohort.reductionVsControl,
    (1 - cohort.rows[0].totalInputTokens / cohort.rows[2].totalInputTokens) * 100,
  );
  assert.equal(
    cohort.pooledControlFaster,
    cohort.rows[2].medianLatencyMs < cohort.rows[0].medianLatencyMs,
  );
  assert.equal(cohort.rows[2].experiment, true);
}
assert.equal(comparison.parity.replays, 232);
assert.equal(
  comparison.parity.preservedWrong,
  report.general_unchanged_path_parity.replay_observations.preserved_baseline_wrong,
);
assert.ok(comparison.knownInheritedLimitation, "Keep the retained alias limitation visible");

const readme = readFileSync(
  new URL("../../docs/skills/jev-capability-advisor/benchmarks/README.md", import.meta.url),
  "utf8",
);
const normalizedReadme = readme.replace(/\s+/g, " ");
const number = (value) => value.toLocaleString("en-US", { maximumFractionDigits: 1 });
for (const cohort of comparison.cohorts) {
  assert.ok(readme.includes(`### ${cohort.label}`));
  assert.ok(
    readme.includes(
      `**${cohort.reductionVsPublished.toFixed(1)}% less total skill-selection input**`,
    ),
  );
  for (const row of cohort.rows) {
    const label = row.label + (row.experiment ? " (experiment)" : "");
    const expected = `| ${label} | ${number(row.medianInputTokens)} | ${number(row.totalInputTokens)} | ${row.skillCorrect}/${row.skillObservations} | ${row.noneCorrect}/${row.noneObservations} | ${(row.medianLatencyMs / 1000).toFixed(3)} s |`;
    assert.ok(
      normalizedReadme.includes(expected),
      `README row differs from shared evidence: ${cohort.id}/${row.id}`,
    );
  }
}
for (const scope of [
  "provider-reported input tokens",
  "remaining work explicitly unassessed",
  "pooled Hussi control remains slightly faster",
  "15,100 completed benchmark executions",
  "107 observations left unexecuted",
  "173 main contract tests passed",
]) {
  assert.ok(readme.includes(scope), `Missing README scope: ${scope}`);
}
const developmentBytes = readFileSync(
  new URL(
    "../../skill-evals/jev-capability-advisor/benchmarks/optimization-development-2026-09-24.json",
    import.meta.url,
  ),
);
const development = JSON.parse(developmentBytes);
assert.equal(
  createHash("sha256").update(developmentBytes).digest("hex"),
  report.historical_campaign.ledger_sha256,
);
for (const field of [
  "completed_executions",
  "recorded_api_attempts",
  "missing_planned_executions",
]) {
  assert.equal(development.campaign[field], report.historical_campaign[field]);
}
assert.equal(
  report.historical_campaign.completed_executions + report.counting.completed_executions + 11308,
  15100,
);
assert.equal(report.historical_campaign.diagnostic_calls_separate, 2);
assert.equal(report.historical_campaign.missing_planned_executions, 107);

const matched = (r) => r.studies.find((study) => study.study_id === "next-skill-matched48");
const hidden = (r) => r.studies.find((study) => study.study_id === "next-skill-hidden32");
const ourSkill = (r) =>
  matched(r).observations.find((row) => row.arm === "jev_next_skill" && row.category === "skill");
let negativeCases = 0;
function rejects(change, reason, expected = /Jev next-skill comparison:/) {
  const mutated = structuredClone(report);
  change(mutated);
  assert.throws(() => nextSkillComparison(mutated), expected, reason);
  negativeCases += 1;
}
function syncTokens(study) {
  for (const [category, arms] of Object.entries(study.groups))
    for (const [arm, group] of Object.entries(arms)) {
      const values = study.observations
        .filter((row) => row.arm === arm && (category === "all" || row.category === category))
        .map((row) => row.input_tokens)
        .sort((left, right) => left - right);
      const total = values.reduce((n, value) => n + value, 0);
      group.input_tokens_per_fully_reported_selection.median =
        values.length % 2
          ? values[Math.floor(values.length / 2)]
          : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
      group.input_tokens_per_fully_reported_selection.total = total;
      group.input_tokens_for_all_completed_selections = total;
      group.input_tokens_for_all_scheduled_selections = total;
    }
}
rejects((r) => {
  r.final_qualification_passed = false;
}, "Do not publish a matched-only pass");
rejects((r) => {
  r.included_gates_passed = false;
}, "Honor failed included evidence");
rejects((r) => {
  r.studies = [matched(r)];
}, "Require hidden confirmation and separate development");
rejects((r) => {
  r.studies.push(structuredClone(matched(r)));
}, "Do not duplicate a favorable cohort");
rejects((r) => {
  hidden(r).gate.passed = false;
}, "Keep confirmation's own gate");
rejects((r) => {
  hidden(r).missing_executions = 1;
}, "Do not omit missing observations");
rejects((r) => {
  ourSkill(r).correct = false;
}, "Do not trade correctness for token savings");
rejects((r) => {
  ourSkill(r).status = "selected";
}, "Keep the explicitly partial next-skill result");
rejects((r) => {
  ourSkill(r).mode = "SINGLE";
}, "Do not silently reinterpret general output");
rejects((r) => {
  ourSkill(r).input_tokens = null;
}, "Unknown provider usage is not zero");
rejects((r) => {
  ourSkill(r).requests_missing_usage = 1;
}, "Keep all call usage");
rejects((r) => {
  ourSkill(r).request_count = 2;
}, "Enforce the measured one-call contract");
rejects((r) => {
  ourSkill(r).reported_input_tokens_partial_sum += 1;
}, "Reported usage must reconcile");
rejects((r) => {
  matched(r).groups.skill.jev_next_skill.input_tokens_per_fully_reported_selection.median -= 100;
}, "Recompute medians from observations");
rejects((r) => {
  matched(r).groups.skill.jev_next_skill.input_tokens_for_all_scheduled_selections -= 100;
}, "Do not replace aggregate total with a favorable subtotal");
rejects(
  (r) => {
    const row = ourSkill(r);
    row.input_tokens += 200000;
    row.reported_input_tokens_partial_sum = row.input_tokens;
    syncTokens(matched(r));
  },
  "A median win cannot hide a total loss",
  /no median and total token win/,
);
rejects((r) => {
  matched(r).groups.skill.jev_next_skill.selection_latency_ms.median -= 100;
}, "Latency remains an independent measured quantity");
rejects((r) => {
  matched(r).observations[1] = structuredClone(matched(r).observations[0]);
}, "Reject duplicated task/arm observations");
rejects((r) => {
  hidden(r).arm_selection_profile.jev_next_skill = "general";
}, "Do not combine profiles");
rejects((r) => {
  hidden(r).arm_request_caps.jev_next_skill = 3;
}, "Do not combine different request limits");
rejects((r) => {
  hidden(r).catalog_records = 718;
}, "Do not extend the catalog claim");
rejects((r) => {
  hidden(r).provenance.catalog_sha256 = "0".repeat(64);
}, "Use the same catalog");
rejects((r) => {
  hidden(r).response_reported_models = { "other-model": 192 };
}, "Do not switch the provider model");
rejects((r) => {
  hidden(r).provenance.source_sha256.next_skill["jev_advisor.py"] = "0".repeat(64);
}, "Bind both cohorts to one implementation");
rejects((r) => {
  hidden(r).window.started_at = matched(r).window.started_at;
}, "Hold confirmation until matched completion");
rejects((r) => {
  r.general_unchanged_path_parity.passed = false;
}, "Preserve the general-path regression guard");
rejects((r) => {
  r.general_unchanged_path_parity.candidate_source_sha256["jev_session.py"] = "0".repeat(64);
}, "Replay must cover the live candidate");
rejects((r) => {
  r.general_unchanged_path_parity.new_live_observations = 232;
}, "Offline replay is not a live cohort");
rejects((r) => {
  r.counting.completed_executions += 232;
}, "Do not count replay as live executions");
rejects((r) => {
  hidden(r).provenance.hussi_revision = "0".repeat(40);
}, "Keep one pinned Hussi source");

console.log(
  `Next-skill comparison: two audited cohorts, seven current runtime hashes, complete accounting and ${negativeCases} negative contract cases passed.`,
);
