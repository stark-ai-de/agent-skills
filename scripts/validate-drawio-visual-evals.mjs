#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const casesDir = path.join(root, "skill-evals/drawio-diagrams/cases");
const supportedKinds = new Set([
  "artifact_exists",
  "png_dimensions",
  "png_nonblank",
  "svg_valid",
  "svg_contains",
  "svg_not_contains",
]);

function parseArgs(argv) {
  const args = { caseFile: null, artifactsDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--case") args.caseFile = argv[++i];
    else if (arg === "--artifacts-dir") args.artifactsDir = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }
  if (args.artifactsDir && !args.caseFile) {
    fail("--artifacts-dir requires --case so assertions are evaluated against one case");
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/validate-drawio-visual-evals.mjs [--case path] [--artifacts-dir dir]

Validates optional ## Visual Assertions sections in drawio-diagrams eval cases.
When --artifacts-dir is supplied, also checks matching generated PNG/SVG artifacts.

Supported assertions:
  - artifact_exists: <glob>
  - png_dimensions: <glob> min_width=<px> min_height=<px>
  - png_nonblank: <glob> [min_size=<bytes>]
  - svg_valid: <glob>
  - svg_contains: <glob> <text>
  - svg_not_contains: <glob> <text>`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, predicate));
    else if (predicate(full)) files.push(full);
  }
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

function parseAssertion(raw) {
  const index = raw.indexOf(":");
  if (index === -1) throw new Error("missing ':' separator");
  const kind = raw.slice(0, index).trim();
  const value = raw.slice(index + 1).trim();
  if (!supportedKinds.has(kind)) {
    throw new Error(`unsupported assertion kind ${JSON.stringify(kind)}`);
  }
  if (!value) throw new Error("missing assertion value");

  const parts = value.split(/\s+/);
  const glob = parts[0];
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
  return artifacts.filter((artifact) => re.test(artifact.rel) || re.test(path.basename(artifact.rel)));
}

function listArtifacts(dir) {
  const base = path.resolve(root, dir);
  return walk(base, (file) => fs.statSync(file).isFile()).map((file) => ({
    file,
    rel: path.relative(base, file).replaceAll("\\", "/"),
  }));
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
      return String(index);
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
    if (transparency?.grayscaleValue != null && sample === String(transparency.grayscaleValue)) return null;
    return sample;
  }
  if (colorType === 3) {
    const index = Number(pngPixelSample(row, x, bitDepth, pixelStride));
    const alpha = transparency?.palette?.[index];
    if (alpha === 0) return null;
    return String(index);
  }
  return pngPixelSample(row, x, bitDepth, pixelStride);
}

function pngTransparencySampleBytes(data, bitDepth, sampleIndex) {
  const bytesPerSample = Math.ceil(bitDepth / 8);
  const sampleStart = sampleIndex * 2;
  return Buffer.from(data.subarray(sampleStart + 2 - bytesPerSample, sampleStart + 2));
}

function decodedPngInfo(file) {
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
  let transparency = {};
  const idatChunks = [];

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error("truncated PNG chunk");
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      if (length !== 13) throw new Error("invalid PNG IHDR length");
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new Error("unsupported PNG compression, filter, or interlace method");
      }
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "tRNS") {
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
        transparency.palette = Buffer.from(data);
      }
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  if (!width || !height || bitDepth == null || colorType == null) throw new Error("PNG missing IHDR");
  if (!idatChunks.length) throw new Error("PNG missing IDAT data");

  const channels = pngChannels(colorType);
  const bitsPerPixel = channels * bitDepth;
  const rowBytes = Math.ceil((width * bitsPerPixel) / 8);
  const filterStride = Math.max(1, Math.ceil(bitsPerPixel / 8));
  const pixelStride = bitDepth >= 8 ? filterStride : 1;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const expectedMinLength = height * (rowBytes + 1);
  if (inflated.length < expectedMinLength) {
    throw new Error("PNG IDAT data is shorter than expected image rows");
  }

  let inOffset = 0;
  let previous = Buffer.alloc(rowBytes);
  const distinctPixels = new Set();
  const visibleDistinctPixels = new Set();
  let visiblePixelCount = 0;
  let transparentPixelCount = 0;

  for (let y = 0; y < height; y += 1) {
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

    for (let x = 0; x < width; x += 1) {
      distinctPixels.add(pngPixelSample(row, x, bitDepth, pixelStride));
      const visibleSample = pngVisiblePixelSample(row, x, bitDepth, colorType, pixelStride, transparency);
      if (visibleSample == null) transparentPixelCount += 1;
      else {
        visiblePixelCount += 1;
        visibleDistinctPixels.add(visibleSample);
      }
    }
    previous = row;
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

function assertValidSvgFile(file) {
  const script = `
import sys
import xml.etree.ElementTree as ET

try:
    root = ET.parse(sys.argv[1]).getroot()
    local_name = root.tag.rsplit("}", 1)[-1].split(":")[-1]
    if local_name != "svg":
        raise ValueError("missing <svg> root")
except Exception as error:
    print(str(error), file=sys.stderr)
    raise SystemExit(1)
`;
  const result = spawnSync("python3", ["-c", script, file], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (result.error) throw new Error(`python3 XML parser failed: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "invalid SVG XML").trim();
    throw new Error(detail);
  }
}

function svgInfo(file) {
  const text = fs.readFileSync(file, "utf8");
  assertValidSvgFile(file);
  return { text };
}

function evaluateAssertion(assertion, artifacts) {
  const matches = matchingArtifacts(artifacts, assertion.glob);
  if (matches.length === 0) throw new Error(`${assertion.raw}: no artifact matches ${assertion.glob}`);

  if (assertion.kind === "artifact_exists") return;
  if (assertion.kind === "png_dimensions") {
    const passing = matches.some(({ file }) => {
      const info = decodedPngInfo(file);
      return info.width >= assertion.options.min_width && info.height >= assertion.options.min_height;
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
    const needle = assertion.text.toLowerCase();
    const passing = matches.some(({ file }) => svgInfo(file).text.toLowerCase().includes(needle));
    if (!passing) throw new Error(`${assertion.raw}: no SVG contains expected text`);
    return;
  }
  if (assertion.kind === "svg_not_contains") {
    const needle = assertion.text.toLowerCase();
    const failing = matches.find(({ file }) => svgInfo(file).text.toLowerCase().includes(needle));
    if (failing) throw new Error(`${assertion.raw}: ${failing.rel} contains forbidden text`);
  }
}

function pngChunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, "ascii");
  return Buffer.concat([header, data, Buffer.alloc(4)]);
}

function makeRgbaPng(width, height, pixelAt) {
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixel = pixelAt(x, y);
      const offset = 1 + x * 4;
      row[offset] = pixel[0];
      row[offset + 1] = pixel[1];
      row[offset + 2] = pixel[2];
      row[offset + 3] = pixel[3];
    }
    rows.push(row);
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIndexedPng(width, height, palette, transparency, indexAt) {
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) row[1 + x] = indexAt(x, y);
    rows.push(row);
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("PLTE", Buffer.from(palette)),
    pngChunk("tRNS", Buffer.from(transparency)),
    pngChunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function runPngNonblankRegression() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drawio-visual-png-"));
  try {
    const blank = path.join(temp, "blank.png");
    const nonblank = path.join(temp, "nonblank.png");
    const transparent = path.join(temp, "transparent-hidden-rgb.png");
    const transparentContent = path.join(temp, "transparent-content.png");
    const indexedTransparent = path.join(temp, "indexed-transparent.png");
    const indexedContent = path.join(temp, "indexed-content.png");
    fs.writeFileSync(blank, makeRgbaPng(8, 8, () => [255, 255, 255, 255]));
    fs.writeFileSync(
      nonblank,
      makeRgbaPng(8, 8, (x, y) => (x === 0 && y === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255])),
    );
    fs.writeFileSync(
      transparent,
      makeRgbaPng(8, 8, (x, y) => [(x * 31) & 0xff, (y * 29) & 0xff, (x + y) & 0xff, 0]),
    );
    fs.writeFileSync(
      transparentContent,
      makeRgbaPng(8, 8, (x, y) => (x === 0 && y === 0 ? [0, 0, 0, 255] : [255, 255, 255, 0])),
    );
    fs.writeFileSync(
      indexedTransparent,
      makeIndexedPng(
        8,
        8,
        [255, 255, 255, 0, 0, 0],
        [0, 0],
        (x, y) => (x + y) % 2,
      ),
    );
    fs.writeFileSync(
      indexedContent,
      makeIndexedPng(
        8,
        8,
        [255, 255, 255, 0, 0, 0],
        [0, 255],
        (x, y) => (x === 0 && y === 0 ? 1 : 0),
      ),
    );

    let blankPassed = false;
    try {
      evaluateAssertion(parseAssertion("png_nonblank: blank.png min_size=1"), listArtifacts(temp));
      blankPassed = true;
    } catch {
      blankPassed = false;
    }
    if (blankPassed) throw new Error("blank solid-color PNG passed png_nonblank");

    let transparentPassed = false;
    try {
      evaluateAssertion(parseAssertion("png_nonblank: transparent-hidden-rgb.png min_size=1"), listArtifacts(temp));
      transparentPassed = true;
    } catch {
      transparentPassed = false;
    }
    if (transparentPassed) throw new Error("fully transparent PNG passed png_nonblank");

    let indexedTransparentPassed = false;
    try {
      evaluateAssertion(parseAssertion("png_nonblank: indexed-transparent.png min_size=1"), listArtifacts(temp));
      indexedTransparentPassed = true;
    } catch {
      indexedTransparentPassed = false;
    }
    if (indexedTransparentPassed) throw new Error("fully transparent indexed PNG passed png_nonblank");

    evaluateAssertion(parseAssertion("png_nonblank: nonblank.png min_size=1"), listArtifacts(temp));
    evaluateAssertion(parseAssertion("png_nonblank: transparent-content.png min_size=1"), listArtifacts(temp));
    evaluateAssertion(parseAssertion("png_nonblank: indexed-content.png min_size=1"), listArtifacts(temp));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function runSvgValidRegression() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drawio-visual-svg-"));
  try {
    fs.writeFileSync(path.join(temp, "valid.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><text>Client</text></svg>');
    fs.writeFileSync(path.join(temp, "invalid.svg"), "<svg><g></svg>");
    fs.writeFileSync(path.join(temp, "not-svg.svg"), "<html><svg></svg></html>");
    fs.writeFileSync(
      path.join(temp, "invalid-attribute.svg"),
      "<svg xmlns=http://www.w3.org/2000/svg><text>Client</text></svg>",
    );

    evaluateAssertion(parseAssertion("svg_valid: valid.svg"), listArtifacts(temp));
    let invalidPassed = false;
    try {
      evaluateAssertion(parseAssertion("svg_valid: invalid.svg"), listArtifacts(temp));
      invalidPassed = true;
    } catch {
      invalidPassed = false;
    }
    if (invalidPassed) throw new Error("malformed SVG passed svg_valid");

    let notSvgPassed = false;
    try {
      evaluateAssertion(parseAssertion("svg_valid: not-svg.svg"), listArtifacts(temp));
      notSvgPassed = true;
    } catch {
      notSvgPassed = false;
    }
    if (notSvgPassed) throw new Error("non-SVG XML root passed svg_valid");

    let invalidAttributePassed = false;
    try {
      evaluateAssertion(parseAssertion("svg_valid: invalid-attribute.svg"), listArtifacts(temp));
      invalidAttributePassed = true;
    } catch {
      invalidAttributePassed = false;
    }
    if (invalidAttributePassed) throw new Error("malformed SVG attribute passed svg_valid");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

const args = parseArgs(process.argv.slice(2));
const caseFiles = args.caseFile
  ? [path.resolve(root, args.caseFile)]
  : walk(casesDir, (file) => file.endsWith(".md")).sort();
const artifacts = args.artifactsDir ? listArtifacts(args.artifactsDir) : null;

let visualCaseCount = 0;
let assertionCount = 0;
const errors = [];

for (const caseFile of caseFiles) {
  const text = fs.readFileSync(caseFile, "utf8");
  const assertions = bullets(section(text, "Visual Assertions"));
  if (!assertions.length) continue;
  visualCaseCount += 1;
  for (const raw of assertions) {
    assertionCount += 1;
    try {
      const parsed = parseAssertion(raw);
      if (artifacts) evaluateAssertion(parsed, artifacts);
    } catch (error) {
      const rel = path.relative(root, caseFile).replaceAll("\\", "/");
      errors.push(`${rel}: ${raw}: ${error.message}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (!artifacts) {
  runPngNonblankRegression();
  runSvgValidRegression();
}

console.log(
  `Validated ${assertionCount} visual assertion(s) across ${visualCaseCount} draw.io eval case(s).`,
);
