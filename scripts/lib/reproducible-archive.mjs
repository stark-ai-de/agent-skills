import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const EOCD = 0x06054b50;
const DOS_DATE = 0x0021;
const DOS_TIME = 0;
const VERSION_NEEDED = 20;
const VERSION_MADE_BY = (3 << 8) | 20;
const UTF8_FLAG = 0x0800;
const METHOD_STORE = 0;
const S_IFREG = 0o100000;
const WINDOWS_RESERVED = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i;
const INVALID_WINDOWS_CHARS = /[<>:"|?*\\]/;
const ZIP64_THRESHOLD = 0xffffffff;

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  CRC_TABLE[index] = crc >>> 0;
}

export const ARCHIVE_PROFILE = "zip-store-v1";
export const RELEASE_BUILD_ENV = {
  TZ: "UTC",
  LC_ALL: "C",
  SOURCE_DATE_EPOCH: "315532800",
};

export function applyReleaseBuildEnvironment() {
  for (const [key, value] of Object.entries(RELEASE_BUILD_ENV)) {
    process.env[key] = value;
  }
}

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc = CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function compareUtf8(left, right) {
  return Buffer.from(left).compare(Buffer.from(right));
}

export function assertSafeArchivePath(archivePath) {
  if (typeof archivePath !== "string" || archivePath.length === 0) {
    throw new Error("[REP-001] archive path must be a non-empty relative POSIX path");
  }
  if (archivePath.includes("\\") || archivePath.includes("\0")) {
    throw new Error(`[REP-001] archive path contains a forbidden character: ${archivePath}`);
  }
  if (archivePath !== archivePath.normalize("NFC")) {
    throw new Error(`[REP-001] archive path must be NFC-normalized: ${archivePath}`);
  }
  const utf8 = Buffer.from(archivePath);
  if (utf8.length > 1024) {
    throw new Error(`[REP-001] archive path exceeds 1024 UTF-8 bytes: ${archivePath}`);
  }
  const segments = archivePath.split("/");
  if (segments.length > 20) {
    throw new Error(`[REP-001] archive path has more than 20 segments: ${archivePath}`);
  }
  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") {
      throw new Error(`[REP-001] archive path has an empty or traversal segment: ${archivePath}`);
    }
    if ([...segment].some((char) => char.codePointAt(0) < 32)) {
      throw new Error(`[REP-001] archive path contains a control character: ${archivePath}`);
    }
    if (segment.endsWith(" ") || segment.endsWith(".")) {
      throw new Error(`[REP-001] archive path has a trailing space or period: ${archivePath}`);
    }
    if (INVALID_WINDOWS_CHARS.test(segment) || WINDOWS_RESERVED.test(segment)) {
      throw new Error(`[REP-001] archive path is not a valid Windows name: ${archivePath}`);
    }
    if (Buffer.from(segment).length > 255) {
      throw new Error(`[REP-001] archive path segment exceeds 255 UTF-8 bytes: ${archivePath}`);
    }
  }
}

export function assertNoPathCollisions(paths) {
  const nfc = new Map();
  const folded = new Map();
  for (const archivePath of paths) {
    const normalized = archivePath.normalize("NFC");
    if (nfc.has(normalized) && nfc.get(normalized) !== archivePath) {
      throw new Error(
        `[REP-001] NFC path collision between ${nfc.get(normalized)} and ${archivePath}`,
      );
    }
    nfc.set(normalized, archivePath);
    const key = archivePath.toLowerCase();
    if (folded.has(key) && folded.get(key) !== archivePath) {
      throw new Error(
        `[REP-001] case-fold collision between ${folded.get(key)} and ${archivePath}`,
      );
    }
    folded.set(key, archivePath);
  }
}

function unixExternalAttributes(mode) {
  return ((S_IFREG | (mode & 0o777)) << 16) >>> 0;
}

export function encodeZipStoreV1(entries) {
  applyReleaseBuildEnvironment();
  const files = entries.map((entry) => {
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const mode = entry.mode === 0o755 ? 0o755 : 0o644;
    assertSafeArchivePath(entry.path);
    if (data.length > 100 * 1024 * 1024) {
      throw new Error(`[OAI-001] archive entry exceeds 100 MiB: ${entry.path}`);
    }
    return { path: entry.path, data, mode, crc: crc32(data) };
  });
  files.sort((left, right) => compareUtf8(left.path, right.path));
  assertNoPathCollisions(files.map((file) => file.path));

  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.path, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_HEADER, 0);
    local.writeUInt16LE(VERSION_NEEDED, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(METHOD_STORE, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(file.crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, file.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_HEADER, 0);
    central.writeUInt16LE(VERSION_MADE_BY, 4);
    central.writeUInt16LE(VERSION_NEEDED, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(METHOD_STORE, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(file.crc, 16);
    central.writeUInt32LE(file.data.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(unixExternalAttributes(file.mode), 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + file.data.length;
    if (offset > ZIP64_THRESHOLD || file.data.length > ZIP64_THRESHOLD) {
      throw new Error("[REP-001] zip-store-v1 rejects ZIP64 output");
    }
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  if (files.length > 65535 || centralOffset > ZIP64_THRESHOLD || centralSize > ZIP64_THRESHOLD) {
    throw new Error("[REP-001] zip-store-v1 rejects ZIP64 output");
  }
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

export function inspectZipStoreV1(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const entries = [];
  let offset = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === LOCAL_HEADER) {
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const size = buffer.readUInt32LE(offset + 22);
    if (method !== METHOD_STORE || extraLength !== 0 || (flags & 0x0008) !== 0) {
      throw new Error("[REP-001] archive is not zip-store-v1 STORE-only");
    }
    const name = buffer.slice(offset + 30, offset + 30 + nameLength).toString("utf8");
    entries.push({ path: name, method, extraLength, size });
    offset += 30 + nameLength + size;
  }
  return entries;
}

export function writeZipStoreV1({ entries, output }) {
  const bytes = encodeZipStoreV1(entries);
  fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o755 });
  const temp = `${output}.tmp-${process.pid}-${crypto.randomUUID()}`;
  fs.writeFileSync(temp, bytes);
  fs.renameSync(temp, output);
  return {
    output,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    profile: ARCHIVE_PROFILE,
  };
}
