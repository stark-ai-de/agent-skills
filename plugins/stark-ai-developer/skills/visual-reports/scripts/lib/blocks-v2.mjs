// Original data visualizations. SPDX-License-Identifier: Apache-2.0
import { renderMermaidSVG } from "../../assets/vendor/generator.mjs";
import { icons } from "../../assets/vendor/icons.mjs";
import { createHash } from "node:crypto";
import { profiles, templates } from "./templates.mjs";

export const EXTRA_KINDS = ["bullets", "diagram", "chart", "statusHistory", "logo"];
export const CHART_TYPES = [
  "bar",
  "stacked-bar",
  "line",
  "scatter",
  "heatmap",
  "before-after",
  "actual-target",
  "waterfall",
];
const states = [
  "measured",
  "documented",
  "partial",
  "absent",
  "unknown",
  "planned",
  "assumed",
  "editorial",
  "fictional",
];
export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const assert = (ok, field) => {
  if (!ok) throw new TypeError(`${field}: invalid or missing value`);
};
const text = (v, field, empty = false) =>
  assert(typeof v === "string" && (empty || v.trim()), field);
const list = (v, field, empty = false) => assert(Array.isArray(v) && (empty || v.length), field);
const finite = (v, field) => assert(typeof v === "number" && Number.isFinite(v), field);
const refs = (v, known, field) => {
  list(v, field, true);
  v.forEach((x) => assert(known.has(x), `${field}: unknown source ${x}`));
};
const https = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
};
function unique(rows, field) {
  const seen = new Set();
  for (const row of rows) {
    assert(/^[a-z][a-z0-9-]*$/.test(row.id) && !seen.has(row.id), `${field}.id`);
    seen.add(row.id);
  }
}
export function validateV2(report) {
  assert(Object.hasOwn(templates, report.reportType), "reportType");
  assert(Object.hasOwn(profiles, report.domainProfile), "domainProfile");
  text(report.nextAction, "nextAction");
}
export function validateDecoration(section) {
  if (section.icon !== undefined) assert(Object.hasOwn(icons, section.icon), "section.icon");
  if (section.details !== undefined) {
    list(section.details, "section.details", true);
    section.details.forEach((d) => {
      text(d.title, "detail.title");
      list(d.items, "detail.items");
      d.items.forEach((v) => text(v, "detail.item"));
    });
  }
}
export function icon(name) {
  return name
    ? `<svg class="report-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`
    : "";
}
export function validateExtra(s, known) {
  const d = s.data,
    field = `sections.${s.id}.${s.kind}`;
  switch (s.kind) {
    case "bullets":
      list(d.items, field);
      d.items.forEach((x) => text(x, field));
      break;
    case "diagram":
      text(d.source, `${field}.source`);
      text(d.description, `${field}.description`);
      assert(d.source.length < 30000, `${field}.source length`);
      // Constrain the authoring language; no links, embedded markup, directives or styling.
      assert(
        /^\s*(?:graph|flowchart|sequenceDiagram|stateDiagram(?:-v2)?|classDiagram|erDiagram)\b/.test(
          d.source,
        ),
        `${field}.diagram family`,
      );
      assert(
        !/<(?:[a-z!\/])|&|%%|(?:^|\n)\s*(?:click|link|classDef|style|linkStyle)\b|\b(?:https?|javascript|data):/i.test(
          d.source,
        ),
        `${field}.unsafe Mermaid markup`,
      );
      break;
    case "chart":
      assert(CHART_TYPES.includes(d.type), `${field}.type`);
      text(d.unit, `${field}.unit`, true);
      text(d.context, `${field}.context`);
      assert(["higher", "lower", "none"].includes(d.direction), `${field}.direction`);
      list(d.series, `${field}.series`);
      unique(d.series, field);
      d.series.forEach((x) => text(x.label, field));
      list(d.rows, `${field}.rows`);
      unique(d.rows, field);
      assert(d.rows.length <= 500 && d.series.length <= 20, `${field}.size`);
      if (["before-after", "actual-target"].includes(d.type))
        assert(d.series.length === 2, `${field}: requires two ordered series`);
      if (d.type === "waterfall")
        assert(d.series.length === 1, `${field}: waterfall requires one series`);
      if (["line", "scatter"].includes(d.type)) text(d.xUnit, `${field}.xUnit`, true);
      d.rows.forEach((r, ri) => {
        text(r.label, `${field}.row.label`);
        list(r.values, `${field}.values`);
        assert(r.values.length === d.series.length, `${field}.values: each series required`);
        r.values.forEach((v, i) => {
          assert(v && states.includes(v.state), `${field}.${ri}.${i}.state`);
          if (v.value !== null) finite(v.value, `${field}.${ri}.${i}.value`);
          if (v.state === "unknown") assert(v.value === null, `${field}: unknown is null`);
          text(v.note, `${field}.note`, true);
          refs(v.sourceIds, known, `${field}.sourceIds`);
        });
        if (["line", "scatter"].includes(d.type)) {
          finite(r.x, `${field}.x`);
          if (d.type === "line" && ri)
            assert(r.x > d.rows[ri - 1].x, `${field}: line x must increase`);
        }
      });
      const numericValues = d.rows
        .flatMap((r) => r.values.map((v) => v.value))
        .filter((v) => v !== null);
      finite(Math.max(0, ...numericValues) - Math.min(0, ...numericValues), `${field}.scale span`);
      if (["line", "scatter"].includes(d.type))
        finite(
          Math.max(...d.rows.map((r) => r.x)) - Math.min(...d.rows.map((r) => r.x)),
          `${field}.x span`,
        );
      if (d.type === "stacked-bar") {
        const low = Math.min(
          0,
          ...d.rows.map((r) => r.values.reduce((sum, v) => sum + Math.min(0, v.value ?? 0), 0)),
        );
        const high = Math.max(
          0,
          ...d.rows.map((r) => r.values.reduce((sum, v) => sum + Math.max(0, v.value ?? 0), 0)),
        );
        finite(high - low, `${field}.stacked span`);
      }
      if (d.type === "waterfall") {
        let running = 0;
        d.rows.forEach((r, i) => {
          const value = r.values[0].value;
          finite(value, `${field}: waterfall cannot infer missing contributions`);
          assert(["start", "delta", "total"].includes(r.role), `${field}.role`);
          assert(i !== 0 || r.role === "start", `${field}: first row is start`);
          assert(i === 0 || r.role !== "start", `${field}: only one start`);
          if (r.role === "total")
            assert(
              Math.abs(running - value) <= 1e-9 * Math.max(1, Math.abs(value)),
              `${field}: total disagrees with contributions`,
            );
          else running = r.role === "start" ? value : running + value;
          finite(running, `${field}.cumulative value`);
        });
        assert(d.rows.at(-1).role === "total", `${field}: last row is total`);
      }
      break;
    case "statusHistory": {
      text(d.context, field);
      list(d.samples, field);
      assert(d.samples.length <= 1000, `${field}.size`);
      let previous = -Infinity;
      for (const sample of d.samples) {
        text(sample.at, `${field}.at`);
        const t = Date.parse(sample.at);
        assert(
          /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(sample.at) &&
            Number.isFinite(t) &&
            new Date(t).toISOString() ===
              sample.at.replace(/Z$/, sample.at.includes(".") ? "Z" : ".000Z") &&
            t > previous,
          `${field}: samples need increasing UTC timestamps`,
        );
        previous = t;
        assert(
          ["healthy", "degraded", "down", "unknown"].includes(sample.status),
          `${field}.status`,
        );
        text(sample.note, `${field}.note`, true);
        refs(sample.sourceIds, known, `${field}.sourceIds`);
      }
      break;
    }
    case "logo": {
      text(d.alt, field);
      text(d.label, field);
      assert(d.reviewed === true, `${field}: explicit asset review required`);
      assert(https(d.identityUrl) && https(d.sourceUrl), `${field}: HTTPS provenance required`);
      if (d.licenseUrl !== undefined) assert(https(d.licenseUrl), `${field}.licenseUrl`);
      text(d.retrievedAt, field);
      assert(Number.isFinite(Date.parse(d.retrievedAt)), `${field}.retrievedAt`);
      assert(
        typeof d.src === "string" &&
          d.src.length < 2800000 &&
          /^data:image\/(?:svg\+xml|png|jpeg|webp|x-icon);base64,[A-Za-z0-9+/]+={0,2}$/.test(d.src),
        `${field}.src`,
      );
      const bytes = Buffer.from(d.src.split(",")[1], "base64");
      assert(
        createHash("sha256").update(bytes).digest("hex") === d.sha256,
        `${field}: asset checksum mismatch`,
      );
      if (d.src.startsWith("data:image/svg+xml;")) validateSvg(bytes.toString("utf8"));
      break;
    }
  }
}
export function validateSvg(svg) {
  assert(
    /<svg\b/i.test(svg) &&
      !/<!DOCTYPE|<!ENTITY|<(?:script|foreignObject|iframe|object|embed|animate|set)\b|\bon[a-z]+\s*=|(?:javascript|vbscript):|@import|url\(\s*['"]?(?!#)/i.test(
        svg,
      ),
    "SVG active or external content",
  );
  for (const [, href] of svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)/gi))
    assert(href.startsWith("#"), "SVG external reference");
}
const bulletList = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
const unit = (d) => esc(d.unit);
const palette = ["#a9d9cf", "#d5c394", "#b8b6df", "#e6b0b0", "#acc9e7"];
const fmt = (v) => (v === null ? "Unbekannt" : String(v));
function dataTable(d) {
  return `<div class="scroll" role="region" tabindex="0" aria-label="Genaue Diagrammwerte"><table><thead><tr><th scope="col">Beobachtung</th>${d.xUnit !== undefined ? `<th scope="col">x (${esc(d.xUnit)})</th>` : ""}${d.series.map((s) => `<th scope="col">${esc(s.label)} (${unit(d)})</th>`).join("")}</tr></thead><tbody>${d.rows.map((r) => `<tr><th scope="row">${esc(r.label)}${r.role ? ` · ${esc(r.role)}` : ""}</th>${d.xUnit !== undefined ? `<td>${r.x}</td>` : ""}${r.values.map((v) => `<td>${esc(fmt(v.value))}<small>${esc(v.state)}${v.note ? ` · ${esc(v.note)}` : ""} ${v.sourceIds.map((id) => `<a href="#source-${id}">[${id}]</a>`).join(" ")}</small></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function chartSvg(d) {
  const vals = d.rows.flatMap((r) => r.values.map((v) => v.value)).filter((v) => v !== null);
  let lo = Math.min(0, ...vals),
    hi = Math.max(0, ...vals);
  const width = 760,
    left = 160,
    right = 710,
    plot = right - left;
  if (d.type === "stacked-bar") {
    lo = Math.min(
      0,
      ...d.rows.map((r) => r.values.reduce((a, v) => a + Math.min(0, v.value ?? 0), 0)),
    );
    hi = Math.max(
      0,
      ...d.rows.map((r) => r.values.reduce((a, v) => a + Math.max(0, v.value ?? 0), 0)),
    );
  }
  let ranges;
  if (d.type === "waterfall") {
    let running = 0;
    ranges = d.rows.map((r) => {
      const value = r.values[0].value,
        from = r.role === "delta" ? running : 0;
      if (r.role === "delta") running += value;
      else running = value;
      return [from, running];
    });
    lo = Math.min(0, ...ranges.flat());
    hi = Math.max(0, ...ranges.flat());
  }
  assert(Number.isFinite(hi - lo), "Chart scale overflow");
  const span = hi - lo || 1,
    scale = (x) => left + ((x - lo) / span) * plot;
  const txt = (x, y, value, extra = "") => `<text x="${x}" y="${y}" ${extra}>${esc(value)}</text>`;
  const line = (x1, y1, x2, y2, extra = "") =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
  let body = "",
    height;
  if (["line", "scatter"].includes(d.type)) {
    height = 290;
    const xmin = Math.min(...d.rows.map((r) => r.x)),
      xmax = Math.max(...d.rows.map((r) => r.x)),
      xspan = xmax - xmin || 1;
    const x = (n) => 65 + ((n - xmin) / xspan) * 630,
      y = (n) => 235 - ((n - lo) / span) * 195;
    body += line(65, y(0), 695, y(0), 'stroke-dasharray="4 4"');
    body +=
      txt(8, 40, hi) +
      txt(8, 238, lo) +
      txt(65, 270, `${xmin} ${d.xUnit}`) +
      txt(695, 270, `${xmax} ${d.xUnit}`, 'text-anchor="end"');
    d.series.forEach((s, si) => {
      let previous = null;
      d.rows.forEach((r) => {
        const value = r.values[si].value;
        if (value === null) {
          previous = null;
          return;
        }
        if (previous && d.type === "line")
          body += line(
            previous[0],
            previous[1],
            x(r.x),
            y(value),
            `style="stroke:${palette[si % 5]}"`,
          );
        body += `<circle cx="${x(r.x)}" cy="${y(value)}" r="${3 + (si % 3)}" fill="${palette[si % 5]}"><title>${esc(`${s.label}: ${r.label}, ${r.x}, ${value} ${d.unit}`)}</title></circle>`;
        previous = [x(r.x), y(value)];
      });
    });
  } else if (d.type === "heatmap") {
    height = 65 + d.rows.length * 45;
    d.rows.forEach((r, ri) => {
      body += txt(5, 62 + ri * 45, r.label);
      r.values.forEach((v, si) => {
        const x = left + (si * plot) / d.series.length,
          w = plot / d.series.length - 4;
        body += `<rect x="${x}" y="${42 + ri * 45}" width="${w}" height="35" fill="${v.value === null ? "#494b50" : palette[0]}" fill-opacity="${v.value === null ? 1 : 0.18 + (0.82 * (v.value - lo)) / span}"/>`;
        body += txt(
          x + w / 2,
          64 + ri * 45,
          v.value === null ? "?" : v.value,
          'text-anchor="middle" style="fill:#fff;paint-order:stroke;stroke:#202124;stroke-width:3px"',
        );
      });
    });
    d.series.forEach((s, i) => {
      body += txt(left + (i * plot) / d.series.length, 25, s.label);
    });
    body += txt(left, height - 5, `Skala ${lo} … ${hi} ${d.unit}; ? unbekannt`);
  } else {
    const rowHeight = Math.max(55, d.type === "bar" ? d.series.length * 21 + 14 : 55);
    height = d.rows.length * rowHeight + 65;
    body +=
      txt(left, 23, `${lo} ${d.unit}`) + txt(right, 23, `${hi} ${d.unit}`, 'text-anchor="end"');
    body += line(scale(0), 30, scale(0), height - 15, 'stroke-dasharray="4 4"');
    d.rows.forEach((r, ri) => {
      const y = 48 + ri * rowHeight;
      body += txt(5, y + 9, r.label);
      const rect = (from, to, offset, color, caption) =>
        `<rect x="${Math.min(scale(from), scale(to))}" y="${y + offset}" width="${Math.max(1, Math.abs(scale(to) - scale(from)))}" height="13" fill="${color}"><title>${esc(caption)}</title></rect>`;
      if (ranges)
        body += rect(
          ...ranges[ri],
          0,
          r.role === "delta" &&
            d.direction !== "none" &&
            (d.direction === "lower" ? r.values[0].value > 0 : r.values[0].value < 0)
            ? palette[3]
            : palette[0],
          `${r.label}: ${r.values[0].value}`,
        );
      else if (d.type === "before-after") {
        const [a, b] = r.values.map((v) => v.value);
        if (a !== null && b !== null) body += line(scale(a), y + 6, scale(b), y + 6);
        [a, b].forEach((v, i) => {
          if (v !== null)
            body += `<circle cx="${scale(v)}" cy="${y + 6}" r="${i ? 6 : 4}" fill="${palette[i]}"><title>${esc(d.series[i].label)}: ${v}</title></circle>`;
        });
      } else if (d.type === "actual-target") {
        const [actual, target] = r.values.map((v) => v.value);
        if (actual !== null) body += rect(0, actual, 0, palette[0], `Ist: ${actual}`);
        if (target !== null)
          body += line(
            scale(target),
            y - 6,
            scale(target),
            y + 21,
            'style="stroke:#d5c394;stroke-width:3"',
          );
        body += txt(left, y + 37, `Ist ${fmt(actual)} / Ziel ${fmt(target)} ${d.unit}`);
      } else {
        let positive = 0,
          negative = 0;
        r.values.forEach((v, si) => {
          if (v.value === null) {
            body += txt(right, y + 10 + si * 15, `? ${d.series[si].label}`, 'text-anchor="end"');
            return;
          }
          const from = d.type === "stacked-bar" ? (v.value < 0 ? negative : positive) : 0;
          body += rect(
            from,
            from + v.value,
            d.type === "bar" ? si * 21 : 0,
            palette[si % 5],
            `${d.series[si].label}: ${v.value}`,
          );
          if (v.value < 0) negative += v.value;
          else positive += v.value;
        });
      }
      if (["before-after", "waterfall"].includes(d.type))
        body += txt(left, y + 35, r.values.map((v) => fmt(v.value)).join(" → ") + ` ${d.unit}`);
    });
  }
  return `<svg class="data-chart" role="img" aria-label="${esc(d.context)}; genaue Werte in der folgenden Tabelle" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
export function renderExtra(s) {
  const d = s.data;
  if (s.kind === "bullets") return bulletList(d.items);
  if (s.kind === "diagram") {
    // Upstream adds a Google Fonts import even for system-ui. Remove that known
    // generator-owned line, then reject any remaining external or active content.
    const svg = renderMermaidSVG(d.source, {
      bg: "#202124",
      fg: "#e7e7e5",
      accent: "#a9d9cf",
      font: "system-ui",
    }).replace(/@import url\('https:\/\/fonts\.googleapis\.com\/[^'\n]*'\);/g, "");
    validateSvg(svg);
    return `<figure><img class="structure-diagram" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" alt="${esc(d.description)}"><figcaption>${esc(d.description)}</figcaption></figure><details id="diagram-source-${s.id}"><summary>Diagramm als Text</summary><pre>${esc(d.source)}</pre></details>`;
  }
  if (s.kind === "chart")
    return `<p>${esc(d.context)} · Einheit: ${unit(d)} · Bewertungsrichtung: ${{ higher: "höher ist besser", lower: "niedriger ist besser", none: "ohne Bewertung" }[d.direction]}</p><ul class="chart-legend">${d.series.map((v, i) => `<li><span style="background:${palette[i % 5]}" aria-hidden="true"></span>${esc(v.label)}</li>`).join("")}</ul><div class="scroll" role="region" tabindex="0" aria-label="Diagramm, horizontal scrollbar">${chartSvg(d)}</div>${dataTable(d)}`;
  if (s.kind === "statusHistory") {
    const known = d.samples.filter((v) => v.status !== "unknown").length,
      healthy = d.samples.filter((v) => v.status === "healthy").length;
    return `<p>${esc(d.context)}</p><p><strong>${healthy} / ${known} bekannte Stichproben gesund${known ? ` (${Math.round((healthy / known) * 1000) / 10}%)` : ""}</strong>; ${d.samples.length - known} unbekannt. Keine zeitgewichtete Verfügbarkeit.</p><div class="status-strip" aria-hidden="true">${d.samples.map((v) => `<span class="sample-${v.status}" title="${esc(v.at + ": " + v.status)}">${{ healthy: "✓", degraded: "~", down: "×", unknown: "?" }[v.status]}</span>`).join("")}</div><div class="scroll" tabindex="0"><table><thead><tr><th scope="col">Zeit (UTC)</th><th scope="col">Zustand</th><th scope="col">Beleg</th></tr></thead><tbody>${d.samples.map((v) => `<tr><th scope="row">${esc(v.at)}</th><td>${esc(v.status)}</td><td>${esc(v.note)} ${v.sourceIds.map((id) => `<a href="#source-${id}">[${id}]</a>`).join(" ")}</td></tr>`).join("")}</tbody></table></div>`;
  }
  if (s.kind === "logo")
    return `<figure class="product-logo"><img src="${esc(d.src)}" alt="${esc(d.alt)}"><figcaption>${esc(d.label)} · <a href="${esc(d.identityUrl)}">Produkt</a> · <a href="${esc(d.sourceUrl)}">Bildquelle</a>${d.licenseUrl ? ` · <a href="${esc(d.licenseUrl)}">Lizenz</a>` : ""}</figcaption></figure>`;
  throw new TypeError(`Unsupported block ${s.kind}`);
}
export function chartText(d) {
  // Selective, deterministic exports, never a model input format.
  if (["before-after", "actual-target"].includes(d.type))
    return d.rows
      .map(
        (r) =>
          `${r.label}: ${fmt(r.values[0].value)} ${d.type === "before-after" ? "->" : "/ target"} ${fmt(r.values[1].value)} ${d.unit}`,
      )
      .join("\n");
  if (d.type === "waterfall")
    return d.rows
      .map(
        (r) =>
          `${r.role.padEnd(5)} ${r.label}: ${r.role === "delta" && r.values[0].value > 0 ? "+" : ""}${r.values[0].value} ${d.unit}`,
      )
      .join("\n");
  return "";
}
export function readerMarkdown(report, md) {
  const lines = [];
  if (report.nextAction) lines.push(`**Nächster Schritt:** ${md(report.nextAction)}`, "");
  for (const s of report.sections) {
    lines.push(`## ${md(s.title)}`, "", ...s.caveats.map((v) => `> Hinweis: ${md(v)}`));
    const d = s.data;
    if (s.kind === "bullets") lines.push(...d.items.map((v) => `- ${md(v)}`));
    else if (s.kind === "text") lines.push(...d.paragraphs.map(md));
    else if (s.kind === "chart") {
      lines.push(md(`${d.context} · ${d.unit} · Richtung: ${d.direction}`), "");
      const diagram = chartText(d);
      if (diagram) lines.push("```text", diagram.replace(/`/g, "'"), "```", "");
      lines.push(
        `| Beobachtung ${d.xUnit !== undefined ? `| x (${md(d.xUnit)}) ` : ""}| ${d.series.map((v) => md(v.label)).join(" | ")} |`,
        `| --- ${d.xUnit !== undefined ? "| --- " : ""}| ${d.series.map(() => "---").join(" | ")} |`,
      );
      lines.push(
        ...d.rows.map(
          (r) =>
            `| ${md(r.label)} ${d.xUnit !== undefined ? `| ${r.x} ` : ""}| ${r.values.map((v) => `${md(fmt(v.value))} ${md(d.unit)} (${md(v.state)}; ${md(v.note)}; ${v.sourceIds.map(md).join(", ")})`).join(" | ")} |`,
        ),
      );
    } else if (s.kind === "statusHistory") {
      const known = d.samples.filter((x) => x.status !== "unknown").length,
        healthy = d.samples.filter((x) => x.status === "healthy").length;
      lines.push(
        `${healthy}/${known} bekannte Stichproben gesund; ${d.samples.length - known} unbekannt. Keine zeitgewichtete Verfügbarkeit.`,
        "",
        "```text",
        d.samples
          .map((x) => ({ healthy: "+", degraded: "~", down: "X", unknown: "?" })[x.status])
          .join(""),
        "```",
        "",
        ...d.samples.map(
          (x) =>
            `- ${md(x.at)}: ${md(x.status)} · ${md(x.note)} · ${x.sourceIds.map(md).join(", ")}`,
        ),
      );
    } else if (s.kind === "timeline") {
      const start = Math.min(...d.tasks.map((t) => Date.parse(t.start))),
        end = Math.max(...d.tasks.map((t) => Date.parse(t.end))),
        span = end - start || 1;
      lines.push(
        "```text",
        ...d.tasks.map(
          (t) =>
            `${t.label.replace(/[`|\r\n]/g, " ")} |${" ".repeat(Math.round(((Date.parse(t.start) - start) / span) * 30))}${"=".repeat(Math.max(1, Math.round(((Date.parse(t.end) - Date.parse(t.start)) / span) * 30)))}| ${t.start} -> ${t.end}`,
        ),
        "```",
        "",
        ...d.tasks.map(
          (t) =>
            `- ${md(t.label)}: ${md(t.start)} → ${md(t.end)} · ${md(t.owner)} · ${t.progress === null ? "Fortschritt unbekannt" : `${t.progress}%`}`,
        ),
        ...d.dependencies.map((e) => `- Abhängigkeit: ${md(e.from)} → ${md(e.to)}`),
      );
    } else if (s.kind === "diagram")
      lines.push(md(d.description), "", "```mermaid", d.source.replace(/`/g, "'"), "```");
    else lines.push(md(d)); // Full structured content for legacy blocks.
    for (const detail of s.details ?? [])
      lines.push("", `### ${md(detail.title)}`, "", ...detail.items.map((x) => `- ${md(x)}`));
    lines.push("", `Quellen: ${s.sourceIds.map(md).join(", ") || "Keine zugeordnet"}`, "");
  }
  lines.push(
    "## Quellen",
    "",
    ...report.sources.map(
      (s) =>
        `- ${md(s.id)}: ${md(s.label)} · ${md(s.state)}${s.url ? ` · <${s.url.replace(/[<>]/g, (c) => encodeURIComponent(c))}>` : ""}${s.asOf ? ` · ${md(s.asOf)}` : ""}`,
    ),
  );
  return lines.join("\n");
}
