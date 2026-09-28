// Reviewed measurement identities. A new run never changes an older receipt's source link.
const sharedSources = {
  "retrieval.py": "b0d55bb85cb93812f1630ebc1143953d442c194da10d6f6bf961106b351e655a",
  "routing_metadata.py": "7f89290ef095005fa50242f8243fe36aea2b867716f922de01a312e77343bae6",
  "index_cache.py": "6f574e59549f78603ad625e944473422915529dd58f810370fd5482f00b784c1",
  "decision_cache.py": "9137cca1125ef5718206a8ade1557abb5c06db1ba47a2ed374e0889b5ae50daa",
  "https_transport.py": "e1e30a5b228d1269747fa185eca0ab3975c9a5a79e23bbaa78af44cb38192c5f",
  "jev_session.py": "154d0040f456deb6f8b5303348a9ee10695a8bbfb33972f3f3a9870f2e5f3efa",
};

const series = [
  {
    date: "2026-09-24",
    revision: "a4a8512dd8ebb55abb26650e08af38f301cea064",
    freeze: "c67d4543ab54eb9dbc76d0c5122000835a9e90e26d7913e21ac92a5330060a67",
    binding: "76ab1e5a452a24e33bae6ff0ae11d6713ce34bd2a01c95c33f558423c490f238",
    advisor: "f431ba4fa0bbddc9d7a7d3835a2f8a08580c3a155794337c9260ee408b4c04e5",
    previouslyExposed: false,
  },
  {
    date: "2026-09-25",
    revision: "095de174e8eb345b27a726631c6a2215168958df",
    freeze: "aa6dd40d954ff6026a83ab0c90d5d1a80cfcbdb300b5809c6b9e5ca1a165fb1a",
    binding: "e5394f7c501388ad36bd4712b665dc0de5f723d3f9136362a1e435e2677c105d",
    advisor: "e20dfce9dd66b032f1990681c0e93f0b51af8bc630dc67bfb0f8a3e369434bec",
    previouslyExposed: true,
  },
];

export function measurementSeries(study) {
  const entry = series.find((item) => item.freeze === study?.provenance?.freeze_sha256);
  const sources = { ...sharedSources, "jev_advisor.py": entry?.advisor };
  const recorded = study?.provenance?.source_sha256?.next_skill;
  if (
    !entry ||
    study.provenance.binding_sha256 !== entry.binding ||
    study.window?.started_at?.slice(0, 10) !== entry.date ||
    !recorded ||
    Object.keys(recorded).length !== Object.keys(sources).length ||
    !Object.entries(sources).every(([file, hash]) => recorded[file] === hash)
  )
    throw new Error(
      "Jev next-skill comparison: unreviewed freeze, date, binding or runtime source",
    );
  const base = "skill-evals/jev-capability-advisor/benchmarks";
  return {
    date: entry.date,
    measuredRevision: entry.revision,
    previouslyExposed: entry.previouslyExposed,
    evidencePath: `${base}/next-skill-${entry.date}.json`,
    nativeEvidencePath: `${base}/native-next-skill-${entry.date}.json`,
  };
}
