#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function usage() {
  return "Usage: node scripts/validate-drawio-diagram-rules.mjs path/to/file.drawio";
}

function decodeXml(value = "") {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function parseAttrs(text = "") {
  const attrs = {};
  for (const match of text.matchAll(/([:\w.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs[match[1]] = decodeXml(match[2] ?? match[3] ?? "");
  }
  return attrs;
}

function inflateDiagramPayload(payload) {
  const inflated = zlib.inflateRawSync(Buffer.from(payload.trim(), "base64")).toString("utf8");
  return decodeURIComponent(inflated);
}

function extractModels(xml) {
  const pages = [];
  const trimmed = xml.trim();
  if (trimmed.startsWith("<mxGraphModel")) {
    return [{ name: "Document", xml: trimmed }];
  }

  const diagramRe = /<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g;
  for (const match of xml.matchAll(diagramRe)) {
    const attrs = parseAttrs(match[1]);
    const name = attrs.name || `Page-${pages.length + 1}`;
    const body = (match[2] || "").trim();
    const model = body.match(/<mxGraphModel\b[\s\S]*?<\/mxGraphModel>/);
    if (model) {
      pages.push({ name, xml: model[0] });
      continue;
    }
    if (!body) throw new Error(`diagram ${JSON.stringify(name)} has no mxGraphModel or payload`);
    pages.push({ name, xml: inflateDiagramPayload(body) });
  }

  if (pages.length > 0) return pages;

  const nestedModel = xml.match(/<mxGraphModel\b[\s\S]*?<\/mxGraphModel>/);
  if (nestedModel) return [{ name: "Document", xml: nestedModel[0] }];
  throw new Error("no mxGraphModel or diagram payload found");
}

function styleMap(style = "") {
  const map = {};
  for (const token of style.split(";")) {
    if (!token.includes("=")) continue;
    const [key, ...rest] = token.split("=");
    map[key] = rest.join("=");
  }
  return map;
}

function parseCells(xml) {
  const cells = [];
  const cellRe = /<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g;
  for (const match of xml.matchAll(cellRe)) {
    const attrs = parseAttrs(match[1]);
    const body = match[2] || "";
    const geo = body.match(/<mxGeometry\b([^>]*)>/);
    const geoAttrs = geo ? parseAttrs(geo[1]) : {};
    const parsedStyle = styleMap(attrs.style || "");
    cells.push({ attrs, body, geo: geoAttrs, style: parsedStyle });
  }
  return cells;
}

function number(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function bbox(cell) {
  const x = number(cell.geo.x);
  const y = number(cell.geo.y);
  const width = number(cell.geo.width);
  const height = number(cell.geo.height);
  if ([x, y, width, height].some((v) => v == null)) return null;
  return { x, y, width, height };
}

function center(box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function segmentIntersectsBox(a, b, box, padding = 0) {
  const left = box.x - padding;
  const right = box.x + box.width + padding;
  const top = box.y - padding;
  const bottom = box.y + box.height + padding;
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - left],
    [dx, right - a.x],
    [-dy, a.y - top],
    [dy, bottom - a.y],
  ]) {
    if (p === 0 && q < 0) return false;
    if (p === 0) continue;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
  }
  return true;
}

function isContainer(cell) {
  const isTextOrLabel = (cell.attrs.style || "").startsWith("text;") || cell.attrs.value;
  return (
    cell.style.container === "1" ||
    (cell.attrs.style || "").includes("swimlane") ||
    (cell.style.fillColor === "none" && !isTextOrLabel)
  );
}

function isObstacle(cell) {
  if (cell.attrs.vertex !== "1") return false;
  if (isContainer(cell)) return false;
  if ((cell.attrs.style || "").startsWith("text;") || cell.attrs.value) return true;
  return cell.style.shape && cell.style.shape !== "image";
}

function isDecorativeEdge(cell) {
  const id = cell.attrs.id || "";
  const value = (cell.attrs.value || "").toLowerCase();
  const role = (cell.style.dataRole || cell.style.semantic || "").toLowerCase();
  return (
    id.startsWith("decorative-") ||
    id.startsWith("legend-") ||
    role === "decorative" ||
    role === "legend" ||
    role === "false" ||
    value.includes("decorative") ||
    value.includes("legend")
  );
}

function cellRef(page, id) {
  return `${page.name}:${id || "?"}`;
}

function validatePage(page) {
  const cells = parseCells(page.xml);
  const byId = new Map(cells.filter((cell) => cell.attrs.id).map((cell) => [cell.attrs.id, cell]));
  const errors = [];
  const warnings = [];

  for (const cell of cells) {
    const id = cell.attrs.id || "?";
    if (cell.attrs.edge === "1") {
      if (!cell.attrs.source || !cell.attrs.target) {
        if (isDecorativeEdge(cell)) continue;
        errors.push(
          `ERROR [${cellRef(page, id)}] edge must reference source and target vertex ids; floating mxPoint-only edges are not allowed in generated diagrams unless marked decorative or legend`,
        );
        continue;
      }
      const source = byId.get(cell.attrs.source);
      const target = byId.get(cell.attrs.target);
      const sourceBox = source ? bbox(source) : null;
      const targetBox = target ? bbox(target) : null;
      if (!source || !target || !sourceBox || !targetBox) continue;
      const routeStart = center(sourceBox);
      const routeEnd = center(targetBox);
      for (const obstacle of cells) {
        const oid = obstacle.attrs.id;
        if (
          !oid ||
          oid === cell.attrs.source ||
          oid === cell.attrs.target ||
          !isObstacle(obstacle)
        ) {
          continue;
        }
        const obstacleBox = bbox(obstacle);
        if (!obstacleBox) continue;
        if (segmentIntersectsBox(routeStart, routeEnd, obstacleBox, 4)) {
          warnings.push(
            `WARN  [${cellRef(page, id)}] probable centerline route crosses ${oid}; use side ports, branch waypoints between elements, or relayout so arrows do not overlap text boxes`,
          );
          break;
        }
      }
    }

    if (cell.attrs.vertex === "1" && (cell.attrs.style || "").includes("shape=image")) {
      const hasFixedAspect =
        (cell.attrs.style || "").includes("aspect=fixed") ||
        (cell.attrs.style || "").includes("imageAspect=1") ||
        (cell.attrs.style || "").includes("dataRole=decorative-image");
      if (!hasFixedAspect) {
        errors.push(
          `ERROR [${cellRef(page, id)}] image/logo missing aspect=fixed or imageAspect=1; logos must preserve their original aspect ratio`,
        );
      }
    }
  }

  return { errors, warnings };
}

function main() {
  const input = process.argv[2];
  if (!input || input === "--help" || input === "-h") {
    console.error(usage());
    process.exit(input ? 0 : 2);
  }

  const inputPath = path.resolve(input);
  let pages;
  try {
    const xml = fs.readFileSync(inputPath, "utf8");
    pages = extractModels(xml);
  } catch (error) {
    console.error(`FATAL: cannot read or parse ${inputPath}: ${error.message}`);
    process.exit(2);
  }

  const errors = [];
  const warnings = [];
  for (const page of pages) {
    const result = validatePage(page);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  for (const line of errors) console.log(line);
  for (const line of warnings) console.log(line);
  console.log(
    `${inputPath}: ${errors.length} diagram rule error(s), ${warnings.length} warning(s)`,
  );
  process.exit(errors.length ? 1 : 0);
}

main();
