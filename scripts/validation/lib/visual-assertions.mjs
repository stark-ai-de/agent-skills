// Shared maintainer-only assertions for repository eval and validation modules.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

export const SUPPORTED_VISUAL_ASSERTION_KINDS = new Set([
  "artifact_exists",
  "markdown_image",
  "markdown_link",
  "png_dimensions",
  "png_nonblank",
  "png_pixels_differ",
  "svg_png_dimensions_match",
  "svg_valid",
  "svg_theme",
  "svg_contains",
  "svg_not_contains",
  "svg_has_flow_animation",
  "svg_self_contained_images",
  "drawio_valid",
  "drawio_graph",
  "drawio_embeds_svg_sha256",
  "drawio_self_contained_svg",
]);
const MAX_PNG_FILE_BYTES = 64 * 1024 * 1024;
const MAX_PNG_DIMENSION = 32768;
const MAX_PNG_PIXELS = 16_000_000;
const MAX_PNG_DECODED_BYTES = 256 * 1024 * 1024;
const MAX_SVG_FILE_BYTES = 16 * 1024 * 1024;
const MAX_MARKDOWN_FILE_BYTES = 1024 * 1024;
const MAX_SVG_ELEMENTS = 20_000;
const MAX_SVG_DEPTH = 128;
const SVG_INSPECTION_TIMEOUT_MS = 5_000;
const DRAWIO_VALIDATION_TIMEOUT_MS = 5_000;
const DRAWIO_PROFILE_STYLE_KEYS = new Set([
  "designProfile",
  "shape",
  "dataRole",
  "strokeColor",
  "fillColor",
  "gradientColor",
  "gradientDirection",
  "shadow",
  "glass",
  "arcSize",
  "strokeWidth",
  "fontColor",
  "fontSize",
  "profileRole",
]);
const DEFAULT_WALK_LIMITS = Object.freeze({
  maxDepth: 64,
  maxEntries: 4_096,
  maxFiles: 1_024,
});
const DEFAULT_ARTIFACT_TOTAL_BYTES = 256 * 1024 * 1024;
const PNG_BIT_DEPTHS = new Map([
  [0, new Set([1, 2, 4, 8, 16])],
  [2, new Set([8, 16])],
  [3, new Set([1, 2, 4, 8])],
  [4, new Set([8, 16])],
  [6, new Set([8, 16])],
]);
const ADAM7_PASSES = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];
const CRC32_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function positiveLimit(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return value;
}

export function walkFiles(dir, predicate, options = {}) {
  if (!fs.existsSync(dir)) return [];
  const limits = {
    maxDepth: positiveLimit(options.maxDepth ?? DEFAULT_WALK_LIMITS.maxDepth, "maxDepth"),
    maxEntries: positiveLimit(options.maxEntries ?? DEFAULT_WALK_LIMITS.maxEntries, "maxEntries"),
    maxFiles: positiveLimit(options.maxFiles ?? DEFAULT_WALK_LIMITS.maxFiles, "maxFiles"),
  };
  const files = [];
  let entryCount = 0;

  function visit(current, depth) {
    if (depth > limits.maxDepth) {
      throw new Error(`file walk exceeds maximum depth ${limits.maxDepth}`);
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      entryCount += 1;
      if (entryCount > limits.maxEntries) {
        throw new Error(`file walk exceeds maximum entry count ${limits.maxEntries}`);
      }
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) visit(full, depth + 1);
      else if (entry.isFile() && predicate(full)) {
        files.push(full);
        if (files.length > limits.maxFiles) {
          throw new Error(`file walk exceeds maximum file count ${limits.maxFiles}`);
        }
      }
    }
  }

  visit(dir, 0);
  return files;
}

function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase(),
  );
  if (start === -1) return "";
  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line)) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function bullets(text) {
  const items = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      if (current) items.push(current);
      current = bullet[1].trim();
      continue;
    }
    if (current && /^\s+\S/.test(line)) {
      current = `${current} ${line.trim()}`;
      continue;
    }
    if (current) {
      items.push(current);
      current = null;
    }
  }
  if (current) items.push(current);
  return items;
}

function parseKeyValues(parts) {
  const values = {};
  for (const part of parts) {
    const match = part.match(/^([A-Za-z_][A-Za-z0-9_]*)=(\d+)$/);
    if (!match) throw new Error(`invalid key=value token ${JSON.stringify(part)}`);
    values[match[1]] = Number(match[2]);
  }
  return values;
}

function decodeMarkdownEscapes(value) {
  return value.replace(/\\([\\`*_[\]{}()#+\-.!])/g, "$1");
}

function parseDrawioGraph(parts) {
  const options = new Map();
  const allowedOptions = new Set([
    "ids",
    "component_ids",
    "component_labels",
    "native_ids",
    "edges",
    "edge_bindings",
    "exact_components",
    "exact_edges",
    "not_edges",
    "edge_roles",
    "profile_styles",
    "links",
    "page",
  ]);
  for (const part of parts) {
    const [name, separator, value] = part.match(/^([a-z_]+)(=)(.+)$/)?.slice(1) || [];
    if (!separator || !allowedOptions.has(name)) {
      throw new Error(`drawio_graph has invalid option ${JSON.stringify(part)}`);
    }
    if (options.has(name)) throw new Error(`drawio_graph repeats option ${name}`);
    options.set(name, value);
  }
  if (
    ![
      "ids",
      "component_ids",
      "component_labels",
      "native_ids",
      "edges",
      "edge_bindings",
      "not_edges",
      "edge_roles",
      "profile_styles",
      "links",
    ].some((name) => options.has(name))
  ) {
    throw new Error(
      "drawio_graph requires ids=..., component_ids=..., component_labels=..., native_ids=..., edges=..., edge_bindings=..., not_edges=..., edge_roles=..., profile_styles=..., or links=...",
    );
  }

  const parseIds = (value, label) => {
    if (!value) return [];
    const ids = value.split(",");
    if (ids.length > 128) throw new Error(`drawio_graph ${label} exceeds 128 entries`);
    for (const id of ids) {
      if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(id)) {
        throw new Error(`drawio_graph has invalid ${label} identifier ${JSON.stringify(id)}`);
      }
    }
    return ids;
  };
  const parseEdges = (value, label) => {
    const edges = (value || "")
      .split(",")
      .filter(Boolean)
      .map((edge) => {
        const match = edge.match(/^([^>]+)>([^>]+)$/);
        if (!match) throw new Error(`drawio_graph has invalid ${label} ${JSON.stringify(edge)}`);
        const [source, target] = [match[1], match[2]];
        parseIds(`${source},${target}`, label);
        return [source, target];
      });
    if (edges.length > 128) throw new Error(`drawio_graph ${label} exceeds 128 entries`);
    return edges;
  };
  const links = (options.get("links") || "").split(",").filter(Boolean);
  if (links.length > 128) throw new Error("drawio_graph links exceeds 128 entries");
  for (const link of links) {
    if (link.length > 2048 || !/^https?:\/\/[^\s,]+$/.test(link)) {
      throw new Error(`drawio_graph has invalid link ${JSON.stringify(link)}`);
    }
  }
  const edgeRoles = (options.get("edge_roles") || "")
    .split(",")
    .filter(Boolean)
    .map((mapping) => {
      const match = mapping.match(/^(.+):([a-z][a-z0-9_-]{0,63})$/);
      if (!match || !/^[A-Za-z0-9_.:-]{1,128}$/.test(match[1])) {
        throw new Error(`drawio_graph has invalid edge role mapping ${JSON.stringify(mapping)}`);
      }
      return [match[1], match[2]];
    });
  if (edgeRoles.length > 128) throw new Error("drawio_graph edge_roles exceeds 128 entries");
  const edgeBindings = (options.get("edge_bindings") || "")
    .split(",")
    .filter(Boolean)
    .map((binding) => {
      const match =
        /^([A-Za-z0-9_.:-]{1,128})@([A-Za-z0-9_.:-]{1,128})>([A-Za-z0-9_.:-]{1,128})$/.exec(
          binding,
        );
      if (!match) {
        throw new Error(`drawio_graph has invalid edge binding ${JSON.stringify(binding)}`);
      }
      return [match[1], match[2], match[3]];
    });
  if (edgeBindings.length > 128) {
    throw new Error("drawio_graph edge_bindings exceeds 128 entries");
  }
  const rawComponentLabels = options.has("component_labels")
    ? options.get("component_labels").split(",")
    : [];
  if (rawComponentLabels.length > 128) {
    throw new Error("drawio_graph component_labels exceeds 128 entries");
  }
  const componentLabels = rawComponentLabels.map((mapping) => {
    if (mapping.length > 1024) {
      throw new Error("drawio_graph has an oversized component label mapping");
    }
    const parts = mapping.split(":");
    const encodedComponent = /^(?:[A-Za-z0-9_.~-]|%[0-9A-Fa-f]{2})+$/;
    if (parts.length !== 2 || parts.some((part) => !encodedComponent.test(part))) {
      throw new Error(
        `drawio_graph has invalid component label mapping ${JSON.stringify(mapping)}`,
      );
    }
    let cellId;
    let label;
    try {
      [cellId, label] = parts.map((part) => decodeURIComponent(part));
    } catch {
      throw new Error(
        `drawio_graph has invalid component label mapping ${JSON.stringify(mapping)}`,
      );
    }
    if (
      !/^[A-Za-z0-9_.:-]{1,128}$/.test(cellId) ||
      !label ||
      [...label].length > 512 ||
      [...label].some((char) => {
        const codePoint = char.codePointAt(0);
        return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159);
      })
    ) {
      throw new Error(
        `drawio_graph has invalid component label mapping ${JSON.stringify(mapping)}`,
      );
    }
    return [cellId, label];
  });
  const rawProfileStyles = options.has("profile_styles")
    ? options.get("profile_styles").split(",")
    : [];
  if (rawProfileStyles.length > 128) {
    throw new Error("drawio_graph profile_styles exceeds 128 entries");
  }
  const profileStyles = rawProfileStyles.map((mapping) => {
    if (mapping.length > 8192) {
      throw new Error("drawio_graph has an oversized profile style mapping");
    }
    const parts = mapping.split(":");
    const encodedComponent = /^(?:[A-Za-z0-9_.~-]|%[0-9A-Fa-f]{2})+$/;
    if (parts.length !== 3 || parts.some((part) => !encodedComponent.test(part))) {
      throw new Error(`drawio_graph has invalid profile style mapping ${JSON.stringify(mapping)}`);
    }
    let cellId;
    let styleKey;
    let styleValue;
    try {
      [cellId, styleKey, styleValue] = parts.map((part) => decodeURIComponent(part));
    } catch {
      throw new Error(`drawio_graph has invalid profile style mapping ${JSON.stringify(mapping)}`);
    }
    const hasControl = (value) =>
      [...value].some((char) => {
        const codePoint = char.codePointAt(0);
        return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159);
      });
    if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(cellId)) {
      throw new Error(`drawio_graph has invalid profile style ID ${JSON.stringify(cellId)}`);
    }
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(styleKey)) {
      throw new Error(`drawio_graph has invalid profile style key ${JSON.stringify(styleKey)}`);
    }
    if (!DRAWIO_PROFILE_STYLE_KEYS.has(styleKey)) {
      throw new Error(`drawio_graph has unsupported profile style key ${JSON.stringify(styleKey)}`);
    }
    if (
      !styleValue ||
      [...styleValue].length > 2048 ||
      hasControl(cellId) ||
      hasControl(styleKey) ||
      hasControl(styleValue)
    ) {
      throw new Error(
        `drawio_graph has invalid profile style value for ${JSON.stringify(styleKey)}`,
      );
    }
    return [cellId, styleKey, styleValue];
  });
  let pageName = null;
  if (options.has("page")) {
    const encodedPage = options.get("page");
    if (encodedPage.length > 384 || !/^(?:[A-Za-z0-9_.:-]|%[0-9A-Fa-f]{2})+$/.test(encodedPage)) {
      throw new Error("drawio_graph has an invalid page");
    }
    try {
      pageName = decodeURIComponent(encodedPage);
    } catch {
      throw new Error("drawio_graph has an invalid page");
    }
    if (
      !pageName ||
      pageName.length > 128 ||
      [...pageName].some((char) => char.charCodeAt(0) < 32)
    ) {
      throw new Error("drawio_graph has an invalid page");
    }
  }
  const exactOption = (name) => {
    if (!options.has(name)) return false;
    if (options.get(name) !== "1") throw new Error(`drawio_graph ${name} must equal 1`);
    return true;
  };
  const componentIds = parseIds(options.get("component_ids"), "component_ids");
  const edges = parseEdges(options.get("edges"), "edge");
  const exactComponents = exactOption("exact_components");
  const exactEdges = exactOption("exact_edges");
  if (exactComponents && componentIds.length === 0) {
    throw new Error("drawio_graph exact_components=1 requires component_ids=...");
  }
  if (exactEdges && edges.length === 0) {
    throw new Error("drawio_graph exact_edges=1 requires edges=...");
  }
  return {
    ids: parseIds(options.get("ids"), "ids"),
    componentIds,
    componentLabels,
    nativeIds: parseIds(options.get("native_ids"), "native_ids"),
    edges,
    edgeBindings,
    notEdges: parseEdges(options.get("not_edges"), "forbidden edge"),
    edgeRoles,
    profileStyles,
    links,
    pageName,
    exactComponents,
    exactEdges,
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function parseAssertion(raw) {
  const index = raw.indexOf(":");
  if (index === -1) throw new Error("missing ':' separator");
  const kind = raw.slice(0, index).trim();
  const value = raw.slice(index + 1).trim();
  if (!SUPPORTED_VISUAL_ASSERTION_KINDS.has(kind)) {
    throw new Error(`unsupported assertion kind ${JSON.stringify(kind)}`);
  }
  if (!value) throw new Error("missing assertion value");

  const parts = value.split(/\s+/);
  const glob = decodeMarkdownEscapes(parts[0]);
  if (!glob) throw new Error("missing artifact glob");

  if (kind === "png_dimensions") {
    const options = parseKeyValues(parts.slice(1));
    if (!options.min_width || !options.min_height) {
      throw new Error("png_dimensions requires min_width=<px> and min_height=<px>");
    }
    return { raw, kind, glob, options };
  }

  if (kind === "png_nonblank") {
    const options = parseKeyValues(parts.slice(1));
    return { raw, kind, glob, options: { min_size: options.min_size || 1024 } };
  }

  if (kind === "png_pixels_differ") {
    if (parts.length < 2) {
      throw new Error(
        "png_pixels_differ requires two artifact globs and optional min_changed_basis_points=<1-10000>",
      );
    }
    const options = parseKeyValues(parts.slice(2));
    for (const name of Object.keys(options)) {
      if (name !== "min_changed_basis_points") {
        throw new Error(`png_pixels_differ does not support option ${name}`);
      }
    }
    const hasMinChangedBasisPoints = Object.hasOwn(options, "min_changed_basis_points");
    const minChangedBasisPoints = hasMinChangedBasisPoints ? options.min_changed_basis_points : 0;
    if (hasMinChangedBasisPoints && (minChangedBasisPoints < 1 || minChangedBasisPoints > 10_000)) {
      throw new Error("png_pixels_differ min_changed_basis_points must be between 1 and 10000");
    }
    return {
      raw,
      kind,
      glob,
      otherGlob: decodeMarkdownEscapes(parts[1]),
      minChangedBasisPoints,
    };
  }

  if (kind === "svg_png_dimensions_match") {
    if (parts.length !== 2) {
      throw new Error("svg_png_dimensions_match requires one SVG glob and one PNG glob");
    }
    return {
      raw,
      kind,
      glob,
      otherGlob: decodeMarkdownEscapes(parts[1]),
    };
  }

  if (kind === "markdown_image" || kind === "markdown_link") {
    const target = decodeMarkdownEscapes(parts[1] || "");
    if (
      parts.length !== 2 ||
      !target ||
      target.length > 512 ||
      [...target].some((char) => char.charCodeAt(0) < 32)
    ) {
      throw new Error(`${kind} requires one control-free Markdown target after the artifact glob`);
    }
    return { raw, kind, glob, target };
  }

  if (kind === "drawio_valid") {
    const options = parseKeyValues(parts.slice(1));
    const allowed = new Set([
      "animation_on",
      "animation_off",
      "adaptive_colors",
      "min_pages",
      "min_native_stencils",
      "self_contained_svg",
      "uncompressed",
    ]);
    for (const name of Object.keys(options)) {
      if (!allowed.has(name)) throw new Error(`drawio_valid does not support option ${name}`);
    }
    if (options.animation_on && options.animation_off) {
      throw new Error("drawio_valid cannot require animation_on and animation_off together");
    }
    for (const name of [
      "animation_on",
      "animation_off",
      "adaptive_colors",
      "self_contained_svg",
      "uncompressed",
    ]) {
      if (options[name] !== undefined && options[name] !== 1) {
        throw new Error(`drawio_valid option ${name} must equal 1`);
      }
    }
    if (options.min_pages !== undefined && options.min_pages < 1) {
      throw new Error("drawio_valid option min_pages must be positive");
    }
    if (options.min_native_stencils !== undefined) {
      if (options.min_native_stencils < 1) {
        throw new Error("drawio_valid option min_native_stencils must be positive");
      }
      if (!options.uncompressed) {
        throw new Error("drawio_valid option min_native_stencils requires uncompressed=1");
      }
    }
    return { raw, kind, glob, options };
  }

  if (kind === "drawio_embeds_svg_sha256") {
    if (
      ![2, 3].includes(parts.length) ||
      !/^[a-f0-9]{64}$/.test(parts[1]) ||
      (parts.length === 3 && !/^cell=[A-Za-z0-9_.:-]{1,128}$/.test(parts[2]))
    ) {
      throw new Error(
        `${kind} requires one lowercase SHA-256 digest and optional cell=<stable-id>`,
      );
    }
    return {
      raw,
      kind,
      glob,
      sha256: parts[1],
      cellId: parts.length === 3 ? parts[2].slice("cell=".length) : null,
    };
  }

  if (kind === "drawio_graph") {
    return { raw, kind, glob, ...parseDrawioGraph(parts.slice(1)) };
  }

  if (kind === "svg_theme") {
    const theme = parts[1];
    if (parts.length !== 2 || !["light", "dark", "adaptive"].includes(theme)) {
      throw new Error(`${kind} requires light, dark, or adaptive after the artifact glob`);
    }
    return { raw, kind, glob, theme };
  }

  if (kind === "svg_contains" || kind === "svg_not_contains") {
    const text = parts.slice(1).join(" ");
    if (!text) throw new Error(`${kind} requires text after the artifact glob`);
    return { raw, kind, glob, text };
  }

  if (parts.length > 1) throw new Error(`${kind} accepts only an artifact glob`);
  return { raw, kind, glob };
}

function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*")
    .replaceAll("?", ".");
  return new RegExp(`^${escaped}$`);
}

function matchingArtifacts(artifacts, glob) {
  const re = globToRegExp(glob);
  return artifacts.filter(
    (artifact) => re.test(artifact.rel) || re.test(path.basename(artifact.rel)),
  );
}

function assertDrawioSelfContainedSvg(file) {
  const validator = path.join(
    process.cwd(),
    "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
  );
  const result = spawnSync(
    "python3",
    [validator, file, "--require-self-contained-images", "--require-uncompressed"],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: DRAWIO_VALIDATION_TIMEOUT_MS,
    },
  );
  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`draw.io validation exceeded ${DRAWIO_VALIDATION_TIMEOUT_MS}ms timeout`);
  }
  if (result.error) throw new Error(`python3 draw.io validator failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "invalid draw.io artifact").trim());
  }
}

function assertDrawioValid(file, options = {}) {
  const validator = path.join(
    process.cwd(),
    "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
  );
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drawio-visual-report-"));
  const report = path.join(temp, "report.json");
  const args = [validator, file, "--json", report];
  if (options.animation_on) args.push("--animation", "on");
  else if (options.animation_off) args.push("--animation", "off");
  if (options.self_contained_svg) args.push("--require-self-contained-images");
  if (options.uncompressed) args.push("--require-uncompressed");
  try {
    const result = spawnSync("python3", args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: DRAWIO_VALIDATION_TIMEOUT_MS,
    });
    if (result.error?.code === "ETIMEDOUT") {
      throw new Error(`draw.io validation exceeded ${DRAWIO_VALIDATION_TIMEOUT_MS}ms timeout`);
    }
    if (result.error) throw new Error(`python3 draw.io validator failed: ${result.error.message}`);
    if (result.status !== 0) {
      throw new Error((result.stderr || result.stdout || "invalid draw.io artifact").trim());
    }
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(report, "utf8"));
    } catch (error) {
      throw new Error(`draw.io validator did not produce a valid report: ${error.message}`);
    }
    if (
      options.min_pages &&
      (!Array.isArray(parsed.pages) || parsed.pages.length < options.min_pages)
    ) {
      throw new Error(
        `draw.io artifact has ${parsed.pages?.length || 0} page(s), expected at least ${options.min_pages}`,
      );
    }
    if (
      options.adaptive_colors &&
      (parsed.adaptive_colors !== true ||
        !Array.isArray(parsed.pages) ||
        parsed.pages.length === 0 ||
        parsed.pages.some((page) => page?.adaptive_colors !== true))
    ) {
      throw new Error('draw.io artifact does not set adaptiveColors="auto" on every page');
    }
    if (options.animation_on) {
      const pages = Array.isArray(parsed.pages) ? parsed.pages : [];
      const directedFlowEdges = pages.reduce(
        (total, page) => total + Number(page?.directed_flow_edges || 0),
        0,
      );
      const animatedEdges = pages.reduce(
        (total, page) => total + Number(page?.animated_edges || 0),
        0,
      );
      if (directedFlowEdges < 1) {
        throw new Error(
          "drawio_valid animation_on=1 requires at least one directed semantic flow edge",
        );
      }
      if (animatedEdges < 1) {
        throw new Error("drawio_valid animation_on=1 requires at least one flowAnimation=1 edge");
      }
    }
    if (
      options.animation_on &&
      parsed.pages?.some((page) =>
        page.warnings?.some(
          (warning) =>
            String(warning).includes("static edge role") &&
            String(warning).includes("should not use flowAnimation=1"),
        ),
      )
    ) {
      throw new Error("draw.io artifact animates a structural/static edge role");
    }
    if (options.min_native_stencils) {
      const pages = Array.isArray(parsed.pages) ? parsed.pages : [];
      const nativeStencilCount = pages.reduce(
        (total, page) =>
          total +
          (Array.isArray(page?.native_stencil_cell_id_sha256s)
            ? page.native_stencil_cell_id_sha256s.length
            : 0),
        0,
      );
      if (nativeStencilCount < options.min_native_stencils) {
        throw new Error(
          `draw.io artifact has ${nativeStencilCount} native stencil cell(s), expected at least ${options.min_native_stencils}`,
        );
      }
    }
    return parsed;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export function listArtifacts(
  dir,
  {
    cwd = process.cwd(),
    maxDepth = DEFAULT_WALK_LIMITS.maxDepth,
    maxEntries = DEFAULT_WALK_LIMITS.maxEntries,
    maxFiles = DEFAULT_WALK_LIMITS.maxFiles,
    maxTotalBytes = DEFAULT_ARTIFACT_TOTAL_BYTES,
  } = {},
) {
  const requestedBase = path.resolve(cwd, dir);
  let requestedStat;
  try {
    requestedStat = fs.lstatSync(requestedBase);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  if (requestedStat.isSymbolicLink()) {
    throw new Error("artifacts path must not be a symbolic link");
  }
  if (!requestedStat.isDirectory()) throw new Error("artifacts path must be a directory");
  const base = fs.realpathSync(requestedBase);
  const totalByteLimit = positiveLimit(maxTotalBytes, "maxTotalBytes");
  let totalBytes = 0;
  return walkFiles(base, () => true, { maxDepth, maxEntries, maxFiles }).map((file) => {
    const realFile = fs.realpathSync(file);
    const relative = path.relative(base, realFile);
    if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
      throw new Error("artifact escapes the artifacts directory");
    }
    const stat = fs.statSync(realFile);
    if (!stat.isFile()) throw new Error("artifact must be a regular file");
    totalBytes += stat.size;
    if (totalBytes > totalByteLimit) {
      throw new Error(`artifacts exceed maximum aggregate size ${totalByteLimit}`);
    }
    return {
      file: realFile,
      rel: relative.replaceAll("\\", "/"),
    };
  });
}

function paethPredictor(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function pngChannels(colorType) {
  if (colorType === 0 || colorType === 3) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  throw new Error(`unsupported PNG color type ${colorType}`);
}

function pngSample(row, sampleIndex, bitDepth) {
  if (bitDepth === 16) return row.readUInt16BE(sampleIndex * 2);
  if (bitDepth === 8) return row[sampleIndex];
  const bitOffset = sampleIndex * bitDepth;
  const byte = row[Math.floor(bitOffset / 8)];
  const shift = 8 - bitDepth - (bitOffset % 8);
  const mask = (1 << bitDepth) - 1;
  return (byte >> shift) & mask;
}

function canonicalPngChannel(value, bitDepth) {
  if (bitDepth === 8) return value;
  if (bitDepth === 16) return Math.round(value / 257);
  return Math.round((value * 255) / (2 ** bitDepth - 1));
}

function canonicalPngPixel(row, x, bitDepth, colorType, transparency) {
  const channels = pngChannels(colorType);
  const samples = Array.from({ length: channels }, (_, channel) =>
    pngSample(row, x * channels + channel, bitDepth),
  );
  let red;
  let green;
  let blue;
  let alpha = 255;

  if (colorType === 0) {
    red = green = blue = canonicalPngChannel(samples[0], bitDepth);
    if (transparency.grayscaleValue === samples[0]) alpha = 0;
  } else if (colorType === 2) {
    [red, green, blue] = samples.map((sample) => canonicalPngChannel(sample, bitDepth));
    if (
      transparency.rgbValues?.every(
        (transparentSample, index) => transparentSample === samples[index],
      )
    ) {
      alpha = 0;
    }
  } else if (colorType === 3) {
    const index = samples[0];
    const color = transparency.paletteColors?.subarray(index * 3, index * 3 + 3);
    if (!color || color.length !== 3) {
      throw new Error(`indexed PNG uses missing palette entry ${index}`);
    }
    [red, green, blue] = color;
    alpha = transparency.palette?.[index] ?? 255;
  } else if (colorType === 4) {
    red = green = blue = canonicalPngChannel(samples[0], bitDepth);
    alpha = canonicalPngChannel(samples[1], bitDepth);
  } else if (colorType === 6) {
    [red, green, blue, alpha] = samples.map((sample) => canonicalPngChannel(sample, bitDepth));
  } else {
    throw new Error(`unsupported PNG color type ${colorType}`);
  }

  return alpha === 0 ? [0, 0, 0, 0] : [red, green, blue, alpha];
}

function crc32(...buffers) {
  let crc = 0xffffffff;
  for (const buffer of buffers) {
    for (const byte of buffer) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function decodedPngInfo(file) {
  const fileSize = fs.statSync(file).size;
  if (fileSize > MAX_PNG_FILE_BYTES) {
    throw new Error(`PNG exceeds ${MAX_PNG_FILE_BYTES} byte validation limit`);
  }
  const buffer = fs.readFileSync(file);
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 33 || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("not a PNG file");
  }

  let offset = 8;
  let width = null;
  let height = null;
  let bitDepth = null;
  let colorType = null;
  let interlaceMethod = null;
  const transparency = {};
  const idatChunks = [];
  let seenIhdr = false;
  let seenPlte = false;
  let seenIdat = false;
  let endedIdat = false;
  let seenTrns = false;
  let seenIend = false;
  let paletteEntries = 0;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error("truncated PNG chunk");
    const data = buffer.subarray(dataStart, dataEnd);
    if (!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type)) throw new Error("invalid PNG chunk type");
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    const actualCrc = crc32(buffer.subarray(offset + 4, offset + 8), data);
    if (expectedCrc !== actualCrc) throw new Error(`invalid PNG ${type} chunk CRC`);
    if (!seenIhdr && type !== "IHDR") throw new Error("PNG IHDR must be the first chunk");
    if (seenIdat && type !== "IDAT" && type !== "IEND") endedIdat = true;
    if (endedIdat && type === "IDAT") throw new Error("PNG IDAT chunks must be consecutive");

    if (type === "IHDR") {
      if (seenIhdr) throw new Error("PNG contains multiple IHDR chunks");
      if (length !== 13) throw new Error("invalid PNG IHDR length");
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlaceMethod = data[12];
      if (!width || !height) throw new Error("PNG dimensions must be positive");
      if (width > MAX_PNG_DIMENSION || height > MAX_PNG_DIMENSION) {
        throw new Error(`PNG dimension exceeds ${MAX_PNG_DIMENSION} pixel validation limit`);
      }
      if (width * height > MAX_PNG_PIXELS) {
        throw new Error(`PNG exceeds ${MAX_PNG_PIXELS} pixel validation limit`);
      }
      if (!PNG_BIT_DEPTHS.get(colorType)?.has(bitDepth)) {
        throw new Error(`invalid PNG bit depth ${bitDepth} for color type ${colorType}`);
      }
      if (data[10] !== 0 || data[11] !== 0) {
        throw new Error("unsupported PNG compression or filter method");
      }
      if (![0, 1].includes(interlaceMethod)) throw new Error("invalid PNG interlace method");
      seenIhdr = true;
    } else if (type === "PLTE") {
      if (seenPlte || seenTrns || seenIdat) throw new Error("invalid PNG PLTE chunk order");
      if (colorType === 0 || colorType === 4) {
        throw new Error(`PNG color type ${colorType} must not contain PLTE`);
      }
      if (length === 0 || length % 3 !== 0 || length > 768) {
        throw new Error("invalid PNG PLTE length");
      }
      if (colorType === 3 && length / 3 > 2 ** bitDepth) {
        throw new Error("PNG PLTE has more entries than indexed bit depth allows");
      }
      paletteEntries = length / 3;
      transparency.paletteColors = Buffer.from(data);
      seenPlte = true;
    } else if (type === "IDAT") {
      if (colorType === 3 && !seenPlte) throw new Error("indexed PNG is missing PLTE before IDAT");
      seenIdat = true;
      idatChunks.push(data);
    } else if (type === "tRNS") {
      if (seenTrns || seenIdat) throw new Error("invalid PNG tRNS chunk order");
      if (colorType === 3 && !seenPlte) throw new Error("indexed PNG tRNS must follow PLTE");
      seenTrns = true;
      if (colorType === 0) {
        if (length !== 2) throw new Error("invalid PNG tRNS length for grayscale image");
        transparency.grayscaleValue = data.readUInt16BE(0);
      } else if (colorType === 2) {
        if (length !== 6) throw new Error("invalid PNG tRNS length for truecolor image");
        transparency.rgbValues = [data.readUInt16BE(0), data.readUInt16BE(2), data.readUInt16BE(4)];
      } else if (colorType === 3) {
        if (length === 0 || length > paletteEntries) {
          throw new Error("invalid PNG tRNS length for indexed image");
        }
        transparency.palette = Buffer.from(data);
      } else {
        throw new Error(`PNG color type ${colorType} must not contain tRNS`);
      }
    } else if (type === "IEND") {
      if (length !== 0) throw new Error("invalid PNG IEND length");
      if (!seenIdat) throw new Error("PNG IEND encountered before IDAT");
      seenIend = true;
      offset = dataEnd + 4;
      break;
    } else if (/^[A-Z]/.test(type)) {
      throw new Error(`unsupported critical PNG chunk ${type}`);
    }
    offset = dataEnd + 4;
  }

  if (!seenIhdr || !width || !height || bitDepth == null || colorType == null) {
    throw new Error("PNG missing IHDR");
  }
  if (!idatChunks.length) throw new Error("PNG missing IDAT data");
  if (!seenIend) throw new Error("PNG missing IEND");
  if (offset !== buffer.length) throw new Error("PNG contains trailing data after IEND");

  const channels = pngChannels(colorType);
  const bitsPerPixel = channels * bitDepth;
  const filterStride = Math.max(1, Math.ceil(bitsPerPixel / 8));
  const passDefinitions = interlaceMethod === 0 ? [[0, 0, 1, 1]] : ADAM7_PASSES;
  const passes = passDefinitions
    .map(([startX, startY, stepX, stepY]) => ({
      startX,
      startY,
      stepX,
      stepY,
      width: width > startX ? Math.ceil((width - startX) / stepX) : 0,
      height: height > startY ? Math.ceil((height - startY) / stepY) : 0,
    }))
    .filter((pass) => pass.width > 0 && pass.height > 0);
  const expectedLength = passes.reduce(
    (total, pass) => total + pass.height * (Math.ceil((pass.width * bitsPerPixel) / 8) + 1),
    0,
  );
  if (expectedLength > MAX_PNG_DECODED_BYTES) {
    throw new Error(`PNG decoded data exceeds ${MAX_PNG_DECODED_BYTES} byte validation limit`);
  }
  const compressed = Buffer.concat(idatChunks);
  const inflatedResult = zlib.inflateSync(compressed, {
    info: true,
    maxOutputLength: expectedLength + 1,
  });
  const inflated = inflatedResult.buffer;
  if (inflatedResult.engine.bytesWritten !== compressed.length) {
    throw new Error("PNG IDAT contains trailing compressed input");
  }
  if (inflated.length !== expectedLength) {
    throw new Error("PNG IDAT data length does not match image rows");
  }

  let inOffset = 0;
  const distinctPixels = new Set();
  const visibleDistinctPixels = new Set();
  let visiblePixelCount = 0;
  let transparentPixelCount = 0;
  let visitedPixelCount = 0;
  const canonicalPixels = Buffer.alloc(width * height * 4);

  for (const pass of passes) {
    const rowBytes = Math.ceil((pass.width * bitsPerPixel) / 8);
    let previous = Buffer.alloc(rowBytes);
    for (let y = 0; y < pass.height; y += 1) {
      const filter = inflated[inOffset];
      const encoded = inflated.subarray(inOffset + 1, inOffset + 1 + rowBytes);
      const row = Buffer.alloc(rowBytes);
      inOffset += rowBytes + 1;

      for (let x = 0; x < rowBytes; x += 1) {
        const left = x >= filterStride ? row[x - filterStride] : 0;
        const up = previous[x] || 0;
        const upperLeft = x >= filterStride ? previous[x - filterStride] || 0 : 0;
        let predictor = 0;
        if (filter === 1) predictor = left;
        else if (filter === 2) predictor = up;
        else if (filter === 3) predictor = Math.floor((left + up) / 2);
        else if (filter === 4) predictor = paethPredictor(left, up, upperLeft);
        else if (filter !== 0) throw new Error(`unsupported PNG row filter ${filter}`);
        row[x] = (encoded[x] + predictor) & 0xff;
      }

      for (let x = 0; x < pass.width; x += 1) {
        const pixel = canonicalPngPixel(row, x, bitDepth, colorType, transparency);
        const canvasX = pass.startX + x * pass.stepX;
        const canvasY = pass.startY + y * pass.stepY;
        canonicalPixels.set(pixel, (canvasY * width + canvasX) * 4);
        visitedPixelCount += 1;
        const pixelKey = pixel[0] * 0x1000000 + pixel[1] * 0x10000 + pixel[2] * 0x100 + pixel[3];
        if (distinctPixels.size < 2) distinctPixels.add(pixelKey);
        if (pixel[3] === 0) transparentPixelCount += 1;
        else {
          visiblePixelCount += 1;
          if (visibleDistinctPixels.size < 2) visibleDistinctPixels.add(pixelKey);
        }
      }
      previous = row;
    }
  }
  if (inOffset !== inflated.length || visitedPixelCount !== width * height) {
    throw new Error("PNG decoded passes do not cover the complete canvas");
  }

  const nonblank =
    transparentPixelCount > 0 ? visiblePixelCount > 0 : visibleDistinctPixels.size > 1;
  const pixelDigest = crypto
    .createHash("sha256")
    .update(`${width}\0${height}\0rgba8\0`, "utf8")
    .update(canonicalPixels)
    .digest("hex");
  return {
    width,
    height,
    bitDepth,
    colorType,
    size: buffer.length,
    distinctPixels: distinctPixels.size,
    visibleDistinctPixels: visibleDistinctPixels.size,
    visiblePixelCount,
    transparentPixelCount,
    nonblank,
    pixelDigest,
    canonicalPixels,
  };
}

function markdownFence(line) {
  const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
  if (!match || (match[2][0] === "`" && match[3].includes("`"))) return null;
  return { character: match[2][0], length: match[2].length, suffix: match[3] };
}

const MARKDOWN_BLOCK_HTML_TAGS =
  "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
const MARKDOWN_BLOCK_HTML_RE = new RegExp(
  `^ {0,3}</?(?:${MARKDOWN_BLOCK_HTML_TAGS})(?:\\s|/?>|$)`,
  "i",
);

function markdownHtmlBlock(line) {
  const prefix = line.match(/^ {0,3}(.*)$/)?.[1];
  if (prefix === undefined) return null;
  for (const [start, end] of [
    [/^<(?:script|pre|style|textarea)(?:\s|>|$)/i, /<\/(?:script|pre|style|textarea)\s*>/i],
    [/^<!--/, /-->/],
    [/^<\?/, /\?>/],
    [/^<!\[CDATA\[/i, /\]\]>/],
    [/^<![A-Z]/, />/],
  ]) {
    if (start.test(prefix)) return { end, blankTerminated: false };
  }
  if (
    MARKDOWN_BLOCK_HTML_RE.test(line) ||
    /^ {0,3}<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>\s*$/.test(line)
  ) {
    return { end: null, blankTerminated: true };
  }
  return null;
}

function markdownSyntaxIsEscaped(source, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function markdownDestinations(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_MARKDOWN_FILE_BYTES) {
    throw new Error(
      `Markdown must be a nonempty file no larger than ${MAX_MARKDOWN_FILE_BYTES} bytes`,
    );
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
  } catch {
    throw new Error("Markdown is not valid UTF-8");
  }
  const visibleLines = [];
  let fence = null;
  let htmlBlock = null;
  for (const line of source.split(/\r?\n/)) {
    if (htmlBlock) {
      if (htmlBlock.blankTerminated) {
        if (line.trim() === "") htmlBlock = null;
      } else if (htmlBlock.end.test(line)) {
        htmlBlock = null;
      }
      continue;
    }
    const marker = markdownFence(line);
    if (fence) {
      if (
        marker?.character === fence.character &&
        marker.length >= fence.length &&
        marker.suffix.trim() === ""
      ) {
        fence = null;
      }
      continue;
    }
    if (marker) {
      fence = marker;
      continue;
    }
    if (/^(?: {4}|\t)/.test(line)) continue;
    const block = markdownHtmlBlock(line);
    if (block) {
      if (!block.blankTerminated && block.end.test(line)) continue;
      htmlBlock = block;
      continue;
    }
    visibleLines.push(line);
  }
  const visible = visibleLines
    .join("\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(pre|code|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/(`+)[\s\S]*?\1/g, "");
  const images = new Set();
  const links = new Set();
  const inline =
    /(!?)\[[^\]\r\n]*\]\(\s*(?:<([^>\r\n]+)>|([^\s)\r\n]+))(?:\s+(?:"[^"\r\n]*"|'[^'\r\n]*'|\([^)\r\n]*\)))?\s*\)/g;
  let match;
  while ((match = inline.exec(visible)) !== null) {
    if (markdownSyntaxIsEscaped(visible, match.index)) continue;
    const target = match[2] || match[3];
    (match[1] ? images : links).add(target);
  }
  return { images, links };
}

function localMarkdownArtifact(markdownRel, target) {
  const value = String(target).trim();
  if (!value || value.startsWith("#") || /^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/|\/)/.test(value)) {
    return null;
  }
  const pathOnly = value.split(/[?#]/, 1)[0];
  if (!pathOnly) return null;
  let decoded;
  try {
    decoded = decodeURI(pathOnly);
  } catch {
    throw new Error(`Markdown target is not a valid relative URI: ${target}`);
  }
  const relative = path.posix.normalize(path.posix.join(path.posix.dirname(markdownRel), decoded));
  if (relative === ".." || relative.startsWith("../")) {
    throw new Error(`Markdown target escapes the artifact root: ${target}`);
  }
  return relative;
}

export function svgInfo(file) {
  const script = `
import base64
import json
import math
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

MAX_BYTES = ${MAX_SVG_FILE_BYTES}
MAX_ELEMENTS = ${MAX_SVG_ELEMENTS}
MAX_DEPTH = ${MAX_SVG_DEPTH}
SVG_NAMESPACE = "http://www.w3.org/2000/svg"
XLINK_NAMESPACE = "http://www.w3.org/1999/xlink"
XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
DRAWIO_SVG_DOCTYPE = b'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
NON_RENDERING = {"defs", "metadata", "title", "desc", "style", "script", "clipPath", "mask", "pattern", "symbol"}
GRAPHICS = {"path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "image", "use", "text", "textPath", "tspan", "foreignObject"}
TEXT_CONTEXT = {"text", "textPath", "tspan", "foreignObject"}
PAINTED_TEXT = {"text", "textPath", "tspan"}
DATA_IMAGE_RE = re.compile(r"^data:image/(svg\\+xml|png)(;base64)?,(.*)$", re.IGNORECASE | re.DOTALL)
CSS_URL_RE = re.compile(r'''url\\(\\s*(['"]?)(.*?)\\1\\s*\\)''', re.IGNORECASE)
PNG_BIT_DEPTHS = {0: {1, 2, 4, 8, 16}, 2: {8, 16}, 3: {1, 2, 4, 8}, 4: {8, 16}, 6: {8, 16}}
PNG_CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
MAX_EMBEDDED_PNG_DIMENSION = 32768
MAX_EMBEDDED_PNG_DECODED_BYTES = 64 * 1024 * 1024
MAX_CANVAS_DIMENSION = ${MAX_PNG_DIMENSION}

def local_name(tag):
    return str(tag).rsplit("}", 1)[-1].split(":")[-1]

def namespace(tag):
    literal = str(tag)
    if literal.startswith("{") and "}" in literal:
        return literal[1:].split("}", 1)[0]
    return ""

def decoded_data_image(source):
    match = DATA_IMAGE_RE.fullmatch(str(source).strip())
    if not match or not match.group(3):
        return None
    media_type = match.group(1).lower()
    payload = match.group(3)
    if not match.group(2) and re.search(r"%(?![0-9A-Fa-f]{2})", payload):
        return None
    try:
        if match.group(2):
            raw = base64.b64decode(payload, validate=True)
        elif re.search(r"%[0-9A-Fa-f]{2}", payload):
            raw = urllib.parse.unquote_to_bytes(payload)
        elif media_type == "svg+xml" and payload.lstrip().startswith("<"):
            raw = payload.encode("utf-8")
        else:
            raw = base64.b64decode(payload, validate=True)
    except (ValueError, base64.binascii.Error):
        return None
    return (media_type, raw) if raw and len(raw) <= 2 * 1024 * 1024 else None

def positive_svg_length(value):
    match = re.fullmatch(r"\\s*\\+?(\\d+(?:\\.\\d*)?|\\.\\d+)(?:[A-Za-z%]+)?\\s*", str(value or ""))
    return bool(match and float(match.group(1)) > 0)

def canvas_dimension(value):
    match = re.fullmatch(r"\\s*\\+?(\\d+(?:\\.\\d*)?|\\.\\d+)(?:px)?\\s*", str(value or ""), re.IGNORECASE)
    if not match:
        return 0
    number = float(match.group(1))
    if not math.isfinite(number) or number <= 0:
        return 0
    dimension = math.ceil(number)
    return dimension if dimension <= MAX_CANVAS_DIMENSION else 0

def embedded_svg_has_bounds(root):
    view_box = root.attrib.get("viewBox") or root.attrib.get("viewbox")
    if view_box:
        try:
            values = [float(value) for value in re.split(r"[\\s,]+", view_box.strip()) if value]
        except ValueError:
            values = []
        if len(values) == 4 and values[2] > 0 and values[3] > 0:
            return True
    return positive_svg_length(root.attrib.get("width")) and positive_svg_length(root.attrib.get("height"))

def external_css_references(text, reject_escapes=False):
    literal = str(text or "")
    count = 1 if re.search(r"@import\\b", literal, re.IGNORECASE) or (reject_escapes and chr(92) in literal) else 0
    for match in CSS_URL_RE.finditer(literal):
        reference = match.group(2).strip()
        if reference and not reference.startswith("#") and not reference.lower().startswith("data:"):
            count += 1
    return count

def local_fragment_exists(reference, identifiers):
    literal = str(reference or "").strip()
    if not literal.startswith("#"):
        return False
    try:
        fragment = urllib.parse.unquote(literal[1:])
    except (UnicodeDecodeError, ValueError):
        return False
    return bool(fragment and fragment in identifiers)

def missing_local_css_references(text, identifiers):
    return sum(
        1
        for match in CSS_URL_RE.finditer(str(text or ""))
        if match.group(2).strip().startswith("#")
        and not local_fragment_exists(match.group(2).strip(), identifiers)
    )

def embedded_svg_is_safe(raw):
    lowered = raw.lower()
    without_xml_declaration = re.sub(br"^\\s*<\\?xml\\s+[^?]*\\?>", b"", lowered, count=1)
    if b"\\x00" in raw or b"<!doctype" in lowered or b"<!entity" in lowered or b"<?" in without_xml_declaration:
        return False
    try:
        embedded_root = ET.fromstring(raw)
    except (ET.ParseError, UnicodeDecodeError):
        return False
    if local_name(embedded_root.tag).lower() != "svg" or namespace(embedded_root.tag) not in {"", SVG_NAMESPACE} or not embedded_svg_has_bounds(embedded_root):
        return False
    if not stylesheets_supported(embedded_root):
        return False
    embedded_ids = {
        str(embedded.attrib.get("id"))
        for embedded in embedded_root.iter()
        if embedded.attrib.get("id")
    }
    for embedded in embedded_root.iter():
        name = local_name(embedded.tag).lower()
        if name in {"animate", "animatemotion", "animatetransform", "discard", "foreignobject", "script", "set"}:
            return False
        if name == "style":
            css = "".join(embedded.itertext())
            if external_css_references(css, True) or missing_local_css_references(css, embedded_ids):
                return False
        for raw_name, raw_value in embedded.attrib.items():
            key = local_name(raw_name).lower()
            value = str(raw_value).strip()
            if raw_name == f"{{{XML_NAMESPACE}}}base" or str(raw_name).lower() == "xml:base":
                return False
            if key.startswith("on") or external_css_references(value, True) or missing_local_css_references(value, embedded_ids):
                return False
            if key in {"href", "src"} and value:
                if value.startswith("#"):
                    if not local_fragment_exists(value, embedded_ids):
                        return False
                else:
                    return False
    return embedded_svg_has_renderable_graphic(embedded_root)

def valid_embedded_image_source(source):
    decoded = decoded_data_image(source)
    if not decoded:
        return None
    media_type, raw = decoded
    if media_type == "svg+xml":
        return media_type if embedded_svg_is_safe(raw) else None
    return media_type if embedded_png_is_valid(raw) else None

def style_map(value):
    result = {}
    for token in str(value or "").split(";"):
        key, separator, item = token.partition(":")
        if separator:
            result[key.strip().lower()] = item.strip().lower()
    return result

def stylesheet_has_only_keyframes(css):
    literal = str(css or "")
    if not literal.strip():
        return True
    if chr(92) in literal or "/*" in literal or "*/" in literal:
        return False
    position = 0
    start_re = re.compile(r"@(?:-webkit-)?keyframes\\s+[_A-Za-z][_A-Za-z0-9-]*\\s*\\{", re.IGNORECASE)
    while position < len(literal):
        while position < len(literal) and literal[position].isspace():
            position += 1
        if position == len(literal):
            return True
        match = start_re.match(literal, position)
        if match is None:
            return False
        depth = 1
        quote = None
        position = match.end()
        while position < len(literal) and depth:
            character = literal[position]
            if quote:
                if character == quote:
                    quote = None
            elif character in {'"', "'"}:
                quote = character
            elif character == "{":
                depth += 1
            elif character == "}":
                depth -= 1
            position += 1
        if depth or quote:
            return False
    return True

def stylesheets_supported(root):
    return all(
        stylesheet_has_only_keyframes("".join(element.itertext()))
        for element in root.iter()
        if local_name(element.tag).lower() == "style"
    )

def flow_keyframe_offsets(root):
    offsets = {}
    for element in root.iter():
        if local_name(element.tag).lower() != "style":
            continue
        css = "".join(element.itertext())
        for match in re.finditer(r"@keyframes\\s+([_A-Za-z][_A-Za-z0-9-]*)\\s*\\{", css, re.IGNORECASE):
            start = match.end() - 1
            depth = 0
            end = None
            for index in range(start, len(css)):
                if css[index] == "{":
                    depth += 1
                elif css[index] == "}":
                    depth -= 1
                    if depth == 0:
                        end = index
                        break
            if end is None:
                continue
            body = css[start + 1:end]
            values = set()
            has_from = has_to = False
            for rule in re.finditer(r"([^{}]+)\\{([^{}]*)\\}", body):
                declaration = re.search(
                    r"stroke-dashoffset\\s*:\\s*([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))(?:px)?(?:\\s*[;}])",
                    rule.group(2),
                    re.IGNORECASE,
                )
                if declaration is None or not math.isfinite(float(declaration.group(1))):
                    continue
                values.add(float(declaration.group(1)))
                selectors = {selector.strip().lower() for selector in rule.group(1).split(",")}
                has_from = has_from or bool(selectors & {"from", "0%", "0.0%"})
                has_to = has_to or bool(selectors & {"to", "100%", "100.0%"})
            if values:
                offsets[match.group(1).lower()] = {
                    "values": values,
                    "has_from": has_from,
                    "has_to": has_to,
                }
    return offsets

def has_flow_animation(root):
    keyframes = flow_keyframe_offsets(root)
    if not keyframes:
        return False

    def visit(element, inherited_paint=None, inherited_hidden=False):
        paint = paint_state(element, inherited_paint)
        hidden = element_hidden(element, inherited_hidden)
        properties = {
            local_name(name).lower(): str(value).strip().lower()
            for name, value in element.attrib.items()
        }
        properties.update(style_map(element.attrib.get("style")))
        animation = properties.get("animation", "")
        animation_tokens = set(re.split(r"\\s+", animation))
        animation_name = next((name for name in keyframes if name in animation_tokens), None)
        times = [
            float(value) * (0.001 if unit.lower() == "ms" else 1)
            for value, unit in re.findall(r"(?<![-\\w.])(\\d+(?:\\.\\d+)?)(ms|s)(?![-\\w])", animation, re.IGNORECASE)
        ]
        dash_array = properties.get("stroke-dasharray", "")
        dash_offset = properties.get("stroke-dashoffset", "")
        inline_offsets = {
            float(value)
            for value in re.findall(r"[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)", dash_offset)
            if math.isfinite(float(value))
        } or {0.0}
        keyframe = keyframes.get(animation_name, {})
        keyframe_offsets = keyframe.get("values", set())
        motion = len(keyframe_offsets) > 1 or (
            not (keyframe.get("has_from") and keyframe.get("has_to"))
            and len(inline_offsets | keyframe_offsets) > 1
        )
        stroke = paint.get("color") if paint.get("stroke") == "currentcolor" else paint.get("stroke")
        animated = (
            local_name(element.tag).lower() in {"path", "line", "polyline"}
            and animation_name
            and "running" in animation_tokens
            and "infinite" in animation_tokens
            and times
            and times[0] > 0
            and any(float(value) > 0 for value in re.findall(r"[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)", dash_array))
            and motion
            and not hidden
            and not transparent_color(stroke)
            and not zero_opacity(paint.get("stroke-opacity", "1"))
            and not zero_or_unknown_length(paint.get("stroke-width", "1"))
        )
        return animated or any(visit(child, paint, hidden) for child in element)

    return visit(root)

def attribute_value(element, key):
    for name, value in element.attrib.items():
        if local_name(name).lower() == key:
            return str(value).strip().lower()
    return ""

def paint_state(element, inherited=None):
    result = dict(inherited or {
        "color": "black",
        "fill": "black",
        "font-size": "16",
        "stroke": "none",
        "stroke-linecap": "butt",
        "stroke-width": "1",
        "fill-opacity": "1",
        "stroke-opacity": "1",
    })
    styles = style_map(element.attrib.get("style"))
    for key in ("color", "fill", "font-size", "stroke", "stroke-linecap", "stroke-width", "fill-opacity", "stroke-opacity"):
        value = styles.get(key) or attribute_value(element, key)
        if value and value != "inherit" and not (key == "color" and value == "currentcolor"):
            result[key] = value
    return result

def zero_opacity(value):
    literal = str(value or "").strip().lower()
    if not literal:
        return False
    try:
        return float(literal.rstrip("%")) <= 0
    except ValueError:
        return True

def transparent_color(value):
    compact = re.sub(r"\\s+", "", str(value or "")).lower()
    if compact in {"none", "transparent"}:
        return True
    alpha = re.fullmatch(r"(?:rgba|hsla)\\(.*,([^,\\)]*)\\)", compact) or re.fullmatch(r"(?:rgba?|hsla?)\\(.*\\/([^\\)]*)\\)", compact)
    if alpha:
        return zero_opacity(alpha.group(1))
    if re.fullmatch(r"#[0-9a-f]{4}", compact):
        return compact[-1] == "0"
    if re.fullmatch(r"#[0-9a-f]{8}", compact):
        return compact[-2:] == "00"
    return compact.startswith("url(")

def zero_or_unknown_font_size(value):
    literal = str(value or "").strip().lower()
    match = re.fullmatch(r"([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))(?:[a-z%]+)?", literal)
    if not match:
        return True
    try:
        return float(match.group(1)) <= 0
    except ValueError:
        return True

def zero_or_unknown_length(value):
    literal = str(value or "").strip().lower()
    match = re.fullmatch(r"([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))(?:[a-z%]+)?", literal)
    if not match:
        return True
    try:
        return float(match.group(1)) <= 0
    except ValueError:
        return True

def text_paint_hidden(paint):
    inherited_color = paint.get("color", "black")
    fill = paint.get("fill", "black")
    stroke = paint.get("stroke", "none")
    if fill == "currentcolor":
        fill = inherited_color
    if stroke == "currentcolor":
        stroke = inherited_color
    fill_visible = not transparent_color(fill) and not zero_opacity(paint.get("fill-opacity", "1"))
    stroke_visible = (
        not transparent_color(stroke)
        and not zero_opacity(paint.get("stroke-opacity", "1"))
        and not zero_or_unknown_length(paint.get("stroke-width", "1"))
    )
    return zero_or_unknown_font_size(paint.get("font-size", "16")) or not (fill_visible or stroke_visible)

def element_hidden(element, inherited):
    if inherited:
        return True
    styles = style_map(element.attrib.get("style"))
    display = str(element.attrib.get("display") or styles.get("display") or "").strip().lower()
    visibility = str(element.attrib.get("visibility") or styles.get("visibility") or "").strip().lower()
    opacity = str(element.attrib.get("opacity") or styles.get("opacity") or "").strip().lower()
    effect_hidden = any(
        str(element.attrib.get(key) or styles.get(key) or "").strip().lower() not in {"", "none"}
        for key in ("clip-path", "filter", "mask")
    )
    opacity_hidden = zero_opacity(opacity)
    return (
        display == "none"
        or visibility in {"hidden", "collapse"}
        or opacity_hidden
        or effect_hidden
        or str(element.attrib.get("aria-hidden") or "").strip().lower() == "true"
    )

def inspect(element, inherited_hidden=False, text_context=False, inherited_paint=None):
    name = local_name(element.tag)
    if name in NON_RENDERING:
        return [], 0
    hidden = element_hidden(element, inherited_hidden)
    paint = paint_state(element, inherited_paint)
    paint_hidden = name in PAINTED_TEXT and text_paint_hidden(paint)
    current_text_context = text_context or name in TEXT_CONTEXT
    text_parts = []
    graphics = 0
    if not hidden:
        if name in GRAPHICS and not paint_hidden:
            graphics += 1
        if current_text_context and not paint_hidden and element.text:
            text_parts.append(element.text)
    for child in element:
        child_text, child_graphics = inspect(child, hidden, current_text_context, paint)
        text_parts.extend(child_text)
        graphics += child_graphics
        if not hidden and current_text_context and not paint_hidden and child.tail:
            text_parts.append(child.tail)
    return text_parts, graphics

def embedded_numeric_length(value, default=0):
    match = re.fullmatch(r"\\s*([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[Ee][+-]?\\d+)?)(?:[A-Za-z%]+)?\\s*", str(value or ""))
    if not match:
        return default
    try:
        number = float(match.group(1))
        return number if number == number and abs(number) != float("inf") else default
    except ValueError:
        return default

def embedded_attribute(element, key):
    for name, value in element.attrib.items():
        if local_name(name).lower() == key:
            return str(value)
    return ""

def embedded_color_visible(value, identifiers):
    literal = re.sub(r"\\s+", "", str(value or "")).lower()
    local_paint = re.fullmatch(r'''url\\((?:['"])?#([^)'"]+)(?:['"])?\\)''', literal)
    if local_paint:
        return urllib.parse.unquote(local_paint.group(1)) in identifiers
    if literal.startswith("url("):
        return False
    return not transparent_color(literal)

def embedded_paint_visible(paint, identifiers, fill=True, stroke=True):
    fill_color = paint.get("color") if paint.get("fill") == "currentcolor" else paint.get("fill")
    stroke_color = paint.get("color") if paint.get("stroke") == "currentcolor" else paint.get("stroke")
    fill_visible = fill and embedded_color_visible(fill_color, identifiers) and not zero_opacity(paint.get("fill-opacity"))
    stroke_visible = (
        stroke
        and embedded_color_visible(stroke_color, identifiers)
        and not zero_opacity(paint.get("stroke-opacity"))
        and embedded_numeric_length(paint.get("stroke-width"), 1) > 0
    )
    return fill_visible or stroke_visible

def embedded_points(value):
    numbers = [float(match.group(0)) for match in re.finditer(r"[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[Ee][-+]?\\d+)?", str(value or ""))]
    if len(numbers) % 2 or not all(math.isfinite(number) for number in numbers):
        return []
    return list(zip(numbers[::2], numbers[1::2]))

def embedded_points_have_area(points):
    if not points:
        return False
    origin = points[0]
    direction = next((point for point in points[1:] if point != origin), None)
    if direction is None:
        return False
    first = (direction[0] - origin[0], direction[1] - origin[1])
    return any(
        first[0] * (point[1] - origin[1]) != first[1] * (point[0] - origin[0])
        for point in points[1:]
    )

def embedded_path_geometry(value):
    data = str(value or "").strip()
    if not data:
        return False, False, False
    arity = {"m": 2, "l": 2, "h": 1, "v": 1, "c": 6, "s": 4, "q": 4, "t": 2, "a": 7}
    commands = frozenset("MmZzLlHhVvCcSsQqTtAa")
    number_re = re.compile(r"[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[Ee][-+]?\\d+)?")
    index = 0
    command = None
    relative = False
    saw_command = False
    drew_segment = False
    drew_zero_length_segment = False
    fillable = False
    current = (0.0, 0.0)
    subpath_start = None
    fill_direction = None

    def record_fill_point(point):
        nonlocal fill_direction, fillable
        if subpath_start is None or point == subpath_start:
            return
        if fill_direction is None:
            fill_direction = point
            return
        first = (fill_direction[0] - subpath_start[0], fill_direction[1] - subpath_start[1])
        candidate = (point[0] - subpath_start[0], point[1] - subpath_start[1])
        if first[0] * candidate[1] != first[1] * candidate[0]:
            fillable = True

    def skip_whitespace(position):
        while position < len(data) and data[position].isspace():
            position += 1
        return position

    def consume_separator(position, allow_comma):
        position = skip_whitespace(position)
        if position < len(data) and data[position] == ",":
            if not allow_comma:
                return None
            position = skip_whitespace(position + 1)
        return position

    while index < len(data):
        index = skip_whitespace(index)
        if index >= len(data):
            break
        if data[index] in commands:
            raw_command = data[index]
            command = raw_command.lower()
            relative = raw_command.islower()
            if not saw_command and command != "m":
                return False, False, False
            saw_command = True
            index += 1
            if command == "z":
                if subpath_start is not None:
                    drew_segment = drew_segment or current != subpath_start
                    current = subpath_start
                command = None
                continue
        elif command is None:
            return False, False, False

        parameter_count = arity.get(command)
        if not parameter_count:
            return False, False, False
        group_count = 0
        while True:
            values = []
            for parameter in range(parameter_count):
                separated = consume_separator(index, parameter > 0 or group_count > 0)
                if separated is None:
                    return False, False, False
                index = separated
                if index >= len(data) or data[index] in commands:
                    return False, False, False
                if command == "a" and parameter in {3, 4}:
                    if data[index] not in {"0", "1"}:
                        return False, False, False
                    values.append(data[index])
                    index += 1
                else:
                    match = number_re.match(data, index)
                    if match is None:
                        return False, False, False
                    values.append(match.group(0))
                    index = match.end()
            if command == "a" and (float(values[0]) < 0 or float(values[1]) < 0):
                return False, False, False
            numbers = [float(item) for item in values]
            if not all(math.isfinite(number) for number in numbers):
                return False, False, False
            origin = current

            def point(x, y):
                return (origin[0] + x, origin[1] + y) if relative else (x, y)

            if command == "m":
                endpoint = point(numbers[0], numbers[1])
                if group_count == 0:
                    subpath_start = endpoint
                    fill_direction = None
                else:
                    drew_segment = drew_segment or endpoint != current
                    drew_zero_length_segment = drew_zero_length_segment or endpoint == current
                    record_fill_point(endpoint)
                current = endpoint
            elif command in {"l", "t"}:
                endpoint = point(numbers[0], numbers[1])
                drew_segment = drew_segment or endpoint != current
                drew_zero_length_segment = drew_zero_length_segment or endpoint == current
                record_fill_point(endpoint)
                current = endpoint
            elif command == "h":
                endpoint = (origin[0] + numbers[0], origin[1]) if relative else (numbers[0], origin[1])
                drew_segment = drew_segment or endpoint != current
                drew_zero_length_segment = drew_zero_length_segment or endpoint == current
                record_fill_point(endpoint)
                current = endpoint
            elif command == "v":
                endpoint = (origin[0], origin[1] + numbers[0]) if relative else (origin[0], numbers[0])
                drew_segment = drew_segment or endpoint != current
                drew_zero_length_segment = drew_zero_length_segment or endpoint == current
                record_fill_point(endpoint)
                current = endpoint
            elif command == "c":
                points = (point(numbers[0], numbers[1]), point(numbers[2], numbers[3]), point(numbers[4], numbers[5]))
                has_extent = any(item != current for item in points)
                drew_segment = drew_segment or has_extent
                drew_zero_length_segment = drew_zero_length_segment or not has_extent
                for item in points:
                    record_fill_point(item)
                current = points[2]
            elif command in {"s", "q"}:
                points = (point(numbers[0], numbers[1]), point(numbers[2], numbers[3]))
                has_extent = any(item != current for item in points)
                drew_segment = drew_segment or has_extent
                drew_zero_length_segment = drew_zero_length_segment or not has_extent
                for item in points:
                    record_fill_point(item)
                current = points[1]
            elif command == "a":
                endpoint = point(numbers[5], numbers[6])
                drew_segment = drew_segment or endpoint != current
                drew_zero_length_segment = drew_zero_length_segment or endpoint == current
                if numbers[0] > 0 and numbers[1] > 0 and endpoint != current:
                    fillable = True
                record_fill_point(endpoint)
                current = endpoint
            group_count += 1

            index = skip_whitespace(index)
            if index >= len(data):
                return drew_segment, fillable, drew_zero_length_segment
            if data[index] in commands:
                break
    return saw_command and drew_segment, saw_command and fillable, saw_command and drew_zero_length_segment

def embedded_svg_has_renderable_graphic(root):
    elements_by_id = {
        str(element.attrib.get("id")): element
        for element in root.iter()
        if element.attrib.get("id")
    }
    non_rendering = {name.lower() for name in NON_RENDERING}

    def visit(element, inherited_paint=None, inherited_hidden=False, resolving=frozenset(), referenced=False):
        name = local_name(element.tag).lower()
        styles = style_map(element.attrib.get("style"))
        hidden = inherited_hidden or str(element.attrib.get("display") or styles.get("display") or "").strip().lower() == "none"
        hidden = hidden or str(element.attrib.get("visibility") or styles.get("visibility") or "").strip().lower() in {"hidden", "collapse"}
        hidden = hidden or zero_opacity(element.attrib.get("opacity") or styles.get("opacity") or "1")
        if hidden:
            return False
        paint = paint_state(element, inherited_paint)
        if name in non_rendering and not (referenced and name == "symbol"):
            return False
        if name == "use":
            href = embedded_attribute(element, "href")
            fragment = urllib.parse.unquote(href[1:]) if href.startswith("#") else ""
            if not fragment or fragment in resolving or fragment not in elements_by_id:
                return False
            return visit(elements_by_id[fragment], paint, False, resolving | {fragment}, True)
        if name == "path":
            has_segment, has_fill_area, has_zero_length_segment = embedded_path_geometry(element.attrib.get("d"))
            if has_segment:
                return embedded_paint_visible(paint, elements_by_id, fill=has_fill_area, stroke=True)
            if has_zero_length_segment and paint.get("stroke-linecap") in {"round", "square"}:
                return embedded_paint_visible(paint, elements_by_id, fill=False, stroke=True)
        elif name == "rect":
            if embedded_numeric_length(element.attrib.get("width")) > 0 and embedded_numeric_length(element.attrib.get("height")) > 0:
                return embedded_paint_visible(paint, elements_by_id)
        elif name == "circle":
            if embedded_numeric_length(element.attrib.get("r")) > 0:
                return embedded_paint_visible(paint, elements_by_id)
        elif name == "ellipse":
            if embedded_numeric_length(element.attrib.get("rx")) > 0 and embedded_numeric_length(element.attrib.get("ry")) > 0:
                return embedded_paint_visible(paint, elements_by_id)
        elif name == "line":
            start = (embedded_numeric_length(element.attrib.get("x1")), embedded_numeric_length(element.attrib.get("y1")))
            end = (embedded_numeric_length(element.attrib.get("x2")), embedded_numeric_length(element.attrib.get("y2")))
            if start != end:
                return embedded_paint_visible(paint, elements_by_id, fill=False)
        elif name in {"polyline", "polygon"}:
            points = embedded_points(element.attrib.get("points"))
            if len(set(points)) >= 2:
                return embedded_paint_visible(paint, elements_by_id, fill=embedded_points_have_area(points), stroke=True)
        elif name == "text":
            if "".join(element.itertext()).strip() and embedded_numeric_length(paint.get("font-size"), 16) > 0:
                return embedded_paint_visible(paint, elements_by_id)
        elif name == "image":
            if embedded_attribute(element, "href") and embedded_numeric_length(element.attrib.get("width")) > 0 and embedded_numeric_length(element.attrib.get("height")) > 0:
                return True
        if name in {"path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "image"}:
            return False
        return any(visit(child, paint, False, resolving) for child in element)

    return visit(root)

def embedded_png_is_valid(raw):
    try:
        if len(raw) < 45 or raw[:8] != bytes.fromhex("89504e470d0a1a0a"):
            return False
        offset = 8
        saw_header = saw_palette = saw_idat = ended_idat = saw_end = False
        width = height = bit_depth = color_type = 0
        idat_chunks = []
        while offset + 12 <= len(raw):
            length = int.from_bytes(raw[offset:offset + 4], "big")
            chunk_type = raw[offset + 4:offset + 8]
            chunk_end = offset + 12 + length
            if chunk_end > len(raw):
                return False
            chunk_data = raw[offset + 8:offset + 8 + length]
            expected_crc = int.from_bytes(raw[offset + 8 + length:chunk_end], "big")
            if zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF != expected_crc:
                return False
            chunk_name = chunk_type.decode("ascii")
            if not re.fullmatch(r"[A-Za-z]{2}[A-Z][A-Za-z]", chunk_name):
                return False
            if not saw_header:
                if chunk_type != b"IHDR" or length != 13:
                    return False
                width = int.from_bytes(chunk_data[:4], "big")
                height = int.from_bytes(chunk_data[4:8], "big")
                bit_depth, color_type = chunk_data[8], chunk_data[9]
                if not width or not height or width > MAX_EMBEDDED_PNG_DIMENSION or height > MAX_EMBEDDED_PNG_DIMENSION:
                    return False
                if bit_depth not in PNG_BIT_DEPTHS.get(color_type, set()) or chunk_data[10] != 0 or chunk_data[11] != 0 or chunk_data[12] != 0:
                    return False
                saw_header = True
            elif chunk_type == b"IHDR":
                return False
            elif chunk_type == b"PLTE":
                entries = length // 3
                if saw_palette or saw_idat or color_type in {0, 4} or not length or length % 3 or entries > 256 or (color_type == 3 and entries > 2 ** bit_depth):
                    return False
                saw_palette = True
            elif chunk_type == b"IDAT":
                if ended_idat or (color_type == 3 and not saw_palette):
                    return False
                saw_idat = True
                idat_chunks.append(chunk_data)
            elif chunk_type == b"IEND":
                if length or chunk_end != len(raw):
                    return False
                saw_end = True
                break
            else:
                if saw_idat:
                    ended_idat = True
                if chunk_name[0].isupper():
                    return False
            offset = chunk_end
        if not saw_header or not idat_chunks or not saw_end:
            return False
        row_bytes = (width * PNG_CHANNELS[color_type] * bit_depth + 7) // 8
        expected_length = height * (row_bytes + 1)
        if expected_length > MAX_EMBEDDED_PNG_DECODED_BYTES:
            return False
        decompressor = zlib.decompressobj()
        decoded = decompressor.decompress(b"".join(idat_chunks), expected_length + 1)
        if len(decoded) > expected_length or decompressor.unconsumed_tail:
            return False
        decoded += decompressor.flush(expected_length + 1 - len(decoded))
        if not decompressor.eof or decompressor.unused_data or len(decoded) != expected_length:
            return False
        return all(decoded[row * (row_bytes + 1)] <= 4 for row in range(height))
    except (ValueError, UnicodeDecodeError, zlib.error):
        return False

try:
    svg_path = Path(sys.argv[1])
    size = svg_path.stat().st_size
    if size > MAX_BYTES:
        raise ValueError(f"SVG exceeds {MAX_BYTES} byte validation limit")
    with svg_path.open("rb") as handle:
        data = handle.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError(f"SVG exceeds {MAX_BYTES} byte validation limit")
    lowered = data.lower()
    if b"\\x00" in data:
        raise ValueError("SVG must use a UTF-8-compatible XML encoding")
    if b"<!entity" in lowered:
        raise ValueError("SVG entity declarations are not allowed")
    if b"<!doctype" in lowered:
        if lowered.count(b"<!doctype") != 1 or data.count(DRAWIO_SVG_DOCTYPE) != 1:
            raise ValueError("only the standard draw.io SVG 1.1 DOCTYPE is allowed")
        data = data.replace(DRAWIO_SVG_DOCTYPE, b"", 1)
    root = ET.fromstring(data)
    if local_name(root.tag) != "svg":
        raise ValueError("missing <svg> root")
    if namespace(root.tag) not in {"", SVG_NAMESPACE}:
        raise ValueError("SVG root uses a non-SVG namespace")
    if not stylesheets_supported(root):
        raise ValueError("SVG contains a non-keyframe stylesheet rule")
    element_count = 0
    embedded_svg_images = 0
    embedded_raster_images = 0
    identifiers = {
        str(element.attrib.get("id"))
        for element in root.iter()
        if element.attrib.get("id")
    }
    without_xml_declaration = re.sub(br"^\\s*<\\?xml\\s+[^?]*\\?>", b"", lowered, count=1)
    external_references = 1 if b"<?" in without_xml_declaration else 0
    unsupported_images = 0
    stack = [(root, 1)]
    while stack:
        element, depth = stack.pop()
        element_count += 1
        if element_count > MAX_ELEMENTS:
            raise ValueError(f"SVG exceeds {MAX_ELEMENTS} element validation limit")
        if depth > MAX_DEPTH:
            raise ValueError(f"SVG exceeds {MAX_DEPTH} level validation limit")
        name = local_name(element.tag).lower()
        element_namespace = namespace(element.tag)
        href = element.attrib.get("href") or element.attrib.get(f"{{{XLINK_NAMESPACE}}}href") or ""
        image_sources = [href] if href else []
        is_image_element = name == "image" and element_namespace in {"", SVG_NAMESPACE}
        is_html_image = name in {"img", "source"} and element_namespace != SVG_NAMESPACE
        if is_html_image:
            image_sources.extend(
                value for value in (element.attrib.get("src"), element.attrib.get("srcset")) if value
            )
        if name == "image" and not is_image_element:
            unsupported_images += 1
        elif is_image_element or is_html_image:
            if not image_sources:
                unsupported_images += 1
            for image_source in image_sources:
                source = str(image_source).strip()
                if source.startswith("#"):
                    if not local_fragment_exists(source, identifiers):
                        unsupported_images += 1
                    continue
                embedded_type = valid_embedded_image_source(source)
                if embedded_type == "svg+xml":
                    embedded_svg_images += 1
                elif embedded_type == "png":
                    embedded_raster_images += 1
                elif source.lower().startswith(("http://", "https://", "//")):
                    external_references += 1
                else:
                    unsupported_images += 1
        elif name in {
            "animate", "animatemotion", "animatetransform", "discard", "feimage", "filter", "lineargradient",
            "link", "mpath", "pattern", "radialgradient", "set", "textpath", "use",
        } and href:
            source = str(href).strip()
            if source.startswith("#"):
                if not local_fragment_exists(source, identifiers):
                    unsupported_images += 1
            elif source.lower().startswith("data:"):
                unsupported_images += 1
            else:
                external_references += 1
        if name in {
            "animate", "animatemotion", "animatetransform", "discard", "embed", "frame",
            "iframe", "object", "script", "set",
        }:
            external_references += 1
        for resource_attribute in {
            "audio": ("src",),
            "base": ("href",),
            "frame": ("src",),
            "input": ("src",),
            "track": ("src",),
            "video": ("src", "poster"),
        }.get(name, ()):
            if element.attrib.get(resource_attribute):
                external_references += 1
        if name == "a" and href:
            navigation = str(href).strip().lower()
            if not navigation.startswith(("#", "http://", "https://", "mailto:")):
                external_references += 1
        # draw.io uses external <a href> values only for text-fallback navigation;
        # unlike image/use/feImage/link sources, they do not load diagram assets.
        if name == "style":
            css = "".join(element.itertext())
            external_references += external_css_references(css, True)
            unsupported_images += missing_local_css_references(css, identifiers)
        for raw_name, value in element.attrib.items():
            key = local_name(raw_name).lower()
            literal = str(value).strip().lower()
            if raw_name == f"{{{XML_NAMESPACE}}}base" or str(raw_name).lower() == "xml:base":
                external_references += 1
            if key.startswith("on") or literal.startswith(("javascript:", "vbscript:", "data:text/html")):
                external_references += 1
            external_references += external_css_references(
                value, key == "style"
            )
            unsupported_images += missing_local_css_references(value, identifiers)
        stack.extend((child, depth + 1) for child in reversed(list(element)))
    visible_text, visible_graphics = inspect(root)
    renderable_graphics = 1 if embedded_svg_has_renderable_graphic(root) else 0
    flow_animation = has_flow_animation(root)
    color_scheme = style_map(root.attrib.get("style")).get("color-scheme", "")
    color_scheme_tokens = color_scheme.lower().split()
    svg_theme = (
        color_scheme_tokens[0]
        if len(color_scheme_tokens) == 1 and color_scheme_tokens[0] in {"light", "dark"}
        else "adaptive"
        if len(color_scheme_tokens) == 2 and set(color_scheme_tokens) == {"light", "dark"}
        else ""
    )
    canvas_width = canvas_dimension(root.attrib.get("width"))
    canvas_height = canvas_dimension(root.attrib.get("height"))
    print(json.dumps({
        "visible_text": " ".join(" ".join(visible_text).split()),
        "visible_graphics": visible_graphics,
        "renderable_graphics": renderable_graphics,
        "embedded_svg_images": embedded_svg_images,
        "embedded_raster_images": embedded_raster_images,
        "external_references": external_references,
        "unsupported_images": unsupported_images,
        "flow_animation": flow_animation,
        "theme": svg_theme,
        "canvas_width": canvas_width,
        "canvas_height": canvas_height,
        "size": size,
    }))
except Exception as error:
    print(str(error), file=sys.stderr)
    raise SystemExit(1)
`;
  const result = spawnSync("python3", ["-c", script, file], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: SVG_INSPECTION_TIMEOUT_MS,
  });
  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`SVG inspection exceeded ${SVG_INSPECTION_TIMEOUT_MS}ms timeout`);
  }
  if (result.error) throw new Error(`python3 XML parser failed: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "invalid SVG XML").trim();
    throw new Error(detail);
  }
  try {
    const parsed = JSON.parse(result.stdout);
    return {
      visibleText: parsed.visible_text || "",
      visibleGraphics: Number(parsed.visible_graphics) || 0,
      renderableGraphics: Number(parsed.renderable_graphics) || 0,
      embeddedSvgImages: Number(parsed.embedded_svg_images) || 0,
      embeddedRasterImages: Number(parsed.embedded_raster_images) || 0,
      externalReferences: Number(parsed.external_references) || 0,
      unsupportedImages: Number(parsed.unsupported_images) || 0,
      flowAnimation: Boolean(parsed.flow_animation),
      theme: parsed.theme || "",
      canvasWidth: Number(parsed.canvas_width) || 0,
      canvasHeight: Number(parsed.canvas_height) || 0,
      size: Number(parsed.size) || 0,
    };
  } catch (error) {
    throw new Error(`invalid SVG inspection output: ${error.message}`);
  }
}

export function evaluateAssertion(assertion, artifacts) {
  const matches = matchingArtifacts(artifacts, assertion.glob);
  if (matches.length === 0)
    throw new Error(`${assertion.raw}: no artifact matches ${assertion.glob}`);

  if (assertion.kind === "artifact_exists") return;
  if (assertion.kind === "markdown_image" || assertion.kind === "markdown_link") {
    const artifactPaths = new Set(artifacts.map(({ rel }) => rel));
    matches.forEach(({ file, rel }) => {
      const destinations = markdownDestinations(file);
      const collection =
        assertion.kind === "markdown_image" ? destinations.images : destinations.links;
      if (!collection.has(assertion.target)) {
        throw new Error(`${assertion.raw}: ${rel} lacks the requested Markdown reference`);
      }
      const referencedArtifact = localMarkdownArtifact(rel, assertion.target);
      if (referencedArtifact && !artifactPaths.has(referencedArtifact)) {
        throw new Error(
          `${assertion.raw}: ${rel} references missing artifact ${referencedArtifact}`,
        );
      }
    });
    return;
  }
  if (assertion.kind === "png_dimensions") {
    matches.forEach(({ file, rel }) => {
      const info = decodedPngInfo(file);
      if (info.width < assertion.options.min_width || info.height < assertion.options.min_height) {
        throw new Error(`${assertion.raw}: ${rel} does not meet required dimensions`);
      }
    });
    return;
  }
  if (assertion.kind === "png_nonblank") {
    matches.forEach(({ file, rel }) => {
      const info = decodedPngInfo(file);
      if (
        info.width <= 0 ||
        info.height <= 0 ||
        info.size < assertion.options.min_size ||
        !info.nonblank
      ) {
        throw new Error(`${assertion.raw}: ${rel} failed decoded nonblank pixel check`);
      }
    });
    return;
  }
  if (assertion.kind === "png_pixels_differ") {
    const otherMatches = matchingArtifacts(artifacts, assertion.otherGlob);
    if (matches.length !== 1 || otherMatches.length !== 1) {
      throw new Error(`${assertion.raw}: each PNG glob must match exactly one artifact`);
    }
    const left = decodedPngInfo(matches[0].file);
    const right = decodedPngInfo(otherMatches[0].file);
    if (left.width !== right.width || left.height !== right.height) {
      throw new Error(`${assertion.raw}: PNG dimensions differ`);
    }
    if (left.pixelDigest === right.pixelDigest) {
      throw new Error(`${assertion.raw}: decoded PNG pixels are identical`);
    }
    if (assertion.minChangedBasisPoints > 0) {
      let changedPixels = 0;
      for (let offset = 0; offset < left.canonicalPixels.length; offset += 4) {
        if (
          left.canonicalPixels[offset] !== right.canonicalPixels[offset] ||
          left.canonicalPixels[offset + 1] !== right.canonicalPixels[offset + 1] ||
          left.canonicalPixels[offset + 2] !== right.canonicalPixels[offset + 2] ||
          left.canonicalPixels[offset + 3] !== right.canonicalPixels[offset + 3]
        ) {
          changedPixels += 1;
        }
      }
      const changedPercent = (changedPixels * 100) / (left.width * left.height);
      if (changedPercent < assertion.minChangedBasisPoints / 100) {
        throw new Error(
          `${assertion.raw}: only ${changedPercent.toFixed(3)}% of decoded PNG pixels differ`,
        );
      }
    }
    return;
  }
  if (assertion.kind === "svg_png_dimensions_match") {
    const otherMatches = matchingArtifacts(artifacts, assertion.otherGlob);
    if (matches.length !== 1 || otherMatches.length !== 1) {
      throw new Error(`${assertion.raw}: each SVG/PNG glob must match exactly one artifact`);
    }
    const svg = svgInfo(matches[0].file);
    const png = decodedPngInfo(otherMatches[0].file);
    if (svg.canvasWidth <= 0 || svg.canvasHeight <= 0) {
      throw new Error(`${assertion.raw}: SVG must declare positive px width and height`);
    }
    if (svg.canvasWidth !== png.width || svg.canvasHeight !== png.height) {
      throw new Error(
        `${assertion.raw}: SVG canvas ${svg.canvasWidth}x${svg.canvasHeight} does not match PNG ${png.width}x${png.height}`,
      );
    }
    return;
  }
  if (assertion.kind === "svg_valid") {
    matches.forEach(({ file, rel }) => {
      if (svgInfo(file).renderableGraphics <= 0) {
        throw new Error(`${assertion.raw}: ${rel} has no visible renderable graphic`);
      }
    });
    return;
  }
  if (assertion.kind === "svg_theme") {
    matches.forEach(({ file, rel }) => {
      const actual = svgInfo(file).theme || "unspecified";
      if (actual !== assertion.theme) {
        throw new Error(`${assertion.raw}: ${rel} declares ${actual}, not ${assertion.theme}`);
      }
    });
    return;
  }
  if (assertion.kind === "svg_contains") {
    const needle = assertion.text.toLowerCase().replace(/\s+/g, " ").trim();
    const passing = matches.some(({ file }) =>
      svgInfo(file).visibleText.toLowerCase().replace(/\s+/g, " ").trim().includes(needle),
    );
    if (!passing) throw new Error(`${assertion.raw}: no SVG contains expected visible text`);
    return;
  }
  if (assertion.kind === "svg_not_contains") {
    const needle = assertion.text.toLowerCase().replace(/\s+/g, " ").trim();
    const failing = matches.find(({ file }) =>
      svgInfo(file).visibleText.toLowerCase().replace(/\s+/g, " ").trim().includes(needle),
    );
    if (failing)
      throw new Error(`${assertion.raw}: ${failing.rel} contains forbidden visible text`);
    return;
  }
  if (assertion.kind === "svg_has_flow_animation") {
    matches.forEach(({ file, rel }) => {
      const info = svgInfo(file);
      if (
        !(
          info.renderableGraphics > 0 &&
          info.flowAnimation &&
          info.externalReferences === 0 &&
          info.unsupportedImages === 0
        )
      ) {
        throw new Error(
          `${assertion.raw}: ${rel} lacks active self-contained connector flow animation`,
        );
      }
    });
    return;
  }
  if (assertion.kind === "svg_self_contained_images") {
    matches.forEach(({ file, rel }) => {
      const info = svgInfo(file);
      if (
        info.embeddedSvgImages <= 0 ||
        info.externalReferences !== 0 ||
        info.unsupportedImages !== 0
      ) {
        throw new Error(`${assertion.raw}: ${rel} lacks self-contained embedded SVG images`);
      }
    });
    return;
  }
  if (assertion.kind === "drawio_valid") {
    matches.forEach(({ file }) => assertDrawioValid(file, assertion.options));
    return;
  }
  if (assertion.kind === "drawio_embeds_svg_sha256") {
    matches.forEach(({ file, rel }) => {
      const report = assertDrawioValid(file);
      const pages = Array.isArray(report.pages) ? report.pages : [];
      const hashes = new Set(pages.flatMap((page) => page.embedded_svg_sha256s || []));
      if (!hashes.has(assertion.sha256)) {
        throw new Error(`${assertion.raw}: ${rel} does not embed the expected SVG bytes`);
      }
      if (assertion.cellId) {
        const cellHashes = new Set(pages.flatMap((page) => page.embedded_svg_cell_sha256s || []));
        const expectedCellHash = sha256(`${assertion.cellId}\0${assertion.sha256}`);
        if (!cellHashes.has(expectedCellHash)) {
          throw new Error(
            `${assertion.raw}: ${rel} does not bind the expected SVG bytes to the requested cell`,
          );
        }
      }
    });
    return;
  }
  if (assertion.kind === "drawio_graph") {
    const expectedIds = assertion.ids.map((id) => sha256(id));
    const expectedComponentIds = assertion.componentIds.map((id) => sha256(id));
    const expectedComponentLabels = assertion.componentLabels.map(([id, label]) =>
      sha256(`${id}\0${label}`),
    );
    const expectedNativeIds = assertion.nativeIds.map((id) => sha256(id));
    const expectedEdges = assertion.edges.map(([source, target]) => sha256(`${source}\0${target}`));
    const expectedEdgeBindings = assertion.edgeBindings.map(([edgeId, source, target]) =>
      sha256(`${edgeId}\0${source}\0${target}`),
    );
    const forbiddenEdges = assertion.notEdges.map(([source, target]) =>
      sha256(`${source}\0${target}`),
    );
    const expectedEdgeRoles = assertion.edgeRoles.map(([edgeId, role]) =>
      sha256(`${edgeId}\0${role}`),
    );
    const expectedProfileStyles = assertion.profileStyles.map(([cellId, key, value]) =>
      sha256(`${cellId}\0${key}\0${value}`),
    );
    const expectedLinks = assertion.links.map((link) => sha256(link));
    matches.forEach(({ file, rel }) => {
      const report = assertDrawioValid(file);
      const pages = Array.isArray(report.pages) ? report.pages : [];
      const scopedPage =
        assertion.pageName === null
          ? null
          : pages.find((page) => page.page_name_sha256 === sha256(assertion.pageName));
      if (assertion.pageName !== null && !scopedPage) {
        throw new Error(`${assertion.raw}: ${rel} does not contain the requested page`);
      }
      const graphs = scopedPage ? [scopedPage] : pages;
      const idHashes = new Set(graphs.flatMap((page) => page.cell_id_sha256s || []));
      const componentHashList = graphs.flatMap((page) => page.component_cell_id_sha256s || []);
      const componentHashes = new Set(componentHashList);
      const componentLabelHashes = new Set(
        graphs.flatMap((page) => page.component_label_sha256s || []),
      );
      const nativeIdHashes = new Set(
        graphs.flatMap((page) => page.native_stencil_cell_id_sha256s || []),
      );
      const edgeHashList = graphs.flatMap((page) => page.directed_edge_sha256s || []);
      const edgeHashes = new Set(edgeHashList);
      const edgeBindingHashes = new Set(
        graphs.flatMap((page) => page.directed_edge_identity_sha256s || []),
      );
      const edgeRoleHashes = new Set(graphs.flatMap((page) => page.edge_role_sha256s || []));
      const profileStylesSatisfied =
        expectedProfileStyles.length === 0 ||
        graphs.some((page) => {
          const hashes = new Set(page.profile_style_sha256s || []);
          return expectedProfileStyles.every((digest) => hashes.has(digest));
        });
      const linkHashes = new Set(graphs.flatMap((page) => page.link_sha256s || []));
      if (!expectedIds.every((digest) => idHashes.has(digest))) {
        throw new Error(`${assertion.raw}: ${rel} lacks one or more required cell IDs`);
      }
      if (!expectedComponentIds.every((digest) => componentHashes.has(digest))) {
        throw new Error(`${assertion.raw}: ${rel} lacks one or more required component IDs`);
      }
      if (!expectedComponentLabels.every((digest) => componentLabelHashes.has(digest))) {
        throw new Error(`${assertion.raw}: ${rel} lacks one or more required component labels`);
      }
      if (
        assertion.exactComponents &&
        (componentHashList.length !== expectedComponentIds.length ||
          componentHashes.size !== expectedComponentIds.length)
      ) {
        throw new Error(`${assertion.raw}: ${rel} contains unexpected semantic components`);
      }
      if (!expectedNativeIds.every((digest) => nativeIdHashes.has(digest))) {
        throw new Error(`${assertion.raw}: ${rel} lacks one or more required native stencil IDs`);
      }
      if (!expectedEdges.every((digest) => edgeHashes.has(digest))) {
        throw new Error(`${assertion.raw}: ${rel} lacks one or more required directed edge pairs`);
      }
      if (!expectedEdgeBindings.every((digest) => edgeBindingHashes.has(digest))) {
        throw new Error(
          `${assertion.raw}: ${rel} does not bind one or more edge IDs to the required endpoints`,
        );
      }
      if (
        assertion.exactEdges &&
        (edgeHashList.length !== expectedEdges.length || edgeHashes.size !== expectedEdges.length)
      ) {
        throw new Error(`${assertion.raw}: ${rel} contains unexpected directed edge pairs`);
      }
      if (forbiddenEdges.some((digest) => edgeHashes.has(digest))) {
        throw new Error(`${assertion.raw}: ${rel} contains a forbidden directed edge pair`);
      }
      if (!expectedEdgeRoles.every((digest) => edgeRoleHashes.has(digest))) {
        throw new Error(`${assertion.raw}: ${rel} lacks one or more required edge roles`);
      }
      if (!profileStylesSatisfied) {
        throw new Error(`${assertion.raw}: ${rel} lacks one or more required profile styles`);
      }
      if (!expectedLinks.every((digest) => linkHashes.has(digest))) {
        throw new Error(`${assertion.raw}: ${rel} lacks one or more required links`);
      }
    });
    return;
  }
  if (assertion.kind === "drawio_self_contained_svg") {
    matches.forEach(({ file }) => assertDrawioSelfContainedSvg(file));
  }
}

export function extractVisualAssertionLines(markdown) {
  return bullets(section(markdown, "Visual Assertions"));
}

export function validateVisualEvalCases({ caseFiles, artifacts = null, rootDir = process.cwd() }) {
  let visualCaseCount = 0;
  let assertionCount = 0;
  const errors = [];

  for (const caseFile of caseFiles) {
    const text = fs.readFileSync(caseFile, "utf8");
    const assertions = extractVisualAssertionLines(text);
    if (!assertions.length) continue;
    visualCaseCount += 1;
    const animationModeByGlob = new Map();
    for (const raw of assertions) {
      assertionCount += 1;
      try {
        const parsed = parseAssertion(raw);
        if (parsed.kind === "drawio_valid") {
          const mode = parsed.options.animation_on
            ? "on"
            : parsed.options.animation_off
              ? "off"
              : null;
          const previous = animationModeByGlob.get(parsed.glob);
          if (mode && previous && previous !== mode) {
            throw new Error(
              `drawio_valid cannot require animation_on=1 and animation_off=1 for the same glob ${JSON.stringify(parsed.glob)}`,
            );
          }
          if (mode) animationModeByGlob.set(parsed.glob, mode);
        }
        if (artifacts) evaluateAssertion(parsed, artifacts);
      } catch (error) {
        const rel = path.relative(rootDir, caseFile).replaceAll("\\", "/");
        errors.push(`${rel}: ${raw}: ${error.message}`);
      }
    }
  }

  return { visualCaseCount, assertionCount, errors };
}
