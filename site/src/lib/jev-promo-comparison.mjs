import { joinNativeNextSkill } from "./jev-native-next-skill.mjs";
import { nextSkillComparison } from "./jev-next-skill-benchmarks.mjs";

// Remove the experimental entry here to publish the three-product view.
// Full results stay in the evidence disclosure regardless of visibility.
export const visibleVariantIds = ["jev_session", "hussi_original", "hussi_control", "native"];

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
  hussi_control: [
    feature("Skill recommendations", "Tested with the fixed skill catalog"),
    feature("MCP tool recommendations", "Not tested in this experiment", "neutral"),
    feature("16k task characters to Jev", "Only up to 600 task characters", "unsupported"),
    feature("HTTPS connection reuse", "Added by our benchmark adapter"),
    feature("Search index reuse", "Not used · fixed candidate list", "neutral"),
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
    info: "Published Jev chooser with fresh HTTPS, a 600-character task allowance and its original 0.8 confidence gate. Two suggestions were withheld by that gate: 46/48 accepted choices, not necessarily two wrong guesses. The complete router also supports MCP tools and saved decisions; its hooks and fallback are outside this timing.",
  },
  {
    id: "hussi_control",
    arm: "hussi_session_control",
    label: "Hussi9 + our HTTPS",
    experimental: true,
    description: "Our internal experiment · not a published skill.",
    info: "This prototype used a fixed catalog and did not test live inventory discovery or MCP routing, which our advisor needs. That’s why it stayed unpublished. About 8 ms faster here; 48/48 accepted choices.",
    credit: true,
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
export function promoComparison(report, nativeEvidence, visibleIds = visibleVariantIds) {
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
  const allowed = definitions.map((row) => row.id);
  if (
    visibleIds.length < 3 ||
    new Set(visibleIds).size !== visibleIds.length ||
    !visibleIds.every((id) => allowed.includes(id)) ||
    !["jev_session", "hussi_original", "native"].every((id) => visibleIds.includes(id))
  )
    throw new Error("Jev promo: require the three public comparison variants");
  const allRows = definitions
    .map((definition) => {
      const skill =
        definition.id === "native" ? native.groups.skill : study.groups.skill[definition.arm];
      const none =
        definition.id === "native" ? native.groups.none : study.groups.none[definition.arm];
      const all = definition.id === "native" ? native.groups.all : study.groups.all[definition.arm];
      const medianSeconds = skill.selection_latency_ms.median / 1000;
      const factor =
        definition.id === "native"
          ? null
          : native.groups.skill.selection_latency_ms.median / skill.selection_latency_ms.median;
      const features = productFeatures[definition.id];
      return {
        ...definition,
        features,
        sourceUrl: definition.id === "hussi_original" ? evidence.hussiSource : undefined,
        githubAriaLabel: `Open ${definition.id === "jev_session" ? "Jev Capability Advisor" : "Hussi9 skill-router"} on GitHub (new tab)`,
        factor,
        speedLabel:
          factor === null
            ? "Native baseline"
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
        announcement: `${definition.label}${definition.experimental ? " (internal, unpublished experiment)" : ""}: ${medianSeconds.toFixed(2)} seconds median. ${factor === null ? "Native baseline" : `${factor.toFixed(2)} times the native selection speed`}. ${skill.correct} of ${skill.n} correct accepted choices. Product features: ${features.map((item) => `${item.label}: ${item.value}`).join("; ")}.`,
      };
    })
    .sort((left, right) => left.medianSeconds - right.medianSeconds);
  const ours = allRows.find((row) => row.id === "jev_session");
  const hussi = allRows.find((row) => row.id === "hussi_original");
  return {
    defaultId: "jev_session",
    baselineId: "native",
    allRows,
    rows: allRows.filter((row) => visibleIds.includes(row.id)),
    hussiFactor: hussi.medianSeconds / ours.medianSeconds,
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
    nativeEvidencePath:
      "skill-evals/jev-capability-advisor/benchmarks/native-next-skill-2026-09-24.json",
    displayedObservations: allRows
      .filter((row) => visibleIds.includes(row.id))
      .reduce((total, row) => total + row.observations + row.noneObservations, 0),
    completedNativeExecutions: native.groups.all.n,
  };
}
