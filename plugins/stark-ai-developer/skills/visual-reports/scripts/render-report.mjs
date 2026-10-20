// Original shared renderer. SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXTRA_KINDS,
  validateV2,
  validateExtra,
  validateDecoration,
  renderExtra,
  readerMarkdown,
  icon,
  validateRasterDataUrl,
  esc as escape,
} from "./lib/blocks-v2.mjs";
import {
  editNotice,
  originalReport,
  stateMarkdown,
  validateRevision,
} from "./lib/report-state.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const KINDS = Object.freeze([
  "text",
  "table",
  "comparison",
  "code",
  "diff",
  "graph",
  "timeline",
  "steps",
  "metrics",
  "figure",
  "variants",
  "motion",
  "prototype",
  "slides",
  "board",
  "flags",
  "prompt",
  "fileTree",
  ...EXTRA_KINDS,
]);
export const STATES = Object.freeze([
  "measured",
  "documented",
  "partial",
  "absent",
  "unknown",
  "planned",
  "assumed",
  "editorial",
  "fictional",
]);
const styles = ["current", "balanced", "calm"];
const idPattern = /^[a-z][a-z0-9-]*$/;
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const scriptJson = (value) =>
  json(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
const fail = (message) => {
  throw new TypeError(message);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};
function assertJsonRepresentable(value, label = "report", ancestors = new Set()) {
  const type = typeof value;
  if (value === null || type === "string" || type === "boolean") return;
  if (type === "number")
    return assert(
      Number.isFinite(value) && !Object.is(value, -0),
      `${label}: finite JSON number required`,
    );
  assert(type === "object", `${label}: value is not JSON representable`);
  assert(!ancestors.has(value), `${label}: cyclic value is not JSON representable`);
  ancestors.add(value);
  const descriptorValue = (descriptor, childLabel) => {
    assert(
      descriptor && descriptor.enumerable && Object.hasOwn(descriptor, "value"),
      `${childLabel}: enumerable data property required`,
    );
    assertJsonRepresentable(descriptor.value, childLabel, ancestors);
  };
  if (Array.isArray(value)) {
    assert(Object.getPrototypeOf(value) === Array.prototype, `${label}: unsupported array type`);
    const keys = Reflect.ownKeys(value);
    assert(
      keys.length === value.length + 1 && keys.includes("length"),
      `${label}: array properties must be JSON representable`,
    );
    for (let index = 0; index < value.length; index++)
      descriptorValue(Object.getOwnPropertyDescriptor(value, String(index)), `${label}[${index}]`);
  } else {
    const prototype = Object.getPrototypeOf(value);
    assert(
      prototype === Object.prototype || prototype === null,
      `${label}: plain JSON object required`,
    );
    for (const key of Reflect.ownKeys(value)) {
      assert(typeof key === "string", `${label}: symbol key is not JSON representable`);
      descriptorValue(Object.getOwnPropertyDescriptor(value, key), `${label}.${key}`);
    }
  }
  ancestors.delete(value);
}
const object = (value, label) =>
  assert(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label}: object required`,
  );
const text = (value, label, empty = false) =>
  assert(
    typeof value === "string" && (empty || value.trim().length > 0),
    `${label}: string required`,
  );
const list = (value, label, empty = false) =>
  assert(Array.isArray(value) && (empty || value.length > 0), `${label}: array required`);
const number = (value, label, min = -Infinity, max = Infinity) =>
  assert(
    typeof value === "number" && Number.isFinite(value) && value >= min && value <= max,
    `${label}: finite number in [${min}, ${max}] required`,
  );
const strings = (value, label, empty = false) => {
  list(value, label, empty);
  value.forEach((s) => text(s, label));
};
function ids(items, label) {
  const seen = new Set();
  for (const item of items) {
    assert(idPattern.test(item.id), `${label}: invalid id`);
    assert(!seen.has(item.id), `${label}: duplicate id ${item.id}`);
    seen.add(item.id);
  }
  return seen;
}
function refs(value, known) {
  strings(value, "sourceIds", true);
  value.forEach((id) => assert(known.has(id), `Unknown source ${id}`));
}
function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
function date(value, field = "timeline date") {
  text(value, field);
  const calendar = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);
  const parsed = Date.parse(value);
  assert(
    (calendar || instant) &&
      Number.isFinite(parsed) &&
      (calendar
        ? new Date(parsed).toISOString().slice(0, 10) === value
        : new Date(parsed).toISOString() ===
          value.replace(/Z$/, value.includes(".") ? "Z" : ".000Z")),
    `${field}: Invalid ISO calendar date or UTC timestamp`,
  );
  return parsed;
}

/** Validate before rendering; never execute source markup, guessed URLs or expressions. */
export function validateReport(report) {
  assertJsonRepresentable(report);
  object(report, "report");
  assert([1, 2].includes(report.schemaVersion), "Unsupported schemaVersion");
  if (report.schemaVersion === 2) validateV2(report);
  ids([report], "report");
  text(report.title, "title");
  text(report.takeaway, "takeaway");
  assert(
    ["lookup", "decide", "execute", "understand"].includes(report.goal),
    "Invalid reader goal",
  );
  assert(styles.includes(report.style ?? "current"), "Invalid style");
  if (report.presentation !== undefined)
    assert(["slides", "reading"].includes(report.presentation), "Invalid presentation start mode");
  strings(report.criticalCaveats, "criticalCaveats", true);
  list(report.sources, "sources", true);
  const known = ids(report.sources, "sources");
  for (const source of report.sources) {
    text(source.label, "source.label");
    assert(STATES.includes(source.state), "Invalid source state");
    if (source.url !== undefined) assert(safeUrl(source.url), "Unsafe source URL");
    if (source.asOf !== undefined) text(source.asOf, "source.asOf");
  }
  list(report.sections, "sections");
  ids(report.sections, "sections");
  for (const section of report.sections) {
    assert(KINDS.includes(section.kind), `Unsupported block ${section.kind}`);
    text(section.title, "section.title");
    refs(section.sourceIds, known);
    strings(section.caveats, "section.caveats", true);
    object(section.data, "section.data");
    validateDecoration(section);
    if (EXTRA_KINDS.includes(section.kind)) {
      assert(report.schemaVersion === 2, "New blocks require schemaVersion 2");
      validateExtra(section, known);
      continue;
    }
    const d = section.data;
    switch (section.kind) {
      case "text":
        strings(d.paragraphs, "paragraphs");
        break;
      case "table": {
        list(d.columns, "columns");
        const columns = ids(d.columns, "columns");
        d.columns.forEach((c) => text(c.label, "column.label"));
        list(d.rows, "rows", true);
        ids(d.rows, "rows");
        d.rows.forEach((r) => {
          object(r.cells, "cells");
          assert(
            Object.keys(r.cells).length === columns.size,
            "Table must supply every column exactly once",
          );
          columns.forEach((key) => {
            const v = r.cells[key];
            assert(
              v === null || ["string", "number", "boolean"].includes(typeof v),
              "Table cell must be scalar or null",
            );
            if (typeof v === "number") number(v, "cell");
          });
        });
        break;
      }
      case "comparison": {
        list(d.options, "options");
        const options = ids(d.options, "options");
        d.options.forEach((o) => {
          text(o.label, "option.label");
          text(o.note, "option.note", true);
        });
        list(d.criteria, "criteria");
        ids(d.criteria, "criteria");
        for (const c of d.criteria) {
          text(c.label, "criterion.label");
          text(c.unit, "criterion.unit", true);
          text(c.context, "criterion.context");
          assert(["higher", "lower", "none"].includes(c.direction), "Invalid direction");
          object(c.values, "values");
          assert(
            Object.keys(c.values).length === options.size,
            "Each criterion must include all options; missing is explicit null/unknown",
          );
          options.forEach((id) => {
            const cell = c.values[id];
            object(cell, "comparison cell");
            assert(STATES.includes(cell.state), "Invalid evidence state");
            assert(
              cell.value === null || ["number", "string", "boolean"].includes(typeof cell.value),
              "Invalid comparison value",
            );
            if (typeof cell.value === "number") number(cell.value, "comparison value");
            if (cell.state === "unknown")
              assert(cell.value === null, "Unknown is null, never zero");
            text(cell.note, "cell.note", true);
            refs(cell.sourceIds, known);
          });
        }
        break;
      }
      case "code":
        list(d.blocks, "code blocks");
        d.blocks.forEach((b) => {
          text(b.label, "code label");
          text(b.code, "code", true);
          strings(b.notes, "notes", true);
        });
        break;
      case "diff":
        text(d.before, "before", true);
        text(d.after, "after", true);
        strings(d.notes, "notes", true);
        break;
      case "graph": {
        list(d.nodes, "nodes");
        const nodes = ids(d.nodes, "nodes");
        d.nodes.forEach((n) => {
          text(n.label, "node.label");
          number(n.x, "node.x", 0, 10000);
          number(n.y, "node.y", 0, 10000);
        });
        list(d.edges, "edges", true);
        d.edges.forEach((e) => {
          assert(nodes.has(e.from) && nodes.has(e.to), "Unknown graph endpoint");
          text(e.label, "edge.label");
        });
        break;
      }
      case "timeline": {
        list(d.tasks, "tasks");
        const tasks = ids(d.tasks, "tasks");
        d.tasks.forEach((t) => {
          text(t.label, "task.label");
          text(t.owner, "task.owner");
          assert(
            date(t.start, `task.${t.id}.start`) <= date(t.end, `task.${t.id}.end`),
            "End before start",
          );
          if (t.progress !== null || report.schemaVersion !== 2)
            number(t.progress, "task.progress", 0, 100);
        });
        const precision = new Set(
          d.tasks.flatMap((t) => [t.start, t.end]).map((value) => value.includes("T")),
        );
        assert(
          precision.size === 1,
          "timeline: do not mix calendar dates and UTC timestamps on one axis",
        );
        list(d.dependencies, "dependencies", true);
        d.dependencies.forEach((e) =>
          assert(tasks.has(e.from) && tasks.has(e.to), "Unknown dependency"),
        );
        break;
      }
      case "steps":
        list(d.items, "steps");
        d.items.forEach((s) =>
          ["label", "action", "success", "recovery"].forEach((key) => text(s[key], key)),
        );
        break;
      case "metrics":
        list(d.items, "metrics");
        d.items.forEach((m) => {
          text(m.label, "metric.label");
          text(m.unit, "unit", true);
          text(m.context, "context");
          assert(STATES.includes(m.state), "Invalid metric state");
          if (m.value !== null) number(m.value, "metric.value");
          if (m.state === "unknown") assert(m.value === null, "Unknown metric is null");
        });
        break;
      case "figure":
        text(d.alt, "alt");
        text(d.caption, "caption");
        assert(
          typeof d.src === "string" && d.src.length <= 2800000,
          "Only reviewed embedded raster images are accepted; use graph for generated SVG",
        );
        validateRasterDataUrl(d.src, "figure.src");
        break;
      case "variants":
        list(d.items, "variants");
        d.items.forEach((v) => {
          text(v.label, "variant.label");
          text(v.text, "variant.text");
          text(v.status, "variant.status");
          assert(["neutral", "mint", "gold"].includes(v.tone), "Invalid tone");
          number(v.progress, "progress", 0, 100);
        });
        break;
      case "motion":
        number(d.distance, "distance", 0, 250);
        number(d.duration, "duration", 100, 5000);
        assert(
          ["linear", "ease", "ease-in", "ease-out", "ease-in-out"].includes(d.easing),
          "Invalid easing",
        );
        break;
      case "prototype":
        strings(d.states, "states");
        assert(
          new Set(d.states).size === d.states.length && d.states.includes(d.initial),
          "Invalid state list/initial state",
        );
        list(d.transitions, "transitions");
        d.transitions.forEach((t) => {
          assert(d.states.includes(t.from) && d.states.includes(t.to), "Unknown transition state");
          text(t.label, "transition.label");
        });
        break;
      case "slides":
        list(d.slides, "slides");
        ids(d.slides, "slides");
        d.slides.forEach((s) => {
          text(s.title, "slide.title");
          text(s.text, "slide.text");
          strings(s.caveats, "slide.caveats", true);
        });
        break;
      case "board":
        strings(d.columns, "columns");
        assert(new Set(d.columns).size === d.columns.length, "Duplicate board column");
        list(d.cards, "cards", true);
        ids(d.cards, "cards");
        d.cards.forEach((c) => {
          ["label", "priority", "description"].forEach((k) => text(c[k], k));
          assert(d.columns.includes(c.column), "Unknown board column");
        });
        break;
      case "flags":
        list(d.flags, "flags");
        ids(d.flags, "flags");
        d.flags.forEach((f) => {
          text(f.label, "flag.label");
          text(f.scope, "flag.scope");
          assert(typeof f.enabled === "boolean", "Flag enabled must be boolean");
          number(f.rollout, "rollout", 0, 100);
        });
        break;
      case "prompt":
        text(d.system, "system", true);
        text(d.user, "user", true);
        number(d.temperature, "temperature", 0, 2);
        number(d.maxTokens, "maxTokens", 1, 100000);
        assert(Number.isInteger(d.maxTokens), "maxTokens must be integer");
        break;
      case "fileTree":
        list(d.entries, "entries");
        d.entries.forEach((e) => {
          text(e.path, "path");
          text(e.role, "role");
          assert(
            ["added", "changed", "moved", "deleted", "context"].includes(e.status),
            "Invalid file status",
          );
          if (e.status === "moved") text(e.from, "moved.from");
        });
        break;
    }
  }
  if (report.presentation === "slides")
    assert(
      report.sections.some((section) => section.kind === "slides"),
      "Presentation requires a slides block",
    );
  if (report.editing !== undefined) {
    validateRevision(report);
    validateReport(report.editing.original);
  }
  return report;
}
const sourceLinks = (ids) =>
  ids.map((id) => `<a href="#source-${escape(id)}">[${escape(id)}]</a>`).join(" ");
const caveats = (items) =>
  items.map((s) => `<p class="caveat"><strong>Hinweis:</strong> ${escape(s)}</p>`).join("");
const notes = (items) => items.map((s) => `<p>${escape(s)}</p>`).join("");
function table(d) {
  return `<div class="toolbar js-only"><label>Suchen <input type="search" data-search></label><output data-result-count aria-live="polite">${d.rows.length} / ${d.rows.length}</output></div><div class="scroll" role="region" tabindex="0" aria-label="Datentabelle"><table><thead><tr>${d.columns.map((c, i) => `<th scope="col">${escape(c.label)} <button class="js-only" data-sort="${i}" aria-label="${escape(c.label)} sortieren">↕</button></th>`).join("")}</tr></thead><tbody>${d.rows.map((r) => `<tr>${d.columns.map((c) => `<td data-value="${escape(r.cells[c.id])}">${r.cells[c.id] === null ? "Unbekannt" : escape(r.cells[c.id])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function comparison(d) {
  const controls = `<div class="js-only"><fieldset><legend>Optionen</legend>${d.options.map((o) => `<label><input type="checkbox" checked data-option-toggle value="${escape(o.id)}">${escape(o.label)}</label>`).join("")}</fieldset><fieldset><legend>Kriterien / Kennzahlen</legend>${d.criteria.map((c) => `<label><input type="checkbox" checked data-criterion-toggle value="${escape(c.id)}">${escape(c.label)}</label>`).join("")}</fieldset></div>`;
  const rows = d.criteria
    .map((c) => {
      const numeric = Object.values(c.values)
        .map((v) => v.value)
        .filter((v) => typeof v === "number");
      const lo = Math.min(0, ...numeric),
        hi = Math.max(0, ...numeric),
        range = hi - lo || 1;
      const cells = d.options
        .map((o) => {
          const v = c.values[o.id];
          const chart =
            v.value === null
              ? '<span class="missing" aria-hidden="true"></span>'
              : typeof v.value === "number"
                ? `<div class="track" aria-hidden="true"><span class="zero" style="left:${((0 - lo) / range) * 100}%"></span><span class="bar" style="margin-left:${((Math.min(0, v.value) - lo) / range) * 100}%;width:${(Math.abs(v.value) / range) * 100}%"></span></div>`
                : "";
          return `<td data-option="${escape(o.id)}"><span class="value">${v.value === null ? "Unbekannt" : escape(v.value)} ${escape(c.unit)}</span>${chart}<span class="state">${escape(v.state)}</span><small>${escape(v.note)} ${sourceLinks(v.sourceIds)}</small></td>`;
        })
        .join("");
      return `<tr data-criterion="${escape(c.id)}"><th scope="row">${escape(c.label)}<small>${escape(c.context)} · ${escape(c.direction)}${numeric.length ? ` · gemeinsame Skala ${lo} … ${hi} ${escape(c.unit)}` : ""}</small></th>${cells}</tr>`;
    })
    .join("");
  return (
    controls +
    `<div class="scroll" role="region" tabindex="0" aria-label="Gemeinsamer Vergleich"><table class="comparison"><thead><tr><th scope="col">Kriterium</th>${d.options.map((o) => `<th scope="col" data-option="${escape(o.id)}">${escape(o.label)}<small>${escape(o.note)}</small></th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`
  );
}
function graph(d, id) {
  const width = Math.max(...d.nodes.map((n) => n.x)) + 200,
    height = Math.max(...d.nodes.map((n) => n.y)) + 95;
  const edges = d.edges
    .map((e) => {
      const a = d.nodes.find((n) => n.id === e.from),
        b = d.nodes.find((n) => n.id === e.to);
      return `<line x1="${a.x + 85}" y1="${a.y + 42}" x2="${b.x + 85}" y2="${b.y + 12}" marker-end="url(#arrow-${id})"/><text x="${(a.x + b.x) / 2 + 92}" y="${(a.y + b.y) / 2 + 20}">${escape(e.label)}</text>`;
    })
    .join("");
  return `<svg class="diagram" role="img" aria-label="${escape(id)} – beschriftete Beziehungen; Textdarstellung folgt" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow-${id}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><polygon points="0 0, 7 3, 0 6"/></marker></defs>${edges}${d.nodes.map((n) => `<rect x="${n.x}" y="${n.y}" width="170" height="44" rx="3"/><text x="${n.x + 8}" y="${n.y + 27}">${escape(n.label)}</text>`).join("")}</svg><p>${d.nodes.map((n) => `${escape(n.id)}: ${escape(n.label)}`).join(" · ")}</p>${d.edges.map((e) => `<p>${escape(e.from)} → ${escape(e.to)}: ${escape(e.label)}</p>`).join("")}`;
}
function block(s) {
  const d = s.data;
  switch (s.kind) {
    case "text":
      return notes(d.paragraphs);
    case "table":
      return table(d);
    case "comparison":
      return comparison(d);
    case "code":
      return `<div class="grid">${d.blocks.map((b) => `<div><h3>${escape(b.label)}</h3><pre class="code"><code>${escape(b.code)}</code></pre>${notes(b.notes)}</div>`).join("")}</div>`;
    case "diff":
      return `<div class="grid"><div><h3>Vorher / entfernt</h3><pre class="code diff-del">${escape(d.before)}</pre></div><div><h3>Nachher / ergänzt</h3><pre class="code diff-add">${escape(d.after)}</pre></div></div>${notes(d.notes)}`;
    case "graph":
      return graph(d, s.id);
    case "timeline": {
      const start = Math.min(...d.tasks.map((t) => date(t.start))),
        end = Math.max(...d.tasks.map((t) => date(t.end))),
        span = end - start || 86400000;
      return (
        d.tasks
          .map(
            (t) =>
              `<div class="timeline-row"><div>${escape(t.label)}<small> · ${escape(t.owner)} · ${escape(t.start)} → ${escape(t.end)} · ${t.progress === null ? "Fortschritt unbekannt" : `${t.progress}%`}${date(t.start) === date(t.end) ? " · Meilenstein" : ""}</small></div><div class="timeline-track" aria-hidden="true"><span class="timeline-bar" style="left:${((date(t.start) - start) / span) * 100}%;width:${((date(t.end) - date(t.start)) / span) * 100}%;min-width:2px"></span></div></div>`,
          )
          .join("") +
        d.dependencies
          .map((e) => `<p>Abhängigkeit: ${escape(e.from)} → ${escape(e.to)}</p>`)
          .join("")
      );
    }
    case "steps":
      return d.items
        .map(
          (v, i) =>
            `<div class="step"><h3>${i + 1}. ${escape(v.label)}</h3><p>${escape(v.action)}</p><p><strong>Erfolg:</strong> ${escape(v.success)}</p><p><strong>Fehlerbehandlung:</strong> ${escape(v.recovery)}</p></div>`,
        )
        .join("");
    case "metrics":
      return d.items
        .map(
          (m) =>
            `<div class="metric"><span>${escape(m.label)}</span><strong>${m.value === null ? "Unbekannt" : m.value} ${escape(m.unit)}</strong><small>${escape(m.state)} · ${escape(m.context)}</small></div>`,
        )
        .join("");
    case "figure":
      return `<figure><img src="${escape(d.src)}" alt="${escape(d.alt)}"><figcaption>${escape(d.caption)}</figcaption></figure>`;
    case "variants":
      return `<div class="grid">${d.items.map((v) => `<div class="tone-${v.tone}"><h3><span class="swatch" aria-hidden="true"></span>${escape(v.label)}</h3><p>${escape(v.text)}</p><p>Status: ${escape(v.status)}</p><div class="metric"><span>Fortschritt</span><span>${v.progress}%</span></div><div class="track" aria-hidden="true"><span class="bar" style="width:${v.progress}%"></span></div></div>`).join("")}</div>`;
    case "motion":
      return `<p>Bewegung: 0 → ${d.distance}px · ${d.duration}ms · ${escape(d.easing)}. Statischer Endzustand ohne JavaScript.</p><div class="motion-lane"><span class="motion-dot" style="transform:translateX(${d.distance}px)" aria-hidden="true"></span></div><div class="toolbar js-only"><label>Dauer <input data-duration type="number" min="100" max="5000" value="${d.duration}"> ms</label><label>Easing <select data-easing>${["linear", "ease", "ease-in", "ease-out", "ease-in-out"].map((v) => `<option${v === d.easing ? " selected" : ""}>${v}</option>`).join("")}</select></label><button data-play>Abspielen</button><button data-pause disabled>Pause</button><button data-stop>Zurücksetzen</button><output data-motion-status></output></div>`;
    case "prototype":
      return `<p>Simulation, keine externe Aktion. Zustand: <strong data-prototype-state aria-live="polite">${escape(d.initial)}</strong></p><p>Zustände: ${d.states.map(escape).join(" → ")}</p>${d.transitions.map((t) => `<p>${escape(t.from)} → ${escape(t.to)}: ${escape(t.label)}</p>`).join("")}<div class="toolbar js-only">${d.transitions.map((t, i) => `<button data-transition="${i}">${escape(t.label)}</button>`).join("")}<button data-reset-prototype>Zurücksetzen</button></div>`;
    case "slides":
      return `<div class="toolbar js-only"><button data-presentation aria-pressed="false">Präsentationsmodus</button><button data-prev>Zurück</button><button data-next>Weiter</button><output data-slide-count aria-live="polite"></output></div>${d.slides.map((v) => `<article class="slide" id="slide-${s.id}-${v.id}"><h3>${escape(v.title)}</h3><p>${escape(v.text)}</p>${caveats(v.caveats)}</article>`).join("")}`;
    case "board":
      return `<p>Lokaler Entwurf: Änderungen werden nicht an einen Dienst übertragen.</p><div class="board-columns">${d.columns.map((column) => `<div class="board-column" data-column="${escape(column)}"><h3>${escape(column)}</h3>${d.cards.map((card, i) => (card.column !== column ? "" : `<article class="ticket" data-card-index="${i}"><h3>${escape(card.label)}</h3><p>${escape(card.description)}</p><small>${escape(card.priority)} · <span data-card-status>${escape(card.column)}</span></small><label class="js-only">Verschieben <select aria-label="${escape(card.label)} verschieben">${d.columns.map((c) => `<option${c === column ? " selected" : ""}>${escape(c)}</option>`).join("")}</select></label></article>`)).join("")}</div>`).join("")}</div>`;
    case "flags":
      return `<p>Nur lokale Simulation; kein Zugriff auf produktive Feature Flags.</p>${d.flags.map((f, i) => `<div class="step" data-flag-index="${i}"><h3>${escape(f.label)}</h3><p>${escape(f.scope)} · <span data-flag-status>${f.enabled ? "An" : "Aus"}</span> · <span data-rollout-value>${f.rollout}%</span></p><label class="js-only"><input type="checkbox" data-enabled${f.enabled ? " checked" : ""}>Lokal aktivieren</label><label class="js-only">Rollout <input data-rollout type="range" min="0" max="100" value="${f.rollout}"></label></div>`).join("")}`;
    case "prompt":
      return `<p>Lokale Prompt-Vorschau. Kein Modellaufruf, keine erzeugte Modellantwort.</p><div class="grid"><div><label class="editor-label">System<textarea data-prompt-field="system">${escape(d.system)}</textarea></label><label class="editor-label">User<textarea data-prompt-field="user">${escape(d.user)}</textarea></label><label>Temperatur <input data-prompt-field="temperature" type="number" min="0" max="2" step="0.1" required value="${d.temperature}"></label><label>Tokenlimit <input data-prompt-field="maxTokens" type="number" min="1" max="100000" required value="${d.maxTokens}"></label></div><pre data-prompt-preview aria-label="Lokaler Prompt-Entwurf">${escape(json(d))}</pre></div>`;
    case "fileTree":
      return `<pre class="file-tree" tabindex="0">${d.entries
        .map((e) => `[${e.status}] ${e.path}${e.from ? ` ← ${e.from}` : ""} — ${e.role}`)
        .map(escape)
        .join("\n")}</pre>`;
    default:
      return renderExtra(s);
  }
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
export function renderMarkdown(report) {
  validateReport(report);
  return stateMarkdown(report);
}
export async function renderReport(report) {
  validateReport(report);
  const [css, browser, stateModule] = await Promise.all([
    readFile(path.join(here, "../assets/report-runtime.css"), "utf8"),
    readFile(path.join(here, "../assets/report-runtime.js"), "utf8"),
    readFile(path.join(here, "./lib/report-state.mjs"), "utf8"),
  ]);
  const runtime = `const ReportState = (() => {\n${stateModule.replace(/^export /gm, "")}\nreturn { originalReport, workingReport, validateRevision, editNotice, stateMarkdown, readerMarkdown, chartText };\n})();\n${browser}`;
  assert(!/<\/script/i.test(runtime), "Owned runtime contains an unsafe script end tag");
  const markdown = renderMarkdown(report),
    digest = createHash("sha256").update(runtime).digest("base64");
  const csp = `default-src 'none'; script-src 'sha256-${digest}'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;
  const original = originalReport(report);
  const html = `<!doctype html>\n<html lang="de" data-style="${report.style ?? "current"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escape(csp)}"><title>${escape(report.title)}</title><style>${css}</style></head><body><a class="skip" href="#content">Zum Inhalt</a><header><h1>${escape(report.title)}</h1><p class="takeaway">${escape(report.takeaway)}</p>${caveats(report.criticalCaveats)}${report.nextAction ? `<p class="next-action"><strong>Nächster Schritt:</strong> ${escape(report.nextAction)}</p>` : ""}<div class="toolbar js-only"><label>Stil <select id="style">${styles.map((v, i) => `<option value="${v}"${(report.style ?? "current") === v ? " selected" : ""}>${["Aktuell", "Mittelweg", "Ruhiger"][i]}</option>`).join("")}</select></label><button id="export-draft">Aktuelles HTML</button><button id="export-md">Aktuelles Markdown</button><button id="export-json">Aktuelles JSON</button><button id="export-original">Original-Snapshot</button><button id="export-settings">Stil exportieren</button></div><p class="caveat" id="edit-status"${report.editing ? "" : " hidden"}>${escape(editNotice(report))}</p><p class="status" id="report-status" role="status" aria-live="polite"></p><noscript><p>Statische Vollansicht. Filter, Präsentation, Bewegung und lokale Editoren benötigen JavaScript; Quellen und Exporte bleiben lesbar.</p></noscript></header><nav aria-label="Abschnitte">${report.sections.map((s) => `<a href="#block-${s.id}">${escape(s.title)}</a>`).join("")}</nav><main id="content">${report.sections.map((s, i) => `<section id="block-${s.id}" data-section-index="${i}" data-kind="${s.kind}"><h2>${icon(s.icon)}${escape(s.title)}</h2>${caveats(s.caveats)}<p class="caveat" data-edit-notice${editNotice(report, s.id) ? "" : " hidden"}>${escape(editNotice(report, s.id))}</p>${block(s)}${(s.details ?? []).map((d, di) => `<details id="detail-${s.id}-${di}"><summary>${escape(d.title)}</summary><ul>${d.items.map((v) => `<li>${escape(v)}</li>`).join("")}</ul></details>`).join("")}<p class="muted">Quellen: ${sourceLinks(s.sourceIds) || "Keine Quelle zugeordnet"}</p></section>`).join("")}</main><section aria-label="Quellen"><h2>Quellen und Evidenz</h2><ul class="source-list">${report.sources.map((s) => `<li id="source-${s.id}">${s.url ? `<a rel="noreferrer noopener" href="${escape(s.url)}">${escape(s.label)}</a>` : escape(s.label)} · ${escape(s.state)}${s.asOf ? ` · Stand: ${escape(s.asOf)}` : ""}</li>`).join("")}</ul></section><details class="agent-ledger" id="complete-json"><summary>Vollständiger JSON-Datenstand (auch ohne JavaScript lesbar)</summary><pre id="report-json">${escape(json(report))}</pre></details><details class="agent-ledger" id="complete-markdown"><summary>Vollständiges Markdown (ungefiltert)</summary><pre id="report-markdown">${escape(markdown)}</pre></details><details class="agent-ledger"><summary>Original-Snapshot (getrennt, unverändert)</summary><pre id="report-original">${escape(json(original))}</pre></details><p class="print-note">Aktueller Arbeitsstand; Nutzerbearbeitungen sind keine neue Quellenprüfung. Original-Snapshot bleibt getrennt erhalten.</p><script type="application/json" id="report-data">${scriptJson(report)}</script><script>${runtime}</script></body></html>\n`;
  return { html, markdown, json: json(report) };
}
/** Explicit local writes only. A new output directory prevents accidental report overwrite. */
export async function writeReport(report, directory) {
  const rendered = await renderReport(report);
  await mkdir(directory, { recursive: false });
  await Promise.all(
    [
      ["html", rendered.html],
      ["md", rendered.markdown],
      ["json", rendered.json],
    ].map(([ext, value]) =>
      writeFile(path.join(directory, `${report.id}.${ext}`), value, { flag: "wx" }),
    ),
  );
  if (report.editing)
    await writeFile(
      path.join(directory, `${report.id}.original.json`),
      json(originalReport(report)),
      { flag: "wx" },
    );
  return rendered;
}
export function extractReport(html) {
  const match = html.match(
    /<script type="application\/json" id="report-data">([\s\S]*?)<\/script>/,
  );
  assert(match, "No embedded visual-report data found");
  return validateReport(JSON.parse(match[1]));
}
async function main(args) {
  if (args[0] === "--gallery" && args.length === 2) {
    const { recipes, exampleReport } = await import("../assets/report-recipes.mjs");
    const destination = path.resolve(args[1]);
    await mkdir(destination, { recursive: false });
    for (const recipe of recipes)
      await writeReport(exampleReport(recipe.id), path.join(destination, recipe.id));
    await writeFile(
      path.join(destination, "index.html"),
      `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visual Reports – 24 Beispiele</title><h1>24 fiktive Anwendungsbeispiele</h1><p>Alle Daten sind Demonstrationen, keine Produktfakten.</p><ol>${recipes.map((r) => `<li><a href="${r.id}/${r.id}.html">${escape(r.id)} — ${escape(r.title)}</a></li>`).join("")}</ol></html>`,
      { flag: "wx" },
    );
    console.log(`24 examples, HTML/Markdown/JSON and gallery index: ${destination}`);
    return;
  }
  if (
    args[0] === "--extract" &&
    (args.length === 2 || (args.length === 4 && args[2] === "--section"))
  ) {
    const report = extractReport(await readFile(path.resolve(args[1]), "utf8"));
    const section = args.length === 4 ? report.sections.find((s) => s.id === args[3]) : report;
    assert(section, "Unknown section");
    process.stdout.write(json(section));
    return;
  }
  const { runCli } = await import("./lib/cli.mjs");
  await runCli(args);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
