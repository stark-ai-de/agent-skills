import { joinNativeNextSkill } from "./jev-native-next-skill.mjs";
import { nextSkillComparison } from "./jev-next-skill-benchmarks.mjs";

// The unpublished control remains in the evidence table, outside the product chart.
export const visibleVariantIds = ["jev_session", "hussi_original", "native"];

const feature = (label, value, status = "supported") => ({ label, value, status });
const productFeatures = {
  jev_session: [
    feature("Skill recommendations", "Chooses from your available skills"),
    feature("MCP tool recommendations", "Available in general mode"),
    feature("16k task characters to Jev", "Sends up to 16,000 task characters"),
    feature("HTTPS connection reuse", "Keeps the connection open in Session"),
    feature("Search index reuse", "Keeps catalog search ready in Session"),
  ],
  hussi_original: [
    feature("Skill recommendations", "Available in Claude and Codex variants"),
    feature("MCP tool recommendations", "Available in the Codex variant"),
    feature("16k task characters to Jev", "Only up to 600 task characters", "unsupported"),
    feature("HTTPS connection reuse", "Fresh connection in the tested chooser", "unsupported"),
    feature("Search index reuse", "Reuses its local skill index"),
  ],
  native: [
    feature("Skill recommendations", "Depends on the host", "neutral"),
    feature("MCP tool recommendations", "Depends on the host", "neutral"),
    feature("16k task characters to Jev", "No Jev request", "neutral"),
    feature("HTTPS connection reuse", "Depends on the host", "neutral"),
    feature("Search index reuse", "Depends on the host", "neutral"),
  ],
};

const definitions = [
  {
    id: "jev_session",
    arm: "jev_next_skill",
    label: "Jev Session",
    sourcePath: "skills/skill-maintenance/jev-capability-advisor/SKILL.md",
    description: "Our advisor · one next-skill choice.",
    info: "Compact next-skill request; reuses HTTPS and a search index in a retained process. Each request validates the current catalog and checks the answer. This study used no saved decisions. General mode also supports MCP tools; only next-skill selection is timed here.",
  },
  {
    id: "hussi_original",
    arm: "hussi_original",
    label: "Published Hussi9 chooser",
    description: "Published chooser · original acceptance gate.",
    info: "Published Jev chooser with fresh HTTPS, a 600-character task allowance and its original 0.8 confidence gate. The complete router also supports MCP tools and saved decisions; its hooks and fallback are outside this timing.",
  },
  {
    id: "hussi_control",
    arm: "hussi_session_control",
    label: "Hussi9 + our HTTPS",
    experimental: true,
  },
  {
    id: "native",
    arm: "native",
    label: "Native",
    description: "Native model selector · identical next-skill inputs.",
    info: "GPT-6 Luna, reasoning medium, receives the same frozen task, candidate cards and one-choice rules. Measures preparation plus the model turn in a separate run. Process startup, skill loading and task execution are excluded. Native stays the reference.",
  },
];

/** Every public comparison requires the source-bound Native observation audit. */
export function promoComparison(report, nativeEvidence) {
  const evidence = nextSkillComparison(report);
  const confirmation = evidence.cohorts.find((cohort) => cohort.id === "next-skill-hidden32");
  const study = report.studies.find((entry) => entry.study_id === confirmation.id);
  const audited = joinNativeNextSkill(nativeEvidence, study);
  const native = {
    model: audited.model.requested,
    reasoning: audited.model.reasoning,
    window: {
      started_at: audited.measurement.started_at,
      summary_written_at: audited.measurement.completed_at,
    },
    groups: Object.fromEntries(
      Object.entries(audited.nativeGroups).map(([category, group]) => [
        category,
        {
          ...group,
          selection_latency_ms: { median: group.median_ms, p95: group.p95_ms },
        },
      ]),
    ),
  };
  const allRows = definitions
    .map((definition) => {
      const skill =
        definition.id === "native" ? native.groups.skill : study.groups.skill[definition.arm];
      const none =
        definition.id === "native" ? native.groups.none : study.groups.none[definition.arm];
      const all = definition.id === "native" ? native.groups.all : study.groups.all[definition.arm];
      const medianSeconds = skill.selection_latency_ms.median / 1000;
      const skillRows = study.observations.filter(
        (row) => row.arm === definition.arm && row.category === "skill",
      );
      const timeouts =
        definition.id === "native"
          ? native.groups.skill.timeouts
          : skillRows.filter((row) => row.error?.includes("timeout")).length;
      const abstentions = skillRows.filter(
        (row) => row.status === "abstained" && row.error === null,
      ).length;
      const speedQualified = skill.errors === 0 && native.groups.skill.errors === 0;
      const factor =
        definition.id === "native" || !speedQualified
          ? null
          : native.groups.skill.selection_latency_ms.median / skill.selection_latency_ms.median;
      const features = productFeatures[definition.id] ?? [];
      return {
        ...definition,
        info:
          definition.info &&
          definition.info +
            (definition.id === "hussi_original"
              ? ` This run: ${skill.correct}/${skill.n} accepted correct choices; ${abstentions} abstentions and ${timeouts} timeout${timeouts === 1 ? "" : "s"}. Abstention is not necessarily a wrong guess.${speedQualified ? "" : " The median includes failure returns; no selection-speed factor is claimed."}`
              : ""),
        features,
        sourceUrl: definition.id === "hussi_original" ? evidence.hussiSource : undefined,
        githubAriaLabel: `Open ${definition.id === "jev_session" ? "Jev Capability Advisor" : "Hussi9 skill-router"} on GitHub (new tab)`,
        factor,
        speedQualified,
        errorLabel: skill.errors
          ? `${skill.errors} ${timeouts === skill.errors ? "timeout" : "error"}${skill.errors === 1 ? "" : "s"}`
          : null,
        speedLabel:
          definition.id === "native"
            ? "Native baseline"
            : !speedQualified
              ? "Speed factor withheld"
              : factor > 1
                ? "Faster skill selection"
                : factor < 1
                  ? "Native selects faster"
                  : "Same median selection speed",
        medianSeconds,
        p95Seconds: skill.selection_latency_ms.p95 / 1000,
        correct: skill.correct,
        observations: skill.n,
        noneCorrect: none.correct,
        noneObservations: none.n,
        errors: all.errors,
        announcement: `${definition.label}${definition.experimental ? " (internal, unpublished experiment)" : ""}: ${medianSeconds.toFixed(2)} seconds median. ${definition.id === "native" ? "Native baseline" : factor === null ? "Speed factor withheld because the comparison includes an error" : `${factor.toFixed(2)} times the native selection speed`}. ${skill.correct} of ${skill.n} correct accepted choices; ${skill.errors} error${skill.errors === 1 ? "" : "s"}. Product features: ${features.map((item) => `${item.label}: ${item.value}`).join("; ")}.`,
      };
    })
    .sort((left, right) => left.medianSeconds - right.medianSeconds);
  const ours = allRows.find((row) => row.id === "jev_session");
  const hussi = allRows.find((row) => row.id === "hussi_original");
  return {
    defaultId: "jev_session",
    baselineId: "native",
    allRows,
    rows: allRows.filter((row) => visibleVariantIds.includes(row.id)),
    hussiFactor:
      hussi.speedQualified && ours.speedQualified ? hussi.medianSeconds / ours.medianSeconds : null,
    inputSaving: Math.min(confirmation.reductionVsPublished, confirmation.reductionVsControl),
    skillObservations: confirmation.skillObservations,
    noneObservations: confirmation.noneObservations,
    catalogRecords: evidence.catalogRecords,
    nativeModel: native.model,
    nativeReasoning: native.reasoning,
    nativeCachedTurns: nativeEvidence.provider_prefix_cache_observations,
    jevModel: evidence.model,
    jevWindow: study.window,
    nativeWindow: native.window,
    dateLabel: [...new Set([confirmation.date, native.window.started_at.slice(0, 10)])].join(" / "),
    hussiSource: evidence.hussiSource,
    evidencePath: evidence.evidencePath,
    nativeEvidencePath: evidence.nativeEvidencePath,
    measuredRevision: evidence.measuredRevision,
    previouslyExposed: evidence.previouslyExposed,
    displayedObservations: allRows
      .filter((row) => visibleVariantIds.includes(row.id))
      .reduce((total, row) => total + row.observations + row.noneObservations, 0),
    completedNativeExecutions: native.groups.all.n,
  };
}
