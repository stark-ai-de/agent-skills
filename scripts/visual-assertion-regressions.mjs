#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import zlib from "node:zlib";

import {
  evaluateAssertion,
  listArtifacts,
  parseAssertion,
  walkFiles,
} from "./lib/visual-assertions.mjs";

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

function makeRgbaPng(width, height, pixelAt, { interlaced = false } = {}) {
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
    const indexedDuplicateColor = path.join(temp, "indexed-duplicate-color.png");
    const interlacedContent = path.join(temp, "interlaced-content.png");
    const corruptCrc = path.join(temp, "corrupt-crc.png");
    const missingIend = path.join(temp, "missing-iend.png");
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

    for (const invalid of ["corrupt-crc.png", "missing-iend.png"]) {
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

    fs.writeFileSync(
      path.join(temp, "valid.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Client</text></svg>',
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
    evaluateAssertion(parseAssertion("svg_contains: valid.svg Client"), listArtifacts(temp));
    evaluateAssertion(
      parseAssertion("svg_contains: split-visible-text.svg Audit Log"),
      listArtifacts(temp),
    );
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
  runPngNonblankRegression();
  runSvgValidRegression();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runVisualAssertionRegressions();
  console.log("Validated visual assertion fixture regressions.");
}
