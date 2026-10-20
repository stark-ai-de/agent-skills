// Shared, pure working-state contract. SPDX-License-Identifier: Apache-2.0
// Used by the Node renderer and embedded verbatim (without exports) in its runtime.
const copy = (value) => JSON.parse(JSON.stringify(value));
const requireState = (condition, message) => {
  if (!condition) throw new TypeError(message);
};
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
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
  requireState(
    original && current && Array.isArray(original.sections) && Array.isArray(current.sections),
    "Invalid working-state sections",
  );
  requireState(!original.editing, "Nested original snapshots are not supported");
  requireState(
    original.sections.length === current.sections.length,
    "Local editing cannot add or remove sections",
  );
  const expected = copy(original),
    changes = [];
  if (current.style !== undefined) {
    requireState(["current", "balanced", "calm"].includes(current.style), "Invalid working style");
    expected.style = current.style;
  } else delete expected.style;
  const originalStyle = original.style ?? "current";
  const currentStyle = current.style ?? "current";
  if (originalStyle !== currentStyle)
    changes.push({
      sectionId: null,
      targetId: "report",
      field: "style",
      before: originalStyle,
      after: currentStyle,
      state: "user-edited",
      sourceIds: [],
    });
  const assign = (s, target, old, now, field, valid) => {
    requireState(valid(now[field]), `Invalid edited ${s.kind}.${field}`);
    target[field] = now[field];
    if (!equal(old[field], now[field]))
      changes.push({
        sectionId: s.id,
        targetId: old.id ?? s.id,
        field,
        before: old[field],
        after: now[field],
        state: "user-edited",
        sourceIds: copy(s.sourceIds),
      });
  };
  original.sections.forEach((s, i) => {
    const c = current.sections[i],
      e = expected.sections[i];
    requireState(
      c && c.id === s.id && c.kind === s.kind,
      "Local editing cannot replace or reorder sections",
    );
    if (s.kind === "board") {
      requireState(
        Array.isArray(c.data.cards) && c.data.cards.length === s.data.cards.length,
        "Local editing cannot remove cards",
      );
      s.data.cards.forEach((item, j) => {
        requireState(c.data.cards[j].id === item.id, "Local editing cannot change card IDs");
        assign(s, e.data.cards[j], item, c.data.cards[j], "column", (v) =>
          s.data.columns.includes(v),
        );
      });
    }
    if (s.kind === "flags") {
      requireState(
        Array.isArray(c.data.flags) && c.data.flags.length === s.data.flags.length,
        "Local editing cannot remove flags",
      );
      s.data.flags.forEach((item, j) => {
        requireState(c.data.flags[j].id === item.id, "Local editing cannot change flag IDs");
        assign(s, e.data.flags[j], item, c.data.flags[j], "enabled", (v) => typeof v === "boolean");
        assign(
          s,
          e.data.flags[j],
          item,
          c.data.flags[j],
          "rollout",
          (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100,
        );
      });
    }
    if (s.kind === "prompt") {
      for (const field of ["system", "user"])
        assign(s, e.data, s.data, c.data, field, (v) => typeof v === "string");
      assign(
        s,
        e.data,
        s.data,
        c.data,
        "temperature",
        (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 2,
      );
      assign(
        s,
        e.data,
        s.data,
        c.data,
        "maxTokens",
        (v) => Number.isInteger(v) && v >= 1 && v <= 100000,
      );
    }
  });
  requireState(
    equal(expected, withoutRevision(current)),
    "Local editing cannot change sources, evidence, caveats or non-editor fields",
  );
  return changes;
}

/** Changes are a diff against one immutable baseline, not a fabricated verification. */
export function workingReport(source, draft) {
  validateRevision(source);
  const original = originalReport(source);
  const current = withoutRevision(draft);
  const changes = editorChanges(original, current);
  if (!changes.length) return original;
  current.editing = { version: 1, kind: "user-edit", original, changes };
  return current;
}

export function validateRevision(report) {
  if (report.editing === undefined) return report;
  const e = report.editing;
  requireState(
    e &&
      e.version === 1 &&
      e.kind === "user-edit" &&
      Array.isArray(e.changes) &&
      e.changes.length > 0,
    "Invalid editing metadata",
  );
  requireState(
    equal(Object.keys(e).sort(), ["changes", "kind", "original", "version"]),
    "Unsupported editing metadata fields",
  );
  const expected = editorChanges(e.original, report);
  requireState(
    equal(e.changes, expected),
    "Editing change list does not match original and current state",
  );
  return report;
}

export function editNotice(report, sectionId) {
  const changes = (report.editing?.changes ?? []).filter(
    (change) => sectionId === undefined || change.sectionId === sectionId,
  );
  if (!changes.length) return "";
  return `Nutzerbearbeitung: ${changes.length} Feldänderung(en)${sectionId ? ` (${changes.map((c) => `${c.targetId}.${c.field}`).join(", ")})` : ""}. Original-Snapshot getrennt erhalten. Originalbelege bestätigen diese Änderungen nicht; keine neue Quellenprüfung.`;
}

function markdownValue(value, depth = 0) {
  const pad = "  ".repeat(depth);
  const md = (v) =>
    String(v)
      .replace(/[\\`*_{}\[\]<>#|]/g, "\\$&")
      .replace(/\n/g, "  \n" + pad + "  ");
  if (Array.isArray(value))
    return value.length
      ? value
          .map(
            (v, i) =>
              `${pad}- ${i + 1}:` +
              (v && typeof v === "object" ? "\n" + markdownValue(v, depth + 1) : " " + md(v)),
          )
          .join("\n")
      : `${pad}(empty)`;
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(
        ([k, v]) =>
          `${pad}- ${md(k)}:` +
          (v && typeof v === "object"
            ? "\n" + markdownValue(v, depth + 1)
            : " " + md(v === null ? "unknown (null)" : v)),
      )
      .join("\n");
  return pad + md(value);
}

const md = (value) =>
  String(value)
    .replace(/[\\`*_{}\[\]<>#|]/g, "\\$&")
    .replace(/\n/g, "  \n");
const fmt = (value) => (value === null ? "Unbekannt" : String(value));
export function chartText(data) {
  if (["before-after", "actual-target"].includes(data.type))
    return data.rows
      .map(
        (row) =>
          `${row.label}: ${fmt(row.values[0].value)} ${data.type === "before-after" ? "->" : "/ target"} ${fmt(row.values[1].value)} ${data.unit}`,
      )
      .join("\n");
  if (data.type === "waterfall")
    return data.rows
      .map(
        (row) =>
          `${row.role.padEnd(5)} ${row.label}: ${row.role === "delta" && row.values[0].value > 0 ? "+" : ""}${row.values[0].value} ${data.unit}`,
      )
      .join("\n");
  return "";
}

/** Reader Markdown is shared by Node exports and the embedded browser runtime. */
export function readerMarkdown(report, escapeInline = md) {
  const lines = [];
  if (report.nextAction) lines.push(`**Nächster Schritt:** ${escapeInline(report.nextAction)}`, "");
  for (const section of report.sections) {
    lines.push(
      `## ${escapeInline(section.title)}`,
      "",
      ...section.caveats.map((value) => `> Hinweis: ${escapeInline(value)}`),
    );
    const data = section.data;
    if (section.kind === "bullets")
      lines.push(...data.items.map((value) => `- ${escapeInline(value)}`));
    else if (section.kind === "text") lines.push(...data.paragraphs.map(escapeInline));
    else if (section.kind === "chart") {
      lines.push(escapeInline(`${data.context} · ${data.unit} · Richtung: ${data.direction}`), "");
      const diagram = chartText(data);
      if (diagram) lines.push("```text", diagram.replace(/`/g, "'"), "```", "");
      lines.push(
        `| Beobachtung ${data.xUnit !== undefined ? `| x (${escapeInline(data.xUnit)}) ` : ""}| ${data.series.map((v) => escapeInline(v.label)).join(" | ")} |`,
        `| --- ${data.xUnit !== undefined ? "| --- " : ""}| ${data.series.map(() => "---").join(" | ")} |`,
        ...data.rows.map(
          (row) =>
            `| ${escapeInline(row.label)} ${data.xUnit !== undefined ? `| ${row.x} ` : ""}| ${row.values.map((value) => `${escapeInline(fmt(value.value))} ${escapeInline(data.unit)} (${escapeInline(value.state)}; ${escapeInline(value.note)}; ${value.sourceIds.map(escapeInline).join(", ")})`).join(" | ")} |`,
        ),
      );
    } else if (section.kind === "statusHistory") {
      const known = data.samples.filter((item) => item.status !== "unknown").length;
      const healthy = data.samples.filter((item) => item.status === "healthy").length;
      lines.push(
        `${healthy}/${known} bekannte Stichproben gesund; ${data.samples.length - known} unbekannt. Keine zeitgewichtete Verfügbarkeit.`,
        "",
        "```text",
        data.samples
          .map((item) => ({ healthy: "+", degraded: "~", down: "X", unknown: "?" })[item.status])
          .join(""),
        "```",
        "",
        ...data.samples.map(
          (item) =>
            `- ${escapeInline(item.at)}: ${escapeInline(item.status)} · ${escapeInline(item.note)} · ${item.sourceIds.map(escapeInline).join(", ")}`,
        ),
      );
    } else if (section.kind === "timeline") {
      const start = Math.min(...data.tasks.map((task) => Date.parse(task.start)));
      const end = Math.max(...data.tasks.map((task) => Date.parse(task.end)));
      const span = end - start || 1;
      lines.push(
        "```text",
        ...data.tasks.map(
          (task) =>
            `${task.label.replace(/[`|\r\n]/g, " ")} |${" ".repeat(Math.round(((Date.parse(task.start) - start) / span) * 30))}${"=".repeat(Math.max(1, Math.round(((Date.parse(task.end) - Date.parse(task.start)) / span) * 30)))}| ${task.start} -> ${task.end}`,
        ),
        "```",
        "",
        ...data.tasks.map(
          (task) =>
            `- ${escapeInline(task.label)}: ${escapeInline(task.start)} → ${escapeInline(task.end)} · ${escapeInline(task.owner)} · ${task.progress === null ? "Fortschritt unbekannt" : `${task.progress}%`}`,
        ),
        ...data.dependencies.map(
          (edge) => `- Abhängigkeit: ${escapeInline(edge.from)} → ${escapeInline(edge.to)}`,
        ),
      );
    } else if (section.kind === "diagram")
      lines.push(
        escapeInline(data.description),
        "",
        "```mermaid",
        data.source.replace(/`/g, "'"),
        "```",
      );
    else lines.push(escapeInline(data));
    for (const detail of section.details ?? [])
      lines.push(
        "",
        `### ${escapeInline(detail.title)}`,
        "",
        ...detail.items.map((item) => `- ${escapeInline(item)}`),
      );
    lines.push(
      "",
      `Quellen: ${section.sourceIds.map(escapeInline).join(", ") || "Keine zugeordnet"}`,
      "",
    );
  }
  lines.push(
    "## Quellen",
    "",
    ...report.sources.map(
      (source) =>
        `- ${escapeInline(source.id)}: ${escapeInline(source.label)} · ${escapeInline(source.state)}${source.url ? ` · <${source.url.replace(/[<>]/g, (character) => encodeURIComponent(character))}>` : ""}${source.asOf ? ` · ${escapeInline(source.asOf)}` : ""}`,
    ),
  );
  return lines.join("\n");
}

export function stateMarkdown(report) {
  validateRevision(report);
  const original = report.editing
    ? `\n## Original snapshot (editing.original; unchanged)\n\n${markdownValue(report.editing.original)}\n`
    : "";
  const typed = JSON.stringify({ current: report, original: originalReport(report) }, null, 2);
  const fence = "`".repeat(
    Math.max(3, ...[...typed.matchAll(/`+/g)].map((run) => run[0].length + 1)),
  );
  return `# ${markdownValue(report.title.replace(/[\r\n]/g, " "))}\n\n${markdownValue(report.takeaway)}\n\n${report.criticalCaveats.map((v) => `> Hinweis: ${markdownValue(v)}`).join("\n\n")}\n\n${editNotice(report)}\n\n${readerMarkdown(report)}\n\n## Complete, unfiltered current field index\n\nCurrent working state; filters and presentation never prune the export. User edits are not source verification.\n\n${markdownValue(report)}\n${original}\n\n## Canonical typed snapshots (JSON)\n\n${fence}json\n${typed}\n${fence}\n`;
}
