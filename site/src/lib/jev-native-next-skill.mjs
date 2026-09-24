/**
 * Validate a normalized Native supplement while retaining every measured outcome.
 * Call nextSkillComparison(originalReport) before passing its hidden32 study.
 * This pure module performs no I/O, credential access, model calls or writes.
 */
export const NATIVE_SCHEMA = "jev-native-next-skill-supplement/v1";
const STUDY = "next-skill-hidden32";
const SHA = /^[a-f0-9]{64}$/;
const CODE = /^[0-9]{3}$/;
const EXPECTED = {
  freeze_sha256: "c67d4543ab54eb9dbc76d0c5122000835a9e90e26d7913e21ac92a5330060a67",
  tasks_sha256: "73c945cea4c8db97975690084e40c9d618a705c59d8d01d4b2764b7fa6d47301",
  catalog_sha256: "4f7b6e2d7a71d495bce85cae62eaf0a104289f156eab9e948ef96b9e1f93759e",
};
const fail = (ok, why) => {
  if (!ok) throw new Error(`Native next-skill comparison: ${why}`);
};
const members = (left, right) =>
  Array.isArray(left) &&
  left.length === right.length &&
  new Set(left).size === left.length &&
  left.every((item) => right.includes(item));
const codes = (value) =>
  Array.isArray(value) &&
  value.every((code) => typeof code === "string" && CODE.test(code)) &&
  new Set(value).size === value.length;
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const key = (row) => `${row.case_id}:${row.rep}`;
const median = (values) => {
  const a = [...values].sort((x, y) => x - y);
  const middle = Math.floor(a.length / 2);
  return a.length % 2 ? a[middle] : (a[middle - 1] + a[middle]) / 2;
};
const p95 = (values) => [...values].sort((x, y) => x - y)[Math.ceil(values.length * 0.95) - 1];
const sourceEqual = (a, b) =>
  a &&
  b &&
  members(Object.keys(a), Object.keys(b)) &&
  Object.entries(a).every(([name, hash]) => SHA.test(hash) && b[name] === hash);
const parseDate = (value) => (typeof value === "string" ? Date.parse(value) : NaN);

function expectedCases(study) {
  fail(
    study?.study_id === STUDY &&
      study.comparison_valid === true &&
      study.gate?.passed === true &&
      study.all_recorded_invariants_passed === true &&
      study.halt_reason === null,
    "invalid original confirmation",
  );
  for (const [field, expected] of Object.entries(EXPECTED)) {
    fail(study.provenance?.[field] === expected, `original ${field} changed`);
  }
  const rows = study.observations.filter((row) => row.arm === "jev_next_skill");
  fail(
    rows.length === 64 && new Set(rows.map(key)).size === 64,
    "original task/repetition coverage changed",
  );
  const cases = new Map();
  for (const row of rows) {
    fail(
      [0, 1].includes(row.rep) && ["skill", "none"].includes(row.category),
      "invalid original task category/repetition",
    );
    const seen = cases.get(row.case_id) ?? { category: row.category, reps: [] };
    fail(seen.category === row.category, "original task category varies");
    seen.reps.push(row.rep);
    cases.set(row.case_id, seen);
  }
  fail(
    cases.size === 32 &&
      [...cases.values()].every((item) => members(item.reps, [0, 1])) &&
      [...cases.values()].filter((item) => item.category === "skill").length === 24,
    "original 24 skill / 8 NONE split changed",
  );
  return new Map(rows.map((row) => [key(row), row.category]));
}

function summarize(rows) {
  const times = rows.map((row) => row.selector_ms);
  return {
    n: rows.length,
    completed: rows.length,
    missing: 0,
    correct: rows.filter((row) => row.correct).length,
    errors: rows.filter((row) => row.error !== null).length,
    timeouts: rows.filter((row) => row.timed_out).length,
    timed_observations: times.length,
    missing_timing: 0,
    median_ms: median(times),
    p95_ms: p95(times),
  };
}

/**
 * Artifact shape:
 * {schema, comparison:{study_id,freeze/tasks/catalog_sha256,source_sha256},
 *  model:{requested,reasoning,resolved}, selection_profile,additional_work,
 *  measurement:{started_at,completed_at,separate_measurement_window,timing_scope,
 *    deadline_seconds,harness_retries,warmup,fallbacks,jev_api_calls},
 *  provenance:{freeze,adapter,schema,schedule,input_proof,raw_results,audit}_sha256,
 *  audit:{passed,source_equivalence,profile,argv,scoring,raw_events,process_cleanup},
 *  counting:{planned,completed,missing}, observations:[{case_id,rep,category,
 *    selector_ms,preparation_ms,model_turn_ms,status,selected_codes,allowed_codes,
 *    forbidden_codes,correct,error,timed_out,invariant_violations}],
 *  groups:{all,skill,none}}
 *
 * Scoring metadata is sanitized opaque codes, never query text or local paths.
 * Its relation to frozen labels must be established by the independent raw audit.
 */
export function joinNativeNextSkill(native, study) {
  const pairs = expectedCases(study);
  fail(native?.schema === NATIVE_SCHEMA, "missing or unsupported Native supplement");
  fail(native.comparison?.study_id === STUDY, "wrong comparison cohort");
  for (const field of Object.keys(EXPECTED)) {
    fail(native.comparison[field] === study.provenance[field], `Native ${field} mismatch`);
  }
  fail(
    sourceEqual(native.comparison.source_sha256, study.provenance.source_sha256.next_skill),
    "Native prepared a different runtime",
  );
  fail(
    native.model?.requested === "gpt-6-luna" &&
      native.model.reasoning === "medium" &&
      (native.model.resolved === null ||
        (typeof native.model.resolved === "string" && native.model.resolved.trim().length > 0)),
    "Native model identity changed or fabricated",
  );
  fail(
    native.selection_profile === "next_skill" && native.additional_work === "unassessed",
    "Native used the wrong selection contract",
  );
  fail(native.statistics?.p95 === "nearest_rank", "Native percentile convention differs");
  const m = native.measurement;
  fail(
    m &&
      m.timing_scope === "preparation_plus_model_turn" &&
      m.deadline_seconds === 90 &&
      m.harness_retries === 0 &&
      m.warmup === 0 &&
      m.fallbacks === 0 &&
      m.jev_api_calls === 0 &&
      m.separate_measurement_window === true,
    "measurement protocol changed",
  );
  fail(
    Number.isFinite(parseDate(m.started_at)) &&
      Number.isFinite(parseDate(m.completed_at)) &&
      parseDate(m.started_at) >= parseDate(study.window.summary_written_at) &&
      parseDate(m.completed_at) >= parseDate(m.started_at),
    "measurement dates invalid",
  );
  for (const field of [
    "freeze",
    "adapter",
    "schema",
    "schedule",
    "input_proof",
    "raw_results",
    "audit",
  ]) {
    fail(SHA.test(native.provenance?.[`${field}_sha256`] ?? ""), `missing ${field} provenance`);
  }
  for (const field of [
    "passed",
    "source_equivalence",
    "profile",
    "argv",
    "scoring",
    "raw_events",
    "process_cleanup",
  ]) {
    fail(native.audit?.[field] === true, `raw audit ${field} failed or absent`);
  }
  fail(
    native.counting?.planned === 64 &&
      native.counting.completed === 64 &&
      native.counting.missing === 0 &&
      native.observations?.length === 64,
    "Native schedule incomplete",
  );
  const seen = new Set();
  for (const row of native.observations) {
    fail(
      typeof row.case_id === "string" &&
        [0, 1].includes(row.rep) &&
        pairs.get(key(row)) === row.category &&
        !seen.has(key(row)),
      "Native has unpaired, duplicate or recategorized observations",
    );
    seen.add(key(row));
    fail(
      typeof row.correct === "boolean" &&
        (row.error === null || (typeof row.error === "string" && row.error.length > 0)) &&
        typeof row.timed_out === "boolean" &&
        Array.isArray(row.invariant_violations) &&
        row.invariant_violations.length === 0,
      "invalid outcome/invariant accounting",
    );
    // Never turn a missing turn event or censored deadline into a fast bar.
    fail(
      !row.timed_out &&
        finite(row.selector_ms) &&
        row.selector_ms > 0 &&
        finite(row.preparation_ms) &&
        row.preparation_ms >= 0 &&
        finite(row.model_turn_ms) &&
        row.model_turn_ms > 0 &&
        Math.abs(row.selector_ms - row.preparation_ms - row.model_turn_ms) <= 0.001,
      "missing, censored or inconsistent timing; cannot publish Native factor",
    );
    fail(
      ["next_skill", "none", "clarify", "error"].includes(row.status) &&
        codes(row.selected_codes) &&
        row.selected_codes.length <= 1 &&
        (row.status === "next_skill") === (row.selected_codes.length === 1) &&
        (row.status === "error") === (row.error !== null),
      "malformed native answer",
    );
    fail(
      codes(row.allowed_codes) &&
        codes(row.forbidden_codes) &&
        (row.category === "skill" ? row.allowed_codes.length > 0 : row.allowed_codes.length === 0),
      "missing or malformed sanitized scoring metadata",
    );
    const correct =
      row.error === null &&
      (row.category === "none"
        ? row.status === "none" && row.selected_codes.length === 0
        : row.status === "next_skill" &&
          row.allowed_codes.includes(row.selected_codes[0]) &&
          !row.forbidden_codes.includes(row.selected_codes[0]));
    fail(row.correct === correct, "correctness disagrees with accepted-answer scoring");
  }
  fail(seen.size === pairs.size, "Native case set differs");
  const groups = {};
  fail(
    members(Object.keys(native.groups ?? {}), ["all", "skill", "none"]),
    "missing Native groups",
  );
  for (const category of ["all", "skill", "none"]) {
    groups[category] = summarize(
      native.observations.filter((row) => category === "all" || row.category === category),
    );
    for (const [field, expected] of Object.entries(groups[category])) {
      fail(
        native.groups[category]?.[field] === expected,
        `${category}/${field} differs from all observations`,
      );
    }
  }
  const nativeMedianMs = groups.skill.median_ms;
  const rows = ["jev_next_skill", "hussi_original", "hussi_session_control"].map((id) => {
    const skill = study.groups.skill[id];
    const none = study.groups.none[id];
    const medianMs = skill.selection_latency_ms.median;
    return {
      id,
      medianMs,
      factor: nativeMedianMs / medianMs,
      correct: skill.correct,
      n: skill.n,
      noneCorrect: none.correct,
      noneN: none.n,
      errors: study.groups.all[id].errors,
    };
  });
  rows.push({
    id: "native",
    medianMs: nativeMedianMs,
    factor: null,
    correct: groups.skill.correct,
    n: groups.skill.n,
    noneCorrect: groups.none.correct,
    noneN: groups.none.n,
    errors: groups.all.errors,
  });
  return {
    studyId: STUDY,
    selectionProfile: "next_skill",
    additionalWork: "unassessed",
    skillObservations: 48,
    noneObservations: 16,
    uniqueTasks: 32,
    defaultId: "jev_next_skill",
    baselineId: "native",
    model: native.model,
    measurement: native.measurement,
    nativeGroups: groups,
    newCompletedExecutions: native.counting.completed,
    rows: rows.sort((a, b) => a.medianMs - b.medianMs),
  };
}
