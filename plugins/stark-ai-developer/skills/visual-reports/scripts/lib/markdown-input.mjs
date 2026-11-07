// Bounded Markdown adapter, not MDX. SPDX-License-Identifier: Apache-2.0
import { parseMarkdownTree } from "../../assets/vendor/generator.mjs";
import { validateReport } from "../render-report.mjs";
import { templates } from "./templates.mjs";

const error = (node, message) => {
  throw new TypeError(`Markdown line ${node.position?.start.line ?? "?"}: ${message}`);
};
function attributes(node, allowed, required = []) {
  const a = node.attributes ?? {};
  for (const key of Object.keys(a))
    if (!allowed.includes(key)) error(node, `unsupported attribute ${key}`);
  for (const key of required)
    if (a[key] === undefined || !a[key].trim()) error(node, `missing attribute ${key}`);
  return a;
}
function plain(node) {
  if (
    node.type === "textDirective" &&
    !node.children.length &&
    !Object.keys(node.attributes ?? {}).length
  )
    return `:${node.name}`;
  if (["text", "inlineCode"].includes(node.type)) return node.value;
  if (["strong", "emphasis", "paragraph", "tableCell", "heading"].includes(node.type))
    return node.children.map(plain).join("");
  error(node, `unsupported ${node.type}; use plain text, emphasis or inline code`);
}
const ids = (value) =>
  (value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
function table(node) {
  if (node.children?.length !== 1 || node.children[0].type !== "table")
    error(node, "one GFM table required (including separator row)");
  const [head, ...rows] = node.children[0].children,
    names = head.children.map(plain);
  if (new Set(names).size !== names.length) error(node, "duplicate table columns");
  return rows.map((row) => {
    if (row.children.length !== names.length) error(row, "table column count mismatch");
    return Object.fromEntries(names.map((name, i) => [name, plain(row.children[i])]));
  });
}
function columns(node, rows, allowed, required) {
  if (!rows.length) error(node, "nonempty table required");
  const keys = Object.keys(rows[0]);
  if (keys.some((x) => !allowed.includes(x)) || required.some((x) => !keys.includes(x)))
    error(
      node,
      `expected columns ${required.join(", ")}; optional ${allowed.filter((x) => !required.includes(x)).join(", ")}`,
    );
}
function numeric(node, value) {
  if (value === "null") return null;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value))
    error(node, `explicit finite number or null required, received ${JSON.stringify(value)}`);
  const result = Number(value);
  if (!Number.isFinite(result)) error(node, "non-finite number");
  return result;
}
function list(node) {
  if (node.children.length !== 1 || node.children[0].type !== "list")
    error(node, "one bullet list required");
  return node.children[0].children.map((item) => {
    if (item.children.length !== 1 || item.children[0].type !== "paragraph")
      error(item, "one text paragraph per item; nested lists are not supported");
    return plain(item.children[0]);
  });
}
function section(node) {
  if (node.name === "model") {
    attributes(node, []);
    if (
      node.children.length !== 1 ||
      node.children[0].type !== "code" ||
      node.children[0].lang !== "json"
    )
      error(node, "model requires one fenced json section");
    try {
      return JSON.parse(node.children[0].value);
    } catch (e) {
      error(node, e.message);
    }
  }
  const common = ["id", "title", "sources", "icon"];
  const extras = {
    bullets: [],
    chart: ["type", "unit", "context", "direction", "series", "xUnit"],
    diagram: ["description"],
    timeline: [],
    statusHistory: ["context"],
  };
  if (!Object.hasOwn(extras, node.name))
    error(
      node,
      `unsupported block ${node.name}; use a model directive for other registered blocks`,
    );
  const a = attributes(node, [...common, ...extras[node.name]], ["id", "title"]);
  const s = {
    id: a.id,
    title: a.title,
    kind: node.name,
    sourceIds: ids(a.sources),
    caveats: [],
    data: {},
  };
  if (a.icon) s.icon = a.icon;
  if (node.name === "bullets") s.data = { items: list(node) };
  if (node.name === "diagram") {
    if (
      node.children.length !== 1 ||
      node.children[0].type !== "code" ||
      node.children[0].lang !== "mermaid"
    )
      error(node, "one mermaid code fence required");
    s.data = { source: node.children[0].value, description: a.description };
  }
  if (node.name === "chart") {
    // Long-form table keeps evidence at each value. Series labels are explicit.
    const rows = table(node);
    columns(
      node,
      rows,
      ["id", "label", "series", "value", "state", "sources", "note", "x", "role"],
      ["id", "label", "series", "value", "state", "sources", "note"],
    );
    if (!a.series) error(node, "series attribute required: id:Label,id:Label");
    const series = a.series.split(",").map((item) => {
      const split = item.indexOf(":");
      if (split < 1) error(node, "series needs id:Label");
      return { id: item.slice(0, split).trim(), label: item.slice(split + 1).trim() };
    });
    const groups = new Map();
    for (const r of rows) {
      let group = groups.get(r.id);
      if (!group) {
        group = { id: r.id, label: r.label, values: Array(series.length).fill(null) };
        if (r.x !== undefined) group.x = numeric(node, r.x);
        if (r.role !== undefined) group.role = r.role;
        groups.set(r.id, group);
      } else if (
        group.label !== r.label ||
        (r.x !== undefined && group.x !== numeric(node, r.x)) ||
        group.role !== r.role
      )
        error(node, `inconsistent row metadata for ${r.id}`);
      const si = series.findIndex((v) => v.id === r.series);
      if (si < 0 || group.values[si])
        error(node, `unknown or duplicate series ${r.series} for ${r.id}`);
      group.values[si] = {
        value: numeric(node, r.value),
        state: r.state,
        sourceIds: ids(r.sources),
        note: r.note,
      };
    }
    for (const group of groups.values())
      if (group.values.includes(null))
        error(node, `missing series for ${group.id}; provide explicit null/unknown`);
    s.data = {
      type: a.type,
      unit: a.unit,
      context: a.context,
      direction: a.direction,
      series,
      rows: [...groups.values()],
    };
    if (a.xUnit !== undefined) s.data.xUnit = a.xUnit;
  }
  if (node.name === "statusHistory") {
    const rows = table(node);
    columns(node, rows, ["at", "status", "sources", "note"], ["at", "status", "sources", "note"]);
    s.data = {
      context: a.context,
      samples: rows.map((r) => ({
        at: r.at,
        status: r.status,
        sourceIds: ids(r.sources),
        note: r.note,
      })),
    };
  }
  if (node.name === "timeline") {
    const rows = table(node);
    columns(
      node,
      rows,
      ["id", "label", "owner", "start", "end", "progress", "dependsOn"],
      ["id", "label", "owner", "start", "end", "progress", "dependsOn"],
    );
    s.data = {
      tasks: rows.map(({ dependsOn, ...r }) => ({ ...r, progress: numeric(node, r.progress) })),
      dependencies: rows.flatMap((r) => ids(r.dependsOn).map((from) => ({ from, to: r.id }))),
    };
  }
  return s;
}
export function parseMarkdown(input) {
  if (typeof input !== "string" || input.length > 2_000_000)
    throw new TypeError("Markdown input must be a string below 2 MB");
  const root = parseMarkdownTree(input);
  if (
    root.children.length !== 1 ||
    root.children[0].type !== "containerDirective" ||
    root.children[0].name !== "report"
  )
    error(root, "exactly one :::report container required");
  const node = root.children[0],
    a = attributes(
      node,
      ["id", "type", "profile", "style", "goal", "presentation"],
      ["id", "type", "profile"],
    );
  const report = {
    schemaVersion: 2,
    id: a.id,
    title: "",
    takeaway: "",
    goal: a.goal ?? templates[a.type]?.goal,
    reportType: a.type,
    domainProfile: a.profile,
    style: a.style ?? "current",
    nextAction: "",
    criticalCaveats: [],
    sources: [],
    sections: [],
  };
  if (a.presentation !== undefined) report.presentation = a.presentation;
  const single = new Set();
  for (const child of node.children) {
    if (child.type === "heading" && child.depth === 1) {
      if (single.has("title")) error(child, "duplicate report title");
      single.add("title");
      report.title = plain(child);
      continue;
    }
    if (child.type === "leafDirective") {
      if (["takeaway", "next", "caveat"].includes(child.name)) {
        attributes(child, []);
        if (child.name !== "caveat" && single.has(child.name))
          error(child, `duplicate ${child.name}`);
        single.add(child.name);
        const value = child.children.map(plain).join("");
        if (child.name === "caveat") report.criticalCaveats.push(value);
        else report[child.name === "next" ? "nextAction" : "takeaway"] = value;
      } else if (child.name === "topic") {
        const topic = attributes(
          child,
          ["id", "title", "short", "sections"],
          ["id", "title", "sections"],
        );
        if (child.children.length) error(child, "topic uses attributes only");
        report.topics ??= [];
        report.topics.push({
          id: topic.id,
          title: topic.title,
          ...(topic.short ? { shortTitle: topic.short } : {}),
          sectionIds: ids(topic.sections),
        });
      } else if (child.name === "source") {
        const source = attributes(
          child,
          ["id", "label", "state", "url", "asOf"],
          ["id", "label", "state"],
        );
        if (child.children.length) error(child, "source uses attributes only");
        report.sources.push({ ...source });
      } else error(child, `unknown directive ${child.name}`);
    } else if (child.type === "containerDirective") report.sections.push(section(child));
    else
      error(
        child,
        `unexpected ${child.type}; no prose or executable markup outside registered blocks`,
      );
  }
  return validateReport(report);
}
