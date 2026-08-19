#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const SEMANTIC_ICON_TOKENS = new Set([
  "actor",
  "cloud",
  "collate",
  "cylinder",
  "cylinder3d",
  "database",
  "document",
  "ellipse",
  "folder",
  "hexagon",
  "note",
  "parallelogram",
  "process",
  "rhombus",
  "tape",
  "triangle",
  "umlactor",
]);
const NON_ICON_MXGRAPH_SHAPE =
  /(^|[._])(container|group|label|line|partialrectangle|rect|rectangle|swimlane|table)([._]|$)/;
const ICON_WRAPPER_SELECTORS = new Map([
  ["mxgraph.aws4.resourceicon", "resIcon"],
  ["mxgraph.kubernetes.icon2", "prIcon"],
]);
const SPLIT_SVG_DATA_URI_RE = /(?:^|;)image=data:image\/svg\+xml;base64,/i;
const MAX_EMBEDDED_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_EMBEDDED_PNG_DIMENSION = 32_768;
const MAX_EMBEDDED_PNG_DECODED_BYTES = 64 * 1024 * 1024;
const MAX_INFLATED_DIAGRAM_BYTES = 64 * 1024 * 1024;
const PNG_BIT_DEPTHS = new Map([
  [0, new Set([1, 2, 4, 8, 16])],
  [2, new Set([8, 16])],
  [3, new Set([1, 2, 4, 8])],
  [4, new Set([8, 16])],
  [6, new Set([8, 16])],
]);
const PNG_CHANNELS = new Map([
  [0, 1],
  [2, 3],
  [3, 1],
  [4, 2],
  [6, 4],
]);
const SVG_NON_RENDERING = new Set([
  "defs",
  "desc",
  "metadata",
  "title",
  "style",
  "script",
  "foreignobject",
  "clippath",
  "mask",
  "pattern",
  "symbol",
]);
const SVG_PAINT_SERVERS = new Set(["lineargradient", "pattern", "radialgradient"]);
const CRC32_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function decodeBase64(payload) {
  const compact = payload.trim();
  if (!compact || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) return null;
  try {
    const decoded = Buffer.from(compact, "base64");
    const canonical = decoded.toString("base64").replace(/=+$/, "");
    return canonical === compact.replace(/=+$/, "") ? decoded : null;
  } catch {
    return null;
  }
}

function decodeEmbeddedImage(source) {
  const match = source.match(/^data:image\/(svg\+xml|png)(;base64)?,(.+)$/is);
  if (!match) return null;
  const mediaType = match[1].toLowerCase();
  const payload = match[3];
  let data = null;
  try {
    if (match[2]) {
      data = decodeBase64(payload);
    } else if (/%[0-9A-Fa-f]{2}/.test(payload)) {
      const chunks = [];
      for (let index = 0; index < payload.length; index += 1) {
        if (
          payload[index] === "%" &&
          /^[0-9A-Fa-f]{2}$/.test(payload.slice(index + 1, index + 3))
        ) {
          chunks.push(Buffer.from([Number.parseInt(payload.slice(index + 1, index + 3), 16)]));
          index += 2;
        } else {
          const codePoint = payload.codePointAt(index);
          chunks.push(Buffer.from(String.fromCodePoint(codePoint), "utf8"));
          if (codePoint > 0xffff) index += 1;
        }
      }
      data = Buffer.concat(chunks);
    } else if (mediaType === "svg+xml" && payload.trimStart().startsWith("<")) {
      data = Buffer.from(payload, "utf8");
    } else {
      data = decodeBase64(payload);
    }
  } catch {
    return null;
  }
  return data && data.length > 0 && data.length <= MAX_EMBEDDED_IMAGE_BYTES
    ? { mediaType, data }
    : null;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function validPng(data) {
  if (data.length < 45 || !data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    return false;
  }
  let offset = 8;
  let sawHeader = false;
  let sawPalette = false;
  let sawIdat = false;
  let endedIdat = false;
  let sawEnd = false;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > data.length) return false;
    const body = data.subarray(offset + 8, offset + 8 + length);
    if (crc32(Buffer.concat([type, body])) !== data.readUInt32BE(offset + 8 + length)) return false;
    const name = type.toString("ascii");
    if (!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(name)) return false;
    if (!sawHeader) {
      if (name !== "IHDR" || length !== 13) {
        return false;
      }
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colorType = body[9];
      if (
        width === 0 ||
        height === 0 ||
        width > MAX_EMBEDDED_PNG_DIMENSION ||
        height > MAX_EMBEDDED_PNG_DIMENSION ||
        !PNG_BIT_DEPTHS.get(colorType)?.has(bitDepth) ||
        body[10] !== 0 ||
        body[11] !== 0 ||
        body[12] !== 0
      ) {
        return false;
      }
      sawHeader = true;
    } else if (name === "IHDR") {
      return false;
    } else if (name === "PLTE") {
      const entries = length / 3;
      if (
        sawPalette ||
        sawIdat ||
        colorType === 0 ||
        colorType === 4 ||
        length === 0 ||
        length % 3 !== 0 ||
        entries > 256 ||
        (colorType === 3 && entries > 2 ** bitDepth)
      ) {
        return false;
      }
      sawPalette = true;
    } else if (name === "IDAT") {
      if (endedIdat || (colorType === 3 && !sawPalette)) return false;
      sawIdat = true;
      idat.push(body);
    } else if (name === "IEND") {
      if (length !== 0 || end !== data.length) return false;
      sawEnd = true;
      break;
    } else {
      if (sawIdat) endedIdat = true;
      if (/^[A-Z]/.test(name)) return false;
    }
    offset = end;
  }
  if (!sawHeader || idat.length === 0 || !sawEnd) return false;
  const channels = PNG_CHANNELS.get(colorType);
  const rowBytes = Math.ceil((width * channels * bitDepth) / 8);
  const expectedLength = height * (rowBytes + 1);
  if (!Number.isSafeInteger(expectedLength) || expectedLength > MAX_EMBEDDED_PNG_DECODED_BYTES) {
    return false;
  }
  try {
    const compressed = Buffer.concat(idat);
    const inflated = zlib.inflateSync(compressed, {
      info: true,
      maxOutputLength: expectedLength + 1,
    });
    const decoded = inflated.buffer;
    if (inflated.engine.bytesWritten !== compressed.length) return false;
    if (decoded.length !== expectedLength) return false;
    for (let row = 0; row < height; row += 1) {
      if (decoded[row * (rowBytes + 1)] > 4) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function svgLocalName(name = "") {
  return name.split(":").at(-1).toLowerCase();
}

function svgTagEnd(text, start) {
  let quote = "";
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return index;
    }
  }
  return -1;
}

function parseSvgTree(text) {
  const document = { name: "#document", attrs: {}, children: [], text: "" };
  const stack = [document];
  let cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf("<", cursor);
    if (open === -1) {
      stack.at(-1).text += text.slice(cursor);
      break;
    }
    stack.at(-1).text += text.slice(cursor, open);
    if (text.startsWith("<!--", open)) {
      const close = text.indexOf("-->", open + 4);
      if (close === -1) return null;
      cursor = close + 3;
      continue;
    }
    if (text.startsWith("<?", open)) {
      const close = text.indexOf("?>", open + 2);
      if (close === -1) return null;
      cursor = close + 2;
      continue;
    }
    if (text.startsWith("<!", open)) return null;
    const close = svgTagEnd(text, open + 1);
    if (close === -1) return null;
    const token = text.slice(open + 1, close).trim();
    if (token.startsWith("/")) {
      const name = token.slice(1).trim();
      if (stack.length === 1 || stack.at(-1).name !== name) return null;
      stack.pop();
    } else {
      const selfClosing = token.endsWith("/");
      const body = selfClosing ? token.slice(0, -1).trim() : token;
      const match = body.match(/^([^\s/>]+)([\s\S]*)$/);
      if (!match) return null;
      const node = {
        name: match[1],
        attrs: parseAttrs(match[2]),
        children: [],
        text: "",
      };
      stack.at(-1).children.push(node);
      if (!selfClosing) stack.push(node);
    }
    cursor = close + 1;
  }
  if (stack.length !== 1 || document.children.length !== 1 || document.text.trim()) return null;
  return document.children[0];
}

function svgNumber(value, fallback = 0) {
  const match = String(value ?? "").match(
    /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)(?:[A-Za-z%]+)?\s*$/,
  );
  const number = match ? Number(match[1]) : fallback;
  return Number.isFinite(number) ? number : fallback;
}

function svgStyle(node, inherited = null) {
  const style = {
    ...(inherited || {
      color: "black",
      fill: "black",
      "fill-opacity": "1",
      "font-size": "16",
      opacity: "1",
      stroke: "none",
      "stroke-linecap": "butt",
      "stroke-opacity": "1",
      "stroke-width": "1",
      visibility: "visible",
    }),
  };
  const inline = {};
  for (const token of String(node.attrs.style || "").split(";")) {
    const [key, ...rest] = token.split(":");
    if (rest.length) inline[key.trim().toLowerCase()] = rest.join(":").trim();
  }
  for (const key of Object.keys(style)) {
    const value = inline[key] || node.attrs[key];
    if (value && String(value).toLowerCase() !== "inherit") {
      const literal = String(value).trim();
      style[key] =
        ["fill", "stroke"].includes(key) && /^url\(/i.test(literal)
          ? literal
          : literal.toLowerCase();
    }
  }
  style.display = String(inline.display || node.attrs.display || "").toLowerCase();
  return style;
}

function svgZeroOpacity(value) {
  const literal = String(value || "")
    .trim()
    .toLowerCase();
  const number = Number(literal.replace(/%$/, ""));
  return Number.isFinite(number) && number / (literal.endsWith("%") ? 100 : 1) <= 0;
}

function svgColorVisible(value, paintServers) {
  const raw = String(value || "").trim();
  const localPaint = raw.match(/^url\(\s*(['"]?)#([^'")]+)\1\s*\)$/i);
  if (localPaint) {
    let fragment;
    try {
      fragment = decodeURIComponent(localPaint[2]);
    } catch {
      return false;
    }
    const server = fragment ? paintServers?.get(fragment) : null;
    return Boolean(server && SVG_PAINT_SERVERS.has(svgLocalName(server.name)));
  }
  const literal = raw.replace(/\s+/g, "").toLowerCase();
  if (!literal || ["none", "transparent"].includes(literal)) return false;
  if (/^#[0-9a-f]{4}$/.test(literal)) return literal.at(-1) !== "0";
  if (/^#[0-9a-f]{8}$/.test(literal)) return !literal.endsWith("00");
  const alpha = literal.match(/^(?:rgba|hsla)\(.*,([^,)]*)\)$/);
  return !(alpha && svgZeroOpacity(alpha[1]));
}

function svgPaintVisible(style, { fill = true, stroke = true } = {}, paintServers = null) {
  const fillColor = style.fill === "currentcolor" ? style.color : style.fill;
  const strokeColor = style.stroke === "currentcolor" ? style.color : style.stroke;
  return (
    (fill && svgColorVisible(fillColor, paintServers) && !svgZeroOpacity(style["fill-opacity"])) ||
    (stroke &&
      svgColorVisible(strokeColor, paintServers) &&
      !svgZeroOpacity(style["stroke-opacity"]) &&
      svgNumber(style["stroke-width"], 1) > 0)
  );
}

function svgPointPairs(value) {
  const numbers = [
    ...String(value || "").matchAll(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[Ee][-+]?\d+)?/g),
  ].map((match) => Number(match[0]));
  if (numbers.length % 2 || numbers.some((number) => !Number.isFinite(number))) return [];
  return Array.from({ length: numbers.length / 2 }, (_, index) => [
    numbers[index * 2],
    numbers[index * 2 + 1],
  ]);
}

function svgPointsHaveArea(points) {
  if (!points.length) return false;
  const origin = points[0];
  const direction = points
    .slice(1)
    .find((point) => point[0] !== origin[0] || point[1] !== origin[1]);
  if (!direction) return false;
  const first = [direction[0] - origin[0], direction[1] - origin[1]];
  return points
    .slice(1)
    .some((point) => first[0] * (point[1] - origin[1]) !== first[1] * (point[0] - origin[0]));
}

function svgPathGeometry(value) {
  const data = String(value || "").trim();
  if (!data) return [false, false, false];
  const arity = new Map([
    ["m", 2],
    ["l", 2],
    ["h", 1],
    ["v", 1],
    ["c", 6],
    ["s", 4],
    ["q", 4],
    ["t", 2],
    ["a", 7],
  ]);
  const commandPattern = /^[MmZzLlHhVvCcSsQqTtAa]$/;
  const numberPattern = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[Ee][-+]?\d+)?/y;
  let index = 0;
  let command = null;
  let relative = false;
  let sawCommand = false;
  let drewSegment = false;
  let drewZeroLengthSegment = false;
  let fillable = false;
  let current = [0, 0];
  let subpathStart = null;
  let fillDirection = null;

  const recordFillPoint = (candidate) => {
    if (!subpathStart || (candidate[0] === subpathStart[0] && candidate[1] === subpathStart[1])) {
      return;
    }
    if (!fillDirection) {
      fillDirection = [...candidate];
      return;
    }
    const first = [fillDirection[0] - subpathStart[0], fillDirection[1] - subpathStart[1]];
    const next = [candidate[0] - subpathStart[0], candidate[1] - subpathStart[1]];
    if (first[0] * next[1] !== first[1] * next[0]) fillable = true;
  };

  const skipWhitespace = () => {
    while (index < data.length && /\s/.test(data[index])) index += 1;
  };
  const consumeSeparator = (allowComma) => {
    skipWhitespace();
    if (data[index] === ",") {
      if (!allowComma) return false;
      index += 1;
      skipWhitespace();
    }
    return true;
  };

  while (index < data.length) {
    skipWhitespace();
    if (index >= data.length) break;
    if (commandPattern.test(data[index])) {
      const rawCommand = data[index];
      command = rawCommand.toLowerCase();
      relative = rawCommand === rawCommand.toLowerCase();
      if (!sawCommand && command !== "m") return [false, false, false];
      sawCommand = true;
      index += 1;
      if (command === "z") {
        if (subpathStart) {
          drewSegment ||= current[0] !== subpathStart[0] || current[1] !== subpathStart[1];
          current = [...subpathStart];
        }
        command = null;
        continue;
      }
    } else if (!command) {
      return [false, false, false];
    }

    const parameterCount = arity.get(command);
    if (!parameterCount) return [false, false, false];
    let groupCount = 0;
    while (true) {
      const values = [];
      for (let parameter = 0; parameter < parameterCount; parameter += 1) {
        if (!consumeSeparator(parameter > 0 || groupCount > 0)) return [false, false, false];
        if (index >= data.length || commandPattern.test(data[index])) return [false, false, false];
        if (command === "a" && (parameter === 3 || parameter === 4)) {
          if (data[index] !== "0" && data[index] !== "1") return [false, false, false];
          values.push(data[index]);
          index += 1;
        } else {
          numberPattern.lastIndex = index;
          const match = numberPattern.exec(data);
          if (!match || !Number.isFinite(Number(match[0]))) return [false, false, false];
          values.push(match[0]);
          index = numberPattern.lastIndex;
        }
      }
      if (command === "a" && (Number(values[0]) < 0 || Number(values[1]) < 0)) {
        return [false, false, false];
      }
      const numbers = values.map(Number);
      const origin = [...current];
      const point = (x, y) => (relative ? [origin[0] + x, origin[1] + y] : [x, y]);
      const differs = (candidate) => candidate[0] !== current[0] || candidate[1] !== current[1];
      if (command === "m") {
        const endpoint = point(numbers[0], numbers[1]);
        if (groupCount === 0) {
          subpathStart = [...endpoint];
          fillDirection = null;
        } else {
          drewSegment ||= differs(endpoint);
          drewZeroLengthSegment ||= !differs(endpoint);
          recordFillPoint(endpoint);
        }
        current = endpoint;
      } else if (["l", "t"].includes(command)) {
        const endpoint = point(numbers[0], numbers[1]);
        drewSegment ||= differs(endpoint);
        drewZeroLengthSegment ||= !differs(endpoint);
        recordFillPoint(endpoint);
        current = endpoint;
      } else if (command === "h") {
        const endpoint = relative ? [origin[0] + numbers[0], origin[1]] : [numbers[0], origin[1]];
        drewSegment ||= differs(endpoint);
        drewZeroLengthSegment ||= !differs(endpoint);
        recordFillPoint(endpoint);
        current = endpoint;
      } else if (command === "v") {
        const endpoint = relative ? [origin[0], origin[1] + numbers[0]] : [origin[0], numbers[0]];
        drewSegment ||= differs(endpoint);
        drewZeroLengthSegment ||= !differs(endpoint);
        recordFillPoint(endpoint);
        current = endpoint;
      } else if (command === "c") {
        const points = [
          point(numbers[0], numbers[1]),
          point(numbers[2], numbers[3]),
          point(numbers[4], numbers[5]),
        ];
        const hasExtent = points.some(differs);
        drewSegment ||= hasExtent;
        drewZeroLengthSegment ||= !hasExtent;
        points.forEach(recordFillPoint);
        current = points[2];
      } else if (["s", "q"].includes(command)) {
        const points = [point(numbers[0], numbers[1]), point(numbers[2], numbers[3])];
        const hasExtent = points.some(differs);
        drewSegment ||= hasExtent;
        drewZeroLengthSegment ||= !hasExtent;
        points.forEach(recordFillPoint);
        current = points[1];
      } else if (command === "a") {
        const endpoint = point(numbers[5], numbers[6]);
        drewSegment ||= differs(endpoint);
        drewZeroLengthSegment ||= !differs(endpoint);
        if (numbers[0] > 0 && numbers[1] > 0 && differs(endpoint)) fillable = true;
        recordFillPoint(endpoint);
        current = endpoint;
      }
      groupCount += 1;

      skipWhitespace();
      if (index >= data.length) return [drewSegment, fillable, drewZeroLengthSegment];
      if (commandPattern.test(data[index])) break;
    }
  }
  return [sawCommand && drewSegment, sawCommand && fillable, sawCommand && drewZeroLengthSegment];
}

function svgText(node) {
  return `${node.text}${node.children.map(svgText).join("")}`;
}

function svgHasRenderableGraphic(root) {
  const byId = new Map();
  const index = (node) => {
    if (node.attrs.id) byId.set(node.attrs.id, node);
    node.children.forEach(index);
  };
  index(root);
  const paintVisible = (style, options) => svgPaintVisible(style, options, byId);

  const visit = (node, inherited = null, resolving = new Set(), referenced = false) => {
    const name = svgLocalName(node.name);
    const style = svgStyle(node, inherited);
    if (
      style.display === "none" ||
      ["hidden", "collapse"].includes(style.visibility) ||
      svgZeroOpacity(style.opacity)
    ) {
      return false;
    }
    if (SVG_NON_RENDERING.has(name) && !(referenced && name === "symbol")) return false;
    if (name === "use") {
      const href = node.attrs.href || node.attrs["xlink:href"] || "";
      let fragment = "";
      try {
        fragment = href.startsWith("#") ? decodeURIComponent(href.slice(1)) : "";
      } catch {
        return false;
      }
      if (!fragment || resolving.has(fragment) || !byId.has(fragment)) return false;
      return visit(byId.get(fragment), style, new Set([...resolving, fragment]), true);
    }
    if (name === "path") {
      const [hasSegment, hasFillArea, hasZeroLengthSegment] = svgPathGeometry(node.attrs.d);
      if (hasSegment) return paintVisible(style, { fill: hasFillArea, stroke: true });
      if (hasZeroLengthSegment && ["round", "square"].includes(style["stroke-linecap"])) {
        return paintVisible(style, { fill: false, stroke: true });
      }
    } else if (name === "rect") {
      if (svgNumber(node.attrs.width) > 0 && svgNumber(node.attrs.height) > 0)
        return paintVisible(style);
    } else if (name === "circle") {
      if (svgNumber(node.attrs.r) > 0) return paintVisible(style);
    } else if (name === "ellipse") {
      if (svgNumber(node.attrs.rx) > 0 && svgNumber(node.attrs.ry) > 0) return paintVisible(style);
    } else if (name === "line") {
      const start = [svgNumber(node.attrs.x1), svgNumber(node.attrs.y1)];
      const end = [svgNumber(node.attrs.x2), svgNumber(node.attrs.y2)];
      if (start[0] !== end[0] || start[1] !== end[1]) return paintVisible(style, { fill: false });
    } else if (name === "polyline" || name === "polygon") {
      const points = svgPointPairs(node.attrs.points);
      const distinct = new Set(points.map((point) => point.join(","))).size;
      if (distinct >= 2) {
        return paintVisible(style, { fill: svgPointsHaveArea(points), stroke: true });
      }
    } else if (name === "text") {
      if (svgText(node).trim() && svgNumber(style["font-size"], 16) > 0) return paintVisible(style);
    }
    if (
      ["path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text"].includes(name)
    ) {
      return false;
    }
    return node.children.some((child) => visit(child, style, resolving));
  };
  return visit(root);
}

function isValidEmbeddedImage(source) {
  const decoded = decodeEmbeddedImage(source);
  if (!decoded || decoded.data.length === 0) return false;
  const { mediaType, data } = decoded;
  if (mediaType === "svg+xml") {
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(data).replace(/^\uFEFF/, "");
    } catch {
      return false;
    }
    const root = parseSvgTree(text);
    if (!root || svgLocalName(root.name) !== "svg") return false;
    const namespace = root.attrs.xmlns;
    const viewBox = String(root.attrs.viewBox || root.attrs.viewbox || "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    const hasBounds =
      (viewBox.length === 4 &&
        viewBox.every(Number.isFinite) &&
        viewBox[2] > 0 &&
        viewBox[3] > 0) ||
      (svgNumber(root.attrs.width) > 0 && svgNumber(root.attrs.height) > 0);
    return (
      (!namespace || namespace === "http://www.w3.org/2000/svg") &&
      hasBounds &&
      svgHasRenderableGraphic(root)
    );
  }
  return validPng(data);
}

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
  const compact = payload.replace(/\s+/g, "");
  const compressed = decodeBase64(compact);
  if (!compressed) throw new Error("compressed diagram payload is not valid base64");
  const inflated = zlib.inflateRawSync(compressed, {
    info: true,
    maxOutputLength: MAX_INFLATED_DIAGRAM_BYTES + 1,
  });
  if (inflated.buffer.length > MAX_INFLATED_DIAGRAM_BYTES) {
    throw new Error("compressed diagram exceeds the 64 MiB inflated-size limit");
  }
  if (inflated.engine.bytesWritten !== compressed.length) {
    throw new Error("compressed diagram has trailing deflate data");
  }
  return decodeURIComponent(inflated.buffer.toString("utf8"));
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
    const points = parseWaypoints(body);
    const offset = parseGeometryOffset(body);
    const parsedStyle = styleMap(attrs.style || "");
    cells.push({
      attrs,
      body,
      geo: geoAttrs,
      offset,
      points,
      style: parsedStyle,
    });
  }
  return cells;
}

function parseWaypoints(body = "") {
  const points = [];
  const arrayRe = /<Array\b([^>]*)>([\s\S]*?)<\/Array>/g;
  for (const arrayMatch of body.matchAll(arrayRe)) {
    const arrayAttrs = parseAttrs(arrayMatch[1]);
    if (arrayAttrs.as !== "points") continue;
    for (const pointMatch of arrayMatch[2].matchAll(/<mxPoint\b([^>]*?)\/?>/g)) {
      const attrs = parseAttrs(pointMatch[1]);
      const x = number(attrs.x);
      const y = number(attrs.y);
      if (x != null && y != null) points.push({ x, y });
    }
  }
  return points;
}

function parseGeometryOffset(body = "") {
  for (const pointMatch of body.matchAll(/<mxPoint\b([^>]*?)\/?>/g)) {
    const attrs = parseAttrs(pointMatch[1]);
    if (attrs.as !== "offset") continue;
    return { x: number(attrs.x) || 0, y: number(attrs.y) || 0 };
  }
  return { x: 0, y: 0 };
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

function absoluteBbox(cell, byId, seen = new Set(), depth = 0) {
  const box = bbox(cell);
  if (!box) return null;
  const id = cell.attrs.id || "";
  if (depth >= 20 || seen.has(id)) return box;
  const parent = byId.get(cell.attrs.parent || "");
  if (!parent || ["0", "1"].includes(parent.attrs.id)) return box;
  const nextSeen = new Set(seen);
  if (id) nextSeen.add(id);
  const parentBox = absoluteBbox(parent, byId, nextSeen, depth + 1);
  if (!parentBox) return box;
  if (cell.geo.relative === "1") {
    return {
      ...box,
      x: parentBox.x + box.x * parentBox.width + cell.offset.x,
      y: parentBox.y + box.y * parentBox.height + cell.offset.y,
    };
  }
  return { ...box, x: parentBox.x + box.x, y: parentBox.y + box.y };
}

function portPoint(box, style, prefix) {
  const x = number(style[`${prefix}X`]);
  const y = number(style[`${prefix}Y`]);
  if (x == null || y == null) return center(box);
  return {
    x: box.x + box.width * x,
    y: box.y + box.height * y,
  };
}

function edgeParentOrigin(edge, byId) {
  const parent = byId.get(edge.attrs.parent || "");
  if (!parent || ["0", "1"].includes(parent.attrs.id)) return { x: 0, y: 0 };
  const parentBox = absoluteBbox(parent, byId);
  return parentBox ? { x: parentBox.x, y: parentBox.y } : { x: 0, y: 0 };
}

function routePoints(edge, sourceBox, targetBox, byId, sourceUsesPort, targetUsesPort) {
  const start = sourceUsesPort ? center(sourceBox) : portPoint(sourceBox, edge.style, "exit");
  const end = targetUsesPort ? center(targetBox) : portPoint(targetBox, edge.style, "entry");
  const origin = edgeParentOrigin(edge, byId);
  const points = edge.points.map((point) => ({
    x: point.x + origin.x,
    y: point.y + origin.y,
  }));
  return [start, ...points, end];
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

function isIconLike(cell) {
  if (cell.attrs.vertex !== "1") return false;
  const rawStyle = cell.attrs.style || "";
  const flags = new Set(
    rawStyle
      .split(";")
      .filter((token) => token && !token.includes("="))
      .map((token) => token.toLowerCase()),
  );
  const shape = (cell.style.shape || "").toLowerCase();
  const isImage = flags.has("image") || shape === "image";
  if (isImage) {
    return !SPLIT_SVG_DATA_URI_RE.test(rawStyle) && isValidEmbeddedImage(cell.style.image || "");
  }
  if ([...flags].some((flag) => SEMANTIC_ICON_TOKENS.has(flag))) {
    return true;
  }

  if (!shape) return false;
  if (shape.startsWith("mxgraph.")) {
    const selector = ICON_WRAPPER_SELECTORS.get(shape);
    if (selector) return Boolean(cell.style[selector]);
    return !NON_ICON_MXGRAPH_SHAPE.test(shape);
  }
  return SEMANTIC_ICON_TOKENS.has(shape);
}

function isImageCell(cell) {
  const shape = (cell.style.shape || "").toLowerCase();
  if (shape === "image") return true;
  return (cell.attrs.style || "")
    .split(";")
    .some((token) => token.trim().toLowerCase() === "image");
}

function hasComponentIcon(component, cells) {
  if (isIconLike(component)) return true;
  const componentId = component.attrs.id;
  return cells.some(
    (cell) =>
      componentId &&
      cell.attrs.parent === componentId &&
      cell.attrs.vertex === "1" &&
      cell.style.dataRole === "icon" &&
      isIconLike(cell),
  );
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
      const sourcePortId = cell.style.sourcePort || "";
      const targetPortId = cell.style.targetPort || "";
      const sourcePort = sourcePortId ? byId.get(sourcePortId) : null;
      const targetPort = targetPortId ? byId.get(targetPortId) : null;
      for (const [role, portId, port] of [
        ["sourcePort", sourcePortId, sourcePort],
        ["targetPort", targetPortId, targetPort],
      ]) {
        if (portId && (!port || port.attrs.vertex !== "1")) {
          errors.push(
            `ERROR [${cellRef(page, id)}] ${role}=${JSON.stringify(portId)} must reference a vertex`,
          );
        }
      }
      const source = sourcePort || byId.get(cell.attrs.source);
      const target = targetPort || byId.get(cell.attrs.target);
      const sourceBox = source ? absoluteBbox(source, byId) : null;
      const targetBox = target ? absoluteBbox(target, byId) : null;
      if (!source || !target || !sourceBox || !targetBox) continue;
      const route = routePoints(
        cell,
        sourceBox,
        targetBox,
        byId,
        Boolean(sourcePort),
        Boolean(targetPort),
      );
      for (const obstacle of cells) {
        const oid = obstacle.attrs.id;
        if (
          !oid ||
          oid === cell.attrs.source ||
          oid === cell.attrs.target ||
          oid === sourcePortId ||
          oid === targetPortId ||
          !isObstacle(obstacle)
        ) {
          continue;
        }
        const obstacleBox = absoluteBbox(obstacle, byId);
        if (!obstacleBox) continue;
        const crossesObstacle = route
          .slice(1)
          .some((point, index) => segmentIntersectsBox(route[index], point, obstacleBox, 4));
        if (crossesObstacle) {
          warnings.push(
            `WARN  [${cellRef(page, id)}] probable connector route crosses ${oid}; use side ports, branch waypoints between elements, or relayout so arrows do not overlap text boxes`,
          );
          break;
        }
      }
    }

    if (cell.attrs.vertex === "1" && isImageCell(cell)) {
      if (SPLIT_SVG_DATA_URI_RE.test(cell.attrs.style || "")) {
        warnings.push(
          `WARN  [${cellRef(page, id)}] SVG data URI uses a ;base64 style delimiter; use percent-encoded SVG or draw.io's marker-less base64 form so the icon is not truncated`,
        );
      }
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

    if (
      cell.attrs.vertex === "1" &&
      cell.style.dataRole === "component" &&
      !hasComponentIcon(cell, cells)
    ) {
      warnings.push(
        `WARN  [${cellRef(page, id)}] component has no icon/logo; use an icon-like native/service shape or add a dataRole=icon child`,
      );
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
