// Shared, pure working-state contract. SPDX-License-Identifier: Apache-2.0
// Used by the Node renderer and embedded verbatim (without exports) in its runtime.
const copy = (value) => JSON.parse(JSON.stringify(value));
const requireState = (condition, message) => { if (!condition) throw new TypeError(message); };
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
};
const equal = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

export function originalReport(report) {
  return copy(report.editing ? report.editing.original : report);
}

function withoutRevision(report) {
  const value = copy(report);
  delete value.editing;
  return value;
}

/** Only the explicitly supported local editor fields may differ from the baseline. */
function editorChanges(original, current) {
  requireState(original && current && Array.isArray(original.sections) && Array.isArray(current.sections), "Invalid working-state sections");
  requireState(!original.editing, "Nested original snapshots are not supported");
  requireState(original.sections.length === current.sections.length, "Local editing cannot add or remove sections");
  const expected = copy(original), changes = [];
  if (current.style !== undefined) {
    requireState(["current", "balanced", "calm"].includes(current.style), "Invalid working style");
    expected.style = current.style;
  } else delete expected.style;
  const assign = (s, target, old, now, field, valid) => {
    requireState(valid(now[field]), `Invalid edited ${s.kind}.${field}`);
    target[field] = now[field];
    if (!equal(old[field], now[field])) changes.push({ sectionId: s.id, targetId: old.id ?? s.id, field, before: old[field], after: now[field], state: "user-edited", sourceIds: copy(s.sourceIds) });
  };
  original.sections.forEach((s, i) => {
    const c = current.sections[i], e = expected.sections[i];
    requireState(c && c.id === s.id && c.kind === s.kind, "Local editing cannot replace or reorder sections");
    if (s.kind === "board") {
      requireState(Array.isArray(c.data.cards) && c.data.cards.length === s.data.cards.length, "Local editing cannot remove cards");
      s.data.cards.forEach((item, j) => {
        requireState(c.data.cards[j].id === item.id, "Local editing cannot change card IDs");
        assign(s, e.data.cards[j], item, c.data.cards[j], "column", (v) => s.data.columns.includes(v));
      });
    }
    if (s.kind === "flags") {
      requireState(Array.isArray(c.data.flags) && c.data.flags.length === s.data.flags.length, "Local editing cannot remove flags");
      s.data.flags.forEach((item, j) => {
        requireState(c.data.flags[j].id === item.id, "Local editing cannot change flag IDs");
        assign(s, e.data.flags[j], item, c.data.flags[j], "enabled", (v) => typeof v === "boolean");
        assign(s, e.data.flags[j], item, c.data.flags[j], "rollout", (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100);
      });
    }
    if (s.kind === "prompt") {
      for (const field of ["system", "user"]) assign(s, e.data, s.data, c.data, field, (v) => typeof v === "string");
      assign(s, e.data, s.data, c.data, "temperature", (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 2);
      assign(s, e.data, s.data, c.data, "maxTokens", (v) => Number.isInteger(v) && v >= 1 && v <= 100000);
    }
  });
  requireState(equal(expected, withoutRevision(current)), "Local editing cannot change sources, evidence, caveats or non-editor fields");
  return changes;
}

/** Changes are a diff against one immutable baseline, not a fabricated verification. */
export function workingReport(source, draft) {
  validateRevision(source);
  const original = originalReport(source);
  const current = withoutRevision(draft);
  const changes = editorChanges(original, current);
  if (changes.length) current.editing = { version: 1, kind: "user-edit", original, changes };
  return current;
}

export function validateRevision(report) {
  if (report.editing === undefined) return report;
  const e = report.editing;
  requireState(e && e.version === 1 && e.kind === "user-edit" && Array.isArray(e.changes) && e.changes.length > 0, "Invalid editing metadata");
  requireState(equal(Object.keys(e).sort(), ["changes", "kind", "original", "version"]), "Unsupported editing metadata fields");
  const expected = editorChanges(e.original, report);
  requireState(equal(e.changes, expected), "Editing change list does not match original and current state");
  return report;
}

export function editNotice(report, sectionId) {
  const changes = (report.editing?.changes ?? []).filter((change) => sectionId === undefined || change.sectionId === sectionId);
  if (!changes.length) return "";
  return `Nutzerbearbeitung: ${changes.length} Feldänderung(en)${sectionId ? ` (${changes.map((c) => `${c.targetId}.${c.field}`).join(", ")})` : ""}. Original-Snapshot getrennt erhalten. Originalbelege bestätigen diese Änderungen nicht; keine neue Quellenprüfung.`;
}

function markdownValue(value, depth = 0) {
  const pad = "  ".repeat(depth);
  const md = (v) => String(v).replace(/[\\`*_{}\[\]<>#|]/g, "\\$&").replace(/\n/g, "  \n" + pad + "  ");
  if (Array.isArray(value)) return value.length ? value.map((v, i) => `${pad}- ${i + 1}:` + (v && typeof v === "object" ? "\n" + markdownValue(v, depth + 1) : " " + md(v))).join("\n") : `${pad}(empty)`;
  if (value && typeof value === "object") return Object.entries(value).map(([k, v]) => `${pad}- ${md(k)}:` + (v && typeof v === "object" ? "\n" + markdownValue(v, depth + 1) : " " + md(v === null ? "unknown (null)" : v))).join("\n");
  return pad + md(value);
}

export function stateMarkdown(report) {
  validateRevision(report);
  const current = copy(report);
  if (current.editing) delete current.editing.original;
  const original = report.editing ? `\n## Original snapshot (editing.original; unchanged)\n\n${markdownValue(report.editing.original)}\n` : "";
  return `# ${markdownValue(report.title.replace(/[\r\n]/g, " "))}\n\n${markdownValue(report.takeaway)}\n\n${report.criticalCaveats.map((v) => `> Hinweis: ${markdownValue(v)}`).join("\n\n")}\n\n${editNotice(report)}\n\n## Complete, unfiltered current field index\n\nCurrent working state; filters and presentation never prune the export. User edits are not source verification.\n\n${markdownValue(current)}\n${original}`;
}
