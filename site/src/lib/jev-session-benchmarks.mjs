import evidence from "../../../skill-evals/jev-capability-advisor/benchmarks/session-index-2026-09-23.json" with { type: "json" };
import native from "../../../skill-evals/jev-capability-advisor/benchmarks/native-index-2026-09-23.json" with { type: "json" };
import parity from "../../../skill-evals/jev-capability-advisor/benchmarks/session-index-parity-2026-09-23.json" with { type: "json" };

// One source for the current chart and its README. Earlier studies remain archived.
export function sessionComparison(archived) {
  const study = evidence.studies.find((entry) => entry.study_id === "memo-matched48");
  const mixed = evidence.studies.find((entry) => entry.study_id === "memo-mixed100");
  const mapping = {
    jev_session: "jev_candidate",
    jev_cold: "jev_candidate_cold",
    hussi_original: "hussi_original",
    hussi_control: "hussi_session_control",
  };
  const groups = Object.fromEntries(
    Object.entries({ all: "all", primary_positive: "skill", none: "none" }).map(
      ([name, source]) => [
        name,
        {
          arms: {
            ...Object.fromEntries(
              Object.entries(mapping).map(([id, arm]) => [id, study.groups[source][arm]]),
            ),
            native: native.groups[name].native,
          },
        },
      ],
    ),
  );
  const notes = {
    jev_session:
      "Reuses HTTPS and one bounded lexical index in the owning process. Every frame validates a fresh catalog; valid requests with eligible candidates ask Jev again. Same full candidate descriptions and answer checks as Fresh; no result cache.",
    jev_cold:
      "Our complete advisor in a new Session for every task: validate, rank, build the bounded index, connect and check Jev's answer. Includes first-use index retention checks; the Session is closed after each observation.",
    hussi_original:
      "Pinned published Jev chooser: domain, process and task-type selection, 600-character task limit and a 0.8 acceptance gate. Fresh HTTPS here. Its whole router, hooks and fallback workflow were not measured.",
    hussi_control:
      "Our internal experiment: the pinned Hussi chooser with our reusable HTTPS client and compact JSON serialization; not an upstream release. Skill-only qualification here; not integrated with our MCP, clarification or compound contract.",
    native:
      "GPT-6 Astra, reasoning low, with identical candidate cards and selection rules. Measures original baseline preparation plus the model turn in a separate run. Process startup, skill loading and task execution are excluded.",
  };
  const rows = archived.rows
    .map((old) => {
      const result = groups.primary_positive.arms[old.id];
      const none = groups.none.arms[old.id];
      const factor =
        old.id === "native"
          ? null
          : groups.primary_positive.arms.native.median_ms / result.median_ms;
      const medianSeconds = result.median_ms / 1000;
      return {
        ...old,
        info: notes[old.id],
        factor,
        medianSeconds,
        p95Seconds: result.p95_ms / 1000,
        correct: result.correct,
        observations: result.n,
        noneCorrect: none.correct,
        noneObservations: none.n,
        errors: groups.all.arms[old.id].errors,
        announcement: `${old.label}${old.experimental ? " (our internal experiment)" : ""}: ${medianSeconds.toFixed(2)} seconds median. ${factor === null ? "Native baseline" : `${factor.toFixed(2)} times the native selection speed`}. ${result.correct} of ${result.n} correct accepted selections.`,
      };
    })
    .sort((left, right) => left.medianSeconds - right.medianSeconds);
  const previous = mixed.groups.all.jev_baseline;
  const selected = mixed.groups.all.jev_candidate;
  return {
    ...archived,
    evidence,
    nativeEvidence: native,
    parity,
    evidencePath: "skill-evals/jev-capability-advisor/benchmarks/session-index-2026-09-23.json",
    nativeEvidencePath:
      "skill-evals/jev-capability-advisor/benchmarks/native-index-2026-09-23.json",
    parityPath:
      "skill-evals/jev-capability-advisor/benchmarks/session-index-parity-2026-09-23.json",
    study,
    mixed,
    rows,
    groups,
    displayedObservations: rows.reduce(
      (total, row) => total + row.observations + row.noneObservations,
      0,
    ),
    dateLabel: [
      ...new Set([study.window.started_at.slice(0, 10), native.started_at.slice(0, 10)]),
    ].join(" / "),
    optimization: {
      title: "Larger catalogs. Less repeated preparation.",
      previous,
      selected,
      catalogRecords: mixed.catalog_records,
      preparationReductionPercent:
        (1 -
          parity.local_preparation_medians_ms.mixed_catalog.candidate /
            parity.local_preparation_medians_ms.mixed_catalog.baseline) *
        100,
      smallCatalogChangePercent:
        (study.groups.skill.jev_candidate.median_ms / study.groups.skill.jev_baseline.median_ms -
          1) *
        100,
      reductionPercent: (1 - selected.median_ms / previous.median_ms) * 100,
      rows: [
        { label: "Jev Session · previous preparation", ...previous },
        { label: "Jev Session · reusable index", ...selected },
      ],
      notes: [
        {
          title: "Less repeated preparation",
          text: "Reuse a matching derived index; rebuild when catalog or representative identity changes. Search and validate current metadata again for every task; reuse HTTPS in the same process.",
        },
        {
          title: "No information removed",
          text: "Keep 200-character initial descriptions, 240-character follow-ups, long task context, MCP tools, activation restrictions and strict answer checks. Shorter descriptions failed qualification and were rejected.",
        },
        {
          title: "Equivalent recorded decisions",
          text: `${parity.replay.observations_replayed}/${parity.replay.observations_replayed} recorded observations and ${parity.replay.recorded_requests_replayed} request payloads reproduced unchanged. This is an offline equivalence check, not additional live model testing.`,
        },
      ],
    },
    technical: {
      title: "Why routing speeds differ",
      introduction:
        "Same Jev model. Different selection work. Session reuses HTTPS and a bounded search index; Fresh pays their first-use costs for every task.",
      rows: [
        ...archived.technical.rows.filter((row) => row.topic !== "Connection"),
        {
          topic: "Reuse",
          hussi: "Published chooser: fresh HTTPS here. Our internal control reuses HTTPS.",
          jev: "Session: HTTPS + one bounded lexical index. Fresh: rebuild and reconnect. Fresh catalog validation in both.",
        },
      ],
      notes: [
        {
          title: "Why Session saves work",
          text: "Matching catalog and alias-representative identities avoid rebuilding lexical postings. No recommendation is cached: eligible routing requests still call Jev. Changed metadata invalidates the index.",
        },
        {
          title: "Why Fresh has more work",
          text: "The full advisor validates skills and tools, resolves aliases, ranks candidates and checks answer consistency. A new Session also measures and bounds its index; that cost is retained in the timing.",
        },
        {
          title: "How to read Hussi9",
          text: "Correct accepted selections require its original 0.8 confidence threshold. An abstention is not necessarily a wrong raw guess. Payload, transport and provider effects were not individually isolated.",
        },
      ],
    },
    experiment: {
      title: "What our Hussi experiment tells us",
      notes: [
        {
          title: "Same transport, different chooser",
          text: "Our internal control combines the pinned Hussi chooser with our persistent HTTPS client and compact JSON. It is not a published Hussi9 upgrade.",
        },
        {
          title: "A measured comparison",
          text: "The current bars use the same 48 tasks and catalog. The four Jev-based display variants ran interleaved; Native ran separately. Differences of a few milliseconds need the paired uncertainty intervals in the evidence.",
        },
        {
          title: "Keep the broader contract",
          text: "Our advisor additionally qualifies MCP tools, clarification, compound outcomes and long context. The Hussi transport control was only tested on skills and no-match tasks here.",
        },
      ],
    },
  };
}
