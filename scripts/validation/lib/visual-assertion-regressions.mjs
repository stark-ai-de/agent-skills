#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import zlib from "node:zlib";

import {
  evaluateAssertion,
  extractVisualAssertionLines,
  listArtifacts,
  parseAssertion,
  validateVisualEvalCases,
  walkFiles,
} from "./visual-assertions.mjs";

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

function expectFailure(callback, message) {
  try {
    callback();
  } catch {
    return;
  }
  throw new Error(message);
}

function runMultilineAssertionRegression() {
  const assertions = extractVisualAssertionLines(`## Visual Assertions

- drawio_valid: result.drawio
  adaptive_colors=1 min_pages=2 uncompressed=1
- artifact_exists: result.drawio
`);
  if (
    assertions.length !== 2 ||
    assertions[0] !== "drawio_valid: result.drawio adaptive_colors=1 min_pages=2 uncompressed=1"
  ) {
    throw new Error(`visual assertion parser lost multiline options: ${assertions.join(" | ")}`);
  }
  parseAssertion(assertions[0]);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drawio-visual-conflict-"));
  try {
    const caseFile = path.join(temp, "conflicting-animation.md");
    fs.writeFileSync(
      caseFile,
      `## Visual Assertions

- drawio_valid: result.drawio animation_on=1
- drawio_valid: result.drawio animation_off=1
`,
    );
    const result = validateVisualEvalCases({ caseFiles: [caseFile], rootDir: temp });
    if (!result.errors.some((error) => error.includes("animation_on=1 and animation_off=1"))) {
      throw new Error("conflicting per-glob animation requirements passed visual eval validation");
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function crc32(...buffers) {
  let crc = 0xffffffff;
  for (const buffer of buffers) {
    for (const byte of buffer) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, "ascii");
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(header.subarray(4), data), 0);
  return Buffer.concat([header, data, checksum]);
}

function makeRgbaPng(
  width,
  height,
  pixelAt,
  { interlaced = false, zlibSuffix = Buffer.alloc(0) } = {},
) {
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = interlaced ? 1 : 0;

  const rows = [];
  const passes = interlaced ? ADAM7_PASSES : [[0, 0, 1, 1]];
  for (const [startX, startY, stepX, stepY] of passes) {
    const passWidth = width > startX ? Math.ceil((width - startX) / stepX) : 0;
    for (let y = startY; y < height && passWidth > 0; y += stepY) {
      const row = Buffer.alloc(1 + passWidth * 4);
      row[0] = 0;
      let passX = 0;
      for (let x = startX; x < width; x += stepX) {
        const pixel = pixelAt(x, y);
        const offset = 1 + passX * 4;
        row[offset] = pixel[0];
        row[offset + 1] = pixel[1];
        row[offset + 2] = pixel[2];
        row[offset + 3] = pixel[3];
        passX += 1;
      }
      rows.push(row);
    }
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", Buffer.concat([zlib.deflateSync(Buffer.concat(rows)), zlibSuffix])),
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
    const indexedDuplicateColor = path.join(temp, "indexed-duplicate-color.png");
    const interlacedContent = path.join(temp, "interlaced-content.png");
    const corruptCrc = path.join(temp, "corrupt-crc.png");
    const missingIend = path.join(temp, "missing-iend.png");
    const trailingCompressed = path.join(temp, "trailing-compressed.png");
    const inflateOverflow = path.join(temp, "inflate-overflow.png");
    fs.writeFileSync(
      blank,
      makeRgbaPng(8, 8, () => [255, 255, 255, 255]),
    );
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
      makeIndexedPng(8, 8, [255, 255, 255, 0, 0, 0], [0, 0], (x, y) => (x + y) % 2),
    );
    fs.writeFileSync(
      indexedContent,
      makeIndexedPng(8, 8, [255, 255, 255, 0, 0, 0], [0, 255], (x, y) =>
        x === 0 && y === 0 ? 1 : 0,
      ),
    );
    fs.writeFileSync(
      indexedDuplicateColor,
      makeIndexedPng(8, 8, [255, 255, 255, 255, 255, 255], [255, 255], (x, y) => (x + y) % 2),
    );
    fs.writeFileSync(
      interlacedContent,
      makeRgbaPng(8, 8, (x, y) => (x === 0 && y === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255]), {
        interlaced: true,
      }),
    );
    fs.writeFileSync(
      trailingCompressed,
      makeRgbaPng(8, 8, (x, y) => (x === 0 && y === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255]), {
        zlibSuffix: Buffer.from([0]),
      }),
    );
    const overflowHeader = Buffer.alloc(13);
    overflowHeader.writeUInt32BE(1, 0);
    overflowHeader.writeUInt32BE(1, 4);
    overflowHeader[8] = 8;
    overflowHeader[9] = 6;
    fs.writeFileSync(
      inflateOverflow,
      Buffer.concat([
        Buffer.from("89504e470d0a1a0a", "hex"),
        pngChunk("IHDR", overflowHeader),
        pngChunk("IDAT", zlib.deflateSync(Buffer.alloc(1024 * 1024))),
        pngChunk("IEND", Buffer.alloc(0)),
      ]),
    );
    const validForCorruption = makeRgbaPng(8, 8, (x, y) =>
      x === 0 && y === 0 ? [0, 0, 0, 255] : [255, 255, 255, 255],
    );
    const corruptCrcBytes = Buffer.from(validForCorruption);
    corruptCrcBytes[corruptCrcBytes.length - 1] ^= 0xff;
    fs.writeFileSync(corruptCrc, corruptCrcBytes);
    fs.writeFileSync(missingIend, validForCorruption.subarray(0, -12));

    evaluateAssertion(parseAssertion("artifact_exists: \\*.png"), listArtifacts(temp));

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
      evaluateAssertion(
        parseAssertion("png_nonblank: transparent-hidden-rgb.png min_size=1"),
        listArtifacts(temp),
      );
      transparentPassed = true;
    } catch {
      transparentPassed = false;
    }
    if (transparentPassed) throw new Error("fully transparent PNG passed png_nonblank");

    let indexedTransparentPassed = false;
    try {
      evaluateAssertion(
        parseAssertion("png_nonblank: indexed-transparent.png min_size=1"),
        listArtifacts(temp),
      );
      indexedTransparentPassed = true;
    } catch {
      indexedTransparentPassed = false;
    }
    if (indexedTransparentPassed)
      throw new Error("fully transparent indexed PNG passed png_nonblank");

    let indexedDuplicateColorPassed = false;
    try {
      evaluateAssertion(
        parseAssertion("png_nonblank: indexed-duplicate-color.png min_size=1"),
        listArtifacts(temp),
      );
      indexedDuplicateColorPassed = true;
    } catch {
      indexedDuplicateColorPassed = false;
    }
    if (indexedDuplicateColorPassed) {
      throw new Error("uniform indexed PNG with duplicate palette colors passed png_nonblank");
    }

    for (const invalid of [
      "corrupt-crc.png",
      "missing-iend.png",
      "trailing-compressed.png",
      "inflate-overflow.png",
    ]) {
      let invalidPassed = false;
      try {
        evaluateAssertion(
          parseAssertion(`png_nonblank: ${invalid} min_size=1`),
          listArtifacts(temp),
        );
        invalidPassed = true;
      } catch {
        invalidPassed = false;
      }
      if (invalidPassed) throw new Error(`${invalid} passed png_nonblank`);
    }

    evaluateAssertion(parseAssertion("png_nonblank: nonblank.png min_size=1"), listArtifacts(temp));
    evaluateAssertion(
      parseAssertion("png_nonblank: transparent-content.png min_size=1"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("png_nonblank: indexed-content.png min_size=1"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("png_nonblank: interlaced-content.png min_size=1"),
      listArtifacts(temp),
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function runSvgValidRegression() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drawio-visual-svg-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "drawio-visual-outside-"));
  try {
    const missingArtifacts = listArtifacts(path.join(temp, "missing-artifacts"));
    if (missingArtifacts.length !== 0) {
      throw new Error("missing artifacts directory produced artifact entries");
    }
    let missingArtifactPassed = false;
    try {
      evaluateAssertion(parseAssertion("artifact_exists: *.svg"), missingArtifacts);
      missingArtifactPassed = true;
    } catch {
      missingArtifactPassed = false;
    }
    if (missingArtifactPassed) {
      throw new Error("missing artifacts directory passed artifact_exists");
    }

    const baseLink = path.join(temp, "artifact-base-link");
    fs.symlinkSync(outside, baseLink, "dir");
    expectFailure(() => listArtifacts(baseLink), "symlinked artifacts base directory was accepted");

    const limitsRoot = path.join(temp, "walk-limits");
    const nested = path.join(limitsRoot, "one", "two");
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(limitsRoot, "a.txt"), "a");
    fs.writeFileSync(path.join(limitsRoot, "b.txt"), "b");
    fs.writeFileSync(path.join(nested, "c.txt"), "c");
    expectFailure(
      () => walkFiles(limitsRoot, () => true, { maxFiles: 1 }),
      "artifact file-count limit was not enforced",
    );
    expectFailure(
      () => walkFiles(limitsRoot, () => true, { maxEntries: 1 }),
      "artifact entry-count limit was not enforced",
    );
    expectFailure(
      () => walkFiles(limitsRoot, () => true, { maxDepth: 1 }),
      "artifact directory-depth limit was not enforced",
    );
    expectFailure(
      () => listArtifacts(limitsRoot, { maxTotalBytes: 1 }),
      "artifact aggregate-size limit was not enforced",
    );

    const embeddedSvgPayload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>',
    ).toString("base64");
    const referencedSvgPayload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><path id="mark" d="M0 0h24v24H0z"/></defs><use href="#mark"/></svg>',
    ).toString("base64");
    const compactArcSvgPayload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.503 0H4.496A4.496 4.496 0 000 4.496v15.007A4.496 4.496 0 004.496 24h15.007A4.496 4.496 0 0024 19.503V4.496A4.496 4.496 0 0019.503 0z"/></svg>',
    ).toString("base64");
    const strokedOpenSvgPayload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#000" d="M1 1L20 20"/></svg>',
    ).toString("base64");
    const zeroLengthRoundSvgPayload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" d="M12 12L12 12"/></svg>',
    ).toString("base64");
    const zeroLengthSquareSvgPayload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#000" stroke-width="4" stroke-linecap="square" d="M12 12L12 12"/></svg>',
    ).toString("base64");
    const strokedCollinearSvgPayload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon fill="none" stroke="#000" points="1,1 12,12 20,20"/></svg>',
    ).toString("base64");
    const strokedCollinearPolylineSvgPayload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline fill="none" stroke="#000" points="1,1 12,12 20,20"/></svg>',
    ).toString("base64");
    const filledNonCollinearSvgPayload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="1,1 20,1 12,20"/></svg>',
    ).toString("base64");
    const resolvedResourceSvgPayload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="paint"><stop offset="0"/></linearGradient><path id="mark" d="M0 0h24v24H0z"/></defs><image href="#mark" width="24" height="24"/><path fill="url(#paint)" d="M0 0h24v24H0z"/></svg>',
    ).toString("base64");
    const embeddedPng = makeRgbaPng(1, 1, () => [20, 80, 220, 255]);
    const embeddedPngPayload = embeddedPng.toString("base64");
    const shortPngHeader = Buffer.alloc(13);
    shortPngHeader.writeUInt32BE(1, 0);
    shortPngHeader.writeUInt32BE(1, 4);
    shortPngHeader[8] = 8;
    shortPngHeader[9] = 6;
    const shortScanlinePng = Buffer.concat([
      Buffer.from("89504e470d0a1a0a", "hex"),
      pngChunk("IHDR", shortPngHeader),
      pngChunk("IDAT", zlib.deflateSync(Buffer.from([0]))),
      pngChunk("IEND", Buffer.alloc(0)),
    ]).toString("base64");
    const oversizedDecodedHeader = Buffer.from(shortPngHeader);
    oversizedDecodedHeader.writeUInt32BE(32_768, 0);
    oversizedDecodedHeader.writeUInt32BE(32_768, 4);
    const oversizedDecodedPng = Buffer.concat([
      Buffer.from("89504e470d0a1a0a", "hex"),
      pngChunk("IHDR", oversizedDecodedHeader),
      pngChunk("IDAT", zlib.deflateSync(Buffer.from([0]))),
      pngChunk("IEND", Buffer.alloc(0)),
    ]).toString("base64");
    fs.writeFileSync(
      path.join(temp, "valid.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "embedded-image.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><text>Logo</text></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "embedded-image-with-png-fallback.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><image href="data:image/png;base64,${embeddedPngPayload}"/><a href="https://www.drawio.com/doc/faq/svg-export-text-problems"><text>Logo</text></a></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "embedded-use-image.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${referencedSvgPayload}"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "embedded-compact-arc-image.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${compactArcSvgPayload}"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "embedded-stroked-open-path-image.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${strokedOpenSvgPayload}"/></svg>`,
    );
    for (const [name, payload] of [
      ["embedded-zero-length-round-image.svg", zeroLengthRoundSvgPayload],
      ["embedded-zero-length-square-image.svg", zeroLengthSquareSvgPayload],
      ["embedded-stroked-collinear-image.svg", strokedCollinearSvgPayload],
      ["embedded-stroked-collinear-polyline-image.svg", strokedCollinearPolylineSvgPayload],
      ["embedded-filled-non-collinear-image.svg", filledNonCollinearSvgPayload],
      ["embedded-resolved-local-resources-image.svg", resolvedResourceSvgPayload],
    ]) {
      fs.writeFileSync(
        path.join(temp, name),
        `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${payload}"/></svg>`,
      );
    }
    fs.writeFileSync(
      path.join(temp, "invalid-png-fallback.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><image href="data:image/png;base64,${shortScanlinePng}"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "oversized-png-fallback.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><image href="data:image/png;base64,${oversizedDecodedPng}"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "remote-image.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://cdn.example/logo.svg"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "mixed-image.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><image href="https://cdn.example/logo.svg"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "foreign-namespace-image.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:e="urn:not-svg"><e:image href="data:image/svg+xml,${embeddedSvgPayload}"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "empty-embedded-image.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "invalid-embedded-image.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,not-an-svg"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "malformed-percent-image.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><image width="24" height="24" href="data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%3E%GG%3Cpath%20d%3D%22M0%200h24v24H0z%22%2F%3E%3C%2Fsvg%3E"/></svg>',
    );
    const emptyBoundedSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"/>',
    ).toString("base64");
    fs.writeFileSync(
      path.join(temp, "empty-bounded-image.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${emptyBoundedSvg}"/></svg>`,
    );
    for (const [name, embedded] of [
      [
        "empty-path-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path/></svg>',
      ],
      [
        "zero-sized-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="0" height="24"/></svg>',
      ],
      [
        "empty-text-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text>   </text></svg>',
      ],
      [
        "malformed-path-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="garbage"/></svg>',
      ],
      [
        "incomplete-path-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0 L"/></svg>',
      ],
      [
        "zero-length-path-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0L0 0"/></svg>',
      ],
      [
        "open-fill-only-path-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1L20 20"/></svg>',
      ],
      [
        "zero-length-butt-path-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#000" stroke-width="4" stroke-linecap="butt" d="M12 12L12 12"/></svg>',
      ],
      [
        "collinear-polyline-fill-only-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="1,1 12,12 20,20"/></svg>',
      ],
      [
        "collinear-polygon-fill-only-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="1,1 12,12 20,20"/></svg>',
      ],
      [
        "missing-local-image-fragment-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><image href="#missing" width="24" height="24"/></svg>',
      ],
      [
        "missing-local-css-fragment-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="url(#missing)" d="M0 0h24v24H0z"/></svg>',
      ],
      [
        "embedded-xml-stylesheet-image.svg",
        '<?xml-stylesheet href="https://cdn.example/icon.css"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>',
      ],
      [
        "embedded-xml-base-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://cdn.example/" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>',
      ],
      [
        "embedded-animation-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path id="mark" d="M0 0h24v24H0z"><animate attributeName="opacity" values="1;0;1" dur="1s"/></path></svg>',
      ],
      [
        "transparent-current-color-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" color="transparent"><path fill="currentColor" d="M0 0h24v24H0z"/></svg>',
      ],
      [
        "stylesheet-hidden-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><style>.mark{display:none}</style><path class="mark" d="M0 0h24v24H0z"/></svg>',
      ],
      [
        "rgb-alpha-zero-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="rgb(0 0 0 / 0)" d="M0 0h24v24H0z"/></svg>',
      ],
      [
        "inherited-transparent-current-color-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g color="transparent"><path fill="currentColor" d="M0 0h24v24H0z"/></g></svg>',
      ],
      [
        "nonfinite-path-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#000" d="M0 0L1e999 20"/></svg>',
      ],
      [
        "nonfinite-polyline-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline fill="none" stroke="#000" points="0,0 1e999,20"/></svg>',
      ],
      [
        "nonfinite-polygon-image.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon fill="none" stroke="#000" points="0,0 20,0 1e999,20"/></svg>',
      ],
    ]) {
      fs.writeFileSync(
        path.join(temp, name),
        `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${Buffer.from(embedded).toString("base64")}"/></svg>`,
      );
    }
    fs.writeFileSync(
      path.join(temp, "foreign-object-remote.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src="https://cdn.example/logo.svg"/></div></foreignObject></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "css-remote.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><style>.logo{background:url(https://cdn.example/logo.svg)}</style></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "external-use.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><use href="https://cdn.example/symbols.svg#logo"/></svg>`,
    );
    for (const [name, resource] of [
      [
        "external-linear-gradient.svg",
        '<linearGradient href="https://cdn.example/paint.svg#gradient"/>',
      ],
      [
        "external-radial-gradient.svg",
        '<radialGradient href="https://cdn.example/paint.svg#gradient"/>',
      ],
      ["external-pattern.svg", '<pattern href="https://cdn.example/paint.svg#pattern"/>'],
      ["external-filter.svg", '<filter href="https://cdn.example/effects.svg#shadow"/>'],
      ["external-mpath.svg", '<mpath href="https://cdn.example/motion.svg#path"/>'],
      [
        "external-animate.svg",
        '<animate href="https://cdn.example/mark.svg#icon" attributeName="opacity"/>',
      ],
    ]) {
      fs.writeFileSync(
        path.join(temp, name),
        `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/>${resource}</svg>`,
      );
    }
    fs.writeFileSync(
      path.join(temp, "local-resource-hrefs.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="mark" d="M0 0h24v24H0z"/><linearGradient id="paint"/><linearGradient href="#paint"/><pattern id="pattern"/><pattern href="#pattern"/><filter id="shadow"/><filter href="#shadow"/></defs><image href="data:image/svg+xml,${embeddedSvgPayload}"/><use href="#mark"/><mpath href="#mark"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "missing-local-image-fragment.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><image href="#missing" width="24" height="24"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "missing-local-css-fragment.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><path fill="url(#missing)" d="M0 0h24v24H0z"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "resolved-local-resources.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="paint"><stop offset="0"/></linearGradient><image id="logo" href="data:image/svg+xml,${embeddedSvgPayload}"/></defs><image href="#logo" width="24" height="24"/><path fill="url(#paint)" d="M0 0h24v24H0z"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "smil-set-mutation.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image id="logo" href="data:image/svg+xml,${embeddedSvgPayload}"/><set href="#logo" attributeName="href" to="https://cdn.example/icon.svg"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "smil-animate-values-mutation.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image id="logo" href="data:image/svg+xml,${embeddedSvgPayload}"/><animate href="#logo" attributeName="href" values="data:image/svg+xml,${embeddedSvgPayload};https://cdn.example/icon.svg"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "srcset-remote.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src="data:image/svg+xml,${embeddedSvgPayload}" srcset="https://cdn.example/logo.svg 2x"/></div></foreignObject></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "remote-text-path.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><text><textPath href="https://cdn.example/path.svg#text">Logo</textPath></text></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "remote-iframe.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><foreignObject><iframe xmlns="http://www.w3.org/1999/xhtml" src="https://cdn.example/embed"/></foreignObject></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "javascript-link.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><a href="javascript:alert(1)"><text>Logo</text></a></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "inline-script.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/><script>alert(1)</script></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "xml-stylesheet.svg"),
      `<?xml-stylesheet href="https://cdn.example/icon.css"?><svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${embeddedSvgPayload}"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "xml-base.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://cdn.example/"><image href="data:image/svg+xml,${embeddedSvgPayload}"/></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "split-visible-text.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text><tspan>Audit</tspan><tspan>Log</tspan></text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "metadata-only.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><metadata>Client</metadata></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "hidden-text.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text style="display:none">Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "fill-none.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text fill="none">Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "fill-opacity-zero.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text style="fill-opacity:0%">Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "font-size-zero.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text font-size="0">Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "inherited-font-size-zero.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><g font-size="0"><text>Client</text></g></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "transparent-current-color.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" color="transparent"><text fill="currentColor">Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "stylesheet-hidden.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><style>.mark{display:none}</style><rect class="mark" width="24" height="24"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "stylesheet-transparent.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><style>.mark{fill:transparent}</style><rect class="mark" width="24" height="24"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "unresolved-paint.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(#missing)" d="M0 0h24v24H0z"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "rgb-alpha-zero.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" fill="rgb(0 0 0 / 0)"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "inherited-transparent-current-color.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><g color="transparent"><rect width="24" height="24" fill="currentColor"/></g></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "clipped-text.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip"/></defs><text clip-path="url(#clip)">Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "calculated-opacity.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text opacity="calc(0)">Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "zero-stroke-width.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text fill="none" stroke="#000" stroke-width="0">Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "stroke-visible.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text fill="none" stroke="#000">Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "child-fill-override.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text fill="none"><tspan fill="#000">Client</tspan></text></svg>',
    );
    const flowAnimationMarkup = (animation = "running", includeKeyframes = true) =>
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16"><defs>${
        includeKeyframes
          ? "<style>@keyframes ge-flow-animation-test { to { stroke-dashoffset: 0; } }</style>"
          : ""
      }</defs><path d="M1 8L31 8" fill="none" stroke="#2563eb" stroke-dasharray="8" style="animation: 500ms linear 0s infinite normal none ${animation} ge-flow-animation-test;stroke-dashoffset:16;"/></svg>`;
    fs.writeFileSync(path.join(temp, "animated-flow.svg"), flowAnimationMarkup());
    fs.writeFileSync(path.join(temp, "paused-flow.svg"), flowAnimationMarkup("paused"));
    fs.writeFileSync(
      path.join(temp, "missing-flow-keyframes.svg"),
      flowAnimationMarkup("running", false),
    );
    fs.writeFileSync(
      path.join(temp, "zero-offset-flow.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16"><defs><style>@keyframes ge-flow-zero { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 0; } }</style></defs><path d="M1 8L31 8" fill="none" stroke="#2563eb" stroke-dasharray="8" stroke-dashoffset="16" style="animation:500ms linear 0s infinite normal none running ge-flow-zero"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "delay-only-flow.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16"><defs><style>@keyframes ge-flow-delay { to { stroke-dashoffset: 0; } }</style></defs><path d="M1 8L31 8" fill="none" stroke="#2563eb" stroke-dasharray="8" stroke-dashoffset="16" style="animation:0s linear 5s infinite normal none running ge-flow-delay"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "transparent-rgba-flow.svg"),
      flowAnimationMarkup().replace('stroke="#2563eb"', 'stroke="rgba(0,0,0,0)"'),
    );
    fs.writeFileSync(
      path.join(temp, "transparent-hex-flow.svg"),
      flowAnimationMarkup().replace('stroke="#2563eb"', 'stroke="#2563eb00"'),
    );
    fs.writeFileSync(
      path.join(temp, "transparent-current-color-flow.svg"),
      flowAnimationMarkup()
        .replace('viewBox="0 0 32 16"', 'viewBox="0 0 32 16" color="transparent"')
        .replace('stroke="#2563eb"', 'stroke="currentColor"'),
    );
    fs.writeFileSync(
      path.join(temp, "empty-root.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"/>',
    );
    fs.writeFileSync(
      path.join(temp, "incomplete-path.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "zero-length-path.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L0 0"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "open-fill-only-path.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M1 1L20 20"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "nonfinite-path.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="#000" d="M0 0L1e999 20"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "nonfinite-polyline.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><polyline fill="none" stroke="#000" points="0,0 1e999,20"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "nonfinite-polygon.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><polygon fill="none" stroke="#000" points="0,0 20,0 1e999,20"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "stroked-open-path.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="#000" d="M1 1L20 20"/></svg>',
    );
    for (const [name, markup] of [
      [
        "zero-length-round-path.svg",
        '<path fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" d="M12 12L12 12"/>',
      ],
      [
        "zero-length-square-path.svg",
        '<path fill="none" stroke="#000" stroke-width="4" stroke-linecap="square" d="M12 12L12 12"/>',
      ],
      [
        "stroked-collinear-polygon.svg",
        '<polygon fill="none" stroke="#000" points="1,1 12,12 20,20"/>',
      ],
      [
        "stroked-collinear-polyline.svg",
        '<polyline fill="none" stroke="#000" points="1,1 12,12 20,20"/>',
      ],
      ["filled-non-collinear-polyline.svg", '<polyline points="1,1 20,1 12,20"/>'],
    ]) {
      fs.writeFileSync(
        path.join(temp, name),
        `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
      );
    }
    fs.writeFileSync(
      path.join(temp, "zero-length-butt-path.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke="#000" stroke-width="4" stroke-linecap="butt" d="M12 12L12 12"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "collinear-polyline-fill-only.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><polyline points="1,1 12,12 20,20"/></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "collinear-polygon-fill-only.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><polygon points="1,1 12,12 20,20"/></svg>',
    );
    fs.writeFileSync(path.join(temp, "invalid.svg"), "<svg><g></svg>");
    fs.writeFileSync(path.join(temp, "not-svg.svg"), "<html><svg></svg></html>");
    fs.writeFileSync(
      path.join(temp, "invalid-attribute.svg"),
      "<svg xmlns=http://www.w3.org/2000/svg><text>Client</text></svg>",
    );
    fs.writeFileSync(
      path.join(temp, "invalid-utf8.svg"),
      Buffer.from("3c7376673e3c746578743eff3c2f746578743e3c2f7376673e", "hex"),
    );
    fs.writeFileSync(
      path.join(temp, "entity.svg"),
      '<!DOCTYPE svg [<!ENTITY label "Client">]><svg><text>&label;</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "doctype.svg"),
      '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"><text>Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "drawio-doctype.svg"),
      '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg xmlns="http://www.w3.org/2000/svg"><text>Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "wrong-namespace.svg"),
      '<svg xmlns="urn:not-svg"><text>Client</text></svg>',
    );
    fs.writeFileSync(
      path.join(temp, "utf16-entity.svg"),
      Buffer.from(
        '\ufeff<?xml version="1.0" encoding="UTF-16"?><!DOCTYPE svg [<!ENTITY label "Client">]><svg><text>&label;</text></svg>',
        "utf16le",
      ),
    );
    fs.writeFileSync(
      path.join(temp, "too-many-elements.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg">${"<g/>".repeat(20_001)}<text>Client</text></svg>`,
    );
    fs.writeFileSync(
      path.join(temp, "too-deep.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg">${"<g>".repeat(129)}<text>Client</text>${"</g>".repeat(129)}</svg>`,
    );
    fs.writeFileSync(
      path.join(outside, "outside.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Secret</text></svg>',
    );
    fs.symlinkSync(path.join(outside, "outside.svg"), path.join(temp, "leak.svg"));

    const logoPayload = embeddedSvgPayload;
    const drawioArtifact = (imageSource = null) => `<mxfile host="app.diagrams.net">
  <diagram name="Logo"><mxGraphModel><root>
    <mxCell id="0"/><mxCell id="1" parent="0"/>
    ${
      imageSource
        ? `<mxCell id="logo" value="Logo" style="shape=image;image=${imageSource};aspect=fixed;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="60" height="60" as="geometry"/></mxCell>`
        : '<mxCell id="note" value="data:image/svg+xml,metadata-only" style="text;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="160" height="40" as="geometry"/></mxCell>'
    }
  </root></mxGraphModel></diagram>
</mxfile>`;
    fs.writeFileSync(
      path.join(temp, "embedded-logo.drawio"),
      drawioArtifact(`data:image/svg+xml,${logoPayload}`),
    );
    fs.writeFileSync(
      path.join(temp, "stable-graph.drawio"),
      `<mxfile host="app.diagrams.net"><diagram name="Graph"><mxGraphModel adaptiveColors="auto"><root>
        <mxCell id="0"/><mxCell id="1" parent="0"/>
        <mxCell id="client" value="Client" style="strokeColor=#123456;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="80" height="40" as="geometry"/></mxCell>
        <mxCell id="api" value="API" vertex="1" parent="1"><mxGeometry x="120" y="0" width="80" height="40" as="geometry"/></mxCell>
        <mxCell id="cache" value="Cache" link="https://docs.example.invalid/product" style="shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.dynamodb;" vertex="1" parent="1"><mxGeometry x="240" y="0" width="80" height="40" as="geometry"/></mxCell>
        <mxCell id="profile-neon-hub" value="Profile" style="designProfile=neon-hub;strokeColor=light-dark(#4D7C0F,#D7FF00);" vertex="1" parent="1"><mxGeometry x="360" y="0" width="80" height="40" as="geometry"/></mxCell>
        <mxCell id="edge-client-api" edge="1" parent="1" source="client" target="api" style="endArrow=block;dataRole=request;"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="edge-api-cache" edge="1" parent="1" source="api" target="cache" style="endArrow=block;dataRole=event;"><mxGeometry relative="1" as="geometry"/></mxCell>
      </root></mxGraphModel></diagram></mxfile>`,
    );
    const pageScopedSource = `<mxfile host="app.diagrams.net">
        <diagram name="Runtime"><mxGraphModel adaptiveColors="auto"><root>
          <mxCell id="0"/><mxCell id="1" parent="0"/>
          <mxCell id="runtime-api" value="Runtime API" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="40" as="geometry"/></mxCell>
        </root></mxGraphModel></diagram>
        <diagram name="Data Path"><mxGraphModel adaptiveColors="auto"><root>
          <mxCell id="0"/><mxCell id="1" parent="0"/>
          <mxCell id="data-api" value="Data API" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="40" as="geometry"/></mxCell>
        </root></mxGraphModel></diagram>
      </mxfile>`;
    fs.writeFileSync(path.join(temp, "page-scoped.drawio"), pageScopedSource);
    const partiallyAdaptiveSource = pageScopedSource.replace(
      '<diagram name="Data Path"><mxGraphModel adaptiveColors="auto">',
      '<diagram name="Data Path"><mxGraphModel>',
    );
    if (partiallyAdaptiveSource === pageScopedSource) {
      throw new Error("adaptive-color regression fixture did not remove the second page setting");
    }
    fs.writeFileSync(path.join(temp, "partially-adaptive.drawio"), partiallyAdaptiveSource);
    fs.writeFileSync(
      path.join(temp, "remote-logo.drawio"),
      drawioArtifact("https://cdn.example/logo.svg"),
    );
    fs.writeFileSync(path.join(temp, "metadata-logo.drawio"), drawioArtifact());
    fs.copyFileSync(
      path.join(
        process.cwd(),
        "skills/engineering-workflows/drawio-diagrams/references/examples/architecture-icons.drawio",
      ),
      path.join(temp, "native-stencils.drawio"),
    );
    const staticDependency = fs.readFileSync(
      path.join(
        process.cwd(),
        "skills/engineering-workflows/drawio-diagrams/references/examples/animation-static-dependency.drawio",
      ),
      "utf8",
    );
    fs.writeFileSync(
      path.join(temp, "animated-dependency.drawio"),
      staticDependency.replace("dataRole=dependency;", "dataRole=dependency;flowAnimation=1;"),
    );
    fs.writeFileSync(
      path.join(temp, "remote-html-logo.drawio"),
      drawioArtifact(`data:image/svg+xml,${logoPayload}`).replace(
        "</root>",
        '<mxCell id="remote-html" value="&lt;img src=&quot;https://cdn.example/logo.svg&quot;/&gt;" style="text;html=1;" vertex="1" parent="1"><mxGeometry x="140" y="40" width="120" height="60" as="geometry"/></mxCell></root>',
      ),
    );
    const compressedModel = `<mxGraphModel><root>
      <mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="logo" value="Logo" style="shape=image;image=data:image/svg+xml,${logoPayload};aspect=fixed;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="60" height="60" as="geometry"/></mxCell>
    </root></mxGraphModel>`;
    const compressedPayload = zlib
      .deflateRawSync(Buffer.from(encodeURIComponent(compressedModel)))
      .toString("base64");
    fs.writeFileSync(
      path.join(temp, "compressed-logo.drawio"),
      `<mxfile host="app.diagrams.net"><diagram name="Logo">${compressedPayload}</diagram></mxfile>`,
    );
    fs.writeFileSync(
      path.join(temp, "terminal-image-style.drawio"),
      drawioArtifact(`data:image/svg+xml,${logoPayload}`).replace(
        `style="shape=image;image=data:image/svg+xml,${logoPayload};aspect=fixed;"`,
        `style="shape=image;aspect=fixed;image=data:image/svg+xml,${logoPayload};"`,
      ),
    );
    const wrappedDrawio = (imageSource, geometry = true) => `<mxfile host="app.diagrams.net">
  <diagram name="Wrapped"><mxGraphModel adaptiveColors="auto"><root>
    <mxCell id="0"/><mxCell id="1" parent="0"/>
    <object id="logo" label="Logo"><mxCell style="shape=image;image=${imageSource};aspect=fixed;" vertex="1" parent="1">${
      geometry ? '<mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>' : ""
    }</mxCell></object>
  </root></mxGraphModel></diagram>
</mxfile>`;
    fs.writeFileSync(
      path.join(temp, "wrapped-embedded-logo.drawio"),
      wrappedDrawio(`data:image/svg+xml,${logoPayload}`),
    );
    fs.writeFileSync(
      path.join(temp, "wrapped-remote-logo.drawio"),
      wrappedDrawio("https://cdn.example/logo.svg"),
    );
    fs.writeFileSync(
      path.join(temp, "wrapped-missing-geometry.drawio"),
      wrappedDrawio(`data:image/svg+xml,${logoPayload}`, false),
    );
    fs.writeFileSync(
      path.join(temp, "animated-flow-without-arrow.drawio"),
      `<mxfile host="app.diagrams.net"><diagram name="Flow"><mxGraphModel adaptiveColors="auto"><root>
        <mxCell id="0"/><mxCell id="1" parent="0"/>
        <mxCell id="source" value="Source" vertex="1" parent="1"><mxGeometry x="0" y="0" width="80" height="40" as="geometry"/></mxCell>
        <mxCell id="target" value="Target" vertex="1" parent="1"><mxGeometry x="120" y="0" width="80" height="40" as="geometry"/></mxCell>
        <mxCell id="flow" edge="1" parent="1" source="source" target="target" style="dataRole=request;flowAnimation=1;endArrow=none;startArrow=none;"><mxGeometry relative="1" as="geometry"/></mxCell>
      </root></mxGraphModel></diagram></mxfile>`,
    );
    const malformedPercentModel = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="node" value="MARKER" vertex="1" parent="1"><mxGeometry x="0" y="0" width="80" height="40" as="geometry"/></mxCell></root></mxGraphModel>`;
    const malformedPercentPayload = zlib
      .deflateRawSync(
        Buffer.from(encodeURIComponent(malformedPercentModel).replace("MARKER", "%GG")),
      )
      .toString("base64");
    fs.writeFileSync(
      path.join(temp, "malformed-percent.drawio"),
      `<mxfile host="app.diagrams.net"><diagram name="Broken">${malformedPercentPayload}</diagram></mxfile>`,
    );
    fs.writeFileSync(
      path.join(temp, "truncated-image-data-uri.drawio"),
      drawioArtifact("data:image/svg+xml;base64"),
    );
    fs.writeFileSync(
      path.join(temp, "malformed-percent-image.drawio"),
      drawioArtifact(
        "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%3E%GG%3Cpath%20d%3D%22M0%200h24v24H0z%22%2F%3E%3C%2Fsvg%3E",
      ),
    );
    const stableGraphSource = fs.readFileSync(path.join(temp, "stable-graph.drawio"), "utf8");
    fs.writeFileSync(
      path.join(temp, "hidden-profile-cell.drawio"),
      stableGraphSource.replace(
        '<mxCell id="profile-neon-hub"',
        '<mxCell id="profile-neon-hub" visible="0"',
      ),
    );
    fs.writeFileSync(
      path.join(temp, "hidden-profile-layer.drawio"),
      stableGraphSource.replace(
        '<mxCell id="1" parent="0"/>',
        '<mxCell id="1" parent="0" visible="0"/>',
      ),
    );
    fs.writeFileSync(
      path.join(temp, "zero-size-profile-cell.drawio"),
      stableGraphSource.replace(
        '<mxGeometry x="360" y="0" width="80" height="40" as="geometry"/>',
        '<mxGeometry x="360" y="0" width="0" height="0" as="geometry"/>',
      ),
    );
    fs.writeFileSync(
      path.join(temp, "split-profile-pages.drawio"),
      `<mxfile host="app.diagrams.net">
        <diagram name="Runtime"><mxGraphModel adaptiveColors="auto"><root>
          <mxCell id="0"/><mxCell id="1" parent="0"/>
          <mxCell id="profile-neon-hub" value="Hub" style="designProfile=neon-hub;strokeColor=light-dark(#4D7C0F,#D7FF00);" vertex="1" parent="1"><mxGeometry x="0" y="0" width="120" height="60" as="geometry"/></mxCell>
        </root></mxGraphModel></diagram>
        <diagram name="Operations"><mxGraphModel adaptiveColors="auto"><root>
          <mxCell id="0"/><mxCell id="1" parent="0"/>
          <mxCell id="profile-neon-hub" value="Hub" style="designProfile=neon-hub;shadow=0;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="120" height="60" as="geometry"/></mxCell>
        </root></mxGraphModel></diagram>
      </mxfile>`,
    );
    const profileReportPath = path.join(outside, "profile-report.json");
    const profileReportResult = spawnSync(
      "python3",
      [
        path.join(
          process.cwd(),
          "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
        ),
        path.join(temp, "stable-graph.drawio"),
        "--json",
        profileReportPath,
      ],
      { encoding: "utf8" },
    );
    if (profileReportResult.error) throw profileReportResult.error;
    if (profileReportResult.status !== 0) {
      throw new Error(
        `profile-style report fixture failed validation: ${(profileReportResult.stderr || profileReportResult.stdout).trim()}`,
      );
    }
    const profileReport = JSON.parse(fs.readFileSync(profileReportPath, "utf8"));
    const expectedProfileStyleHashes = [
      "profile-neon-hub\0designProfile\0neon-hub",
      "profile-neon-hub\0strokeColor\0light-dark(#4D7C0F,#D7FF00)",
    ].map((value) => createHash("sha256").update(value).digest("hex"));
    if (
      profileReport.adaptive_colors !== true ||
      profileReport.pages?.[0]?.adaptive_colors !== true ||
      !expectedProfileStyleHashes.every(
        (digest) =>
          profileReport.profile_style_sha256s?.includes(digest) &&
          profileReport.pages?.[0]?.profile_style_sha256s?.includes(digest),
      ) ||
      profileReport.profile_style_sha256s?.includes(
        createHash("sha256").update("client\0strokeColor\0#123456").digest("hex"),
      )
    ) {
      throw new Error("draw.io validator emitted incorrect bounded profile-style hashes");
    }
    const partialReportPath = path.join(outside, "partial-adaptive-report.json");
    const partialReportResult = spawnSync(
      "python3",
      [
        path.join(
          process.cwd(),
          "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
        ),
        path.join(temp, "partially-adaptive.drawio"),
        "--json",
        partialReportPath,
      ],
      { encoding: "utf8" },
    );
    if (partialReportResult.error) throw partialReportResult.error;
    if (partialReportResult.status !== 0) {
      throw new Error(
        `partial adaptive-color fixture failed validation: ${(partialReportResult.stderr || partialReportResult.stdout).trim()}`,
      );
    }
    const partialReport = JSON.parse(fs.readFileSync(partialReportPath, "utf8"));
    if (
      partialReport.adaptive_colors !== false ||
      partialReport.pages?.length !== 2 ||
      partialReport.pages[0]?.adaptive_colors !== true ||
      partialReport.pages[1]?.adaptive_colors !== false
    ) {
      throw new Error("draw.io validator emitted incorrect per-page adaptive-color metadata");
    }
    fs.writeFileSync(
      path.join(temp, "nonfinite-geometry.drawio"),
      stableGraphSource.replace('x="0" y="0"', 'x="NaN" y="0"'),
    );
    fs.writeFileSync(
      path.join(temp, "nonfinite-point.drawio"),
      stableGraphSource.replace(
        '<mxGeometry relative="1" as="geometry"/>',
        '<mxGeometry relative="1" as="geometry"><mxPoint x="Infinity" y="20" as="offset"/></mxGeometry>',
      ),
    );

    const listedArtifacts = listArtifacts(temp);
    if (listedArtifacts.some(({ rel }) => rel === "leak.svg")) {
      throw new Error("artifact listing followed a file symlink");
    }
    let symlinkPassed = false;
    try {
      evaluateAssertion(parseAssertion("svg_contains: leak.svg Secret"), listedArtifacts);
      symlinkPassed = true;
    } catch {
      symlinkPassed = false;
    }
    if (symlinkPassed) throw new Error("symlinked SVG passed visual assertions");

    evaluateAssertion(parseAssertion("svg_valid: valid.svg"), listArtifacts(temp));
    evaluateAssertion(parseAssertion("svg_valid: drawio-doctype.svg"), listArtifacts(temp));
    evaluateAssertion(parseAssertion("svg_contains: valid.svg Client"), listArtifacts(temp));
    evaluateAssertion(
      parseAssertion("svg_self_contained_images: embedded-image.svg"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("svg_self_contained_images: embedded-image-with-png-fallback.svg"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("svg_self_contained_images: embedded-use-image.svg"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("svg_self_contained_images: embedded-compact-arc-image.svg"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("svg_self_contained_images: embedded-stroked-open-path-image.svg"),
      listArtifacts(temp),
    );
    for (const safeEmbeddedSvg of [
      "embedded-zero-length-round-image.svg",
      "embedded-zero-length-square-image.svg",
      "embedded-stroked-collinear-image.svg",
      "embedded-stroked-collinear-polyline-image.svg",
      "embedded-filled-non-collinear-image.svg",
      "embedded-resolved-local-resources-image.svg",
      "resolved-local-resources.svg",
    ]) {
      evaluateAssertion(
        parseAssertion(`svg_self_contained_images: ${safeEmbeddedSvg}`),
        listArtifacts(temp),
      );
    }
    evaluateAssertion(
      parseAssertion("svg_self_contained_images: local-resource-hrefs.svg"),
      listArtifacts(temp),
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("svg_self_contained_images: mixed-image.svg"),
          listArtifacts(temp),
        ),
      "mixed remote SVG image source passed svg_self_contained_images",
    );
    for (const unsafeSvg of [
      "foreign-namespace-image.svg",
      "empty-embedded-image.svg",
      "invalid-embedded-image.svg",
      "malformed-percent-image.svg",
      "empty-bounded-image.svg",
      "empty-path-image.svg",
      "zero-sized-image.svg",
      "empty-text-image.svg",
      "malformed-path-image.svg",
      "incomplete-path-image.svg",
      "zero-length-path-image.svg",
      "open-fill-only-path-image.svg",
      "zero-length-butt-path-image.svg",
      "collinear-polyline-fill-only-image.svg",
      "collinear-polygon-fill-only-image.svg",
      "missing-local-image-fragment-image.svg",
      "missing-local-css-fragment-image.svg",
      "embedded-xml-stylesheet-image.svg",
      "embedded-xml-base-image.svg",
      "embedded-animation-image.svg",
      "transparent-current-color-image.svg",
      "stylesheet-hidden-image.svg",
      "rgb-alpha-zero-image.svg",
      "inherited-transparent-current-color-image.svg",
      "nonfinite-path-image.svg",
      "nonfinite-polyline-image.svg",
      "nonfinite-polygon-image.svg",
      "invalid-png-fallback.svg",
      "oversized-png-fallback.svg",
      "foreign-object-remote.svg",
      "css-remote.svg",
      "external-use.svg",
      "external-linear-gradient.svg",
      "external-radial-gradient.svg",
      "external-pattern.svg",
      "external-filter.svg",
      "external-mpath.svg",
      "external-animate.svg",
      "smil-set-mutation.svg",
      "smil-animate-values-mutation.svg",
      "missing-local-image-fragment.svg",
      "missing-local-css-fragment.svg",
      "srcset-remote.svg",
      "remote-text-path.svg",
      "remote-iframe.svg",
      "javascript-link.svg",
      "inline-script.svg",
      "xml-stylesheet.svg",
      "xml-base.svg",
    ]) {
      expectFailure(
        () =>
          evaluateAssertion(
            parseAssertion(`svg_self_contained_images: ${unsafeSvg}`),
            listArtifacts(temp),
          ),
        `${unsafeSvg} passed svg_self_contained_images`,
      );
    }
    evaluateAssertion(
      parseAssertion("drawio_self_contained_svg: embedded-logo.drawio"),
      listArtifacts(temp),
    );
    evaluateAssertion(parseAssertion("drawio_valid: embedded-logo.drawio"), listArtifacts(temp));
    evaluateAssertion(
      parseAssertion("drawio_valid: page-scoped.drawio adaptive_colors=1"),
      listArtifacts(temp),
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_valid: partially-adaptive.drawio adaptive_colors=1"),
          listArtifacts(temp),
        ),
      "multi-page draw.io artifact missing adaptive colors on one page passed adaptive_colors=1",
    );
    expectFailure(
      () => parseAssertion("drawio_valid: page-scoped.drawio adaptive_colors=2"),
      "drawio_valid accepted adaptive_colors other than 1",
    );
    evaluateAssertion(
      parseAssertion("drawio_self_contained_svg: terminal-image-style.drawio"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("drawio_self_contained_svg: wrapped-embedded-logo.drawio"),
      listArtifacts(temp),
    );
    for (const [kind, invalidWrappedOrCompressed, message] of [
      ["drawio_self_contained_svg", "wrapped-remote-logo.drawio", "wrapped remote image source"],
      ["drawio_valid", "wrapped-missing-geometry.drawio", "wrapped image without geometry"],
      ["drawio_valid", "malformed-percent.drawio", "malformed compressed percent encoding"],
      ["drawio_valid", "truncated-image-data-uri.drawio", "truncated image data URI"],
      ["drawio_valid", "malformed-percent-image.drawio", "malformed image percent encoding"],
      ["drawio_valid", "nonfinite-geometry.drawio", "non-finite mxGeometry coordinate"],
      ["drawio_valid", "nonfinite-point.drawio", "non-finite mxPoint coordinate"],
    ]) {
      expectFailure(
        () =>
          evaluateAssertion(
            parseAssertion(`${kind}: ${invalidWrappedOrCompressed}`),
            listArtifacts(temp),
          ),
        `${message} passed ${kind}`,
      );
    }
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_valid: embedded-logo.drawio animation_on=1"),
          listArtifacts(temp),
        ),
      "draw.io artifact without directed or animated edges passed animation_on=1",
    );
    const publicStaticDependency = spawnSync(
      "python3",
      [
        path.join(
          process.cwd(),
          "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
        ),
        path.join(
          process.cwd(),
          "skills/engineering-workflows/drawio-diagrams/references/examples/animation-static-dependency.drawio",
        ),
        "--animation",
        "on",
      ],
      { encoding: "utf8" },
    );
    if (publicStaticDependency.error) throw publicStaticDependency.error;
    if (publicStaticDependency.status !== 0) {
      throw new Error(
        `public draw.io validator rejected a static dependency with --animation on: ${(publicStaticDependency.stderr || publicStaticDependency.stdout).trim()}`,
      );
    }
    evaluateAssertion(
      parseAssertion(
        "drawio_graph: stable-graph.drawio page=Graph ids=client,api,cache native_ids=cache edges=client>api,api>cache not_edges=api>client edge_roles=edge-client-api:request,edge-api-cache:event profile_styles=profile-neon-hub:designProfile:neon-hub,profile-neon-hub:strokeColor:light-dark%28%234D7C0F%2C%23D7FF00%29 links=https://docs.example.invalid/product",
      ),
      listArtifacts(temp),
    );
    for (const invisibleProfileArtifact of [
      "hidden-profile-cell.drawio",
      "hidden-profile-layer.drawio",
      "zero-size-profile-cell.drawio",
    ]) {
      expectFailure(
        () =>
          evaluateAssertion(
            parseAssertion(
              `drawio_graph: ${invisibleProfileArtifact} profile_styles=profile-neon-hub:designProfile:neon-hub`,
            ),
            listArtifacts(temp),
          ),
        `${invisibleProfileArtifact} exposed profile styles from a non-renderable cell`,
      );
    }
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion(
            "drawio_graph: split-profile-pages.drawio profile_styles=profile-neon-hub:designProfile:neon-hub,profile-neon-hub:strokeColor:light-dark%28%234D7C0F%2C%23D7FF00%29,profile-neon-hub:shadow:0",
          ),
          listArtifacts(temp),
        ),
      "profile styles split across pages passed an unscoped drawio_graph assertion",
    );
    evaluateAssertion(
      parseAssertion(
        "drawio_graph: split-profile-pages.drawio page=Runtime profile_styles=profile-neon-hub:designProfile:neon-hub,profile-neon-hub:strokeColor:light-dark%28%234D7C0F%2C%23D7FF00%29",
      ),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion(
        "drawio_graph: split-profile-pages.drawio page=Operations profile_styles=profile-neon-hub:designProfile:neon-hub,profile-neon-hub:shadow:0",
      ),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("drawio_graph: page-scoped.drawio page=Data%20Path ids=data-api"),
      listArtifacts(temp),
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_graph: page-scoped.drawio page=Runtime ids=data-api"),
          listArtifacts(temp),
        ),
      "page-scoped graph assertion accepted an ID from a different page",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_graph: page-scoped.drawio page=Missing ids=runtime-api"),
          listArtifacts(temp),
        ),
      "graph assertion accepted a missing page",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_graph: stable-graph.drawio native_ids=api"),
          listArtifacts(temp),
        ),
      "non-native cell ID passed native_ids",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_graph: stable-graph.drawio edge_roles=edge-client-api:event"),
          listArtifacts(temp),
        ),
      "incorrect edge role passed edge_roles",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_graph: stable-graph.drawio ids=database edges=api>client"),
          listArtifacts(temp),
        ),
      "missing graph IDs and reversed edge pair passed drawio_graph",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_graph: stable-graph.drawio not_edges=client>api"),
          listArtifacts(temp),
        ),
      "forbidden present edge passed drawio_graph",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion(
            "drawio_graph: stable-graph.drawio links=https://docs.example.invalid/missing",
          ),
          listArtifacts(temp),
        ),
      "missing link passed drawio_graph",
    );
    expectFailure(
      () => parseAssertion("drawio_graph: stable-graph.drawio edges=client-api"),
      "invalid drawio_graph edge syntax was accepted",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion(
            "drawio_graph: stable-graph.drawio profile_styles=profile-neon-hub:strokeColor:%23FFFFFF",
          ),
          listArtifacts(temp),
        ),
      "incorrect profile style value passed drawio_graph",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion(
            "drawio_graph: stable-graph.drawio profile_styles=client:strokeColor:%23123456",
          ),
          listArtifacts(temp),
        ),
      "style from an unmarked cell passed profile_styles",
    );
    for (const invalidProfileStyles of [
      "bad%20id:designProfile:neon-hub",
      "profile-neon-hub:bad%3Dkey:value",
      "profile-neon-hub:image:value",
      "profile-neon-hub:strokeColor:%00",
      "profile-neon-hub:strokeColor:%FF",
      `profile-neon-hub:strokeColor:${"a".repeat(2049)}`,
      Array.from({ length: 129 }, (_, index) => `profile-${index}:designProfile:technical`).join(
        ",",
      ),
    ]) {
      expectFailure(
        () =>
          parseAssertion(
            `drawio_graph: stable-graph.drawio profile_styles=${invalidProfileStyles}`,
          ),
        "invalid or oversized profile_styles mapping was accepted",
      );
    }
    const embeddedSvgSha256 = createHash("sha256")
      .update(Buffer.from(embeddedSvgPayload, "base64"))
      .digest("hex");
    evaluateAssertion(
      parseAssertion(`drawio_embeds_svg_sha256: embedded-logo.drawio ${embeddedSvgSha256}`),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion(
        `drawio_embeds_svg_sha256: embedded-logo.drawio ${embeddedSvgSha256} cell=logo`,
      ),
      listArtifacts(temp),
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion(
            `drawio_embeds_svg_sha256: embedded-logo.drawio ${embeddedSvgSha256} cell=other-logo`,
          ),
          listArtifacts(temp),
        ),
      "embedded SVG digest passed with the wrong cell binding",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion(`drawio_embeds_svg_sha256: embedded-logo.drawio ${"0".repeat(64)}`),
          listArtifacts(temp),
        ),
      "wrong embedded SVG digest passed drawio_embeds_svg_sha256",
    );
    expectFailure(
      () => parseAssertion("drawio_embeds_svg_sha256: embedded-logo.drawio not-a-digest"),
      "invalid embedded SVG digest was accepted",
    );
    evaluateAssertion(
      parseAssertion(
        "drawio_valid: embedded-logo.drawio min_pages=1 self_contained_svg=1 uncompressed=1",
      ),
      listArtifacts(temp),
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_valid: embedded-logo.drawio min_pages=2"),
          listArtifacts(temp),
        ),
      "single-page draw.io artifact passed min_pages=2",
    );
    expectFailure(
      () => parseAssertion("drawio_valid: embedded-logo.drawio animation_on=1 animation_off=1"),
      "contradictory drawio_valid animation options were accepted",
    );
    evaluateAssertion(
      parseAssertion("drawio_valid: native-stencils.drawio uncompressed=1 min_native_stencils=3"),
      listArtifacts(temp),
    );
    expectFailure(
      () => parseAssertion("drawio_valid: native-stencils.drawio min_native_stencils=3"),
      "native-stencil inspection without an uncompressed source was accepted",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_valid: animated-dependency.drawio animation_on=1"),
          listArtifacts(temp),
        ),
      "animated structural dependency passed animation_on role separation",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_valid: animated-flow-without-arrow.drawio animation_on=1"),
          listArtifacts(temp),
        ),
      "animated explicit flow without a static arrow passed animation_on",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_self_contained_svg: remote-logo.drawio"),
          listArtifacts(temp),
        ),
      "remote draw.io image source passed drawio_self_contained_svg",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_self_contained_svg: remote-html-logo.drawio"),
          listArtifacts(temp),
        ),
      "remote HTML image passed drawio_self_contained_svg",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_self_contained_svg: compressed-logo.drawio"),
          listArtifacts(temp),
        ),
      "compressed draw.io source passed drawio_self_contained_svg",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("drawio_self_contained_svg: metadata-logo.drawio"),
          listArtifacts(temp),
        ),
      "metadata text passed drawio_self_contained_svg",
    );
    evaluateAssertion(
      parseAssertion("svg_contains: split-visible-text.svg Audit Log"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("svg_has_flow_animation: animated-flow.svg"),
      listArtifacts(temp),
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("svg_has_flow_animation: paused-flow.svg"),
          listArtifacts(temp),
        ),
      "paused SVG connector animation passed svg_has_flow_animation",
    );
    expectFailure(
      () =>
        evaluateAssertion(
          parseAssertion("svg_has_flow_animation: missing-flow-keyframes.svg"),
          listArtifacts(temp),
        ),
      "SVG animation without matching keyframes passed svg_has_flow_animation",
    );
    for (const invalidFlowAnimation of [
      "zero-offset-flow.svg",
      "delay-only-flow.svg",
      "transparent-rgba-flow.svg",
      "transparent-hex-flow.svg",
      "transparent-current-color-flow.svg",
    ]) {
      expectFailure(
        () =>
          evaluateAssertion(
            parseAssertion(`svg_has_flow_animation: ${invalidFlowAnimation}`),
            listArtifacts(temp),
          ),
        `${invalidFlowAnimation} passed svg_has_flow_animation`,
      );
    }
    evaluateAssertion(
      parseAssertion("svg_not_contains: metadata-only.svg Client"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("svg_not_contains: hidden-text.svg Client"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("svg_not_contains: fill-none.svg Client"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("svg_not_contains: fill-opacity-zero.svg Client"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("svg_contains: stroke-visible.svg Client"),
      listArtifacts(temp),
    );
    evaluateAssertion(
      parseAssertion("svg_contains: child-fill-override.svg Client"),
      listArtifacts(temp),
    );
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

    expectFailure(
      () =>
        evaluateAssertion(parseAssertion("svg_valid: wrong-namespace.svg"), listArtifacts(temp)),
      "non-SVG namespace passed svg_valid",
    );
    for (const renderable of [
      "stroked-open-path.svg",
      "zero-length-round-path.svg",
      "zero-length-square-path.svg",
      "stroked-collinear-polygon.svg",
      "stroked-collinear-polyline.svg",
      "filled-non-collinear-polyline.svg",
    ]) {
      evaluateAssertion(parseAssertion(`svg_valid: ${renderable}`), listArtifacts(temp));
    }
    for (const nonRenderable of [
      "empty-root.svg",
      "incomplete-path.svg",
      "zero-length-path.svg",
      "open-fill-only-path.svg",
      "nonfinite-path.svg",
      "nonfinite-polyline.svg",
      "nonfinite-polygon.svg",
      "zero-length-butt-path.svg",
      "collinear-polyline-fill-only.svg",
      "collinear-polygon-fill-only.svg",
      "stylesheet-hidden.svg",
      "stylesheet-transparent.svg",
      "unresolved-paint.svg",
      "rgb-alpha-zero.svg",
      "inherited-transparent-current-color.svg",
    ]) {
      expectFailure(
        () => evaluateAssertion(parseAssertion(`svg_valid: ${nonRenderable}`), listArtifacts(temp)),
        `${nonRenderable} passed svg_valid`,
      );
    }

    let invalidAttributePassed = false;
    try {
      evaluateAssertion(parseAssertion("svg_valid: invalid-attribute.svg"), listArtifacts(temp));
      invalidAttributePassed = true;
    } catch {
      invalidAttributePassed = false;
    }
    if (invalidAttributePassed) throw new Error("malformed SVG attribute passed svg_valid");

    let invalidUtf8Passed = false;
    try {
      evaluateAssertion(parseAssertion("svg_valid: invalid-utf8.svg"), listArtifacts(temp));
      invalidUtf8Passed = true;
    } catch {
      invalidUtf8Passed = false;
    }
    if (invalidUtf8Passed) throw new Error("invalid UTF-8 SVG passed svg_valid");

    for (const unsafeXml of ["entity.svg", "doctype.svg", "utf16-entity.svg"]) {
      let unsafeXmlPassed = false;
      try {
        evaluateAssertion(parseAssertion(`svg_valid: ${unsafeXml}`), listArtifacts(temp));
        unsafeXmlPassed = true;
      } catch {
        unsafeXmlPassed = false;
      }
      if (unsafeXmlPassed) {
        throw new Error(`${unsafeXml} passed svg_valid`);
      }
    }

    for (const oversizedStructure of ["too-many-elements.svg", "too-deep.svg"]) {
      expectFailure(
        () =>
          evaluateAssertion(
            parseAssertion(`svg_valid: ${oversizedStructure}`),
            listArtifacts(temp),
          ),
        `${oversizedStructure} bypassed SVG structural limits`,
      );
    }

    for (const invisible of [
      "metadata-only.svg",
      "hidden-text.svg",
      "fill-none.svg",
      "fill-opacity-zero.svg",
      "font-size-zero.svg",
      "inherited-font-size-zero.svg",
      "transparent-current-color.svg",
      "clipped-text.svg",
      "calculated-opacity.svg",
      "zero-stroke-width.svg",
    ]) {
      let invisiblePassed = false;
      try {
        evaluateAssertion(parseAssertion(`svg_contains: ${invisible} Client`), listArtifacts(temp));
        invisiblePassed = true;
      } catch {
        invisiblePassed = false;
      }
      if (invisiblePassed) throw new Error(`${invisible} passed visible svg_contains`);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
}

export function runVisualAssertionRegressions() {
  runMultilineAssertionRegression();
  runPngNonblankRegression();
  runSvgValidRegression();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runVisualAssertionRegressions();
  console.log("Validated visual assertion fixture regressions.");
}
