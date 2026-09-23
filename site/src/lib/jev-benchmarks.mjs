import session from "../../../skill-evals/jev-capability-advisor/benchmarks/session-2026-09-22.json" with { type: "json" };
import development from "../../../skill-evals/jev-capability-advisor/benchmarks/development-counts-2026-09-22.json" with { type: "json" };
import evidence from "../../../skill-evals/jev-capability-advisor/benchmarks/2026-09-22.json" with { type: "json" };
import current from "../../../skill-evals/jev-capability-advisor/benchmarks/native-session-2026-09-23.json" with { type: "json" };

const sum = (values) => values.reduce((total, value) => total + value, 0);
const comparison = evidence.matched_selector_regression;
const arms = comparison.groups.all.arms;
const optimization = evidence.retrieval_optimization.measurement;

// Count completed executions once per experiment, never nested subsets or API follow-ups.
const runCounts = {
  retrieval: sum(Object.values(evidence.offline_retrieval.metrics).map((arm) => arm.all270.cases)),
  runtime: evidence.performance.process_samples + optimization.samples_per_arm * 2,
  liveSelection:
    sum(Object.values(evidence.live_selection_before_followup_fix.arms).map((arm) => arm.cases)) +
    evidence.live_selection_after_followup_fix.all100.cases +
    sum(Object.values(evidence.matched_selector_pilot.arms).map((arm) => arm.n)) +
    comparison.completed_runs,
  replay: evidence.optimized_archived_replay.cases,
  sessionDevelopment: development.recorded_executions,
  nativeSupplement: current.experiment.new_observations,
};

const positive = current.groups.primary_positive.arms;
const rowLabels = {
  jev_session: "Jev Session",
  jev_cold: "Jev Fresh Connection",
  hussi_original: "Hussi9",
  native: "Native",
};
const rowNotes = {
  jev_session:
    "Same candidate ranking and answer checks as Fresh Connection. Reuses HTTPS in a retained process, avoiding repeated setup; a host-supplied catalog is validated for every task. No result cache in this benchmark.",
  jev_cold:
    "Validates, deduplicates and ranks skills + MCP tools, then checks selected IDs and answer consistency. Opens new HTTPS for each selection. One API call per observation here; compound tasks can need follow-ups.",
  hussi_original:
    "Uses Jev for domain, process and task-type choices. Smaller requests and less local preparation than Fresh here; their latency effects were not isolated. Its 0.8 confidence gate withheld four correct suggestions.",
  native: `${current.models.native.requested}, reasoning ${current.models.native.reasoning}, selects from the same Jev candidate cards. Timing includes preparation and the model turn; excludes process startup, skill loading and task execution. Measured in a separate run.`,
};
const rows = Object.entries(rowLabels)
  .map(([id, label]) => {
    const result = positive[id];
    const none = current.groups.none.arms[id];
    const factor = id === "native" ? null : positive.native.median_ms / result.median_ms;
    const relation =
      factor === null ? "Native baseline" : `${factor.toFixed(2)} times the native selection speed`;
    return {
      id,
      label,
      info: rowNotes[id],
      sourceUrl: id === "hussi_original" ? current.sources.hussi.url.split("/blob/")[0] : null,
      factor,
      medianSeconds: result.median_ms / 1000,
      p95Seconds: result.p95_ms / 1000,
      correct: result.correct,
      observations: result.n,
      noneCorrect: none.correct,
      noneObservations: none.n,
      errors: current.groups.all.arms[id].errors,
      description:
        factor === null
          ? "The reference model chooses from the same candidate cards."
          : "Median skill-selection speed compared with the native model selector.",
      announcement: `${label}: ${(result.median_ms / 1000).toFixed(2)} seconds median. ${relation}. ${result.correct} of ${result.n} correct accepted selections.`,
    };
  })
  .sort((left, right) => left.medianSeconds - right.medianSeconds);

export const jevBenchmarks = {
  current: {
    evidence: current,
    evidencePath: "skill-evals/jev-capability-advisor/benchmarks/native-session-2026-09-23.json",
    rows,
    defaultId: "jev_session",
    baselineId: "native",
    skillObservations: positive.native.n,
    dateLabel: current.measurement_dates.join(" / "),
    nativeModel: current.models.native.requested,
    nativeReasoning: current.models.native.reasoning,
    jevModel: current.models.jev,
    hussiSource: current.sources.hussi.url,
    controlMedianSeconds: current.modified_control.primary_positive.median_ms / 1000,
    technical: {
      title: "Why routing speeds differ",
      introduction:
        "Same Jev model. Different selection work. Fresh Connection is already our optimized advisor; Session adds connection reuse.",
      rows: [
        {
          topic: "Candidates",
          hussi: "Eligible skill index; split into domain and process choices.",
          jev: "Validate, deduplicate and locally rank skills + MCP tools; up to 240 candidates.",
        },
        {
          topic: "Questions",
          hussi: "Domain, process and task type in one request.",
          jev: "Selection mode + first capability; up to two follow-up calls for compound tasks.",
        },
        {
          topic: "Task context",
          hussi: "Task truncated to 600 characters; short candidate summaries.",
          jev: "Tasks up to 16,000 characters; candidate descriptions bounded by a request-size budget.",
        },
        {
          topic: "Acceptance",
          hussi: "Validate returned IDs; confidence ≥ 0.8 to route, ≥ 0.5 to suggest.",
          jev: "Validate returned IDs and answer consistency; explicit no-match / clarify outcomes, no confidence gate.",
        },
        {
          topic: "Connection",
          hussi: "Fresh HTTPS for each measured selection.",
          jev: "Fresh: new HTTPS. Session: reuse HTTPS in a retained process; same selection policy.",
        },
      ],
      notes: [
        {
          title: "Why Session is faster",
          text: "Reusing HTTPS avoids repeated connection setup. The host supplies a catalog for each request; it is validated each time. This benchmark used no result cache.",
        },
        {
          title: "Why Hussi9 beats Fresh here",
          text: "Its measured requests were smaller and local preparation shorter. Both made one API call per observation. The effects of payload size, preparation, transport and provider load were not isolated.",
        },
        {
          title: "What 76/80 means",
          text: "Four correct Hussi9 suggestions fell below its 0.8 route threshold. These are withheld recommendations, not four wrong skill guesses. We measured the chooser, not its full fallback workflow.",
        },
      ],
    },
  },
  date: comparison.date,
  evidencePath: "skill-evals/jev-capability-advisor/benchmarks/2026-09-22.json",
  readmePath: "docs/skills/jev-capability-advisor/benchmarks/README.md",
  methodsPath: "skill-evals/jev-capability-advisor/README.md",
  session: {
    evidence: session,
    evidencePath: "skill-evals/jev-capability-advisor/benchmarks/session-2026-09-22.json",
    tasks: session.experiment.unique_tasks,
    skillObservations: session.groups.primary_positive.arms.jev_session.n,
    correct: session.groups.all.arms.jev_session.correct,
    observations: session.groups.all.arms.jev_session.n,
    medianSeconds: session.groups.primary_positive.arms.jev_session.median_ms / 1000,
    coldMedianSeconds: session.groups.primary_positive.arms.jev_cold.median_ms / 1000,
    speedRatio:
      session.groups.primary_positive.arms.jev_cold.median_ms /
      session.groups.primary_positive.arms.jev_session.median_ms,
    reductionPercent:
      (1 -
        session.groups.primary_positive.arms.jev_session.median_ms /
          session.groups.primary_positive.arms.jev_cold.median_ms) *
      100,
  },
  countsPath: "skill-evals/jev-capability-advisor/benchmarks/development-counts-2026-09-22.json",
  runCounts,
  development,
  totalRuns: sum(Object.values(runCounts)),
  tasks: comparison.task_count,
  catalogSize: comparison.catalog_records,
  candidates: comparison.candidate_limit,
  jev: {
    medianSeconds: arms.jev.selector.p50_ms / 1000,
    p95Seconds: arms.jev.selector.p95_ms / 1000,
    correct: arms.jev.exact_correct,
  },
  native: {
    medianSeconds: arms.native_selector.selector.p50_ms / 1000,
    p95Seconds: arms.native_selector.selector.p95_ms / 1000,
    correct: arms.native_selector.exact_correct,
  },
  speedRatio: arms.native_selector.selector.p50_ms / arms.jev.selector.p50_ms,
  compactReduction: evidence.compact_output.reduction_percent,
  compactCases: evidence.compact_output.cases,
  preparationReduction: optimization.prepare_request_reduction_percent,
  preparationPairs: optimization.samples_per_arm,
};
