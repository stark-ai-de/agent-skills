#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import zlib from "node:zlib";

import {
  commitRenderArtifacts,
  createRenderStagingDirectory,
  openRenderDirectoryBinding,
  removeRenderStagingDirectory,
  verifyCommittedRenderArtifacts,
  verifyRenderDirectoryBinding,
} from "./lib/transactional-render-output.mjs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_CRC32_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
const IO_BUFFER_BYTES = 64 * 1024;
const MAX_RENDER_ARTIFACT_BYTES = 256 * 1024 * 1024;
const MAX_PNG_DECODED_BYTES = 256 * 1024 * 1024;
const MAX_PNG_CHUNKS = 100_000;
const MAX_SVG_ELEMENTS = 100_000;
const MAX_SVG_DEPTH = 256;
const MAX_XML_TAG_CHARS = 1024 * 1024;
const XML_DECLARATION =
  /^<\?xml[ \t\r\n]+version[ \t\r\n]*=[ \t\r\n]*(?:"1\.[0-9]+"|'1\.[0-9]+')(?:[ \t\r\n]+encoding[ \t\r\n]*=[ \t\r\n]*(?:"[Uu][Tt][Ff]-8"|'[Uu][Tt][Ff]-8'))?(?:[ \t\r\n]+standalone[ \t\r\n]*=[ \t\r\n]*(?:"(?:yes|no)"|'(?:yes|no)'))?[ \t\r\n]*\?>$/;
const DRAWIO_SVG_DOCTYPE =
  '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
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

function usage() {
  return [
    "Usage: node scripts/render-drawio.mjs path/to/file.drawio [--page-index <1-based-index>]",
    "Safety boundary: the transactional renderer requires Linux /proc/self/fd and a Linux-native draw.io CLI.",
    "On macOS, Windows, or a WSL-hosted Windows draw.io.exe, export manually and validate before replacing maintained artifacts.",
  ].join("\n");
}

function supportsDescriptorAnchoredChild(drawio) {
  return (
    process.platform === "linux" && !/\.exe$/i.test(drawio) && !/^\/mnt\/[a-z]\//i.test(drawio)
  );
}

function parseArgs(argv) {
  let input = null;
  let pageIndex = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, input, pageIndex };
    if (arg === "--page-index" || arg === "-p") {
      const value = argv[++index];
      if (!value || !/^\d+$/.test(value) || Number(value) < 1) {
        throw new Error("--page-index must be a positive 1-based integer");
      }
      pageIndex = Number(value);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown argument: ${arg}`);
    if (input) throw new Error(`Unexpected extra input: ${arg}`);
    input = arg;
  }

  return { help: false, input, pageIndex };
}

function pathCandidates() {
  const candidates = [];
  const pathParts = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const part of pathParts) {
    candidates.push(path.join(part, process.platform === "win32" ? "drawio.exe" : "drawio"));
  }
  candidates.push("/Applications/draw.io.app/Contents/MacOS/draw.io");
  candidates.push("C:\\Program Files\\draw.io\\draw.io.exe");
  candidates.push("/mnt/c/Program Files/draw.io/draw.io.exe");
  if (process.env.USER) {
    candidates.push(`/mnt/c/Users/${process.env.USER}/AppData/Local/Programs/draw.io/draw.io.exe`);
  }
  return candidates;
}

function findDrawio() {
  const configured = process.env.DRAWIO_BIN;
  if (configured) {
    if (fs.existsSync(configured)) return configured;
    const probe = spawnSync(configured, ["--version"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) return configured;
  }
  for (const candidate of pathCandidates()) {
    if (fs.existsSync(candidate)) return candidate;
  }
  for (const command of ["drawio", "diagrams.net"]) {
    const probe = spawnSync(command, ["--version"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) return command;
  }
  return null;
}

function runDrawio(drawio, args, directoryHandles = []) {
  const result = spawnSync(drawio, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe", ...directoryHandles],
  });
  if (result.error || result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(
      [`draw.io export failed: ${drawio} ${args.join(" ")}`, result.error?.message, stderr, stdout]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return result;
}

function artifactStat(file, format) {
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`draw.io export did not create a ${format} artifact`);
    }
    throw error;
  }
  if (stat.isSymbolicLink()) {
    invalidArtifact(format, "output is a symbolic link");
  }
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`draw.io export created an empty or non-file ${format} artifact`);
  }
  return stat;
}

function sameFileIdentity(left, right) {
  return left?.dev === right?.dev && left?.ino === right?.ino;
}

function sameArtifactSnapshot(left, right) {
  return (
    sameFileIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

function openArtifact(file, format) {
  const pathStat = artifactStat(file, format);
  let handle;
  try {
    const noFollow = process.platform === "win32" ? 0 : fs.constants.O_NOFOLLOW || 0;
    handle = fs.openSync(file, fs.constants.O_RDONLY | noFollow);
  } catch (error) {
    if (error?.code === "ELOOP") invalidArtifact(format, "output is a symbolic link");
    if (error?.code === "ENOENT") invalidArtifact(format, "output changed before validation");
    throw error;
  }
  let descriptorStat;
  try {
    descriptorStat = fs.fstatSync(handle);
  } catch (error) {
    fs.closeSync(handle);
    throw error;
  }
  if (!descriptorStat.isFile() || !sameArtifactSnapshot(pathStat, descriptorStat)) {
    fs.closeSync(handle);
    invalidArtifact(format, "output changed before validation");
  }
  return { handle, stat: descriptorStat };
}

function validatedArtifactIdentity(file, format, handle, expected, digest) {
  const descriptorStat = fs.fstatSync(handle);
  let pathStat;
  try {
    pathStat = artifactStat(file, format);
  } catch (error) {
    invalidArtifact(format, `output changed during validation (${error.message})`);
  }
  if (
    !sameArtifactSnapshot(expected, descriptorStat) ||
    !sameArtifactSnapshot(descriptorStat, pathStat)
  ) {
    invalidArtifact(format, "output changed during validation");
  }
  return {
    dev: pathStat.dev,
    ino: pathStat.ino,
    size: pathStat.size,
    mtimeMs: pathStat.mtimeMs,
    ctimeMs: pathStat.ctimeMs,
    digest,
  };
}

function descriptorDigest(handle, size, format) {
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_RENDER_ARTIFACT_BYTES) {
    invalidArtifact(format, "file exceeds fingerprint size limit");
  }
  const digest = createHash("sha256");
  const buffer = Buffer.allocUnsafe(Math.min(IO_BUFFER_BYTES, size));
  let position = 0;
  while (position < size) {
    const requested = Math.min(buffer.length, size - position);
    const bytesRead = fs.readSync(handle, buffer, 0, requested, position);
    if (bytesRead <= 0 || bytesRead > requested) {
      invalidArtifact(format, "file changed while its content was fingerprinted");
    }
    digest.update(buffer.subarray(0, bytesRead));
    position += bytesRead;
  }
  const probe = Buffer.allocUnsafe(1);
  if (fs.readSync(handle, probe, 0, 1, size) !== 0) {
    invalidArtifact(format, "file grew while its content was fingerprinted");
  }
  return digest.digest("hex");
}

function readBoundedDescriptor(handle, size, format) {
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_RENDER_ARTIFACT_BYTES) {
    invalidArtifact(format, "file exceeds read size limit");
  }
  const bytes = Buffer.allocUnsafe(size);
  let position = 0;
  while (position < size) {
    const bytesRead = fs.readSync(handle, bytes, position, size - position, position);
    if (bytesRead <= 0 || bytesRead > size - position) {
      invalidArtifact(format, "file changed while it was read");
    }
    position += bytesRead;
  }
  const probe = Buffer.allocUnsafe(1);
  if (fs.readSync(handle, probe, 0, 1, size) !== 0) {
    invalidArtifact(format, "file grew while it was read");
  }
  return bytes;
}

function readExact(handle, position, length) {
  const buffer = Buffer.alloc(length);
  let offset = 0;
  while (offset < length) {
    const bytesRead = fs.readSync(handle, buffer, offset, length - offset, position + offset);
    if (bytesRead === 0) throw new Error("unexpected end of artifact");
    offset += bytesRead;
  }
  return buffer;
}

function updatePngCrc(crc, bytes) {
  for (const byte of bytes) crc = PNG_CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return crc >>> 0;
}

function pngChunkCrc(handle, type, dataPosition, length, scratch) {
  let crc = updatePngCrc(0xffffffff, type);
  let position = dataPosition;
  let remaining = length;
  while (remaining > 0) {
    const requested = Math.min(remaining, scratch.length);
    const bytesRead = fs.readSync(handle, scratch, 0, requested, position);
    if (bytesRead === 0) throw new Error("unexpected end of PNG chunk");
    crc = updatePngCrc(crc, scratch.subarray(0, bytesRead));
    position += bytesRead;
    remaining -= bytesRead;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function invalidArtifact(format, reason) {
  throw new Error(`draw.io export created an invalid ${format} artifact: ${reason}`);
}

function validatePng(file) {
  const { handle, stat } = openArtifact(file, "PNG");
  const scratch = Buffer.alloc(IO_BUFFER_BYTES);
  let position = 8;
  let chunkCount = 0;
  let seenIhdr = false;
  let seenPlte = false;
  let seenIdat = false;
  let idatEnded = false;
  let seenIend = false;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];
  let identity;
  try {
    if (stat.size > MAX_RENDER_ARTIFACT_BYTES) invalidArtifact("PNG", "file exceeds size limit");
    if (stat.size < 45) invalidArtifact("PNG", "file is too short");
    if (!readExact(handle, 0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      invalidArtifact("PNG", "signature mismatch");
    }
    while (position < stat.size) {
      chunkCount += 1;
      if (chunkCount > MAX_PNG_CHUNKS) invalidArtifact("PNG", "chunk count exceeds limit");
      if (stat.size - position < 12) invalidArtifact("PNG", "truncated chunk header");

      const chunkHeader = readExact(handle, position, 8);
      const length = chunkHeader.readUInt32BE(0);
      const typeBytes = chunkHeader.subarray(4, 8);
      const type = typeBytes.toString("ascii");
      if (!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type)) {
        invalidArtifact("PNG", "invalid chunk type");
      }
      const dataPosition = position + 8;
      const dataEnd = dataPosition + length;
      const chunkEnd = dataEnd + 4;
      if (chunkEnd > stat.size) invalidArtifact("PNG", `${type} chunk exceeds file bounds`);

      const expectedCrc = readExact(handle, dataEnd, 4).readUInt32BE(0);
      const actualCrc = pngChunkCrc(handle, typeBytes, dataPosition, length, scratch);
      if (expectedCrc !== actualCrc) invalidArtifact("PNG", `${type} chunk CRC mismatch`);

      if (chunkCount === 1 && type !== "IHDR") invalidArtifact("PNG", "IHDR is not first");
      if (type === "IHDR") {
        if (seenIhdr || chunkCount !== 1 || length !== 13) {
          invalidArtifact("PNG", "invalid IHDR placement or length");
        }
        const ihdr = readExact(handle, dataPosition, length);
        width = ihdr.readUInt32BE(0);
        height = ihdr.readUInt32BE(4);
        bitDepth = ihdr[8];
        colorType = ihdr[9];
        if (width === 0 || height === 0) {
          invalidArtifact("PNG", "width and height must be positive");
        }
        if (!PNG_BIT_DEPTHS.get(colorType)?.has(bitDepth)) {
          invalidArtifact("PNG", "invalid bit-depth/color-type combination");
        }
        if (ihdr[10] !== 0 || ihdr[11] !== 0) {
          invalidArtifact("PNG", "unsupported compression or filter method");
        }
        if (ihdr[12] !== 0) {
          invalidArtifact("PNG", "interlacing is unsupported");
        }
        seenIhdr = true;
      } else if (type === "PLTE") {
        const entries = length / 3;
        if (
          seenPlte ||
          seenIdat ||
          colorType === 0 ||
          colorType === 4 ||
          length === 0 ||
          length % 3 !== 0 ||
          entries > 256 ||
          (colorType === 3 && entries > 2 ** bitDepth)
        ) {
          invalidArtifact("PNG", "invalid PLTE chunk");
        }
        seenPlte = true;
      } else if (type === "IDAT") {
        if (!seenIhdr || idatEnded || (colorType === 3 && !seenPlte)) {
          invalidArtifact("PNG", "invalid IDAT ordering");
        }
        seenIdat = true;
        idatChunks.push(readExact(handle, dataPosition, length));
      } else if (type === "IEND") {
        if (!seenIhdr || !seenIdat || length !== 0) {
          invalidArtifact("PNG", "IEND requires IHDR, IDAT, and zero length");
        }
        if (chunkEnd !== stat.size) invalidArtifact("PNG", "IEND is not final");
        seenIend = true;
      } else {
        if (/^[A-Z]/.test(type)) {
          invalidArtifact("PNG", `unsupported critical chunk ${type}`);
        }
        if (seenIdat) idatEnded = true;
      }

      position = chunkEnd;
      if (seenIend) break;
    }
    if (!seenIhdr || !seenIdat || !seenIend) {
      invalidArtifact("PNG", "required IHDR, IDAT, or IEND chunk is missing");
    }

    const channels = PNG_CHANNELS.get(colorType);
    const rowBytes = Math.ceil((width * channels * bitDepth) / 8);
    const expectedLength = height * (rowBytes + 1);
    if (!Number.isSafeInteger(expectedLength) || expectedLength > MAX_PNG_DECODED_BYTES) {
      invalidArtifact("PNG", "decoded data exceeds the validation limit");
    }
    const compressed = Buffer.concat(idatChunks);
    let inflated;
    try {
      inflated = zlib.inflateSync(compressed, {
        info: true,
        maxOutputLength: expectedLength + 1,
      });
    } catch {
      invalidArtifact("PNG", "compressed pixel data is invalid or exceeds its scanline layout");
    }
    if (inflated.engine.bytesWritten !== compressed.length) {
      invalidArtifact("PNG", "IDAT contains an incomplete or trailing zlib stream");
    }
    if (inflated.buffer.length !== expectedLength) {
      invalidArtifact("PNG", "decoded data does not match its scanline layout");
    }
    for (let row = 0; row < height; row += 1) {
      if (inflated.buffer[row * (rowBytes + 1)] > 4) {
        invalidArtifact("PNG", "decoded data contains an invalid scanline filter");
      }
    }
    const digest = descriptorDigest(handle, stat.size, "PNG");
    identity = validatedArtifactIdentity(file, "PNG", handle, stat, digest);
  } finally {
    fs.closeSync(handle);
  }
  return identity;
}

function isXmlCodePoint(codePoint) {
  return (
    codePoint === 0x9 ||
    codePoint === 0xa ||
    codePoint === 0xd ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff)
  );
}

function validateXmlCharacters(text) {
  for (const character of text) {
    if (!isXmlCodePoint(character.codePointAt(0))) {
      invalidArtifact("SVG", "contains an illegal XML character");
    }
  }
}

function validateXmlReferences(text, context) {
  let cursor = 0;
  while ((cursor = text.indexOf("&", cursor)) !== -1) {
    const end = text.indexOf(";", cursor + 1);
    if (end === -1 || end - cursor > 32) {
      invalidArtifact("SVG", `${context} contains an invalid entity reference`);
    }
    const reference = text.slice(cursor, end + 1);
    if (!["&amp;", "&apos;", "&gt;", "&lt;", "&quot;"].includes(reference)) {
      const numeric = /^&#(x[0-9A-Fa-f]+|[0-9]+);$/.exec(reference);
      if (!numeric) invalidArtifact("SVG", `${context} contains an invalid entity reference`);
      const digits = numeric[1];
      const codePoint = Number.parseInt(
        digits.startsWith("x") ? digits.slice(1) : digits,
        digits.startsWith("x") ? 16 : 10,
      );
      if (!Number.isSafeInteger(codePoint) || !isXmlCodePoint(codePoint)) {
        invalidArtifact("SVG", `${context} contains an invalid character reference`);
      }
    }
    cursor = end + 1;
  }
}

function xmlTagEnd(text, start) {
  let quote = null;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "<") invalidArtifact("SVG", "unexpected < inside a tag");
    else if (char === ">") return index;
    if (index - start > MAX_XML_TAG_CHARS) invalidArtifact("SVG", "tag exceeds size limit");
  }
  invalidArtifact("SVG", "unterminated tag");
}

function xmlAttributes(raw) {
  const attributes = new Map();
  let cursor = 0;
  while (cursor < raw.length) {
    while (/\s/.test(raw[cursor] || "")) cursor += 1;
    if (cursor >= raw.length) break;
    const nameMatch = /^[A-Za-z_:][A-Za-z0-9_.:-]*/.exec(raw.slice(cursor));
    if (!nameMatch) invalidArtifact("SVG", "invalid attribute name");
    const name = nameMatch[0];
    if (attributes.has(name)) invalidArtifact("SVG", `duplicate attribute ${name}`);
    cursor += name.length;
    while (/\s/.test(raw[cursor] || "")) cursor += 1;
    if (raw[cursor] !== "=") invalidArtifact("SVG", `attribute ${name} has no value`);
    cursor += 1;
    while (/\s/.test(raw[cursor] || "")) cursor += 1;
    const quote = raw[cursor];
    if (quote !== '"' && quote !== "'") {
      invalidArtifact("SVG", `attribute ${name} is not quoted`);
    }
    const end = raw.indexOf(quote, cursor + 1);
    if (end === -1) invalidArtifact("SVG", `attribute ${name} is unterminated`);
    const value = raw.slice(cursor + 1, end);
    if (value.includes("<")) invalidArtifact("SVG", `attribute ${name} contains <`);
    validateXmlReferences(value, `attribute ${name}`);
    attributes.set(name, value);
    cursor = end + 1;
  }
  return attributes;
}

export function validateSvgXml(source) {
  const text = source.replace(/^\uFEFF/, "");
  validateXmlCharacters(text);
  const stack = [];
  let cursor = 0;
  let rootSeen = false;
  let rootClosed = false;
  let doctypeSeen = false;
  let declarationSeen = false;
  let elementCount = 0;

  while (cursor < text.length) {
    const open = text.indexOf("<", cursor);
    if (open === -1) {
      validateXmlReferences(text.slice(cursor), "text");
      if (stack.length === 0 && /\S/.test(text.slice(cursor))) {
        invalidArtifact("SVG", "text appears outside the root element");
      }
      break;
    }
    validateXmlReferences(text.slice(cursor, open), "text");
    if (stack.length === 0 && /\S/.test(text.slice(cursor, open))) {
      invalidArtifact("SVG", "text appears outside the root element");
    }

    if (text.startsWith("<!--", open)) {
      const end = text.indexOf("-->", open + 4);
      const body = end === -1 ? "" : text.slice(open + 4, end);
      if (end === -1 || body.includes("--") || body.endsWith("-")) {
        invalidArtifact("SVG", "malformed XML comment");
      }
      cursor = end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", open)) {
      if (stack.length === 0) invalidArtifact("SVG", "CDATA appears outside the root element");
      const end = text.indexOf("]]>", open + 9);
      if (end === -1) invalidArtifact("SVG", "unterminated CDATA section");
      cursor = end + 3;
      continue;
    }
    if (text.startsWith("<?", open)) {
      const end = text.indexOf("?>", open + 2);
      const declaration = end === -1 ? "" : text.slice(open, end + 2);
      if (
        end === -1 ||
        open !== 0 ||
        rootSeen ||
        declarationSeen ||
        !XML_DECLARATION.test(declaration)
      ) {
        invalidArtifact("SVG", "invalid XML declaration or processing instruction");
      }
      declarationSeen = true;
      cursor = end + 2;
      continue;
    }
    if (text.startsWith("<!DOCTYPE", open)) {
      if (rootSeen || doctypeSeen || !text.startsWith(DRAWIO_SVG_DOCTYPE, open)) {
        invalidArtifact("SVG", "unsupported or misplaced DOCTYPE");
      }
      doctypeSeen = true;
      cursor = open + DRAWIO_SVG_DOCTYPE.length;
      continue;
    }
    if (text.startsWith("<!", open)) invalidArtifact("SVG", "unsupported XML declaration");

    const close = xmlTagEnd(text, open);
    let raw = text.slice(open + 1, close).trim();
    if (!raw) invalidArtifact("SVG", "empty tag");
    if (raw.startsWith("/")) {
      const name = raw.slice(1).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(name)) {
        invalidArtifact("SVG", "invalid closing tag");
      }
      const expected = stack.pop();
      if (!expected || expected !== name) invalidArtifact("SVG", `mismatched closing tag ${name}`);
      if (stack.length === 0) rootClosed = true;
      cursor = close + 1;
      continue;
    }

    const selfClosing = /\/\s*$/.test(raw);
    if (selfClosing) raw = raw.replace(/\/\s*$/, "").trimEnd();
    const nameMatch = /^([A-Za-z_][A-Za-z0-9_.:-]*)/.exec(raw);
    if (!nameMatch) invalidArtifact("SVG", "invalid element name");
    const name = nameMatch[1];
    const attributes = xmlAttributes(raw.slice(name.length));
    if (stack.length === 0) {
      if (rootSeen || rootClosed || name !== "svg")
        invalidArtifact("SVG", "root element is not svg");
      if (attributes.get("xmlns") !== "http://www.w3.org/2000/svg") {
        invalidArtifact("SVG", "root has no SVG namespace");
      }
      rootSeen = true;
    }
    elementCount += 1;
    if (elementCount > MAX_SVG_ELEMENTS) invalidArtifact("SVG", "element count exceeds limit");
    if (!selfClosing) {
      stack.push(name);
      if (stack.length > MAX_SVG_DEPTH) invalidArtifact("SVG", "nesting depth exceeds limit");
    } else if (stack.length === 0) {
      rootClosed = true;
    }
    cursor = close + 1;
  }

  if (!rootSeen || !rootClosed || stack.length !== 0) {
    invalidArtifact("SVG", "root element is missing or unclosed");
  }
}

function validateSvg(file) {
  const { handle, stat } = openArtifact(file, "SVG");
  try {
    if (stat.size > MAX_RENDER_ARTIFACT_BYTES) invalidArtifact("SVG", "file exceeds size limit");
    let source;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(
        readBoundedDescriptor(handle, stat.size, "SVG"),
      );
    } catch {
      invalidArtifact("SVG", "file is not valid UTF-8");
    }
    validateSvgXml(source);
    const digest = descriptorDigest(handle, stat.size, "SVG");
    return validatedArtifactIdentity(file, "SVG", handle, stat, digest);
  } finally {
    fs.closeSync(handle);
  }
}

function withCommandOutput(error, result) {
  const output = [result?.stderr?.trim(), result?.stdout?.trim()].filter(Boolean).join("\n");
  return new Error([error.message, output].filter(Boolean).join("\n"));
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(2);
  }
  if (!args.input || args.help) {
    console.log(usage());
    process.exit(args.help ? 0 : 2);
  }
  const inputPath = path.resolve(args.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    process.exit(2);
  }
  const drawio = findDrawio();
  if (!drawio) {
    console.error("draw.io Desktop CLI not found. Install it or open the .drawio file manually.");
    process.exit(1);
  }
  if (!supportsDescriptorAnchoredChild(drawio)) {
    console.error(
      "Transactional rendering requires Linux /proc/self/fd and a Linux-native draw.io CLI; use a raw/manual export plus validation on this platform.",
    );
    process.exit(1);
  }

  const lightPng = `${inputPath}.png`;
  const darkSvg = inputPath.replace(/\.drawio$/i, "") + ".dark.svg";
  const pageArgs = args.pageIndex ? ["--page-index", String(args.pageIndex)] : [];
  const stagedPngName = path.basename(lightPng);
  const stagedSvgName = path.basename(darkSvg);
  let parentBinding;
  let stagingBinding;
  let preserveStagingDirectory = true;
  let cleanupAttempted = false;
  let pngIdentity;
  let svgIdentity;
  try {
    parentBinding = openRenderDirectoryBinding(path.dirname(inputPath));
    stagingBinding = createRenderStagingDirectory(parentBinding);
    preserveStagingDirectory = false;
    const verifyBindings = () => {
      verifyRenderDirectoryBinding(parentBinding, { description: "render output parent" });
      verifyRenderDirectoryBinding(stagingBinding, { description: "render staging directory" });
    };
    const anchoredInput = path.join(parentBinding.descriptorPath, path.basename(inputPath));
    const anchoredLightPng = path.join(parentBinding.descriptorPath, path.basename(lightPng));
    const anchoredDarkSvg = path.join(parentBinding.descriptorPath, path.basename(darkSvg));
    const stagedPng = path.join(stagingBinding.descriptorPath, stagedPngName);
    const stagedSvg = path.join(stagingBinding.descriptorPath, stagedSvgName);
    const childParent = "/proc/self/fd/3";
    const childStaging = "/proc/self/fd/4";
    const childInput = path.join(childParent, path.basename(inputPath));
    const childStagedPng = path.join(childStaging, stagedPngName);
    const childStagedSvg = path.join(childStaging, stagedSvgName);
    const inheritedDirectories = [parentBinding.handle, stagingBinding.handle];

    verifyBindings();
    const inputStat = fs.lstatSync(anchoredInput);
    if (inputStat.isSymbolicLink() || !inputStat.isFile()) {
      throw new Error("draw.io input is not a regular descriptor-anchored file");
    }
    verifyBindings();
    const pngResult = runDrawio(
      drawio,
      ["-x", "-f", "png", "-s", "2", "-b", "10", ...pageArgs, "-o", childStagedPng, childInput],
      inheritedDirectories,
    );
    verifyBindings();
    try {
      pngIdentity = validatePng(stagedPng);
    } catch (error) {
      throw withCommandOutput(error, pngResult);
    }
    verifyBindings();
    const svgResult = runDrawio(
      drawio,
      [
        "-x",
        "-f",
        "svg",
        "--svg-theme",
        "dark",
        "-e",
        "-b",
        "10",
        ...pageArgs,
        "-o",
        childStagedSvg,
        childInput,
      ],
      inheritedDirectories,
    );
    verifyBindings();
    try {
      svgIdentity = validateSvg(stagedSvg);
    } catch (error) {
      throw withCommandOutput(error, svgResult);
    }
    verifyBindings();
    const committedArtifacts = [
      { staged: stagedPng, destination: anchoredLightPng, expectedIdentity: pngIdentity },
      { staged: stagedSvg, destination: anchoredDarkSvg, expectedIdentity: svgIdentity },
    ];
    const commitResult = commitRenderArtifacts(committedArtifacts, stagingBinding.descriptorPath, {
      expectedStagingIdentity: stagingBinding,
    });
    preserveStagingDirectory = commitResult.preserveStagingDirectory;
    if (!preserveStagingDirectory) {
      cleanupAttempted = true;
      removeRenderStagingDirectory(stagingBinding, parentBinding, [stagedPngName, stagedSvgName]);
      // Unlinking the private hard links is itself an adversarial boundary. The
      // public artifacts receive the definitive digest pass only afterwards.
      verifyCommittedRenderArtifacts(committedArtifacts);
    }
    console.log(`draw.io CLI: ${drawio}`);
    console.log(`light PNG: ${lightPng}`);
    console.log(`dark SVG: ${darkSvg}`);
    if (commitResult.recoveryDirectory) {
      console.log(`replacement recovery directory: ${stagingBinding.lexicalPath}`);
    }
  } catch (error) {
    preserveStagingDirectory = !stagingBinding || Boolean(error?.preserveStagingDirectory);
    console.error(error.message);
    process.exitCode = 1;
    if (!preserveStagingDirectory && !cleanupAttempted && parentBinding && stagingBinding) {
      cleanupAttempted = true;
      try {
        removeRenderStagingDirectory(stagingBinding, parentBinding, [stagedPngName, stagedSvgName]);
      } catch (cleanupError) {
        preserveStagingDirectory = true;
        console.error(
          `render staging directory could not be removed safely and was retained: ${cleanupError.message}`,
        );
      }
    }
  } finally {
    if (stagingBinding) fs.closeSync(stagingBinding.handle);
    if (parentBinding) fs.closeSync(parentBinding.handle);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
