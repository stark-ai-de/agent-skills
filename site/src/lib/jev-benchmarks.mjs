import session from "../../../skill-evals/jev-capability-advisor/benchmarks/session-2026-09-22.json" with { type: "json" };
import development from "../../../skill-evals/jev-capability-advisor/benchmarks/development-counts-2026-09-22.json" with { type: "json" };
import evidence from "../../../skill-evals/jev-capability-advisor/benchmarks/2026-09-22.json" with { type: "json" };

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
};

export const jevBenchmarks = {
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
