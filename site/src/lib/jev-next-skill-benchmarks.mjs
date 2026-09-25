import { measurementSeries } from "./jev-measurement-series.mjs";

const OURS = "jev_next_skill";
const HUSSI = ["hussi_original", "hussi_session_control"];
const ARMS = [OURS, ...HUSSI];
const CATALOG_SHA = "4f7b6e2d7a71d495bce85cae62eaf0a104289f156eab9e948ef96b9e1f93759e";
const MODEL = "jev-1.13.0";
const SPECS = [
  {
    id: "next-skill-matched48",
    label: "Matched tasks",
    skill: 80,
    none: 16,
    repetitions: 2,
    arms: ARMS,
  },
  {
    id: "next-skill-hidden32",
    label: "Independent confirmation",
    skill: 48,
    none: 16,
    repetitions: 2,
    arms: ARMS,
  },
  {
    id: "next-skill-dev9",
    label: "Development smoke",
    skill: 8,
    none: 1,
    repetitions: 1,
    arms: [OURS],
  },
];
const requireEvidence = (condition, message) => {
  if (!condition) throw new Error(`Jev next-skill comparison: ${message}`);
};
const sameMembers = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  new Set(left).size === left.length &&
  left.every((item) => right.includes(item));
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[center] : (sorted[center - 1] + sorted[center]) / 2;
};
const sum = (values) => values.reduce((total, value) => total + value, 0);
const percentage = (ours, theirs) => (1 - ours / theirs) * 100;
const sourcesEqual = (left, right) =>
  left &&
  right &&
  sameMembers(Object.keys(left), Object.keys(right)) &&
  Object.entries(left).every(([file, hash]) => /^[a-f0-9]{64}$/.test(hash) && right[file] === hash);

function checkGroup(study, category, arm, expected) {
  const rows = study.observations.filter(
    (row) => row.arm === arm && (category === "all" || row.category === category),
  );
  const group = study.groups[category]?.[arm];
  const label = `${study.study_id}/${category}/${arm}`;
  requireEvidence(
    rows.length === expected &&
      group?.n === expected &&
      group.completed === expected &&
      group.missing === 0,
    `${label}: incomplete observations`,
  );
  const correct = rows.filter((row) => row.correct).length;
  const errors = rows.filter((row) => row.error !== null).length;
  requireEvidence(
    group.correct === correct && group.errors === errors && correct + errors <= expected,
    `${label}: outcome accounting differs`,
  );
  const tokens = rows.map((row) => row.input_tokens);
  const latency = rows.map((row) => row.selector_ms);
  const usage = group.usage_coverage;
  const requests = sum(rows.map((row) => row.request_count));
  requireEvidence(
    usage?.completed_selections === expected &&
      usage.fully_reported_selections === expected &&
      usage.selections_with_missing_usage === 0 &&
      usage.requests_missing_usage === 0 &&
      usage.request_count === requests &&
      usage.requests_with_usage === requests,
    `${label}: incomplete provider usage`,
  );
  const metric = group.input_tokens_per_fully_reported_selection;
  requireEvidence(
    metric?.n === expected &&
      metric.median === median(tokens) &&
      metric.total === sum(tokens) &&
      group.input_tokens_for_all_completed_selections === metric.total &&
      group.input_tokens_for_all_scheduled_selections === metric.total,
    `${label}: token metrics differ from observations`,
  );
  requireEvidence(
    group.selection_latency_ms?.n === expected &&
      group.selection_latency_ms.median === median(latency),
    `${label}: latency differs from observations`,
  );
  if (arm === OURS)
    requireEvidence(
      correct === expected && errors === 0,
      `${label}: candidate quality floor failed`,
    );
  return group;
}

function checkStudy(study, spec) {
  const expected = (spec.skill + spec.none) * spec.arms.length;
  const development = spec.arms.length === 1;
  requireEvidence(
    study.role === (development ? "development" : "confirmation") &&
      study.comparison_valid === true &&
      study.gate?.passed === true &&
      study.gate.kind ===
        (development ? "development_smoke_only" : "confirmation_token_and_quality") &&
      study.gate.quality_floor_passed === true &&
      study.gate.all_usage_known === true &&
      study.all_recorded_invariants_passed === true &&
      study.halt_reason === null,
    `${spec.id}: unqualified cohort`,
  );
  requireEvidence(
    study.planned_executions === expected &&
      study.completed_executions === expected &&
      study.missing_executions === 0 &&
      study.observations?.length === expected,
    `${spec.id}: incomplete schedule`,
  );
  requireEvidence(
    sameMembers(Object.keys(study.groups), ["all", "skill", "none"]) &&
      ["all", "skill", "none"].every((category) =>
        sameMembers(Object.keys(study.groups[category]), spec.arms),
      ),
    `${spec.id}: wrong categories or variants`,
  );
  requireEvidence(
    study.requested_model === MODEL &&
      sameMembers(Object.keys(study.response_reported_models), [MODEL]),
    `${spec.id}: model changed`,
  );
  requireEvidence(
    sameMembers(Object.keys(study.arm_selection_profile), spec.arms) &&
      sameMembers(Object.keys(study.arm_request_caps), spec.arms) &&
      spec.arms.every(
        (arm) =>
          study.arm_request_caps[arm] === 1 &&
          study.arm_selection_profile[arm] === (arm === OURS ? "next_skill" : "upstream_chooser"),
      ),
    `${spec.id}: profile changed`,
  );
  requireEvidence(
    study.catalog_records === 132 && study.provenance.catalog_sha256 === CATALOG_SHA,
    `${spec.id}: catalog changed`,
  );
  const pairs = new Map();
  for (const row of study.observations) {
    requireEvidence(
      spec.arms.includes(row.arm) &&
        ["skill", "none"].includes(row.category) &&
        integer(row.rep) &&
        row.rep < spec.repetitions &&
        typeof row.case_id === "string" &&
        row.case_id.length > 0 &&
        typeof row.correct === "boolean" &&
        (row.error === null || typeof row.error === "string") &&
        integer(row.input_tokens) &&
        Number.isFinite(row.selector_ms) &&
        row.selector_ms > 0 &&
        integer(row.request_count) &&
        row.request_count <= 1 &&
        row.requests_missing_usage === 0 &&
        row.requests_with_usage === row.request_count &&
        row.reported_input_tokens_partial_sum === row.input_tokens,
      `${spec.id}: malformed or unknown observation usage`,
    );
    if (row.arm === OURS)
      requireEvidence(
        row.error === null &&
          row.correct &&
          row.status === (row.category === "skill" ? "next_skill" : "none") &&
          row.mode === (row.category === "skill" ? "NEXT_SKILL" : "NONE"),
        `${spec.id}: wrong next-skill outcome`,
      );
    const key = `${row.case_id}:${row.rep}`;
    const pair = pairs.get(key) ?? { category: row.category, arms: [] };
    requireEvidence(
      pair.category === row.category && !pair.arms.includes(row.arm),
      `${spec.id}: duplicated or unpaired row`,
    );
    pair.arms.push(row.arm);
    pairs.set(key, pair);
  }
  requireEvidence(
    [...pairs.values()].every((pair) => sameMembers(pair.arms, spec.arms)),
    `${spec.id}: unmatched task pairs`,
  );
  const cases = new Map();
  for (const row of study.observations.filter((row) => row.arm === OURS)) {
    const entry = cases.get(row.case_id) ?? { category: row.category, repetitions: new Set() };
    requireEvidence(entry.category === row.category, `${spec.id}: task category changed`);
    entry.repetitions.add(row.rep);
    cases.set(row.case_id, entry);
  }
  requireEvidence(
    cases.size === (spec.skill + spec.none) / spec.repetitions &&
      [...cases.values()].every((entry) => entry.repetitions.size === spec.repetitions),
    `${spec.id}: missing task repetition`,
  );
  requireEvidence(
    Date.parse(study.window.started_at) <= Date.parse(study.window.summary_written_at),
    `${spec.id}: invalid measurement window`,
  );
  const calls = sum(study.observations.map((row) => row.request_count));
  requireEvidence(
    study.recorded_api_attempts === calls && study.response_reported_models[MODEL] === calls,
    `${spec.id}: API/model accounting differs`,
  );
  for (const category of ["all", "skill", "none"]) {
    for (const arm of spec.arms)
      checkGroup(
        study,
        category,
        arm,
        category === "all" ? spec.skill + spec.none : spec[category],
      );
  }
  if (!development) {
    const wins = study.gate.median_and_total_token_wins;
    requireEvidence(
      sameMembers(
        Object.keys(wins),
        ["skill", "all"].flatMap((category) => HUSSI.map((arm) => `${category}__vs__${arm}`)),
      ),
      `${spec.id}: missing primary KPI gates`,
    );
    for (const category of ["skill", "all"])
      for (const arm of HUSSI) {
        const ours = study.groups[category][OURS].input_tokens_per_fully_reported_selection;
        const other = study.groups[category][arm].input_tokens_per_fully_reported_selection;
        requireEvidence(
          wins[`${category}__vs__${arm}`] === true &&
            ours.median < other.median &&
            ours.total < other.total,
          `${spec.id}/${category}/${arm}: no median and total token win`,
        );
      }
  }
}

/** Fail closed: a matched-only pass never becomes a public two-cohort claim. */
export function nextSkillComparison(report) {
  requireEvidence(
    report?.schema === "jev-next-skill-audited-report/v1" && report.profile === "next_skill",
    "unsupported report",
  );
  requireEvidence(
    report.included_gates_passed === true && report.final_qualification_passed === true,
    "final qualification incomplete",
  );
  requireEvidence(
    Array.isArray(report.studies) &&
      sameMembers(
        report.studies.map((study) => study.study_id),
        SPECS.map((spec) => spec.id),
      ),
    "require both confirmation cohorts and separate development smoke",
  );
  const studies = SPECS.map((spec) => {
    const study = report.studies.find((entry) => entry.study_id === spec.id);
    checkStudy(study, spec);
    return { spec, study };
  });
  const source = studies[0].study.provenance.source_sha256;
  const binding = studies[0].study.provenance.binding_sha256;
  requireEvidence(
    /^[a-f0-9]{64}$/.test(binding) && report.binding_sha256 === binding,
    "predeclaration binding differs",
  );
  for (const { study } of studies) {
    requireEvidence(
      sourcesEqual(source.next_skill, study.provenance.source_sha256.next_skill) &&
        sourcesEqual(source.baseline, study.provenance.source_sha256.baseline) &&
        study.provenance.binding_sha256 === binding,
      "runtime changed between studies",
    );
  }
  const [matched, hidden, development] = studies.map(({ study }) => study);
  const series = measurementSeries(hidden);
  requireEvidence(
    Date.parse(development.window.summary_written_at) <= Date.parse(matched.window.started_at) &&
      Date.parse(matched.window.summary_written_at) <= Date.parse(hidden.window.started_at),
    "confirmation order changed",
  );
  const parity = report.general_unchanged_path_parity;
  requireEvidence(
    parity?.schema === "jev-unchanged-path-parity-receipt-v1" &&
      parity.passed === true &&
      parity.evidence_kind === "deterministic_offline_replay_not_live_quality" &&
      parity.network_calls === 0 &&
      parity.credential_reads === 0 &&
      parity.new_live_observations === 0 &&
      sourcesEqual(source.next_skill, parity.candidate_source_sha256) &&
      sourcesEqual(source.baseline, parity.baseline_source_sha256),
    "general-path parity missing or mismatched",
  );
  for (const [field, expected] of [
    ["initial_payload_checks", 116],
    ["replay_observations", 232],
    ["fixture_checks", 18],
  ]) {
    requireEvidence(
      parity[field]?.passed === expected && parity[field].total === expected,
      `${field}: incomplete general parity`,
    );
  }
  requireEvidence(
    parity.replayed_requests_per_implementation === 343 &&
      integer(parity.replay_observations.preserved_baseline_wrong) &&
      integer(parity.replay_observations.preserved_baseline_errors) &&
      parity.replay_observations.preserved_baseline_errors <=
        parity.replay_observations.preserved_baseline_wrong,
    "invalid retained general-path failures",
  );
  for (const key of [
    "planned_executions",
    "completed_executions",
    "missing_executions",
    "recorded_api_attempts",
  ]) {
    requireEvidence(
      report.counting?.[key] === sum(studies.map(({ study }) => study[key])),
      `${key}: counting mismatch`,
    );
  }
  const revision = matched.provenance.hussi_revision;
  requireEvidence(
    /^[a-f0-9]{40}$/.test(revision) && hidden.provenance.hussi_revision === revision,
    "Hussi source changed",
  );
  const cohorts = studies.slice(0, 2).map(({ spec, study }) => {
    const rows = [
      { id: OURS, label: "Our Jev · next skill", highlight: true },
      { id: HUSSI[0], label: "Published Hussi9 chooser" },
      { id: HUSSI[1], label: "Hussi9 + our HTTPS client", experiment: true },
    ].map((row) => {
      const skill = study.groups.skill[row.id];
      const none = study.groups.none[row.id];
      return {
        ...row,
        skillCorrect: skill.correct,
        skillObservations: skill.n,
        noneCorrect: none.correct,
        noneObservations: none.n,
        errors: study.groups.all[row.id].errors,
        medianInputTokens: skill.input_tokens_per_fully_reported_selection.median,
        totalInputTokens: skill.input_tokens_for_all_scheduled_selections,
        noneMedianInputTokens: none.input_tokens_per_fully_reported_selection.median,
        noneTotalInputTokens: none.input_tokens_for_all_scheduled_selections,
        allTotalInputTokens: study.groups.all[row.id].input_tokens_for_all_scheduled_selections,
        medianLatencyMs: skill.selection_latency_ms.median,
      };
    });
    return {
      id: spec.id,
      label:
        series.previouslyExposed && spec.id === "next-skill-hidden32"
          ? "Repeated confirmation"
          : spec.label,
      date: study.window.started_at.slice(0, 10),
      rows,
      skillObservations: spec.skill,
      noneObservations: spec.none,
      reductionVsPublished: percentage(rows[0].totalInputTokens, rows[1].totalInputTokens),
      reductionVsControl: percentage(rows[0].totalInputTokens, rows[2].totalInputTokens),
      pooledControlFaster: rows[2].medianLatencyMs < rows[0].medianLatencyMs,
    };
  });
  return {
    ...series,
    cohorts,
    model: MODEL,
    catalogRecords: matched.catalog_records,
    source: source.next_skill,
    knownInheritedLimitation:
      report.supplementary_offline_evidence?.known_inherited_limitation?.summary ?? null,
    readmePath:
      "docs/skills/jev-capability-advisor/benchmarks/README.md#next-skill-input-efficiency",
    hussiSource: `https://github.com/hussi9/skill-router/blob/${revision}/scripts/jev_choose.py`,
    confirmationExecutions: matched.completed_executions + hidden.completed_executions,
    developmentExecutions: development.completed_executions,
    completedExecutions: report.counting.completed_executions,
    parity: {
      replays: parity.replay_observations.total,
      preservedWrong: parity.replay_observations.preserved_baseline_wrong,
      preservedErrors: parity.replay_observations.preserved_baseline_errors,
    },
  };
}
