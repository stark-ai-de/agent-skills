// SPDX-License-Identifier: Apache-2.0
export const templates = Object.freeze({
  overview: {
    label: "Überblick",
    question: "Was muss ich jetzt wissen?",
    goal: "lookup",
    outline: ["Kernaussage", "Wichtige Punkte", "Nächster Schritt"],
    visuals: ["metrics", "diagram", "bullets"],
  },
  comparison: {
    label: "Vergleich / Entscheidung",
    question: "Welche Option passt unter welchen Bedingungen?",
    goal: "decide",
    outline: ["Empfehlung", "Gemeinsame Kriterien", "Tradeoffs", "Entscheidung"],
    visuals: ["comparison", "chart:before-after", "chart:actual-target"],
    required: ["Optionen", "Kriterien und Richtung", "Entscheidende Einschränkungen"],
  },
  research: {
    label: "Recherche",
    question: "Was ist belegt und was bleibt offen?",
    goal: "understand",
    outline: ["Ergebnis", "Belege", "Widersprüche und Lücken", "Nächste Prüfung"],
    visuals: ["table", "comparison", "diagram"],
    required: ["Primärquellen", "Quellenstand", "Evidenzzustand"],
  },
  explanation: {
    label: "Erklärung",
    question: "Wie hängt das zusammen?",
    goal: "understand",
    outline: ["Kernidee", "Zusammenhänge", "Beispiel", "Grenzen"],
    visuals: ["diagram", "steps", "chart:line"],
    required: ["Begriffe", "Beziehungen", "Beispielstatus"],
  },
  plan: {
    label: "Plan / Roadmap",
    question: "Was geschieht wann und mit welchen Abhängigkeiten?",
    goal: "execute",
    outline: ["Ziel", "Etappen", "Abhängigkeiten", "Abnahme"],
    visuals: ["timeline", "steps", "diagram"],
    required: ["Verantwortliche", "Termine oder unbekannt", "Erfolgskriterien"],
  },
  status: {
    label: "Status",
    question: "Wo stehen wir gegenüber dem Ziel?",
    goal: "lookup",
    outline: ["Stand", "Zielabgleich", "Hindernisse", "Nächste Aktion"],
    visuals: ["metrics", "chart:actual-target", "statusHistory"],
    required: ["Beobachtungszeitraum", "Ziel", "Datenlücken"],
  },
  review: {
    label: "Review / Änderungen",
    question: "Was hat sich geändert und welche Folgen hat es?",
    goal: "decide",
    outline: ["Ergebnis", "Änderungen", "Risiken", "Verifikation"],
    visuals: ["diff", "chart:before-after", "fileTree"],
    required: ["Basisstand", "Neuer Stand", "Geprüft und ungeprüft"],
  },
  diagnosis: {
    label: "Diagnose / Störung",
    question: "Was erklärt die Beobachtung und was prüfen wir als Nächstes?",
    goal: "execute",
    outline: ["Auswirkung", "Beobachtungen", "Hypothesen", "Nächste Prüfung"],
    visuals: ["statusHistory", "timeline", "diagram"],
    required: ["Symptom", "Zeitbezug", "Hypothese versus Nachweis", "Rückfallweg"],
  },
});
export const profiles = Object.freeze({
  software: {
    label: "Software / Produkte",
    required: ["Zielgruppe", "Anwendungsfall", "Version", "Einschränkungen"],
    visuals: ["comparison", "figure", "chart:before-after"],
  },
  architecture: {
    label: "Architektur",
    required: ["Systemgrenzen", "Verantwortung", "Datenfluss", "Alternativen"],
    visuals: ["diagram", "comparison"],
  },
  code: {
    label: "Codeänderungen",
    required: ["Basis und Ziel", "Betroffene Dateien", "Verhalten", "Testnachweise"],
    visuals: ["diff", "fileTree", "diagram"],
  },
  operations: {
    label: "Betrieb / Fehler",
    required: ["Zeitraum", "Auswirkung", "Beobachtung", "Wiederherstellung"],
    visuals: ["statusHistory", "timeline", "chart:line"],
  },
  capacity: {
    label: "Kosten / Kapazität",
    required: ["Einheit", "Zeitraum", "Annahmen", "Grenze"],
    visuals: ["chart:waterfall", "chart:actual-target", "chart:stacked-bar"],
  },
});
export function starter({ type = "overview", profile = "software", id = "report" } = {}) {
  if (!Object.hasOwn(templates, type) || !Object.hasOwn(profiles, profile))
    throw new TypeError("Unknown template or profile; use --templates");
  const template = templates[type],
    domain = profiles[profile];
  return {
    schemaVersion: 2,
    id,
    title: `${template.label} · ${domain.label}`,
    takeaway: "Entwurf: Kernaussage nach Prüfung der Quellen ergänzen.",
    goal: template.goal,
    reportType: type,
    domainProfile: profile,
    style: "current",
    presentation: "topics",
    nextAction: "Offene Angaben mit den vorhandenen Quellen klären.",
    criticalCaveats: ["Unbefülltes Startermodell; keine Tatsachen oder Messwerte."],
    sources: [],
    sections: template.outline.map((label, i) => ({
      id: `section-${i + 1}`,
      title: label,
      kind: "bullets",
      sourceIds: [],
      caveats: [],
      data: {
        items:
          i === 0
            ? [template.question]
            : [`Offen: ${[...(template.required ?? []), ...domain.required][i - 1] ?? label}`],
      },
    })),
  };
}
