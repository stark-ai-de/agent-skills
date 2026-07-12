import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const SUPPORTED_VISUAL_ASSERTION_KINDS = new Set([
  "artifact_exists",
  "png_dimensions",
  "png_nonblank",
  "svg_valid",
  "svg_contains",
  "svg_not_contains",
]);
const MAX_PNG_FILE_BYTES = 64 * 1024 * 1024;
const MAX_PNG_DIMENSION = 32768;
const MAX_PNG_PIXELS = 16_000_000;
const MAX_PNG_DECODED_BYTES = 256 * 1024 * 1024;
const MAX_SVG_FILE_BYTES = 16 * 1024 * 1024;
const MAX_SVG_ELEMENTS = 20_000;
const MAX_SVG_DEPTH = 128;
const SVG_INSPECTION_TIMEOUT_MS = 5_000;
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
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
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

function pngPixelSample(row, x, bitDepth, pixelStride) {
  if (bitDepth >= 8) {
    const start = x * pixelStride;
    return row.subarray(start, start + pixelStride).toString("hex");
  }
  const bitOffset = x * bitDepth;
  const byte = row[Math.floor(bitOffset / 8)];
  const shift = 8 - bitDepth - (bitOffset % 8);
  const mask = (1 << bitDepth) - 1;
  return String((byte >> shift) & mask);
}

function sampleHasValue(bytes) {
  return bytes.some((byte) => byte !== 0);
}

function sampleEquals(bytes, expected) {
  if (!expected || bytes.length !== expected.length) return false;
  return bytes.every((byte, index) => byte === expected[index]);
}

function pngVisiblePixelSample(row, x, bitDepth, colorType, pixelStride, transparency) {
  if (bitDepth >= 8) {
    const start = x * pixelStride;
    const bytesPerSample = Math.ceil(bitDepth / 8);
    if (colorType === 0) {
      const sample = row.subarray(start, start + bytesPerSample);
      if (sampleEquals(sample, transparency?.grayscale)) return null;
      return sample.toString("hex");
    }
    if (colorType === 2) {
      const sample = row.subarray(start, start + 3 * bytesPerSample);
      if (sampleEquals(sample, transparency?.rgb)) return null;
      return sample.toString("hex");
    }
    if (colorType === 3) {
      const index = row[start];
      const alpha = transparency?.palette?.[index];
      if (alpha === 0) return null;
      const color = transparency?.paletteColors?.subarray(index * 3, index * 3 + 3);
      if (!color || color.length !== 3)
        throw new Error(`indexed PNG uses missing palette entry ${index}`);
      return `${color.toString("hex")}:${alpha ?? 255}`;
    }
    if (colorType === 4) {
      const alphaStart = start + bytesPerSample;
      const alpha = row.subarray(alphaStart, alphaStart + bytesPerSample);
      if (!sampleHasValue(alpha)) return null;
      return row.subarray(start, alphaStart).toString("hex");
    }
    if (colorType === 6) {
      const alphaStart = start + 3 * bytesPerSample;
      const alpha = row.subarray(alphaStart, alphaStart + bytesPerSample);
      if (!sampleHasValue(alpha)) return null;
      return row.subarray(start, alphaStart).toString("hex");
    }
    return row.subarray(start, start + pixelStride).toString("hex");
  }
  if (colorType === 0) {
    const sample = pngPixelSample(row, x, bitDepth, pixelStride);
    if (transparency?.grayscaleValue != null && sample === String(transparency.grayscaleValue))
      return null;
    return sample;
  }
  if (colorType === 3) {
    const index = Number(pngPixelSample(row, x, bitDepth, pixelStride));
    const alpha = transparency?.palette?.[index];
    if (alpha === 0) return null;
    const color = transparency?.paletteColors?.subarray(index * 3, index * 3 + 3);
    if (!color || color.length !== 3)
      throw new Error(`indexed PNG uses missing palette entry ${index}`);
    return `${color.toString("hex")}:${alpha ?? 255}`;
  }
  return pngPixelSample(row, x, bitDepth, pixelStride);
}

function pngTransparencySampleBytes(data, bitDepth, sampleIndex) {
  const bytesPerSample = Math.ceil(bitDepth / 8);
  const sampleStart = sampleIndex * 2;
  return Buffer.from(data.subarray(sampleStart + 2 - bytesPerSample, sampleStart + 2));
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
        transparency.grayscale = pngTransparencySampleBytes(data, bitDepth, 0);
        transparency.grayscaleValue = data.readUInt16BE(0);
      } else if (colorType === 2) {
        if (length !== 6) throw new Error("invalid PNG tRNS length for truecolor image");
        transparency.rgb = Buffer.concat([
          pngTransparencySampleBytes(data, bitDepth, 0),
          pngTransparencySampleBytes(data, bitDepth, 1),
          pngTransparencySampleBytes(data, bitDepth, 2),
        ]);
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
  const pixelStride = bitDepth >= 8 ? filterStride : 1;
  const passes =
    interlaceMethod === 0
      ? [{ width, height }]
      : ADAM7_PASSES.map(([startX, startY, stepX, stepY]) => ({
          width: width > startX ? Math.ceil((width - startX) / stepX) : 0,
          height: height > startY ? Math.ceil((height - startY) / stepY) : 0,
        })).filter((pass) => pass.width > 0 && pass.height > 0);
  const expectedLength = passes.reduce(
    (total, pass) => total + pass.height * (Math.ceil((pass.width * bitsPerPixel) / 8) + 1),
    0,
  );
  if (expectedLength > MAX_PNG_DECODED_BYTES) {
    throw new Error(`PNG decoded data exceeds ${MAX_PNG_DECODED_BYTES} byte validation limit`);
  }
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks), {
    maxOutputLength: expectedLength + 1,
  });
  if (inflated.length !== expectedLength) {
    throw new Error("PNG IDAT data length does not match image rows");
  }

  let inOffset = 0;
  const distinctPixels = new Set();
  const visibleDistinctPixels = new Set();
  let visiblePixelCount = 0;
  let transparentPixelCount = 0;

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
        if (distinctPixels.size < 2) {
          distinctPixels.add(pngPixelSample(row, x, bitDepth, pixelStride));
        }
        const visibleSample = pngVisiblePixelSample(
          row,
          x,
          bitDepth,
          colorType,
          pixelStride,
          transparency,
        );
        if (visibleSample == null) transparentPixelCount += 1;
        else {
          visiblePixelCount += 1;
          if (visibleDistinctPixels.size < 2) visibleDistinctPixels.add(visibleSample);
        }
      }
      previous = row;
    }
  }

  const nonblank =
    transparentPixelCount > 0 ? visiblePixelCount > 0 : visibleDistinctPixels.size > 1;
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
  };
}

export function svgInfo(file) {
  const script = `
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

MAX_BYTES = ${MAX_SVG_FILE_BYTES}
MAX_ELEMENTS = ${MAX_SVG_ELEMENTS}
MAX_DEPTH = ${MAX_SVG_DEPTH}
NON_RENDERING = {"defs", "metadata", "title", "desc", "style", "script", "clipPath", "mask", "pattern", "symbol"}
GRAPHICS = {"path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "image", "use", "text", "textPath", "tspan", "foreignObject"}
TEXT_CONTEXT = {"text", "textPath", "tspan", "foreignObject"}
PAINTED_TEXT = {"text", "textPath", "tspan"}

def local_name(tag):
    return str(tag).rsplit("}", 1)[-1].split(":")[-1]

def style_map(value):
    result = {}
    for token in str(value or "").split(";"):
        key, separator, item = token.partition(":")
        if separator:
            result[key.strip().lower()] = item.strip().lower()
    return result

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
        "stroke-width": "1",
        "fill-opacity": "1",
        "stroke-opacity": "1",
    })
    styles = style_map(element.attrib.get("style"))
    for key in ("color", "fill", "font-size", "stroke", "stroke-width", "fill-opacity", "stroke-opacity"):
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
    if b"<!doctype" in lowered or b"<!entity" in lowered:
        raise ValueError("SVG DOCTYPE and entity declarations are not allowed")
    root = ET.fromstring(data)
    if local_name(root.tag) != "svg":
        raise ValueError("missing <svg> root")
    element_count = 0
    stack = [(root, 1)]
    while stack:
        element, depth = stack.pop()
        element_count += 1
        if element_count > MAX_ELEMENTS:
            raise ValueError(f"SVG exceeds {MAX_ELEMENTS} element validation limit")
        if depth > MAX_DEPTH:
            raise ValueError(f"SVG exceeds {MAX_DEPTH} level validation limit")
        stack.extend((child, depth + 1) for child in reversed(list(element)))
    visible_text, visible_graphics = inspect(root)
    print(json.dumps({
        "visible_text": " ".join(" ".join(visible_text).split()),
        "visible_graphics": visible_graphics,
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
  if (assertion.kind === "png_dimensions") {
    const passing = matches.some(({ file }) => {
      const info = decodedPngInfo(file);
      return (
        info.width >= assertion.options.min_width && info.height >= assertion.options.min_height
      );
    });
    if (!passing) throw new Error(`${assertion.raw}: no PNG matches required dimensions`);
    return;
  }
  if (assertion.kind === "png_nonblank") {
    const passing = matches.some(({ file }) => {
      const info = decodedPngInfo(file);
      return (
        info.width > 0 &&
        info.height > 0 &&
        info.size >= assertion.options.min_size &&
        info.nonblank
      );
    });
    if (!passing) throw new Error(`${assertion.raw}: no PNG passed decoded nonblank pixel check`);
    return;
  }
  if (assertion.kind === "svg_valid") {
    matches.forEach(({ file }) => svgInfo(file));
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
    for (const raw of assertions) {
      assertionCount += 1;
      try {
        const parsed = parseAssertion(raw);
        if (artifacts) evaluateAssertion(parsed, artifacts);
      } catch (error) {
        const rel = path.relative(rootDir, caseFile).replaceAll("\\", "/");
        errors.push(`${rel}: ${raw}: ${error.message}`);
      }
    }
  }

  return { visualCaseCount, assertionCount, errors };
}
