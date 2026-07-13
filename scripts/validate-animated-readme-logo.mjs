import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { inspectAnimatedImageFile } from "./lib/animated-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = [
  path.join(root, "skills/engineering-workflows/animated-readme-logo"),
  path.join(root, "incubator/skills/engineering-workflows/animated-readme-logo"),
].find((candidate) => existsSync(candidate));
if (!skillRoot) throw new Error("animated-readme-logo skill directory was not found");

const svgValidator = path.join(skillRoot, "scripts/validate_logo_svg.py");
const animatedCli = path.join(skillRoot, "scripts/inspect-animated-image.mjs");
const auditCli = path.join(skillRoot, "scripts/audit-readme-logo-assets.mjs");
const snippetCli = path.join(skillRoot, "scripts/generate-readme-logo-snippet.mjs");
const skillMarkdown = path.join(skillRoot, "SKILL.md");
const localToolingReference = path.join(skillRoot, "references/local-tooling.md");
const assetPipelineReference = path.join(skillRoot, "references/asset-pipeline.md");
const outputContractReference = path.join(skillRoot, "references/output-contract.md");
const temp = mkdtempSync(path.join(tmpdir(), "animated-readme-logo-validator-"));
let checkCount = 0;

function check(name, callback) {
  try {
    callback();
    checkCount += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.error) throw result.error;
  return { ...result, output: `${result.stdout || ""}${result.stderr || ""}` };
}

function expectRun(name, command, args, status, outputPart) {
  check(name, () => {
    const result = run(command, args);
    assert.equal(result.status, status, result.output);
    if (outputPart) assert.match(result.output, outputPart);
  });
}

function pngCrc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(pngCrc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function pngIhdr(width, height, { bitDepth = 8, colorType = 6 } = {}) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = bitDepth;
  data[9] = colorType;
  return pngChunk("IHDR", data);
}

function apngFrameControl(sequence, width, height) {
  const data = Buffer.alloc(26);
  data.writeUInt32BE(sequence, 0);
  data.writeUInt32BE(width, 4);
  data.writeUInt32BE(height, 8);
  data.writeUInt16BE(1, 20);
  data.writeUInt16BE(10, 22);
  return pngChunk("fcTL", data);
}

function scanline(width, red, green, blue) {
  const bytes = [0];
  for (let pixel = 0; pixel < width; pixel += 1) bytes.push(red, green, blue, 255);
  return zlib.deflateSync(Buffer.from(bytes));
}

function makePng({ animated, width = 2, height = 1 }) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const firstImage = scanline(width, 220, 30, 50);
  if (!animated) {
    return Buffer.concat([
      signature,
      pngIhdr(width, height),
      pngChunk("IDAT", firstImage),
      pngChunk("IEND"),
    ]);
  }
  const animationControl = Buffer.alloc(8);
  animationControl.writeUInt32BE(2, 0);
  animationControl.writeUInt32BE(0, 4);
  const secondData = scanline(width, 20, 80, 220);
  const frameData = Buffer.alloc(4 + secondData.length);
  frameData.writeUInt32BE(2, 0);
  secondData.copy(frameData, 4);
  return Buffer.concat([
    signature,
    pngIhdr(width, height),
    pngChunk("acTL", animationControl),
    apngFrameControl(0, width, height),
    pngChunk("IDAT", firstImage),
    apngFrameControl(1, width, height),
    pngChunk("fdAT", frameData),
    pngChunk("IEND"),
  ]);
}

function gifFrame(width, height) {
  const descriptor = Buffer.alloc(10);
  descriptor[0] = 0x2c;
  descriptor.writeUInt16LE(width, 5);
  descriptor.writeUInt16LE(height, 7);
  return Buffer.concat([
    Buffer.from([0x21, 0xf9, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00]),
    descriptor,
    Buffer.from([0x02, 0x02, 0x44, 0x0a, 0x00]),
  ]);
}

function makeGif({ animated, width = 2, height = 1 }) {
  const header = Buffer.alloc(13);
  header.write("GIF89a", 0, "ascii");
  header.writeUInt16LE(width, 6);
  header.writeUInt16LE(height, 8);
  header[10] = 0x80;
  const globalColorTable = Buffer.from([0, 0, 0, 255, 255, 255]);
  const loop = Buffer.from([
    0x21,
    0xff,
    0x0b,
    ...Buffer.from("NETSCAPE2.0", "ascii"),
    0x03,
    0x01,
    0x00,
    0x00,
    0x00,
  ]);
  return Buffer.concat([
    header,
    globalColorTable,
    ...(animated ? [loop] : []),
    gifFrame(width, height),
    ...(animated ? [gifFrame(width, height)] : []),
    Buffer.from([0x3b]),
  ]);
}

function uint24Le(value) {
  return Buffer.from([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff]);
}

function webpChunk(type, data) {
  const header = Buffer.alloc(8);
  header.write(type, 0, "ascii");
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, data.length & 1 ? Buffer.from([0]) : Buffer.alloc(0)]);
}

function vp8l(width, height) {
  const data = Buffer.alloc(6);
  data[0] = 0x2f;
  data.writeUInt32LE((width - 1) | ((height - 1) << 14), 1);
  return data;
}

function anmf(width, height, colorByte) {
  const header = Buffer.alloc(16);
  uint24Le(width - 1).copy(header, 6);
  uint24Le(height - 1).copy(header, 9);
  uint24Le(100).copy(header, 12);
  return webpChunk(
    "ANMF",
    Buffer.concat([
      header,
      webpChunk("VP8L", Buffer.concat([vp8l(width, height), Buffer.from([colorByte])])),
    ]),
  );
}

function makeWebp({ animated, width = 2, height = 1 }) {
  let chunks;
  if (animated) {
    const vp8x = Buffer.alloc(10);
    vp8x[0] = 0x02;
    uint24Le(width - 1).copy(vp8x, 4);
    uint24Le(height - 1).copy(vp8x, 7);
    const anim = Buffer.alloc(6);
    anim.writeUInt16LE(0, 4);
    chunks = Buffer.concat([
      webpChunk("VP8X", vp8x),
      webpChunk("ANIM", anim),
      anmf(width, height, 0),
      anmf(width, height, 1),
    ]);
  } else {
    chunks = webpChunk("VP8L", Buffer.concat([vp8l(width, height), Buffer.from([0])]));
  }
  const riff = Buffer.alloc(12);
  riff.write("RIFF", 0, "ascii");
  riff.writeUInt32LE(chunks.length + 4, 4);
  riff.write("WEBP", 8, "ascii");
  return Buffer.concat([riff, chunks]);
}

function appendWebpChunk(webp, type, data) {
  const chunks = Buffer.concat([webp.subarray(12), webpChunk(type, data)]);
  const riff = Buffer.from(webp.subarray(0, 12));
  riff.writeUInt32LE(chunks.length + 4, 4);
  return Buffer.concat([riff, chunks]);
}

function insertPngChunkBeforeIend(png, type, data) {
  return Buffer.concat([png.subarray(0, -12), pngChunk(type, data), png.subarray(-12)]);
}

function fixture(name, data) {
  const file = path.join(temp, name);
  writeFileSync(file, data);
  return file;
}

function snippetArgs(assetPath) {
  return [
    snippetCli,
    "--fallback",
    assetPath,
    "--alt",
    "Fixture logo",
    "--width",
    "64",
    "--height",
    "64",
    "--mode",
    "static-only",
  ];
}

try {
  check("local-tool installation and browser fallback contract", () => {
    const skill = readFileSync(skillMarkdown, "utf8");
    const localTooling = readFileSync(localToolingReference, "utf8");
    const assetPipeline = readFileSync(assetPipelineReference, "utf8");
    const outputContract = readFileSync(outputContractReference, "utf8");

    assert.match(skill, /requested export or inspection needs a missing local command/);
    assert.match(skill, /Keep provider approval and local-tool installation approval as separate/);
    assert.match(localTooling, /Ask for explicit approval of that exact installation/);
    assert.match(
      localTooling,
      /Verify executable versions and the requested encoder, muxer, and filter support/,
    );
    assert.match(localTooling, /agent-browser skills get core/);
    assert.match(localTooling, /Only when no compatible local browser exists/);
    assert.match(assetPipeline, /required exporter or inspector command/);
    assert.match(
      outputContract,
      /Local-tool approval: pending \| approved \| declined \| not-required/,
    );
  });

  const formats = [
    {
      name: "gif",
      animated: makeGif({ animated: true }),
      static: makeGif({ animated: false }),
    },
    {
      name: "apng",
      animated: makePng({ animated: true }),
      static: makePng({ animated: false }),
    },
    {
      name: "webp",
      animated: makeWebp({ animated: true }),
      static: makeWebp({ animated: false }),
    },
  ].map((entry) => ({
    ...entry,
    animatedFile: fixture(`animated.${entry.name}`, entry.animated),
    staticFile: fixture(`static.${entry.name === "apng" ? "png" : entry.name}`, entry.static),
    truncatedFile: fixture(
      `truncated.${entry.name}`,
      entry.animated.subarray(0, entry.animated.length - 1),
    ),
  }));

  for (const format of formats) {
    check(`${format.name} library inspection`, () => {
      const inspected = inspectAnimatedImageFile(format.animatedFile);
      assert.equal(inspected.width, 2);
      assert.equal(inspected.height, 1);
      assert.equal(inspected.frameCount, 2);
      assert.equal(inspected.animated, true);
      assert.equal(inspected.loop, "infinite");
      assert.equal(inspected.format, format.name === "apng" ? "apng" : format.name);
    });
    expectRun(
      `${format.name} CLI validation`,
      "node",
      [animatedCli, format.animatedFile],
      0,
      /Frames: 2/,
    );
    check(`${format.name} JSON validation`, () => {
      const parsed = JSON.parse(run("node", [animatedCli, "--json", format.animatedFile]).stdout);
      assert.equal(parsed.valid, true);
      assert.equal(parsed.frameCount, 2);
      assert.equal(parsed.animated, true);
    });
    expectRun(
      `${format.name} static rejection`,
      "node",
      [animatedCli, format.staticFile],
      1,
      /\[STATIC_IMAGE]/,
    );
    expectRun(
      `${format.name} truncation rejection`,
      "node",
      [animatedCli, format.truncatedFile],
      1,
      /\[(?:TRUNCATED_FILE|MISSING_GIF_TRAILER|WEBP_SIZE_MISMATCH)]/,
    );
    expectRun(
      `${format.name} frame limit`,
      "node",
      [animatedCli, "--max-frames", "1", format.animatedFile],
      1,
      /\[FRAME_LIMIT]/,
    );
    expectRun(
      `${format.name} dimension limit`,
      "node",
      [animatedCli, "--max-dimension", "1", format.animatedFile],
      1,
      /\[DIMENSION_LIMIT]/,
    );
    expectRun(
      `${format.name} chunk limit`,
      "node",
      [animatedCli, "--max-chunk-bytes", "1", format.animatedFile],
      1,
      /\[CHUNK_LIMIT]/,
    );
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const apngControl = Buffer.alloc(8);
  apngControl.writeUInt32BE(2, 0);
  const firstApngData = scanline(2, 220, 30, 50);
  const secondApngData = scanline(2, 20, 80, 220);
  const frameData = (sequence, compressed) => {
    const data = Buffer.alloc(4 + compressed.length);
    data.writeUInt32BE(sequence, 0);
    compressed.copy(data, 4);
    return pngChunk("fdAT", data);
  };
  const defaultImageExcluded = fixture(
    "default-image-excluded.apng",
    Buffer.concat([
      pngSignature,
      pngIhdr(2, 1),
      pngChunk("acTL", apngControl),
      pngChunk("IDAT", firstApngData),
      apngFrameControl(0, 2, 1),
      frameData(1, secondApngData),
      apngFrameControl(2, 2, 1),
      frameData(3, firstApngData),
      pngChunk("IEND"),
    ]),
  );
  expectRun(
    "APNG accepts excluded default image ordering",
    "node",
    [animatedCli, defaultImageExcluded],
    0,
    /Frames: 2/,
  );
  const mismatchedIncludedDefault = fixture(
    "mismatched-included-default.apng",
    Buffer.concat([
      pngSignature,
      pngIhdr(2, 1),
      pngChunk("acTL", apngControl),
      apngFrameControl(0, 1, 1),
      pngChunk("IDAT", firstApngData),
      apngFrameControl(1, 2, 1),
      frameData(2, secondApngData),
      pngChunk("IEND"),
    ]),
  );
  expectRun(
    "APNG included default frame must match canvas",
    "node",
    [animatedCli, mismatchedIncludedDefault],
    1,
    /\[INVALID_FCTL]/,
  );
  const fdatBeforeIdat = fixture(
    "fdat-before-idat.apng",
    Buffer.concat([
      pngSignature,
      pngIhdr(2, 1),
      pngChunk("acTL", apngControl),
      apngFrameControl(0, 2, 1),
      frameData(1, firstApngData),
      apngFrameControl(2, 2, 1),
      frameData(3, secondApngData),
      pngChunk("IDAT", firstApngData),
      pngChunk("IEND"),
    ]),
  );
  expectRun(
    "APNG rejects fdAT before IDAT",
    "node",
    [animatedCli, fdatBeforeIdat],
    1,
    /\[INVALID_FDAT]/,
  );
  const idatAfterFdat = fixture(
    "idat-after-fdat.apng",
    Buffer.concat([
      pngSignature,
      pngIhdr(2, 1),
      pngChunk("acTL", apngControl),
      apngFrameControl(0, 2, 1),
      pngChunk("IDAT", firstApngData),
      apngFrameControl(1, 2, 1),
      frameData(2, secondApngData),
      pngChunk("IDAT", firstApngData),
      pngChunk("IEND"),
    ]),
  );
  expectRun(
    "APNG rejects IDAT after fdAT",
    "node",
    [animatedCli, idatAfterFdat],
    1,
    /\[PNG_ORDER]/,
  );
  const indexedWithoutPalette = fixture(
    "indexed-without-palette.apng",
    Buffer.concat([
      pngSignature,
      pngIhdr(2, 1, { bitDepth: 8, colorType: 3 }),
      pngChunk("acTL", apngControl),
      apngFrameControl(0, 2, 1),
      pngChunk("IDAT", firstApngData),
      pngChunk("IEND"),
    ]),
  );
  expectRun(
    "APNG indexed image requires PLTE",
    "node",
    [animatedCli, indexedWithoutPalette],
    1,
    /\[MISSING_PLTE]/,
  );
  const latePalette = fixture(
    "late-palette.apng",
    Buffer.concat([
      pngSignature,
      pngIhdr(2, 1),
      pngChunk("acTL", apngControl),
      apngFrameControl(0, 2, 1),
      pngChunk("IDAT", firstApngData),
      pngChunk("PLTE", Buffer.from([0, 0, 0])),
      pngChunk("IEND"),
    ]),
  );
  expectRun(
    "APNG rejects PLTE after IDAT",
    "node",
    [animatedCli, latePalette],
    1,
    /\[INVALID_PLTE]/,
  );

  const animatedGif = formats.find((entry) => entry.name === "gif").animated;
  const gifComment = fixture(
    "metadata-comment.gif",
    Buffer.concat([
      animatedGif.subarray(0, -1),
      Buffer.from([0x21, 0xfe, 0x01, 0x78, 0x00]),
      animatedGif.subarray(-1),
    ]),
  );
  expectRun(
    "GIF comment metadata rejection",
    "node",
    [animatedCli, gifComment],
    1,
    /\[HIDDEN_METADATA]/,
  );
  const gifApplication = fixture(
    "metadata-application.gif",
    Buffer.concat([
      animatedGif.subarray(0, -1),
      Buffer.from([0x21, 0xff, 0x0b, ...Buffer.from("XMP DataXMP", "ascii")]),
      Buffer.from([0x01, 0x78, 0x00]),
      animatedGif.subarray(-1),
    ]),
  );
  expectRun(
    "GIF application metadata rejection",
    "node",
    [animatedCli, gifApplication],
    1,
    /\[HIDDEN_METADATA]/,
  );

  const animatedPng = formats.find((entry) => entry.name === "apng").animated;
  for (const [name, type] of [
    ["text", "tEXt"],
    ["exif", "eXIf"],
    ["icc", "iCCP"],
  ]) {
    const metadataPng = fixture(
      `metadata-${name}.apng`,
      insertPngChunkBeforeIend(animatedPng, type, Buffer.from("neutral-marker")),
    );
    expectRun(
      `PNG ${type} metadata rejection`,
      "node",
      [animatedCli, metadataPng],
      1,
      /\[HIDDEN_METADATA]/,
    );
  }
  const unknownAncillaryPng = fixture(
    "unknown-ancillary.apng",
    insertPngChunkBeforeIend(animatedPng, "vpAg", Buffer.from([0])),
  );
  expectRun(
    "PNG unknown ancillary rejection",
    "node",
    [animatedCli, unknownAncillaryPng],
    1,
    /\[UNSUPPORTED_ANCILLARY_CHUNK]/,
  );

  const animatedWebp = formats.find((entry) => entry.name === "webp").animated;
  for (const type of ["EXIF", "XMP ", "ICCP"]) {
    const metadataWebp = fixture(
      `metadata-${type.trim().toLowerCase()}.webp`,
      appendWebpChunk(animatedWebp, type, Buffer.from("neutral-marker")),
    );
    expectRun(
      `WebP ${type.trim()} metadata rejection`,
      "node",
      [animatedCli, metadataWebp],
      1,
      /\[HIDDEN_METADATA]/,
    );
  }
  const metadataFlagWebpBytes = Buffer.from(animatedWebp);
  metadataFlagWebpBytes[20] |= 0x08;
  const metadataFlagWebp = fixture("metadata-flag.webp", metadataFlagWebpBytes);
  expectRun(
    "WebP metadata flag rejection",
    "node",
    [animatedCli, metadataFlagWebp],
    1,
    /\[HIDDEN_METADATA]/,
  );

  if (process.platform !== "win32") {
    const fifo = path.join(temp, "animated-input.fifo");
    check("create FIFO fixture", () => {
      const result = spawnSync("mkfifo", [fifo], {
        encoding: "utf8",
        timeout: 5_000,
      });
      assert.equal(result.status, 0, `${result.stdout || ""}${result.stderr || ""}`);
    });
    expectRun(
      "animated inspector rejects FIFO without blocking",
      "node",
      [animatedCli, fifo],
      2,
      /\[NOT_REGULAR_FILE]/,
    );
  }

  expectRun(
    "animated file-size limit",
    "node",
    [animatedCli, "--max-file-bytes", "10", formats[0].animatedFile],
    1,
    /\[FILE_LIMIT]/,
  );
  expectRun("animated CLI usage", "node", [animatedCli, "--max-frames", "0"], 2, /INVALID_OPTION/);

  const validSvg = fixture(
    "valid.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs><linearGradient id="paint"><stop stop-color="#ff3050"/><stop offset="1" stop-color="#2450ee"/></linearGradient></defs>
  <circle cx="32" cy="32" r="24" fill="url(#paint)"/>
</svg>`,
  );
  expectRun("valid SVG", "python3", [svgValidator, validSvg], 0, /VALID SVG:/);
  check("valid SVG JSON", () => {
    const result = run("python3", [svgValidator, "--json", validSvg]);
    assert.equal(result.status, 0, result.output);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.valid, true);
    assert.deepEqual(parsed.viewBox, [0, 0, 64, 64]);
  });
  const bomSvg = fixture(
    "utf8-bom.svg",
    Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(
        `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>`,
      ),
    ]),
  );
  expectRun("UTF-8 BOM SVG", "python3", [svgValidator, bomSvg], 0, /VALID SVG:/);
  const declaredUtf8Svg = fixture(
    "utf8-declaration.svg",
    `<?xml version="1.0" encoding="UTF-8"?><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0h1v1z"/></svg>`,
  );
  expectRun("UTF-8 XML declaration", "python3", [svgValidator, declaredUtf8Svg], 0, /VALID SVG:/);
  const validUseSvg = fixture(
    "valid-use.svg",
    `<svg width="10" height="10" viewBox="0 0 10 10"><defs><path id="mark" d="M1 1h8v8H1z"/></defs><use href="#mark"/></svg>`,
  );
  expectRun(
    "same-document use with defs geometry",
    "python3",
    [svgValidator, validUseSvg],
    0,
    /VALID SVG:/,
  );
  const validLocalCssReferenceSvg = fixture(
    "valid-local-css-reference.svg",
    `<svg width="10" height="10" viewBox="0 0 10 10"><defs><linearGradient id="paint"><stop stop-color="#123456"/><stop offset="1" stop-color="#abcdef"/></linearGradient></defs><circle cx="5" cy="5" r="4" style="fill:url(#paint)"/></svg>`,
  );
  expectRun(
    "literal local CSS fragment reference",
    "python3",
    [svgValidator, validLocalCssReferenceSvg],
    0,
    /VALID SVG:/,
  );
  const validClipBackgroundSvg = fixture(
    "valid-clip-background.svg",
    `<svg width="10" height="10" viewBox="0 0 10 10"><defs><clipPath id="canvas-clip"><rect width="100%" height="100%"/></clipPath></defs><circle cx="5" cy="5" r="4" clip-path="url(#canvas-clip)"/><circle cx="5" cy="5" r="2"/></svg>`,
  );
  expectRun(
    "full-canvas rect inside clipPath is non-rendering",
    "python3",
    [svgValidator, validClipBackgroundSvg],
    0,
    /VALID SVG:/,
  );
  const validHiddenBackgroundSvg = fixture(
    "valid-hidden-background.svg",
    `<svg width="10" height="10" viewBox="0 0 10 10"><g display="none"><rect width="100%" height="100%" fill="#fff"/></g><circle cx="5" cy="5" r="4"/></svg>`,
  );
  expectRun(
    "hidden full-canvas rect is non-rendering",
    "python3",
    [svgValidator, validHiddenBackgroundSvg],
    0,
    /VALID SVG:/,
  );
  for (const [name, markup, label] of [
    [
      "valid-inherited-transparent-background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g fill-opacity="0"><rect width="10" height="10" fill="#fff"/></g><circle cx="5" cy="5" r="4"/></svg>`,
      "inherited zero fill opacity is not an opaque background",
    ],
    [
      "valid-inherited-no-fill-background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g fill="none"><rect width="10" height="10"/></g><circle cx="5" cy="5" r="4"/></svg>`,
      "inherited no-fill is not an opaque background",
    ],
    [
      "valid-style-transparent-background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g style="fill-opacity: 0"><rect width="10" height="10" fill="#fff"/></g><circle cx="5" cy="5" r="4"/></svg>`,
      "style-inherited transparency is not an opaque background",
    ],
  ]) {
    expectRun(label, "python3", [svgValidator, fixture(name, markup)], 0, /VALID SVG:/);
  }
  const sharedUseDefinitions = [
    '<g id="g0"><circle cx="5" cy="5" r="2"/></g>',
    ...Array.from(
      { length: 22 },
      (_, index) =>
        '<g id="g' +
        (index + 1) +
        '"><use href="#g' +
        index +
        '"/><use href="#g' +
        index +
        '"/></g>',
    ),
  ].join("");
  const sharedUseDagSvg = fixture(
    "shared-use-dag.svg",
    '<svg width="10" height="10" viewBox="0 0 10 10"><defs>' +
      sharedUseDefinitions +
      '</defs><use href="#g22"/></svg>',
  );
  expectRun(
    "shared use DAG remains bounded",
    "python3",
    [svgValidator, sharedUseDagSvg],
    0,
    /VALID SVG:/,
  );
  for (const [name, markup, label] of [
    [
      "valid-transformed-off-canvas-circle.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g transform="translate(-20 -20)"><circle cx="22" cy="22" r="2"/></g></svg>`,
      "transformed geometry remains conservatively renderable",
    ],
    [
      "valid-translated-use.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><path id="mark" d="M20 20h4v4h-4z"/></defs><use href="#mark" x="-20" y="-20"/></svg>`,
      "use translation preserves referenced resource bounds",
    ],
  ]) {
    expectRun(label, "python3", [svgValidator, fixture(name, markup)], 0, /VALID SVG:/);
  }
  const invalidSvgs = [
    [
      "malformed.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path></svg>`,
      /malformed-xml/,
    ],
    [
      "doctype.svg",
      `<!DOCTYPE svg [<!ENTITY bad "x">]><svg width="10" height="10" viewBox="0 0 10 10"/>`,
      /doctype-forbidden/,
    ],
    [
      "script.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><script>alert(1)</script></svg>`,
      /active-content/,
    ],
    [
      "xml-comment.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><!-- hidden authoring note --><path d="M1 1h8v8H1z"/></svg>`,
      /xml-comment-forbidden/,
    ],
    [
      "metadata.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><metadata>hidden authoring marker</metadata><path d="M1 1h8v8H1z"/></svg>`,
      /hidden-metadata/,
    ],
    [
      "custom-private-element.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><private-data>hidden authoring marker</private-data><path d="M1 1h8v8H1z"/></svg>`,
      /unsupported-svg-element/,
    ],
    [
      "custom-private-attribute.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path data-private-note="hidden authoring marker" d="M1 1h8v8H1z"/></svg>`,
      /unsupported-svg-attribute/,
    ],
    [
      "foreign.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><foreignObject/></svg>`,
      /active-content/,
    ],
    [
      "event.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10" onload="x"><circle r="1"/></svg>`,
      /event-handler/,
    ],
    [
      "external.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><use href="https://example.com/a.svg#x"/></svg>`,
      /external-reference/,
    ],
    [
      "foreign-root.svg",
      `<x:svg xmlns:x="urn:not-svg" width="10" height="10" viewBox="0 0 10 10"><x:path d="M1 1h8v8H1z"/></x:svg>`,
      /root-not-svg/,
    ],
    [
      "foreign-shape.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="urn:not-svg" width="10" height="10" viewBox="0 0 10 10"><x:path d="M1 1h8v8H1z"/></svg>`,
      /foreign-namespace-element/,
    ],
    [
      "namespace-reset-shape.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><path xmlns="" d="M1 1h8v8H1z"/></svg>`,
      /foreign-namespace-element/,
    ],
    [
      "mixed-svg-namespace-shape.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path xmlns="http://www.w3.org/2000/svg" d="M1 1h8v8H1z"/></svg>`,
      /foreign-namespace-element/,
    ],
    [
      "data.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><image href="data:image/png;base64,AA=="/></svg>`,
      /embedded-raster-image/,
    ],
    [
      "traversal.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><use href="%2e%2e/secret.svg#x"/></svg>`,
      /unsafe-path-reference/,
    ],
    ["dimensions.svg", `<svg width="100%" height="0" viewBox="0 0 10 10"/>`, /invalid-dimensions/],
    ["viewbox.svg", `<svg width="10" height="10" viewBox="0 0 -1 10"/>`, /invalid-viewbox/],
    [
      "background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><rect width="100%" height="100%" fill="#fff"/></svg>`,
      /opaque-full-canvas-background/,
    ],
    [
      "referenced-background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><rect id="bg" width="10" height="10" fill="#fff"/></defs><use href="#bg"/></svg>`,
      /opaque-full-canvas-background/,
    ],
    [
      "partial-fill-opacity-background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10" fill="#fff" fill-opacity="0.5"/></svg>`,
      /opaque-full-canvas-background/,
    ],
    [
      "partial-color-alpha-background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10" fill="rgba(255,255,255,0.5)"/></svg>`,
      /opaque-full-canvas-background/,
    ],
    [
      "partial-ancestor-opacity-background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g opacity="0.5"><rect width="10" height="10" fill="#fff"/></g></svg>`,
      /opaque-full-canvas-background/,
    ],
    [
      "identity-transform-background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10" fill="#fff" transform="translate(0 0)"/></svg>`,
      /opaque-full-canvas-background/,
    ],
    [
      "rounded-background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10" rx="0.001" fill="#fff"/></svg>`,
      /opaque-full-canvas-background/,
    ],
    [
      "gradient-background.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><linearGradient id="paint"><stop stop-color="#fff"/><stop offset="1" stop-color="#ddd"/></linearGradient></defs><rect width="10" height="10" fill="url(#paint)"/></svg>`,
      /opaque-full-canvas-background/,
    ],
    [
      "image.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><image href="#bitmap" width="10" height="10"/></svg>`,
      /embedded-raster-image/,
    ],
    ["empty.svg", `<svg width="10" height="10" viewBox="0 0 10 10"/>`, /no-renderable-graphic/],
    [
      "defs-only.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><path id="mark" d="M0 0h10v10z"/></defs></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "off-canvas-circle.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="20" cy="20" r="2"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "off-canvas-rect.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><rect x="-20" y="-20" width="4" height="4"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "off-canvas-path.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M20 20h4v4h-4z"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "off-canvas-use.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><path id="mark" d="M20 20h4v4h-4z"/></defs><use href="#mark"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "empty-path.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "zero-path.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L1 1"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "open-unpainted-path.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "two-point-unpainted-polyline.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1 1 9 9"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "empty-text.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><text>  </text></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "zero-rect.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><rect width="0" height="8"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "zero-circle.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="0"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "zero-line.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="2" y2="2"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "unresolved-use.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><use href="#missing"/></svg>`,
      /unresolved-use/,
    ],
    [
      "encoded-use-fragment.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><path id="mark" d="M1 1h8v8H1z"/></defs><use href="%23mark"/></svg>`,
      /nonlocal-reference/,
    ],
    [
      "double-encoded-use-fragment.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><path id="mark" d="M1 1h8v8H1z"/></defs><use href="%2523mark"/></svg>`,
      /nonlocal-reference/,
    ],
    [
      "encoded-paint-fragment.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><linearGradient id="paint"><stop stop-color="#000"/></linearGradient></defs><circle cx="5" cy="5" r="4" fill="url(%23paint)"/></svg>`,
      /nonlocal-reference/,
    ],
    [
      "unresolved-paint-fragment.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="url(#missing)"/></svg>`,
      /unresolved-fragment-reference/,
    ],
    [
      "invalid-clip-target.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><linearGradient id="paint"><stop stop-color="#000"/></linearGradient></defs><circle cx="5" cy="5" r="4" clip-path="url(#paint)"/></svg>`,
      /invalid-fragment-target/,
    ],
    [
      "empty-use-target.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><path id="empty"/></defs><use href="#empty"/></svg>`,
      /empty-use-target/,
    ],
    [
      "cyclic-use.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><g id="a"><use href="#b"/></g><g id="b"><use href="#a"/></g></defs><use href="#a"/></svg>`,
      /cyclic-use-reference/,
    ],
    [
      "zero-use-size.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><symbol id="mark" viewBox="0 0 10 10"><path d="M1 1h8v8H1z"/></symbol></defs><use href="#mark" width="0" height="10"/></svg>`,
      /zero-use-size/,
    ],
    [
      "hidden-opacity.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g opacity="0"><path d="M1 1h8v8H1z"/></g></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "hidden-display.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g style="display: none"><path d="M1 1h8v8H1z"/></g></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "hidden-visibility.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g visibility="hidden"><path d="M1 1h8v8H1z"/></g></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "hidden-important-opacity.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g style="opacity: 0 !important"><path d="M1 1h8v8H1z"/></g></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "no-paint.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="none"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "empty-clip-path.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><clipPath id="clip"/></defs><circle cx="5" cy="5" r="4" clip-path="url(#clip)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "empty-mask.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><mask id="mask"/></defs><circle cx="5" cy="5" r="4" mask="url(#mask)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "black-mask.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><mask id="mask"><rect width="10" height="10" fill="#000"/></mask></defs><circle cx="5" cy="5" r="4" mask="url(#mask)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "inherited-zero-font-size.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g font-size="0"><text x="1" y="5">Logo</text></g></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "transparent-hsla.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="hsla(0,100%,50%,0)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "transparent-current-color.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10" color="transparent"><rect x="1" y="1" width="8" height="8" fill="currentColor"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "calculated-zero-opacity.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" opacity="calc(0)"/></svg>`,
      /unsupported-opacity-value/,
    ],
    [
      "inherited-no-paint.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g fill="none" stroke="none"><circle cx="5" cy="5" r="4"/></g></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "transparent-gradient-paint.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><linearGradient id="paint"><stop stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="transparent"/></linearGradient></defs><circle cx="5" cy="5" r="4" fill="url(#paint)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "transparent-current-color-gradient.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10" color="transparent"><defs><linearGradient id="paint"><stop stop-color="currentColor"/></linearGradient></defs><circle cx="5" cy="5" r="4" fill="url(#paint)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "empty-pattern-paint.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><pattern id="paint" width="1" height="1"/></defs><rect x="1" y="1" width="8" height="8" fill="url(#paint)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "empty-inherited-pattern-paint.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><pattern id="base" width="1" height="1"/><pattern id="paint" href="#base" width="1" height="1"/></defs><rect x="1" y="1" width="8" height="8" fill="url(#paint)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "no-paint-pattern.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><pattern id="paint" width="1" height="1"><rect width="1" height="1" fill="none" stroke="none"/></pattern></defs><rect x="1" y="1" width="8" height="8" fill="url(#paint)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "hidden-pattern.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><pattern id="paint" width="1" height="1"><rect width="1" height="1" display="none"/></pattern></defs><rect x="1" y="1" width="8" height="8" fill="url(#paint)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "transparent-pattern.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><pattern id="paint" width="1" height="1"><rect width="1" height="1" fill="transparent"/></pattern></defs><rect x="1" y="1" width="8" height="8" fill="url(#paint)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "unsized-pattern.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><pattern id="paint"><rect width="1" height="1"/></pattern></defs><rect x="1" y="1" width="8" height="8" fill="url(#paint)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "zero-sized-pattern.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><pattern id="paint" width="0" height="0"><rect width="1" height="1"/></pattern></defs><rect x="1" y="1" width="8" height="8" fill="url(#paint)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "unreferenced-pattern-symbol.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><pattern id="paint" width="1" height="1"><symbol><rect width="1" height="1"/></symbol></pattern></defs><rect x="1" y="1" width="8" height="8" fill="url(#paint)"/></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "css-variable-paint.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style="--paint:none;fill:var(--paint)"/></svg>`,
      /css-variable-forbidden/,
    ],
    [
      "cyclic-gradient-reference.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><defs><linearGradient id="first" href="#second"/><linearGradient id="second" href="#first"/></defs><circle cx="5" cy="5" r="4" fill="url(#first)"/></svg>`,
      /cyclic-gradient-reference/,
    ],
    [
      "stylesheet-hidden.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><style>.mark{display:none}</style><circle class="mark" cx="5" cy="5" r="4"/></svg>`,
      /stylesheet-forbidden/,
    ],
    [
      "zero-font-size.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><text font-size="0em">Logo</text></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "calculated-font-size.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><text font-size="calc(0)">Logo</text></svg>`,
      /unsupported-length-value/,
    ],
    [
      "calculated-stroke-width.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" fill="none" stroke="#000" stroke-width="calc(0)"/></svg>`,
      /unsupported-length-value/,
    ],
    [
      "singular-scale.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g transform="scale(0)"><rect x="1" y="1" width="8" height="8"/></g></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "singular-matrix.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><g transform="matrix(1 0 0 0 0 0)"><rect x="1" y="1" width="8" height="8"/></g></svg>`,
      /no-renderable-graphic/,
    ],
    [
      "escaped-style-url.svg",
      String.raw`<svg width="10" height="10" viewBox="0 0 10 10"><style>path{fill:u\72l(https://example.com/leak)}</style><path d="M1 1h8v8H1z"/></svg>`,
      /css-escape-forbidden/,
    ],
    [
      "escaped-style-import.svg",
      String.raw`<svg width="10" height="10" viewBox="0 0 10 10"><style>@im\70ort "https://example.com/leak.css";</style><path d="M1 1h8v8H1z"/></svg>`,
      /css-escape-forbidden/,
    ],
    [
      "escaped-style-attribute.svg",
      String.raw`<svg width="10" height="10" viewBox="0 0 10 10"><path style="fill:u\72l(https://example.com/leak)" d="M1 1h8v8H1z"/></svg>`,
      /css-escape-forbidden/,
    ],
    [
      "escaped-presentation-value.svg",
      String.raw`<svg width="10" height="10" viewBox="0 0 10 10"><path fill="u\72l(https://example.com/leak)" d="M1 1h8v8H1z"/></svg>`,
      /css-escape-forbidden/,
    ],
    [
      "comment-spliced-style-url.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><style>path{fill:u/**/rl(https://example.com/leak)}</style><path d="M1 1h8v8H1z"/></svg>`,
      /css-comment-forbidden/,
    ],
    [
      "comment-spliced-style-import.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><style>@im/**/port "https://example.com/leak.css";</style><path d="M1 1h8v8H1z"/></svg>`,
      /css-comment-forbidden/,
    ],
    [
      "comment-spliced-style-attribute.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path style="fill:u/**/rl(https://example.com/leak)" d="M1 1h8v8H1z"/></svg>`,
      /css-comment-forbidden/,
    ],
    [
      "comment-spliced-presentation.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path fill="u/**/rl(https://example.com/leak)" d="M1 1h8v8H1z"/></svg>`,
      /css-comment-forbidden/,
    ],
    [
      "css-keyframes.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><style>@keyframes pulse { to { opacity: .5 } } path { animation: pulse 1s infinite }</style><path d="M1 1h8v8H1z"/></svg>`,
      /css-animation-forbidden/,
    ],
    [
      "css-animation-attribute.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path style="animation-name: pulse" d="M1 1h8v8H1z"/></svg>`,
      /css-animation-forbidden/,
    ],
    [
      "css-transition-presentation.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path transition="opacity 1s" d="M1 1h8v8H1z"/></svg>`,
      /css-animation-forbidden/,
    ],
    [
      "smil-set-reference.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><use href="#mark"><set attributeName="href" to="https://example.com/leak.svg#mark"/></use><defs><path id="mark" d="M1 1h8v8H1z"/></defs></svg>`,
      /declarative-animation/,
    ],
    [
      "smil-animate-values.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path id="mark" d="M1 1h8v8H1z"><animate attributeName="href" values="#mark;https://example.com/leak.svg#mark"/></path></svg>`,
      /declarative-animation/,
    ],
    [
      "smil-motion.svg",
      `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1h8v8H1z"><animateMotion path="M0 0L1 1"><mpath href="#motion"/></animateMotion></path><path id="motion" d="M0 0L1 1"/></svg>`,
      /declarative-animation/,
    ],
  ];
  for (const [name, source, expected] of invalidSvgs) {
    const file = fixture(name, source);
    expectRun(`SVG rejects ${name}`, "python3", [svgValidator, file], 1, expected);
  }
  const repeatedPatternSvg = fixture(
    "repeated-pattern-visibility.svg",
    '<svg width="10" height="10" viewBox="0 0 10 10"><defs><pattern id="paint" width="1" height="1">' +
      '<rect width="1" height="1" fill="none" stroke="none"/>'.repeat(3_000) +
      "</pattern></defs>" +
      '<rect x="1" y="1" width="8" height="8" fill="url(#paint)"/>'.repeat(3_000) +
      "</svg>",
  );
  expectRun(
    "repeated pattern visibility is memoized",
    "python3",
    [svgValidator, repeatedPatternSvg],
    1,
    /no-renderable-graphic/,
  );
  const deepGradientDefinitions = Array.from({ length: 130 }, (_, index) =>
    index === 129
      ? `<linearGradient id="g${index}"><stop stop-color="transparent"/></linearGradient>`
      : `<linearGradient id="g${index}" href="#g${index + 1}"/>`,
  ).join("");
  const deepGradientSvg = fixture(
    "deep-gradient-reference.svg",
    `<svg width="10" height="10" viewBox="0 0 10 10"><defs>${deepGradientDefinitions}</defs><circle cx="5" cy="5" r="4" fill="url(#g0)"/></svg>`,
  );
  check("gradient inheritance depth is bounded and structured", () => {
    const result = run("python3", [svgValidator, "--json", deepGradientSvg]);
    assert.equal(result.status, 1, result.output);
    assert.doesNotMatch(result.output, /RecursionError|Traceback/);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.valid, false);
    assert.ok(parsed.errors.some((finding) => finding.code === "gradient-reference-depth"));
  });
  const privateMarker = "private-reference-marker";
  const largeReferenceSvg = fixture(
    "large-private-reference.svg",
    `<svg width="10" height="10" viewBox="0 0 10 10"><use href="https://example.com/${privateMarker.repeat(70_000)}"/></svg>`,
  );
  check("large references produce bounded privacy-safe findings", () => {
    const result = run("python3", [svgValidator, "--json", largeReferenceSvg]);
    assert.equal(result.status, 1, result.output.slice(0, 2_000));
    assert.ok(result.stdout.length < 64 * 1024, result.stdout.length);
    assert.doesNotMatch(result.stdout, new RegExp(privateMarker));
    const parsed = JSON.parse(result.stdout);
    assert.ok(parsed.errors.some((finding) => finding.code === "external-reference"));
  });
  const findingCapSvg = fixture(
    "finding-cap.svg",
    String.raw`<svg xmlns:x="urn:private" width="0" height="0" viewBox="0 0 -1 0"><script id="same" onload="x" xml:base="/" href="https://example.com/private" x:private="x" style="animation:spin 1s;fill:u\72l(#same)/**/"/><animate/><image/><metadata/><style>@import "https://example.com/private.css";</style><path id="same" d="M1 1h1v1z"/></svg>`,
  );
  check("finding count has a terminal cap", () => {
    const result = run("python3", [svgValidator, "--json", findingCapSvg]);
    assert.equal(result.status, 1, result.output);
    assert.ok(result.stdout.length < 64 * 1024, result.stdout.length);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.errors.at(-1).code, "too-many-findings");
    assert.equal(parsed.errors.length, 16);
  });
  const utf16Doctype = fixture(
    "utf16-doctype.svg",
    Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-16"?><!DOCTYPE svg><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0h1v1z"/></svg>`,
        "utf16le",
      ),
    ]),
  );
  expectRun(
    "UTF-16 DOCTYPE bypass rejection",
    "python3",
    [svgValidator, utf16Doctype],
    1,
    /utf16-forbidden/,
  );
  const utf16Entity = fixture(
    "utf16-entity.svg",
    Buffer.concat([
      Buffer.from([0xfe, 0xff]),
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-16"?><!DOCTYPE svg [<!ENTITY payload "x">]><svg width="10" height="10" viewBox="0 0 10 10"><text>&payload;</text></svg>`,
        "utf16le",
      ).swap16(),
    ]),
  );
  expectRun(
    "UTF-16 entity bypass rejection",
    "python3",
    [svgValidator, utf16Entity],
    1,
    /utf16-forbidden/,
  );
  const nulSvg = fixture(
    "nul.svg",
    Buffer.from(`<svg width="10" height="10" viewBox="0 0 10 10">\0<path/></svg>`),
  );
  expectRun("NUL SVG rejection", "python3", [svgValidator, nulSvg], 1, /nul-byte/);
  const invalidUtf8 = fixture(
    "invalid-utf8.svg",
    Buffer.concat([
      Buffer.from(`<svg width="10" height="10" viewBox="0 0 10 10"><text>`),
      Buffer.from([0xff]),
      Buffer.from(`</text></svg>`),
    ]),
  );
  expectRun(
    "invalid UTF-8 SVG rejection",
    "python3",
    [svgValidator, invalidUtf8],
    1,
    /invalid-utf8/,
  );
  const misleadingDeclaration = fixture(
    "utf16-declaration.svg",
    `<?xml version="1.0" encoding="UTF-16"?><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0h1v1z"/></svg>`,
  );
  expectRun(
    "non-UTF-8 declaration rejection",
    "python3",
    [svgValidator, misleadingDeclaration],
    1,
    /encoding-declaration/,
  );
  const oversizedSvg = fixture(
    "oversized.svg",
    Buffer.concat([
      Buffer.from(`<svg width="1" height="1" viewBox="0 0 1 1">`),
      Buffer.alloc(5 * 1024 * 1024, 0x20),
      Buffer.from(`</svg>`),
    ]),
  );
  expectRun("SVG file-size limit", "python3", [svgValidator, oversizedSvg], 1, /file-too-large/);
  expectRun(
    "SVG I/O exit",
    "python3",
    [svgValidator, path.join(temp, "missing.svg")],
    2,
    /read-error/,
  );
  check("Windows absolute SVG path is classified as local", () => {
    const result = run("python3", [
      svgValidator,
      String.raw`Z:\codex-validator-fixture\missing-logo.svg`,
    ]);
    assert.equal(result.status, 2, result.output);
    assert.match(result.output, /read-error/);
    assert.doesNotMatch(result.output, /nonlocal-input/);
  });
  for (const nonlocalInput of [
    "https://example.com/logo.svg",
    "data:image/svg+xml,%3Csvg%3E",
    "file:///tmp/logo.svg",
  ]) {
    expectRun(
      `SVG rejects nonlocal input ${nonlocalInput.split(":", 1)[0]}`,
      "python3",
      [svgValidator, nonlocalInput],
      2,
      /nonlocal-input/,
    );
  }

  const auditRoot = path.join(temp, "audit-repository");
  const auditAssets = path.join(auditRoot, "assets");
  const auditReadme = path.join(auditRoot, "README.md");
  mkdirSync(auditAssets, { recursive: true });
  writeFileSync(
    path.join(auditAssets, "logo.svg"),
    `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>`,
  );
  writeFileSync(path.join(auditAssets, "static.png"), makePng({ animated: false }));
  writeFileSync(path.join(auditRoot, "safe.png"), makePng({ animated: false }));
  writeFileSync(path.join(auditAssets, "logo_(v2).png"), makePng({ animated: false }));
  writeFileSync(path.join(auditAssets, "animated.png"), makePng({ animated: true }));
  writeFileSync(path.join(auditAssets, "animated.webp"), makeWebp({ animated: true }));
  writeFileSync(path.join(auditAssets, "unsupported.jpg"), Buffer.from("not-a-jpeg"));
  writeFileSync(
    path.join(auditAssets, "smil.svg"),
    `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"><animate attributeName="r" values="3;4"/></circle></svg>`,
  );
  writeFileSync(
    path.join(auditAssets, "css-obfuscated.svg"),
    String.raw`<svg width="10" height="10" viewBox="0 0 10 10"><style>circle{fill:u\72l(https://example.com/a)}</style><circle cx="5" cy="5" r="4"/></svg>`,
  );
  const outsideAsset = path.join(temp, "outside.svg");
  writeFileSync(
    outsideAsset,
    `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0h1v1z"/></svg>`,
  );
  symlinkSync(outsideAsset, path.join(auditAssets, "external-link.svg"));
  const outsideDirectory = path.join(temp, "outside-directory");
  const outsideSubdirectory = path.join(outsideDirectory, "sub");
  mkdirSync(outsideSubdirectory, { recursive: true });
  writeFileSync(
    path.join(outsideDirectory, "leak.svg"),
    `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0h1v1z"/></svg>`,
  );
  symlinkSync(outsideSubdirectory, path.join(auditAssets, "external-directory-link"), "dir");
  symlinkSync(path.join(temp, "missing-target.svg"), path.join(auditAssets, "dangling.svg"));
  mkdirSync(path.join(auditAssets, "directory"));

  const runAuditFixture = (name, markdown, expectedStatus, expectedOutput) => {
    writeFileSync(auditReadme, markdown);
    expectRun(
      name,
      "node",
      [auditCli, "--root", auditRoot, "--readme", "README.md"],
      expectedStatus,
      expectedOutput,
    );
  };

  runAuditFixture(
    "README audit safe asset",
    `# Fixture\n\n<img src="assets/logo.svg" alt="Fixture logo" width="64" height="64">\n`,
    0,
    /`assets\/logo\.svg` \| yes \| yes/,
  );
  const unsafeAuditCases = [
    [
      "README audit traversal",
      `![Logo](../outside.svg)`,
      /parent traversal|escapes the repository root/,
    ],
    ["README audit absolute path", `![Logo](/etc/passwd)`, /relative repository path/],
    [
      "README audit Windows path",
      `<img src="C:\\private\\logo.svg" alt="Logo" width="64" height="64">`,
      /relative repository path/,
    ],
    [
      "README audit UNC path",
      `<img src="\\\\server\\share\\logo.svg" alt="Logo" width="64" height="64">`,
      /relative repository path/,
    ],
    ["README audit external symlink", `![Logo](assets/external-link.svg)`, /through a symlink/],
    [
      "README audit preserves symlink parent semantics",
      `![Logo](assets/external-directory-link/../leak.svg)`,
      /through a symlink/,
    ],
    ["README audit dangling symlink", `![Logo](assets/dangling.svg)`, /dangling symlink/],
    ["README audit directory target", `![Logo](assets/directory)`, /regular file/],
    [
      "README audit literal tab",
      `<img src="assets/\tlogo.svg" alt="Logo" width="64" height="64">`,
      /control characters/,
    ],
    [
      "README audit encoded tab",
      `<img src="assets/%09logo.svg" alt="Logo" width="64" height="64">`,
      /control characters/,
    ],
    [
      "README audit double-encoded traversal",
      `![Logo](%252e%252e/outside.svg)`,
      /parent traversal|escapes the repository root/,
    ],
  ];
  for (const [name, markdown, expected] of unsafeAuditCases) {
    runAuditFixture(name, markdown, 2, expected);
  }
  runAuditFixture(
    "README audit external URL",
    `<img src="https://example.com/logo.svg" alt="Logo" width="64" height="64">`,
    1,
    /Local asset references found: 0[\s\S]*readiness is unverified[\s\S]*not fetched/,
  );
  runAuditFixture(
    "README audit data srcset",
    `<picture><source srcset="data:image/svg+xml,%3Csvg%3E 1x"><img src="https://example.com/logo.svg" alt="Logo" width="64" height="64"></picture>`,
    1,
    /Local asset references found: 0[\s\S]*embedded data image/,
  );
  runAuditFixture(
    "README audit missing local asset",
    `![Logo](assets/missing.png)`,
    1,
    /missing local asset/,
  );
  runAuditFixture(
    "README audit strict SMIL rejection",
    `![Logo](assets/smil.svg)`,
    1,
    /declarative-animation/,
  );
  runAuditFixture(
    "README audit strict CSS obfuscation rejection",
    `![Logo](assets/css-obfuscated.svg)`,
    1,
    /css-escape-forbidden/,
  );
  runAuditFixture(
    "README audit unsupported readiness",
    `![Logo](assets/unsupported.jpg)`,
    1,
    /format is not SVG, GIF, PNG\/APNG, or WebP/,
  );
  runAuditFixture(
    "README audit detects animated PNG without reduced motion",
    `<img src="assets/animated.png" alt="Logo" width="64" height="64">`,
    1,
    /verified animated source without a reduced-motion source/,
  );
  runAuditFixture(
    "README audit verifies static reduced-motion source",
    `<picture><source media="(prefers-reduced-motion: reduce)" srcset="assets/static.png"><source srcset="assets/animated.png"><img src="assets/static.png" alt="Logo" width="64" height="64"></picture>`,
    0,
    /No compatibility findings/,
  );
  runAuditFixture(
    "README audit rejects inert source src",
    `<picture><source media="(prefers-reduced-motion: reduce)" src="assets/static.png"><source srcset="assets/animated.png"><img src="assets/static.png" alt="Logo" width="64" height="64"></picture>`,
    1,
    /<source> must use srcset[\s\S]*without a reduced-motion source/,
  );
  for (const descriptor of ["0w", "0x", "bogus"]) {
    runAuditFixture(
      `README audit rejects srcset descriptor ${descriptor}`,
      `<picture><source media="(prefers-reduced-motion: reduce)" srcset="assets/static.png ${descriptor}"><source srcset="assets/animated.png"><img src="assets/static.png" alt="Logo" width="64" height="64"></picture>`,
      1,
      /srcset must contain exactly one bare URL[\s\S]*without a reduced-motion source/,
    );
  }
  runAuditFixture(
    "README audit rejects animated fallback reused for reduce",
    `<picture><source media="(prefers-reduced-motion: reduce)" srcset="assets/animated.webp"><img src="assets/animated.webp" alt="Logo" width="64" height="64"></picture>`,
    1,
    /reduced-motion source[\s\S]*is animated[\s\S]*no reduced-motion source was verified static/,
  );
  runAuditFixture(
    "README audit ignores non-rendered examples",
    `\`\`\`md\n![Fenced](../outside.svg)\n[mark]: /etc/passwd\n\`\`\`\n\n    ![Indented](../outside.svg)\n\n\`![Inline][mark]\`\n<!-- <img src="/etc/shadow"> -->`,
    0,
    /Image blocks found: 0[\s\S]*No compatibility findings/,
  );
  runAuditFixture(
    "README audit inline-code comment opener does not mask live image",
    `\`<!--\`\n<img src="/etc/passwd" alt="Logo" width="64" height="64">`,
    2,
    /relative repository path/,
  );
  runAuditFixture(
    "README audit quoted HTML comment opener does not mask live image",
    `<img alt="<!--" src="safe.png" width="1" height="1">\n\n![leak](/etc/passwd)\n-->`,
    2,
    /relative repository path/,
  );
  runAuditFixture(
    "README audit quoted HTML backtick does not mask live image",
    `<img alt="\`" src="assets/logo.svg" width="1" height="1">\n\n![leak](/etc/passwd)\n\`\n\``,
    2,
    /relative repository path/,
  );
  runAuditFixture(
    "README audit quoted greater-than img attribute",
    `<img alt=">" src="/etc/passwd" width="1" height="1">`,
    2,
    /relative repository path/,
  );
  runAuditFixture(
    "README audit ignores Markdown syntax inside HTML attributes",
    `<img alt="![example](/etc/passwd)" src="assets/logo.svg" width="1" height="1">`,
    0,
    /No compatibility findings/,
  );
  runAuditFixture(
    "README audit quoted greater-than source attribute",
    `<picture><source data-label=">" srcset="/etc/passwd"><img src="assets/logo.svg" alt="Logo" width="1" height="1"></picture>`,
    2,
    /relative repository path/,
  );
  runAuditFixture(
    "README audit unclosed picture fails closed",
    `<picture><source srcset="assets/animated.png"><img src="assets/static.png" alt="Logo" width="1" height="1">`,
    2,
    /HTML <picture> element is not closed/,
  );
  for (const tag of ["img", "source"]) {
    runAuditFixture(
      `README audit over-limit live ${tag} tag`,
      `<${tag} data-padding="${"x".repeat(64 * 1024)}" src="assets/logo.svg">`,
      2,
      new RegExp(`HTML <${tag}> tag did not close within the 65536-byte syntax limit`),
    );
  }
  for (const [name, srcset] of [
    ["absolute", "assets/logo.svg,/etc/passwd.svg"],
    ["traversal", "assets/logo.svg,../outside.svg"],
    ["UNC", String.raw`assets/logo.svg,\\server\share\logo.svg`],
  ]) {
    runAuditFixture(
      `README audit no-whitespace srcset ${name}`,
      `<picture><source srcset="${srcset}"><img src="assets/logo.svg" alt="Logo" width="1" height="1"></picture>`,
      2,
      /relative repository path|escapes the repository root/,
    );
  }
  runAuditFixture(
    "README audit duplicate src preserves unsafe first value",
    `<img src="/etc/passwd" src="assets/logo.svg" alt="Logo" width="64" height="64">`,
    2,
    /duplicate src attributes[\s\S]*relative repository path/,
  );
  runAuditFixture(
    "README audit reduced-motion source ordering",
    `<picture><source srcset="assets/animated.png"><source media="(prefers-reduced-motion: reduce)" srcset="assets/static.png"><img src="assets/static.png" alt="Logo" width="64" height="64"></picture>`,
    1,
    /verified-static reduced-motion source must precede animated candidate/,
  );
  runAuditFixture(
    "README audit negated reduced-motion media is not accepted",
    `<picture><source media="not (prefers-reduced-motion: reduce)" srcset="assets/static.png"><source srcset="assets/animated.png"><img src="assets/static.png" alt="Logo" width="64" height="64"></picture>`,
    1,
    /not an unambiguous positive reduced-motion query[\s\S]*without a reduced-motion source/,
  );
  runAuditFixture(
    "README audit animated img fallback fails despite static reduce",
    `<picture><source media="(prefers-reduced-motion: reduce)" srcset="assets/static.png"><img src="assets/animated.png" alt="Logo" width="64" height="64"></picture>`,
    1,
    /final <img> fallback[\s\S]*was not verified static/,
  );
  runAuditFixture(
    "README audit missing img fallback",
    `<picture><source media="(prefers-reduced-motion: reduce)" srcset="assets/static.png"><source srcset="assets/animated.png"></picture>`,
    1,
    /picture is missing a final <img> fallback/,
  );
  runAuditFixture(
    "README audit empty picture",
    `<picture></picture>`,
    1,
    /picture is missing a final <img> fallback/,
  );
  runAuditFixture(
    "README audit ignores commented picture fallback",
    `<picture><!-- <img src="assets/static.png" alt="Logo" width="1" height="1"> --></picture>`,
    1,
    /picture is missing a final <img> fallback/,
  );
  runAuditFixture(
    "README audit standalone img requires a candidate",
    `<img alt="Logo" width="1" height="1">`,
    1,
    /must contain a non-empty src or srcset candidate/,
  );
  runAuditFixture(
    "README audit picture img requires a candidate",
    `<picture><img alt="Logo" width="1" height="1"></picture>`,
    1,
    /must contain a non-empty src or srcset candidate/,
  );
  for (const [name, markup] of [
    ["hidden img fallback", '<img hidden src="assets/logo.svg" alt="Logo" width="1" height="1">'],
    [
      "display-none img fallback",
      '<img style="display:none" src="assets/logo.svg" alt="Logo" width="1" height="1">',
    ],
    [
      "hidden picture fallback",
      '<picture hidden><img src="assets/logo.svg" alt="Logo" width="1" height="1"></picture>',
    ],
    [
      "hidden wrapper around img fallback",
      '<div hidden><img src="assets/logo.svg" alt="Logo" width="1" height="1"></div>',
    ],
    [
      "display-none wrapper around picture fallback",
      '<div style="display:none"><picture><img src="assets/logo.svg" alt="Logo" width="1" height="1"></picture></div>',
    ],
    [
      "mismatched closer inside hidden wrapper",
      '<div hidden></bogus><img src="assets/logo.svg" alt="Logo" width="1" height="1">',
    ],
  ]) {
    runAuditFixture(
      "README audit rejects " + name,
      markup,
      1,
      /hidden(?: ancestor)? and cannot provide a meaningful/,
    );
  }
  for (const [dimension, value] of [
    ["width", "0"],
    ["width", "-1"],
    ["height", "wide"],
  ]) {
    const width = dimension === "width" ? value : "1";
    const height = dimension === "height" ? value : "1";
    runAuditFixture(
      `README audit rejects invalid ${dimension} ${value}`,
      `<img src="assets/logo.svg" alt="Logo" width="${width}" height="${height}">`,
      1,
      new RegExp(`<img> ${dimension} must be a positive integer`),
    );
  }
  runAuditFixture(
    "README audit source after final img is rejected structurally",
    `<picture><source srcset="assets/static.png"><img src="assets/static.png" alt="Logo" width="1" height="1"><source srcset="assets/static.png"></picture>`,
    1,
    /final <img> fallback must follow every <source> candidate/,
  );
  runAuditFixture(
    "README audit nested picture fails closed",
    `<picture><picture><img src="assets/static.png" alt="Logo" width="1" height="1"></picture></picture>`,
    2,
    /Nested HTML <picture> elements are unsupported/,
  );
  runAuditFixture(
    "README audit image block limit",
    Array.from({ length: 4_097 }, () => `![Logo](assets/logo.svg)`).join("\n"),
    2,
    /4096 image-block limit/,
  );
  runAuditFixture(
    "README audit balanced inline destination",
    `![Logo](assets/logo_(v2).png)`,
    0,
    /`assets\/logo_\(v2\)\.png` \| yes \| yes/,
  );
  runAuditFixture(
    "README audit balanced destination root escape",
    `![Logo](../outside_(v2).png)`,
    2,
    /escapes the repository root/,
  );
  runAuditFixture(
    "README audit escaped reference label",
    `![Logo \\]][mark \\]]\n\n[mark \\]]: assets/logo.svg`,
    0,
    /`assets\/logo\.svg` \| yes \| yes/,
  );
  runAuditFixture(
    "README audit unresolved image reference is unverified",
    `![Logo][missing-definition]`,
    1,
    /Markdown image readiness is unverified[\s\S]*reference definition was not resolved/,
  );
  runAuditFixture(
    "README audit reference image traversal",
    `![Logo][mark]\n\n[mark]: /etc/passwd`,
    2,
    /relative repository path/,
  );
  runAuditFixture(
    "README audit angle image traversal",
    `![Logo](<../outside.svg>)`,
    2,
    /escapes the repository root/,
  );

  const nestedDocs = path.join(auditRoot, "docs");
  mkdirSync(nestedDocs);
  writeFileSync(path.join(nestedDocs, "README.md"), `![Logo](../assets/logo.svg)`);
  expectRun(
    "README audit allows root-bounded parent segment",
    "node",
    [auditCli, "--root", auditRoot, "--readme", "docs/README.md"],
    0,
    /`assets\/logo\.svg` \| yes \| yes/,
  );

  check("README audit does not leak canonical root", () => {
    writeFileSync(auditReadme, `![Logo](assets/logo.svg)`);
    const result = spawnSync(
      process.execPath,
      [auditCli, "--root", auditRoot, "--readme", "README.md"],
      { cwd: tmpdir(), encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes(auditRoot), false, result.stdout);
    assert.equal(result.stdout.includes(temp), false, result.stdout);
    assert.match(result.stdout, /Root boundary: declared repository root/);
  });
  check("README audit Python unavailable is unverified without path leakage", () => {
    writeFileSync(auditReadme, `![Logo](assets/logo.svg)`);
    const result = spawnSync(
      process.execPath,
      [auditCli, "--root", auditRoot, "--readme", "README.md"],
      {
        cwd: tmpdir(),
        encoding: "utf8",
        env: { ...process.env, PATH: "" },
      },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /strict SVG validator is unavailable/);
    assert.equal(result.stdout.includes(auditRoot), false, result.stdout);
    assert.equal(result.stdout.includes(temp), false, result.stdout);
  });
  check("README audit missing asset does not leak canonical root", () => {
    writeFileSync(auditReadme, `![Logo](assets/disappeared.png)`);
    const result = spawnSync(
      process.execPath,
      [auditCli, "--root", auditRoot, "--readme", "README.md"],
      { cwd: tmpdir(), encoding: "utf8" },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /missing local asset/);
    assert.equal(result.stdout.includes(auditRoot), false, result.stdout);
    assert.equal(result.stdout.includes(temp), false, result.stdout);
  });
  expectRun(
    "README audit help documents exit statuses",
    "node",
    [auditCli, "--help"],
    0,
    /0 clean; 1 compatibility\/readiness findings; 2 unsafe input or path/,
  );

  expectRun(
    "README snippet safe asset",
    "node",
    snippetArgs("assets/logo.svg"),
    0,
    /src="assets\/logo\.svg"/,
  );
  const unsafeSnippetCases = [
    ["README snippet traversal", "../outside.svg", /safe relative repository path/],
    ["README snippet absolute", "/etc/passwd", /safe relative repository path/],
    ["README snippet Windows path", `C:\\private\\logo.svg`, /safe relative repository path/],
    ["README snippet UNC path", `\\\\server\\share\\logo.svg`, /safe relative repository path/],
    [
      "README snippet external URL",
      "https://example.com/logo.svg",
      /safe relative repository path/,
    ],
    ["README snippet literal tab", "assets/\tlogo.svg", /control characters/],
    ["README snippet encoded tab", "assets/%09logo.svg", /control characters/],
    [
      "README snippet double-encoded traversal",
      "%252e%252e/outside.svg",
      /safe relative repository path/,
    ],
  ];
  for (const [name, assetPath, expected] of unsafeSnippetCases) {
    expectRun(name, "node", snippetArgs(assetPath), 1, expected);
  }

  console.log(`animated-readme-logo validators: ${checkCount} checks passed`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
