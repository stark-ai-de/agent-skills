// Admission boundary for the seven-product campaign. No fixture or partial run is a report.
import { createHash } from "node:crypto";
export const SELECTOR_SCHEMA = "jev-selector-comparison/v1";
export const selectorArms = [
  "jev",
  "hussi",
  "skill_picker",
  "suggester",
  "skillranker",
  "lomesh",
  "native",
];
export const chartArms = selectorArms.filter((arm) => arm !== "suggester");
const fail = (message) => {
  throw new Error(`Jev selector comparison: ${message}`);
};
const require = (condition, message) => {
  if (!condition) fail(message);
};
const digest = (value) => /^[a-f0-9]{64}$/.test(value ?? "");
const numeric = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
const usage = (value) => value === null || (Number.isSafeInteger(value) && value >= 0);
const median = (values) => {
  const ordered = [...values].sort((a, b) => a - b),
    middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};
const sumKnown = (rows, key) =>
  rows.every((row) => row[key] !== null) ? rows.reduce((n, row) => n + row[key], 0) : null;
const group = (rows, includeTiming = true) => ({
  n: rows.length,
  correct: rows.filter((row) => row.correct).length,
  abstentions: rows.filter((row) => row.status === "abstained").length,
  errors: rows.filter((row) => row.error !== null).length,
  medianMs:
    !includeTiming || rows.some((row) => row.error !== null)
      ? null
      : median(rows.map((row) => row.selector_ms)),
  p95Ms:
    !includeTiming || rows.some((row) => row.error !== null)
      ? null
      : rows.map((row) => row.selector_ms).sort((a, b) => a - b)[Math.ceil(rows.length * 0.95) - 1],
  inputTokens: sumKnown(rows, "input_tokens"),
  outputTokens: sumKnown(rows, "output_tokens"),
  requests: sumKnown(rows, "requests"),
  medianInputTokens: rows.every((row) => row.input_tokens !== null)
    ? median(rows.map((row) => row.input_tokens))
    : null,
});

export function selectorComparison(report) {
  require(report?.schema === SELECTOR_SCHEMA, "missing or unsupported report");
  const p = report.protocol;
  require(p?.catalog_size === 132 &&
    p.skill_tasks === 24 &&
    p.none_tasks === 8 &&
    p.repetitions === 2, "wrong cohort");
  require(p.native_model === "gpt-6-luna" &&
    p.native_reasoning === "low", "wrong Native model or reasoning");
  require(p.harness_retries === 0 &&
    p.warmups === 0 &&
    p.decision_cache === false &&
    p.concurrent_jev_calls === 1, "wrong execution protocol");
  require(p.p95 === "nearest_rank" &&
    p.timing_scope ===
      "full_selection_without_process_startup", "wrong statistics or timing scope");
  require(report.audit?.passed === true &&
    report.audit?.independent === true &&
    report.audit?.source_equivalence === true &&
    report.audit?.raw_reconstruction === true, "audit incomplete");
  const repaired = report.audit?.qualification === "qualified_with_disclosed_deviations";
  if (repaired) {
    require(report.audit.protocol_compliance === false &&
      report.audit.deviations_reviewed === true &&
      report.audit.repair_protocol_compliance === true, "repair audit incomplete");
    const expected = [
      "original_quota_stop_missed",
      "original_cli_identity_unrecorded",
      "separate_repair_window",
    ];
    require(Array.isArray(report.deviations) &&
      report.deviations.length === expected.length &&
      expected.every((code) =>
        report.deviations.some(
          (row) =>
            row.code === code &&
            typeof row.detail === "string" &&
            row.detail.length > 0 &&
            digest(row.evidence_sha256),
        ),
      ), "missing deviation evidence");
    require(report.attempt_history?.total === 520 &&
      report.attempt_history.selected === 448 &&
      report.attempt_history.superseded === 72 &&
      report.attempt_history.original_errors === 96 &&
      report.attempt_history.repair_errors === 0, "incomplete attempt history");
    require(Array.isArray(report.measurement_windows) &&
      report.measurement_windows.length === 2 &&
      report.measurement_windows[0].id === "original" &&
      report.measurement_windows[0].attempts === 448 &&
      report.measurement_windows[1].id === "repair" &&
      report.measurement_windows[1].attempts === 72, "missing repair window");
    require(digest(report.provenance?.repair_freeze_sha256) &&
      digest(report.provenance?.source_audit_sha256), "missing repair audit provenance");
  } else {
    require(report.audit?.protocol_compliance === true &&
      (!report.deviations || report.deviations.length === 0), "execution protocol not qualified");
  }
  for (const key of [
    "catalog_sha256",
    "tasks_sha256",
    "freeze_sha256",
    "raw_manifest_sha256",
    "audit_sha256",
  ])
    require(digest(report.provenance?.[key]), `missing ${key}`);
  require(Array.isArray(report.cases) &&
    report.cases.length === 32 &&
    new Set(report.cases.map((row) => row.id)).size === 32, "case identities");
  require(report.cases.filter((row) => row.category === "skill").length === 24 &&
    report.cases.filter((row) => row.category === "none").length === 8, "case categories");
  const cases = new Map(report.cases.map((row) => [row.id, row]));
  for (const row of report.cases)
    require(Array.isArray(row.allowed_ids) &&
      Array.isArray(row.forbidden_ids) &&
      (row.category === "none"
        ? row.allowed_ids.length === 0
        : row.allowed_ids.length > 0), "case labels");
  require(Array.isArray(report.selectors) &&
    report.selectors.length === 7 &&
    new Set(report.selectors.map((row) => row.arm)).size === 7 &&
    report.selectors.every((row) => selectorArms.includes(row.arm)), "selector identities");
  const featureLabels = report.selectors[0]?.features?.map((feature) => feature.label);
  for (const row of report.selectors) {
    require(typeof row.label === "string" &&
      row.label.length > 0 &&
      typeof row.info === "string", "selector labels");
    require(Array.isArray(row.features) &&
      row.features.length === 5 &&
      row.features.every(
        (f) =>
          ["supported", "unsupported", "neutral"].includes(f.status) &&
          typeof f.label === "string" &&
          typeof f.value === "string" &&
          (f.status === "neutral" || /^https:\/\//.test(f.evidence_url)),
      ), "feature evidence");
    require(row.features.every(
      (feature, index) => feature.label === featureLabels[index],
    ), "feature order mismatch");
    if (row.arm !== "native")
      require(/^[a-f0-9]{40}$/.test(row.revision ?? "") &&
        /^https:\/\/github\.com\//.test(row.sourceUrl ?? "") &&
        typeof row.requested_model === "string" &&
        row.requested_model.startsWith("jev"), "selector source/model");
    else require(row.requested_model === "gpt-6-luna", "Native source model");
    require(row.resolved_model === null ||
      typeof row.resolved_model === "string", "unknown model must be explicit");
  }
  require(Array.isArray(report.observations) &&
    report.observations.length === 448, "incomplete observations");
  const seen = new Set();
  for (const row of report.observations) {
    const key = `${row.arm}/${row.case_id}/${row.rep}`,
      task = cases.get(row.case_id);
    require(selectorArms.includes(row.arm) &&
      task &&
      (row.rep === 0 || row.rep === 1) &&
      row.category === task.category &&
      !seen.has(key), "invalid or duplicate observation");
    seen.add(key);
    require(digest(row.raw_sha256), "missing raw evidence");
    const excludedIncomplete =
      row.arm === "suggester" &&
      row.error === "too_many_batch_candidates; narrow catalog" &&
      row.status === "error";
    require(excludedIncomplete
      ? row.selector_ms === null || numeric(row.selector_ms)
      : row.error === null && numeric(row.selector_ms), "error or missing raw timing");
    require((excludedIncomplete || ["selected", "none", "abstained"].includes(row.status)) &&
      Array.isArray(row.selected_ids) &&
      row.selected_ids.every((id) => typeof id === "string") &&
      new Set(row.selected_ids).size === row.selected_ids.length, "selection shape");
    require((row.status === "selected") ===
      row.selected_ids.length > 0, "selection status mismatch");
    const correct =
      task.category === "none"
        ? row.status === "none" && row.selected_ids.length === 0
        : row.status === "selected" &&
          row.selected_ids.length === 1 &&
          task.allowed_ids.includes(row.selected_ids[0]) &&
          !task.forbidden_ids.includes(row.selected_ids[0]);
    require(row.correct === correct, "incorrect scoring");
    for (const field of ["input_tokens", "output_tokens", "requests"])
      require(usage(row[field]), `invalid ${field}`);
    require(Number.isFinite(Date.parse(row.started_at)) &&
      Date.parse(row.completed_at) >= Date.parse(row.started_at), "invalid measurement window");
    if (repaired) {
      const window = report.measurement_windows.find((entry) => entry.id === row.window_id);
      require(window &&
        Date.parse(window.started_at) <= Date.parse(row.started_at) &&
        Date.parse(window.completed_at) >=
          Date.parse(row.completed_at), "observation outside its window");
      require(row.arm !== "lomesh" ||
        row.window_id === "repair", "Lomesh requires corrected timing");
      require(row.window_id !== "repair" ||
        ["native", "lomesh"].includes(row.arm), "unexpected repeated arm");
    }
  }
  if (repaired)
    require(report.observations.filter((row) => row.window_id === "repair").length === 72 &&
      report.observations.filter((row) => row.arm === "native" && row.window_id === "repair")
        .length === 8, "repair observation count");
  const grouped = Object.fromEntries(
    selectorArms.map((arm) => {
      const rows = report.observations.filter((row) => row.arm === arm);
      return [
        arm,
        Object.fromEntries(
          ["all", "skill", "none"].map((category) => [
            category,
            group(
              rows.filter((row) => category === "all" || row.category === category),
              arm !== "suggester",
            ),
          ]),
        ),
      ];
    }),
  );
  const nativeMedian = grouped.native.skill.medianMs;
  const allRows = report.selectors.map((definition) => {
    const { skill, none, all } = grouped[definition.arm];
    const included = chartArms.includes(definition.arm);
    const factor = !included || definition.arm === "native" ? null : nativeMedian / skill.medianMs;
    if (report.audit.skill_speed_factor_vs_native && factor !== null)
      require(Math.abs(report.audit.skill_speed_factor_vs_native[definition.arm] - factor) <
        1e-10, "independent factor mismatch");
    const id = { jev: "jev_session", hussi: "hussi_original" }[definition.arm] ?? definition.arm;
    const speedLabel = !included
      ? all.errors
        ? "Incomplete selection"
        : "Details only"
      : factor === null
        ? "Native baseline"
        : factor > 1
          ? "Faster skill selection"
          : factor < 1
            ? "Native selects faster"
            : "Same median selection speed";
    const exclusionReason = !included
      ? all.errors
        ? `Incomplete selection in ${all.errors} of ${all.n} observations. The original candidate-pool limit prevents a complete timing comparison.`
        : "Retained in the details under this comparison's scope."
      : null;
    return {
      ...definition,
      id,
      factor,
      speedLabel,
      speedQualified: included,
      errorLabel: null,
      exclusionReason,
      medianSeconds: included ? skill.medianMs / 1000 : null,
      p95Seconds: included ? skill.p95Ms / 1000 : null,
      correct: skill.correct,
      observations: skill.n,
      abstentions: skill.abstentions,
      noneCorrect: none.correct,
      noneObservations: none.n,
      errors: all.errors,
      groups: { skill, none, all },
      githubAriaLabel: `Open ${definition.label} source on GitHub (new tab)`,
      announcement: `${definition.label}: ${included ? `${(skill.medianMs / 1000).toFixed(2)} seconds median. ${factor === null ? "Native baseline" : `${factor.toFixed(2)} times the Native selection speed`}` : exclusionReason}. ${skill.correct} of ${skill.n} correct accepted choices; ${skill.abstentions} abstentions. Product features: ${definition.features.map((f) => `${f.label}: ${f.value}`).join("; ")}.`,
    };
  });
  const rows = allRows
    .filter((row) => row.speedQualified)
    .sort((left, right) => left.medianSeconds - right.medianSeconds);
  const excludedRows = allRows.filter((row) => !row.speedQualified);
  const ours = grouped.jev.skill,
    hussi = grouped.hussi.skill;
  const inputSaving =
    ours.inputTokens !== null && hussi.inputTokens > 0
      ? 100 * (1 - ours.inputTokens / hussi.inputTokens)
      : null;
  const byTime = (left, right) => Date.parse(left) - Date.parse(right);
  const times = report.observations.map((row) => row.started_at).sort(byTime),
    ends = report.observations.map((row) => row.completed_at).sort(byTime);
  return {
    rows,
    allRows: [...rows, ...excludedRows],
    excludedRows,
    defaultId: "jev_session",
    baselineId: "native",
    inputSaving,
    hussiFactor: hussi.medianMs / ours.medianMs,
    catalogRecords: 132,
    skillObservations: 48,
    noneObservations: 16,
    displayedObservations: 384,
    measuredObservations: 448,
    nativeModel: p.native_model,
    nativeReasoning: p.native_reasoning,
    jevModel: [
      ...new Set(report.selectors.filter((s) => s.arm !== "native").map((s) => s.requested_model)),
    ].join(" / "),
    window: { started_at: times[0], completed_at: ends.at(-1) },
    dateLabel: [...new Set(report.observations.map((row) => row.started_at.slice(0, 10)))].join(
      " / ",
    ),
    previouslyExposed: true,
    deviations: report.deviations ?? [],
    repaired,
    measurementNote: repaired
      ? "Includes a separate repair window. Native CLI identity was not recorded for the first window; see method & scope."
      : null,
    evidencePath:
      "skill-evals/jev-capability-advisor/benchmarks/selector-comparison-2026-09-26.json",
    sourceReport: report,
    reportDigest: createHash("sha256").update(JSON.stringify(report)).digest("hex"),
  };
}
