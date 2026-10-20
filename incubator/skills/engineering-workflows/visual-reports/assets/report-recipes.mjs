// Original compositions, not copied upstream templates. SPDX-License-Identifier: Apache-2.0
// Upstream numbers are a coverage index, not a runtime dependency or code provenance claim.
export const recipes = Object.freeze([
  ["r01", "Codeansätze vergleichen", ["comparison", "code"]],
  ["r02", "Visuelle Designrichtungen", ["variants", "comparison"]],
  ["r03", "Pull-Request-Code-Review", ["diff", "table", "fileTree"]],
  ["r04", "Code und Datenfluss verstehen", ["code", "graph"]],
  ["r05", "Designsystem dokumentieren", ["table", "variants"]],
  ["r06", "Komponentenvarianten", ["variants", "table"]],
  ["r07", "Motion-Prototyp", ["motion", "text"]],
  ["r08", "Interaktionsprototyp", ["prototype"]],
  ["r09", "Präsentation", ["slides"]],
  ["r10", "Beschriftete SVG-Illustration", ["graph", "text"]],
  ["r11", "Statusbericht", ["metrics", "steps"]],
  ["r12", "Incident-Bericht", ["timeline", "text", "steps"]],
  ["r13", "Ablaufdiagramm", ["graph"]],
  ["r14", "Funktion erklären", ["graph", "text"]],
  ["r15", "Konzept erklären und behalten", ["graph", "text", "steps"]],
  ["r16", "Implementierungsplan", ["timeline", "steps"]],
  ["r17", "Pull-Request-Beschreibung", ["diff", "fileTree", "steps"]],
  ["r18", "Lokales Triage-Board", ["board"]],
  ["r19", "Lokaler Feature-Flag-Editor", ["flags"]],
  ["r20", "Lokaler Prompt-Tuner", ["prompt"]],
  ["r21", "Dashboard", ["metrics", "comparison", "table"]],
  ["r22", "Interaktive Tabelle", ["table"]],
  ["r23", "Systemarchitektur", ["graph", "table"]],
  ["r24", "Zeitplan und Gantt", ["timeline", "table"]],
].map(([id, title, kinds]) => Object.freeze({ id, upstreamNumber: id.slice(1), title, kinds: Object.freeze(kinds) })));

const section = (id, kind, title, data, caveats = []) => ({ id, kind, title, data, sourceIds: ["demo"], caveats });
const cell = (value, note = "") => ({ value, note, state: value === null ? "unknown" : "fictional", sourceIds: ["demo"] });
const comparison = () => ({
  options: [{ id: "a", label: "Variante A", note: "Einfacher Ausgangspunkt" }, { id: "b", label: "Variante B", note: "Zusätzliche Prüfung" }, { id: "c", label: "Variante C", note: "Noch nicht gemessen" }],
  criteria: [
    { id: "latency", label: "Laufzeit", unit: "ms", context: "Fiktiver gleicher Einzelauftrag; keine Produktmessung", direction: "lower", values: { a: cell(30), b: cell(45), c: cell(null, "Fehlende Messung ist nicht 0 ms") } },
    { id: "coverage", label: "Dokumentierte Fälle", unit: "/ 10", context: "Fiktiver gemeinsamer Nenner; kein Qualitätsscore", direction: "higher", values: { a: cell(6), b: cell(8), c: cell(4, "Nicht mit ausgelieferten Funktionen gleichsetzen") } },
    { id: "state", label: "Freigabestatus", unit: "", context: "Status, keine numerische Rangfolge", direction: "none", values: { a: cell("Prüfung offen"), b: cell("Prüfung offen"), c: { value: "Geplant", state: "planned", note: "Noch nicht verfügbar", sourceIds: ["demo"] } } },
  ],
});
const grid = () => ({ columns: [{ id: "name", label: "Eintrag" }, { id: "value", label: "Wert" }, { id: "state", label: "Status / Bedingung" }], rows: [
  { id: "a", cells: { name: "Alpha", value: 2, state: "fictional: Beispiel" } },
  { id: "b", cells: { name: "Beta", value: 10, state: "planned: nicht verfügbar" } },
  { id: "c", cells: { name: "Gamma", value: null, state: "unknown: nicht als fehlend bewerten" } },
] });
const variants = () => ({ items: [
  { label: "Neutral", text: "Gleicher Inhalt, ruhige matte Darstellung.", tone: "neutral", status: "In Prüfung", progress: 72 },
  { label: "Mint", text: "Gleicher Inhalt, ruhige matte Darstellung.", tone: "mint", status: "In Prüfung", progress: 72 },
  { label: "Gold", text: "Gleicher Inhalt, ruhige matte Darstellung.", tone: "gold", status: "In Prüfung", progress: 72 },
] });
const graph = () => ({ nodes: [
  { id: "source", label: "Quelle", x: 20, y: 20 }, { id: "model", label: "Reportmodell", x: 260, y: 140 },
  { id: "html", label: "HTML", x: 20, y: 280 }, { id: "md", label: "Markdown", x: 260, y: 280 }, { id: "json", label: "JSON", x: 500, y: 280 },
], edges: [{ from: "source", to: "model", label: "zuordnen" }, { from: "model", to: "html", label: "darstellen" }, { from: "model", to: "md", label: "lesen" }, { from: "model", to: "json", label: "auswerten" }] });
const steps = () => ({ items: [
  { label: "Quellen prüfen", action: "Datenstand und fehlende Belege erfassen.", success: "Jede entscheidende Aussage hat einen nachvollziehbaren Beleg oder eine sichtbare Lücke.", recovery: "Unbekannt markieren; keine Werte ergänzen oder Quellen erfinden." },
  { label: "Ergebnis prüfen", action: "Vergleich und vollständige Exporte anhand derselben Daten öffnen.", success: "Werte, Einheiten und Einschränkungen stimmen überein.", recovery: "Zuordnung korrigieren und alle Formate erneut erzeugen." },
] });
const timeline = () => ({ tasks: [
  { id: "inspect", label: "Analyse", owner: "Beispielrolle A", start: "2026-01-05", end: "2026-01-07", progress: 100 },
  { id: "build", label: "Umsetzung", owner: "Beispielrolle B", start: "2026-01-08", end: "2026-01-13", progress: 50 },
  { id: "review", label: "Abnahme", owner: "Beispielrolle A", start: "2026-01-14", end: "2026-01-14", progress: 0 },
], dependencies: [{ from: "inspect", to: "build" }, { from: "build", to: "review" }] });
const metrics = () => ({ items: [
  { label: "Erfasste Datensätze", value: 12, unit: "von 15", context: "Fiktiver gemeinsamer Datenstand; 3 nicht geprüft", state: "fictional" },
  { label: "Offene Prüfungen", value: 3, unit: "Fälle", context: "Nicht automatisch als Fehler behandeln", state: "fictional" },
  { label: "Gemessener Zeitgewinn", value: null, unit: "min", context: "Keine Messung vorhanden", state: "unknown" },
] });
const files = () => ({ entries: [
  { path: "example/source.json", status: "changed", role: "Maßgebliche Beispieldaten" },
  { path: "example/report.html", status: "added", role: "Generierter Output; nicht parallel pflegen" },
  { path: "example/archive.md", from: "example/notes.md", status: "moved", role: "Umbenannte Dokumentation" },
  { path: "example/old.html", status: "deleted", role: "Veralteter Beispieloutput" },
  { path: "example/.cache/", status: "context", role: "Lokaler ignorierter Zustand; nicht Bestandteil eines Exports" },
] });
const code = () => ({ blocks: [
  { label: "Direkte Zuordnung", code: "const rows = input.map(toRow);", notes: ["Weniger Schritte; Annahme: bereits geprüfte Eingaben."] },
  { label: "Validierung vor Zuordnung", code: "validate(input);\nconst rows = input.map(toRow);", notes: ["Zusätzliche Vorbedingungsprüfung; Fehlermeldungen explizit behandeln."] },
] });
const diff = () => ({ before: "return input.map(toRow);", after: "validate(input);\nreturn input.map(toRow);", notes: ["Beispieldiff, nicht aus einem realen Repository. Validierung allein beweist keine vollständige Sicherheit."] });

/** Recipes only compose blocks; they never own a second HTML/CSS implementation. */
export function exampleReport(id) {
  const recipe = recipes.find((entry) => entry.id === id);
  if (!recipe) throw new TypeError(`Unknown recipe ${id}`);
  let sections;
  switch (id) {
    case "r01": sections = [section("compare", "comparison", "Ansätze direkt vergleichen", comparison()), section("code", "code", "Code und Bedingungen", code())]; break;
    case "r02": sections = [section("variants", "variants", "Gleicher Inhalt, drei Richtungen", variants()), section("compare", "comparison", "Gemeinsame Kriterien statt Einzelgalerien", comparison())]; break;
    case "r03": sections = [section("diff", "diff", "Änderung und Befund", diff()), section("findings", "table", "Befunde, Schwere und Grenzen", grid()), section("files", "fileTree", "Betroffene Dateien", files())]; break;
    case "r04": sections = [section("code", "code", "Schrittweise Erklärung", code()), section("flow", "graph", "Eingabe und Ausgabe", graph())]; break;
    case "r05": {
      const d = grid(); d.rows = [{ id: "space", cells: { name: "Abstand", value: "1.3rem", state: "Konfigurierbar, keine globale Nutzerpräferenz" } }, { id: "type", cells: { name: "Schrift", value: "System Sans", state: "Fallback; keine Schriftdateien übertragen" } }];
      sections = [section("tokens", "table", "Designparameter", d), section("variants", "variants", "Zurückhaltende Beispiele", variants())]; break;
    }
    case "r06": sections = [section("variants", "variants", "Varianten bei gleichem Fortschritt", variants()), section("props", "table", "Eigenschaften und Zustände", grid())]; break;
    case "r07": sections = [section("motion", "motion", "Bewegung bewusst testen", { distance: 180, duration: 800, easing: "ease-out" }, ["Nur für den ausdrücklich gewählten Motion-Prototyp; kein Effekt im normalen Report."]), section("explanation", "text", "Statische Alternative", { paragraphs: ["Start: links. Ende: 180 Pixel rechts. Abspielen und Stoppen bleiben freiwillig; Reduced Motion verhindert die Animation."] })]; break;
    case "r08": sections = [section("prototype", "prototype", "Klickbarer Zustandsablauf", { states: ["Bereit", "In Prüfung", "Abgeschlossen"], initial: "Bereit", transitions: [{ from: "Bereit", to: "In Prüfung", label: "Prüfung starten" }, { from: "In Prüfung", to: "Abgeschlossen", label: "Prüfung abschließen" }, { from: "In Prüfung", to: "Bereit", label: "Abbrechen" }] })]; break;
    case "r09": sections = [section("slides", "slides", "Präsentation mit vollständiger Leseansicht", { slides: [{ id: "question", title: "Welche Entscheidung steht an?", text: "Beispiel: Direktes Mapping oder vorherige Validierung?", caveats: ["Fiktive Entscheidung; keine reale Implementierungsfreigabe."] }, { id: "evidence", title: "Welche Bedingungen gelten?", text: "Ungeprüfte Daten dürfen nicht still als vollständig behandelt werden.", caveats: [] }, { id: "action", title: "Was ist der nächste Schritt?", text: "Datenstand prüfen und die gleiche Quelle in allen Formaten erhalten.", caveats: [] }] })]; break;
    case "r10": sections = [section("illustration", "graph", "Ein Datenstand, drei Sichten", graph()), section("caption", "text", "Bildbeschreibung", { paragraphs: ["Die Quelle führt zum gemeinsamen Reportmodell. Daraus entstehen HTML, Markdown und JSON. Pfeile zeigen Ableitung, keine gemessene Verarbeitungsgeschwindigkeit."] })]; break;
    case "r11": sections = [section("metrics", "metrics", "Stand mit sichtbaren Lücken", metrics()), section("actions", "steps", "Nächste Schritte und Erfolgskriterien", steps())]; break;
    case "r12": sections = [section("timeline", "timeline", "Fiktiver Incident-Verlauf", timeline()), section("impact", "text", "Auswirkung und Ursachenstatus", { paragraphs: ["Beispiel: Ein Datenimport wurde unterbrochen. Der Umfang ist noch nicht belegt; Ursache und Hypothese nicht verwechseln."] }, ["Die Zeitangaben sind Demonstrationsdaten, keine echte Incident-Chronologie."]), section("followup", "steps", "Wiederherstellung und Nachprüfung", steps())]; break;
    case "r13": {
      const d = { nodes: [{ id: "input", label: "Eingabe", x: 220, y: 10 }, { id: "check", label: "Vollständig?", x: 220, y: 110 }, { id: "accept", label: "Übernehmen", x: 20, y: 250 }, { id: "review", label: "Manuell prüfen", x: 440, y: 250 }], edges: [{ from: "input", to: "check", label: "prüfen" }, { from: "check", to: "accept", label: "ja" }, { from: "check", to: "review", label: "nein / unbekannt" }] };
      sections = [section("flow", "graph", "Entscheidung mit Fehlerpfad", d)]; break;
    }
    case "r14": sections = [section("feature", "graph", "Wie der vollständige Export funktioniert", graph()), section("limits", "text", "Funktion und Grenze", { paragraphs: ["Browserfilter ändern nur die Darstellung. Das Original-JSON und Markdown enthalten weiterhin alle Optionen, Kennzahlen und Quellen.", "Lokale Entwürfe werden separat exportiert. Eine Quelldatei wird dadurch nicht automatisch geändert."] })]; break;
    case "r15": sections = [section("concept", "graph", "Eine maßgebliche Quelle verstehen", graph()), section("recall", "text", "Optionaler Denkanstoß", { paragraphs: ["Warum führen drei separat gepflegte Exporte zu Widersprüchen? Weil spätere Änderungen nur in einem Format ankommen können. Ein gemeinsames Modell vermeidet diese zusätzliche Pflege.", "Die Grafik und Frage sind Erklärhilfen, kein Nachweis eines Lern- oder Erinnerungseffekts."] }), section("example", "steps", "An einem Beispiel anwenden", steps())]; break;
    case "r16": sections = [section("plan", "timeline", "Phasen und Abhängigkeiten", timeline()), section("acceptance", "steps", "Prüfbare Meilensteine", steps())]; break;
    case "r17": sections = [section("change", "diff", "Was und warum", diff()), section("files", "fileTree", "Dateiübergabe mit Rollen", files()), section("tests", "steps", "Tests und Reviewer-Hinweise", steps())]; break;
    case "r18": sections = [section("board", "board", "Aufgaben lokal sortieren", { columns: ["Backlog", "In Prüfung", "Erledigt"], cards: [{ id: "task-a", label: "Quellen zuordnen", column: "Backlog", priority: "Hoch", description: "Belege und sichtbare Lücken ergänzen." }, { id: "task-b", label: "Exporte prüfen", column: "In Prüfung", priority: "Normal", description: "Gleiche Informationen in drei Formaten nachweisen." }] }, ["Drag-and-drop oder tastaturbedienbare Auswahl; kein Team-Sync und keine Serverpersistenz."])]; break;
    case "r19": sections = [section("flags", "flags", "Flags als lokalen Entwurf prüfen", { flags: [{ id: "preview", label: "Vorschau", scope: "Lokales Beispielszenario", enabled: true, rollout: 25 }, { id: "new-flow", label: "Neuer Ablauf", scope: "Lokales Beispielszenario", enabled: false, rollout: 0 }] })]; break;
    case "r20": sections = [section("prompt", "prompt", "Prompt und Parameter lokal bearbeiten", { system: "Fasse die bereitgestellten Quellen zusammen. Markiere fehlende Belege.", user: "Vergleiche die Optionen anhand derselben Kriterien.", temperature: 0.2, maxTokens: 1200 }, ["Keine Modell-API angeschlossen. Die Vorschau zeigt nur den lokalen Request-Entwurf."])]; break;
    case "r21": sections = [section("metrics", "metrics", "Kennzahlen mit Bezugsrahmen", metrics()), section("compare", "comparison", "Optionen und Kennzahlen gleichzeitig", comparison()), section("records", "table", "Datensätze nachschlagen", grid())]; break;
    case "r22": sections = [section("table", "table", "Suchen und numerisch sortieren", grid(), ["Null bleibt unbekannt. Sortierung und Filter verändern den Export nicht."])]; break;
    case "r23": sections = [section("architecture", "graph", "Quelle, Adapter und gemeinsamer Renderer", graph()), section("inventory", "table", "Komponenten und Verantwortlichkeiten", grid())]; break;
    case "r24": sections = [section("timeline", "timeline", "Phasen, Abhängigkeiten und Meilenstein", timeline()), section("inventory", "table", "Ergänzende Nachschlageansicht", grid())]; break;
  }
  return { schemaVersion: 1, id, title: recipe.title, goal: ["r01", "r02", "r21"].includes(id) ? "decide" : ["r16", "r17", "r18"].includes(id) ? "execute" : "understand", style: "current", takeaway: "Fiktives Funktionsbeispiel: Inhalte, Bedingungen und Quellen bleiben in allen Ausgabeformaten erhalten.", criticalCaveats: ["Alle Werte, Rollen, Zeitangaben und Fälle sind fiktive Demonstrationen. Keine Produktdaten, Messnachweise oder Leistungsversprechen."], sources: [{ id: "demo", label: "Originales fiktives Demonstrationsmodell im Visual-Reports-Skill", state: "fictional", asOf: "2026-10-20" }], sections };
}
