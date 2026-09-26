const fail = (message) => {
  throw new Error(`Jev Luna Low Dev9 evidence: ${message}`);
};

const requireEvidence = (condition, message) => {
  if (!condition) fail(message);
};

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[center] : (sorted[center - 1] + sorted[center]) / 2;
};

const group = (rows) => ({
  n: rows.length,
  correct: rows.filter((row) => row.correct).length,
  accuracy: rows.filter((row) => row.correct).length / rows.length,
});

// Crosswalk reconstructed from the retained Dev9 task requirements and catalog.
// The drawio aliases share one catalog skill identity and therefore one chart.
const DEV9_TARGET_SKILL_BY_CASE = Object.freeze({
  "nextdev-h008": "cli-creator",
  "nextdev-stressv5c001": "plugin-creator",
  "nextdev-stressv5c002": "drawio-diagrams",
  "nextdev-stressv5c003": "higgsfield-product-photoshoot",
  "nextdev-stressv5c004": "vercel:ncc",
  "nextdev-stressv5c005": "ads-manager:ads-manager-insights",
  "nextdev-stressv5c006": "vercel:geist",
  "nextdev-stressv5c008": "security-best-practices",
});

const requireSameMetric = (actual, expected, path) => {
  requireEvidence(actual && typeof actual === "object", `${path}: missing summary`);
  for (const [key, value] of Object.entries(expected))
    requireEvidence(actual[key] === value, `${path}.${key}: differs from observations`);
};

/** Validate the public, sanitized copy of the independently audited Dev9 rows. */
export function summarizeNativeDev9(evidence) {
  requireEvidence(evidence?.schema === "jev-native-dev9-evidence/v1", "unsupported schema");
  requireEvidence(
    evidence.stage === "dev9" &&
      evidence.requested?.model === "gpt-6-luna" &&
      evidence.requested?.reasoning_effort === "low" &&
      evidence.resolved_backend_model === null,
    "model request or unreported backend identity changed",
  );
  requireEvidence(
    evidence.execution?.client === "Codex Native CLI" &&
      evidence.execution.codex_cli_version === "codex-cli 0.157.0" &&
      evidence.execution.planned_dev9_observations === 9 &&
      evidence.execution.completed_model_turns === 9 &&
      evidence.execution.turns_with_reported_usage === 9 &&
      evidence.execution.errors === 0,
    "execution accounting changed",
  );
  requireEvidence(
    evidence.campaign?.planned_live_observations === 329 &&
      evidence.campaign.attempted_live_observations === 9 &&
      evidence.campaign.remaining_not_run === 320 &&
      evidence.campaign.stop_reason === "dev9_quality_gate_failed" &&
      evidence.campaign.matched_cohort_started === false &&
      evidence.campaign.confirmation_cohort_started === false,
    "campaign stop accounting changed",
  );
  requireEvidence(
    evidence.quality_gate?.passed === false &&
      evidence.quality_gate.required_correct === 9 &&
      evidence.quality_gate.actual_correct === 8 &&
      evidence.inputs_previously_used === true &&
      evidence.comparison_claim === "none",
    "gate or scope disclosure changed",
  );
  requireEvidence(
    /^[a-f0-9]{64}$/.test(evidence.source_integrity?.independent_audit_sha256 ?? "") &&
      /^[a-f0-9]{64}$/.test(evidence.source_integrity?.protocol_sha256 ?? ""),
    "source digests are missing",
  );

  const rows = evidence.observations;
  requireEvidence(Array.isArray(rows) && rows.length === 9, "expected nine observation rows");
  const caseIds = new Set();
  for (const row of rows) {
    requireEvidence(
      typeof row.case_id === "string" && row.case_id.length > 0 && !caseIds.has(row.case_id),
      "duplicate or empty task id",
    );
    caseIds.add(row.case_id);
    requireEvidence(
      row.rep === 0 &&
        ["skill", "none"].includes(row.category) &&
        ["next_skill", "none", "clarify"].includes(row.status) &&
        typeof row.correct === "boolean" &&
        row.attempted === true &&
        row.model_turn_completed === true &&
        row.error === null &&
        Number.isSafeInteger(row.input_tokens) &&
        row.input_tokens >= 0 &&
        Number.isSafeInteger(row.output_tokens) &&
        row.output_tokens >= 0 &&
        Number.isFinite(row.model_turn_ms) &&
        row.model_turn_ms > 0,
      `malformed observation: ${row.case_id}`,
    );
  }

  const skills = rows.filter((row) => row.category === "skill");
  const noMatch = rows.filter((row) => row.category === "none");
  const skillResults = skills.map((row) => {
    const skillName = DEV9_TARGET_SKILL_BY_CASE[row.case_id];
    requireEvidence(typeof skillName === "string", "skill target is missing for " + row.case_id);
    return {
      caseId: row.case_id,
      skillName,
      correct: row.correct,
      correctObservations: row.correct ? 1 : 0,
      observations: 1,
      accuracyPercent: row.correct ? 100 : 0,
      modelTurnMs: row.model_turn_ms,
      inputTokens: row.input_tokens,
    };
  });
  requireEvidence(
    skillResults.length === Object.keys(DEV9_TARGET_SKILL_BY_CASE).length &&
      new Set(skillResults.map((row) => row.skillName)).size === skillResults.length,
    "skill target mapping does not exactly cover the unique Dev9 skills",
  );
  const summary = {
    all: group(rows),
    skill: group(skills),
    none: group(noMatch),
    errors: rows.filter((row) => row.error !== null).length,
    model_turn_ms: {
      n: rows.length,
      median: median(rows.map((row) => row.model_turn_ms)),
      p95_nearest_rank: [...rows.map((row) => row.model_turn_ms)].sort((a, b) => a - b)[
        Math.ceil(0.95 * rows.length) - 1
      ],
    },
    all_input_tokens: {
      n: rows.length,
      missing: 0,
      total: rows.reduce((total, row) => total + row.input_tokens, 0),
      median: median(rows.map((row) => row.input_tokens)),
    },
    skill_input_tokens: {
      n: skills.length,
      missing: 0,
      total: skills.reduce((total, row) => total + row.input_tokens, 0),
      median: median(skills.map((row) => row.input_tokens)),
    },
  };

  requireSameMetric(evidence.summary?.all, summary.all, "all");
  requireSameMetric(evidence.summary?.skill, summary.skill, "skill");
  requireSameMetric(evidence.summary?.none, summary.none, "none");
  requireEvidence(
    evidence.summary?.errors === summary.errors,
    "error count differs from observations",
  );
  for (const key of ["model_turn_ms", "all_input_tokens", "skill_input_tokens"])
    requireSameMetric(evidence.summary?.[key], summary[key], key);
  requireEvidence(
    summary.all.correct === evidence.quality_gate.actual_correct &&
      summary.all.correct < evidence.quality_gate.required_correct &&
      summary.all.n === evidence.quality_gate.required_correct,
    "quality gate does not match the audited observations",
  );

  return { ...summary, skillResults };
}
