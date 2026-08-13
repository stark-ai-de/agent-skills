import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const INDEX_SCHEMA_VERSION = 1;
const MAX_ARTIFACTS = 1_000;
const STORE_TIMEOUT_MS = 20_000;
const PAGE_SIZE = 100;
const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
const MAX_ENTRY_BYTES = 384 * 1024 * 1024;
const MAX_ENTRY_COUNT = 100_000;
const MAX_CONTROL_PLANE_CALLS = 256;
const MAX_CONTROL_PLANE_TREES = 64;
const MAX_CONTROL_PLANE_TREE_ENTRIES = 4_096;
const MAX_CONTROL_PLANE_FILES = 256;
const MAX_CONTROL_PLANE_FILE_BYTES = 8 * 1024 * 1024;
const MAX_CONTROL_PLANE_BYTES = 32 * 1024 * 1024;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const TASK_KEY_PATTERN = /^sha256:([a-f0-9]{64})$/;
export const TASK_BUNDLE_FILE = "validation-task-bundle-v1.json";

function bytewiseCompare(left, right) {
  return Buffer.from(left).compare(Buffer.from(right));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

function sha256Bytes(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function gitBlobSha(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes)
    .digest("hex");
}

function controlPlaneFromWitnesses(witnesses) {
  const ordered = [...witnesses].sort((left, right) => bytewiseCompare(left.path, right.path));
  const workflow = ordered.find(
    ({ path: relative }) => relative === ".github/workflows/validate.yml",
  );
  if (!workflow) throw new Error("Control plane is missing .github/workflows/validate.yml.");
  return {
    workflowDigest: workflow.digest,
    controlPlaneDigest: `sha256:${crypto.createHash("sha256").update(canonicalJson(ordered)).digest("hex")}`,
  };
}

export function localControlPlaneIdentity(repository) {
  const root = path.resolve(repository);
  const files = [];
  let treeCount = 0;
  let treeEntryCount = 0;
  let totalBytes = 0;
  const visit = (directory) => {
    treeCount += 1;
    if (treeCount > MAX_CONTROL_PLANE_TREES) {
      throw new Error("Local control-plane tree bound was exceeded.");
    }
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    treeEntryCount += entries.length;
    if (treeEntryCount > MAX_CONTROL_PLANE_TREE_ENTRIES) {
      throw new Error("Local control-plane tree-entry bound was exceeded.");
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Control-plane path is a symlink: ${absolute}`);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && !entry.name.endsWith(".test.mjs")) files.push(absolute);
    }
  };
  const workflow = path.join(root, ".github/workflows/validate.yml");
  files.push(workflow);
  visit(path.join(root, "scripts/ci"));
  if (files.length > MAX_CONTROL_PLANE_FILES) {
    throw new Error("Local control-plane file bound was exceeded.");
  }
  return controlPlaneFromWitnesses(
    files.map((file) => {
      const stat = fs.lstatSync(file);
      if (stat.size > MAX_CONTROL_PLANE_FILE_BYTES) {
        throw new Error(`Local control-plane file exceeds its size bound: ${file}`);
      }
      totalBytes += stat.size;
      if (totalBytes > MAX_CONTROL_PLANE_BYTES) {
        throw new Error("Local control-plane byte bound was exceeded.");
      }
      return {
        path: path.relative(root, file).split(path.sep).join("/"),
        mode: (stat.mode & 0o111) === 0 ? "0644" : "0755",
        size: stat.size,
        digest: sha256Bytes(fs.readFileSync(file)),
      };
    }),
  );
}

function clone(value) {
  return structuredClone(value);
}

function storeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireRepository(value) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value ?? "")) {
    throw new Error("GitHub repository must be an owner/repository name.");
  }
  return value;
}

function requirePositiveString(value, label) {
  const normalized = typeof value === "number" ? String(value) : value;
  if (!/^[1-9]\d*$/.test(normalized ?? "")) {
    throw new Error(`${label} must be a positive integer string.`);
  }
  return normalized;
}

function comparePositiveDecimal(left, right) {
  const normalizedLeft = requirePositiveString(left, "Identifier");
  const normalizedRight = requirePositiveString(right, "Identifier");
  return (
    normalizedLeft.length - normalizedRight.length ||
    bytewiseCompare(normalizedLeft, normalizedRight)
  );
}

function requireDigest(value, label) {
  if (!DIGEST_PATTERN.test(value ?? "")) throw new Error(`${label} must be a SHA-256 digest.`);
  return value;
}

function normalizeArtifactDigest(value) {
  const normalized = /^[a-f0-9]{64}$/.test(value ?? "") ? `sha256:${value}` : value;
  return requireDigest(normalized, "GitHub artifact digest");
}

export function taskArtifactName(gateId, taskKey, runId, runAttempt) {
  if (!/^[a-z][a-z0-9-]*$/.test(gateId ?? "")) throw new Error("Task gate ID is invalid.");
  const key = TASK_KEY_PATTERN.exec(taskKey ?? "")?.[1];
  if (!key) throw new Error("Task key must be a SHA-256 digest.");
  requirePositiveString(runId, "Task artifact run ID");
  requirePositiveString(runAttempt, "Task artifact run attempt");
  return `validation-task-v1-${gateId}-${key}-${runId}-${runAttempt}`;
}

function artifactPrefix(gateId, taskKey) {
  const key = TASK_KEY_PATTERN.exec(taskKey ?? "")?.[1];
  if (!/^[a-z][a-z0-9-]*$/.test(gateId ?? "") || !key) {
    throw new Error("Task artifact lookup identity is invalid.");
  }
  return `validation-task-v1-${gateId}-${key}-`;
}

export function validateArchivePath(name) {
  if (
    typeof name !== "string" ||
    name.length === 0 ||
    name.includes("\0") ||
    name.includes("\\") ||
    name.startsWith("/") ||
    name.includes("//")
  ) {
    throw new Error(`Artifact archive path is unsafe or ambiguous: ${String(name)}`);
  }
  const normalized = name.endsWith("/") ? name.slice(0, -1) : name;
  const components = normalized.split("/");
  if (components.some((component) => !component || component === "." || component === "..")) {
    throw new Error(`Artifact archive path is unsafe or ambiguous: ${name}`);
  }
  return normalized;
}

export function validateBundleEntry(name) {
  const normalized = validateArchivePath(name);
  if (normalized !== TASK_BUNDLE_FILE) {
    throw new Error(`Artifact archive contains undeclared outer content: ${name}`);
  }
  return normalized;
}

function validateInnerPath(name) {
  if (name === ".") return name;
  const normalized = validateArchivePath(name);
  if (
    normalized !== "bundle.json" &&
    normalized !== "receipt.json" &&
    normalized !== "outputs" &&
    !normalized.startsWith("outputs/")
  ) {
    throw new Error(`Task bundle contains undeclared content: ${name}`);
  }
  return normalized;
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  if (canonicalJson(actual) !== canonicalJson([...expected].sort())) {
    throw new Error(`${label} fields are not exact.`);
  }
}

function publicationEntries(directory) {
  const root = path.resolve(directory);
  const entries = [];
  let totalBytes = 0;
  const visit = (absolute, relative) => {
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink())
      throw new Error(`Task bundle contains a symlink: ${relative || "."}`);
    const mode = (stat.mode & 0o7777).toString(8).padStart(4, "0");
    if (stat.isDirectory()) {
      entries.push({
        path: relative || ".",
        type: "directory",
        mode,
        size: 0,
        digest: sha256Bytes(Buffer.alloc(0)),
        contentBase64: "",
      });
      const names = fs.readdirSync(absolute).sort(bytewiseCompare);
      for (const name of names)
        visit(path.join(absolute, name), relative ? `${relative}/${name}` : name);
    } else if (stat.isFile() && stat.nlink === 1) {
      const bytes = fs.readFileSync(absolute);
      totalBytes += bytes.length;
      if (totalBytes > MAX_ENTRY_BYTES)
        throw new Error("Task bundle content exceeds its size limit.");
      entries.push({
        path: validateInnerPath(relative),
        type: "file",
        mode,
        size: bytes.length,
        digest: sha256Bytes(bytes),
        contentBase64: bytes.toString("base64"),
      });
    } else {
      throw new Error(`Task bundle contains an unsupported entry: ${relative || "."}`);
    }
    if (entries.length > MAX_ENTRY_COUNT) throw new Error("Task bundle exceeds its entry limit.");
  };
  visit(root, "");
  return entries;
}

function parseCanonicalTaskBundle(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_ARCHIVE_BYTES) {
    throw new Error("Canonical task bundle size is invalid.");
  }
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`Canonical task bundle JSON is malformed: ${error.message}`);
  }
  exactKeys(document, ["schemaVersion", "format", "entries"], "canonical task bundle");
  if (
    document.schemaVersion !== 1 ||
    document.format !== "validation-task-bundle" ||
    !Array.isArray(document.entries) ||
    document.entries.length === 0 ||
    document.entries.length > MAX_ENTRY_COUNT
  ) {
    throw new Error("Canonical task bundle schema is invalid.");
  }
  if (!bytes.equals(Buffer.from(canonicalJson(document)))) {
    throw new Error("Canonical task bundle is not canonically serialized.");
  }
  const seen = new Set();
  let totalBytes = 0;
  for (const [index, entry] of document.entries.entries()) {
    exactKeys(
      entry,
      ["path", "type", "mode", "size", "digest", "contentBase64"],
      "canonical task bundle entry",
    );
    const normalized = validateInnerPath(entry.path);
    if (normalized !== entry.path || seen.has(normalized)) {
      throw new Error(`Canonical task bundle path is duplicate or noncanonical: ${entry.path}`);
    }
    seen.add(normalized);
    if (!new Set(["file", "directory"]).has(entry.type) || !/^0[0-7]{3}$/.test(entry.mode)) {
      throw new Error(`Canonical task bundle entry type or mode is invalid: ${entry.path}`);
    }
    if (!Number.isSafeInteger(entry.size) || entry.size < 0 || !DIGEST_PATTERN.test(entry.digest)) {
      throw new Error(`Canonical task bundle entry size or digest is invalid: ${entry.path}`);
    }
    if (typeof entry.contentBase64 !== "string") {
      throw new Error(`Canonical task bundle entry content is invalid: ${entry.path}`);
    }
    const content = Buffer.from(entry.contentBase64, "base64");
    if (content.toString("base64") !== entry.contentBase64) {
      throw new Error(`Canonical task bundle entry base64 is noncanonical: ${entry.path}`);
    }
    if (
      (entry.type === "directory" && (entry.size !== 0 || content.length !== 0)) ||
      (entry.type === "file" && content.length !== entry.size) ||
      sha256Bytes(content) !== entry.digest
    ) {
      throw new Error(`Canonical task bundle entry content is contradictory: ${entry.path}`);
    }
    if (index === 0 && (entry.path !== "." || entry.type !== "directory")) {
      throw new Error("Canonical task bundle must begin with its root directory.");
    }
    if (entry.path !== ".") {
      const parent = path.posix.dirname(entry.path);
      const parentEntry = document.entries.find(({ path: candidate }) => candidate === parent);
      if (parent !== "." && parentEntry?.type !== "directory") {
        throw new Error(`Canonical task bundle parent is absent or not a directory: ${entry.path}`);
      }
    }
    totalBytes += content.length;
    if (totalBytes > MAX_ENTRY_BYTES)
      throw new Error("Canonical task bundle expands beyond its limit.");
  }
  const actualPaths = document.entries.map((entry) => entry.path);
  const sortedPaths = [".", ...actualPaths.slice(1).sort(bytewiseCompare)];
  if (canonicalJson(actualPaths) !== canonicalJson(sortedPaths)) {
    throw new Error("Canonical task bundle paths are not bytewise ordered.");
  }
  const fileBytes = (name) => {
    const entry = document.entries.find(
      ({ path: candidate, type }) => candidate === name && type === "file",
    );
    if (!entry) throw new Error(`Canonical task bundle is missing ${name}.`);
    return Buffer.from(entry.contentBase64, "base64");
  };
  const fixedModes = new Map([
    [".", ["directory", "0700"]],
    ["bundle.json", ["file", "0600"]],
    ["receipt.json", ["file", "0600"]],
  ]);
  for (const [name, [type, mode]] of fixedModes) {
    const entry = document.entries.find(({ path: candidate }) => candidate === name);
    if (entry?.type !== type || entry.mode !== mode) {
      throw new Error(`Canonical task bundle ${name} type or mode is not deterministic.`);
    }
  }
  const outputsRoot = document.entries.find(({ path: candidate }) => candidate === "outputs");
  if (outputsRoot && (outputsRoot.type !== "directory" || outputsRoot.mode !== "0755")) {
    throw new Error("Canonical task bundle outputs root type or mode is not deterministic.");
  }
  let receipt;
  let bundle;
  const receiptBytes = fileBytes("receipt.json");
  const bundleBytes = fileBytes("bundle.json");
  try {
    receipt = JSON.parse(receiptBytes.toString("utf8"));
    bundle = JSON.parse(bundleBytes.toString("utf8"));
  } catch (error) {
    throw new Error(`Canonical task bundle metadata is malformed: ${error.message}`);
  }
  if (
    !receiptBytes.equals(Buffer.from(canonicalJson(receipt))) ||
    !bundleBytes.equals(Buffer.from(canonicalJson(bundle)))
  ) {
    throw new Error("Canonical task bundle metadata is not canonically serialized.");
  }
  return { document, entries: document.entries, receipt, bundle };
}

export function packCanonicalTaskBundle(publicationDirectory, outputFile) {
  const document = {
    schemaVersion: 1,
    format: "validation-task-bundle",
    entries: publicationEntries(publicationDirectory),
  };
  // Canonical ordering is an independently verified part of the transport format.
  document.entries = [
    document.entries[0],
    ...document.entries.slice(1).sort((left, right) => bytewiseCompare(left.path, right.path)),
  ];
  const bytes = Buffer.from(canonicalJson(document));
  parseCanonicalTaskBundle(bytes);
  const target = path.resolve(outputFile);
  if (fs.existsSync(target)) throw new Error("Canonical task bundle destination already exists.");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes, { mode: 0o600 });
  return { file: target, digest: sha256Bytes(bytes), size: bytes.length };
}

function materializeTaskBundle(parsed, destination) {
  const target = path.resolve(destination);
  if (fs.existsSync(target)) throw new Error("Canonical task bundle destination must be absent.");
  for (const entry of parsed.entries) {
    const absolute = entry.path === "." ? target : path.join(target, ...entry.path.split("/"));
    const mode = Number.parseInt(entry.mode, 8);
    if (entry.type === "directory") fs.mkdirSync(absolute, { recursive: false, mode });
    else fs.writeFileSync(absolute, Buffer.from(entry.contentBase64, "base64"), { mode });
    fs.chmodSync(absolute, mode);
  }
  return { directory: target, receipt: clone(parsed.receipt), bundle: clone(parsed.bundle) };
}

export function materializeCanonicalTaskBundle(bundleFile, destination) {
  return materializeTaskBundle(parseCanonicalTaskBundle(fs.readFileSync(bundleFile)), destination);
}

function findEndOfCentralDirectory(buffer) {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("GitHub artifact is not a supported ZIP archive.");
}

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let current = value;
  for (let bit = 0; bit < 8; bit += 1) {
    current = (current & 1) === 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }
  return current >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function parseZipEntries(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_ARCHIVE_BYTES) {
    throw new Error("GitHub artifact ZIP size is invalid.");
  }
  const eocd = findEndOfCentralDirectory(buffer);
  const disk = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const diskEntries = buffer.readUInt16LE(eocd + 8);
  const totalEntries = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const commentLength = buffer.readUInt16LE(eocd + 20);
  if (
    disk !== 0 ||
    centralDisk !== 0 ||
    diskEntries !== totalEntries ||
    totalEntries === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff ||
    totalEntries > MAX_ENTRY_COUNT ||
    centralOffset + centralSize !== eocd ||
    eocd + 22 + commentLength !== buffer.length
  ) {
    throw new Error("GitHub artifact uses an unsupported ZIP layout.");
  }
  const seen = new Set();
  const entries = [];
  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("GitHub artifact ZIP central directory is malformed.");
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const expectedCrc = buffer.readUInt32LE(offset + 16);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const externalAttributes = buffer.readUInt32LE(offset + 38);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const rowEnd = offset + 46 + nameLength + extraLength + commentLength;
    if (
      rowEnd > buffer.length ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff
    ) {
      throw new Error("GitHub artifact uses unsupported ZIP64 metadata.");
    }
    if ((flags & ~(0x8 | 0x800)) !== 0 || !new Set([0, 8]).has(method)) {
      throw new Error("GitHub artifact uses encryption or an unsupported compression method.");
    }
    const rawNameBytes = buffer.subarray(offset + 46, offset + 46 + nameLength);
    const rawName = rawNameBytes.toString("utf8");
    if (!Buffer.from(rawName, "utf8").equals(rawNameBytes)) {
      throw new Error("GitHub artifact ZIP path is not valid canonical UTF-8.");
    }
    const name = validateBundleEntry(rawName);
    if (seen.has(name)) throw new Error(`GitHub artifact contains duplicate entry: ${rawName}`);
    seen.add(name);
    const unixMode = externalAttributes >>> 16;
    const type = unixMode & 0o170000;
    const directory = rawName.endsWith("/");
    if (type === 0o120000 || (!directory && type !== 0 && type !== 0o100000)) {
      throw new Error(`GitHub artifact contains a non-regular entry: ${rawName}`);
    }
    if (directory && uncompressedSize !== 0) {
      throw new Error(`GitHub artifact directory contains data: ${rawName}`);
    }
    if (uncompressedSize > MAX_ENTRY_BYTES) {
      throw new Error(`GitHub artifact entry exceeds its size limit: ${rawName}`);
    }
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_ARCHIVE_BYTES) {
      throw new Error("GitHub artifact expands beyond its size limit.");
    }
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("GitHub artifact ZIP local header is malformed.");
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const localFlags = buffer.readUInt16LE(localOffset + 6);
    const localMethod = buffer.readUInt16LE(localOffset + 8);
    const localCrc = buffer.readUInt32LE(localOffset + 14);
    const localCompressedSize = buffer.readUInt32LE(localOffset + 18);
    const localUncompressedSize = buffer.readUInt32LE(localOffset + 22);
    const localHeaderEnd = localOffset + 30 + localNameLength + localExtraLength;
    if (localHeaderEnd > centralOffset) {
      throw new Error(`GitHub artifact ZIP local header is truncated: ${rawName}`);
    }
    const localNameBytes = buffer.subarray(localOffset + 30, localOffset + 30 + localNameLength);
    if (
      localFlags !== flags ||
      localMethod !== method ||
      !localNameBytes.equals(rawNameBytes) ||
      ((flags & 0x8) === 0 &&
        (localCrc !== expectedCrc ||
          localCompressedSize !== compressedSize ||
          localUncompressedSize !== uncompressedSize)) ||
      ((flags & 0x8) !== 0 &&
        ((localCrc !== 0 && localCrc !== expectedCrc) ||
          (localCompressedSize !== 0 && localCompressedSize !== compressedSize) ||
          (localUncompressedSize !== 0 && localUncompressedSize !== uncompressedSize)))
    ) {
      throw new Error(`GitHub artifact ZIP local header contradicts central metadata: ${rawName}`);
    }
    const dataOffset = localHeaderEnd;
    const dataEnd = dataOffset + compressedSize;
    if (dataEnd > buffer.length) throw new Error("GitHub artifact ZIP entry is truncated.");
    entries.push({
      name,
      rawName,
      directory,
      mode: unixMode & 0o7777 || (directory ? 0o755 : 0o644),
      method,
      flags,
      expectedCrc,
      compressedSize,
      uncompressedSize,
      localOffset,
      localExtraLength,
      dataOffset,
    });
    offset = rowEnd;
  }
  if (offset !== centralOffset + centralSize) {
    throw new Error("GitHub artifact ZIP central directory size is contradictory.");
  }
  const localOrder = [...entries].sort((left, right) => left.localOffset - right.localOffset);
  if (localOrder[0]?.localOffset !== 0) {
    throw new Error("GitHub artifact ZIP contains an ambiguous prefix.");
  }
  for (const [index, entry] of localOrder.entries()) {
    let end = entry.dataOffset + entry.compressedSize;
    if ((entry.flags & 0x8) !== 0) {
      const signed = buffer.readUInt32LE(end) === 0x08074b50;
      const descriptor = end + (signed ? 4 : 0);
      if (
        descriptor + 12 > centralOffset ||
        buffer.readUInt32LE(descriptor) !== entry.expectedCrc ||
        buffer.readUInt32LE(descriptor + 4) !== entry.compressedSize ||
        buffer.readUInt32LE(descriptor + 8) !== entry.uncompressedSize
      ) {
        throw new Error(`GitHub artifact ZIP data descriptor is contradictory: ${entry.name}`);
      }
      end = descriptor + 12;
    }
    const nextHeader = localOrder[index + 1]?.localOffset ?? centralOffset;
    if (end !== nextHeader) {
      throw new Error(
        `GitHub artifact ZIP contains overlapping or ambiguous local data: ${entry.name}`,
      );
    }
  }
  return entries;
}

function entryBytes(buffer, entry) {
  const compressed = buffer.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
  const bytes = entry.method === 0 ? Buffer.from(compressed) : zlib.inflateRawSync(compressed);
  if (bytes.length !== entry.uncompressedSize) {
    throw new Error(`GitHub artifact entry size is contradictory: ${entry.name}`);
  }
  if (crc32(bytes) !== entry.expectedCrc) {
    throw new Error(`GitHub artifact entry CRC is contradictory: ${entry.name}`);
  }
  return bytes;
}

function writeAtomic(file, value) {
  const destination = path.resolve(file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(temporary, canonicalJson(value), { mode: 0o600 });
  fs.renameSync(temporary, destination);
}

function readUntrustedIndex(file) {
  if (!file || !fs.existsSync(file)) return [];
  try {
    const index = JSON.parse(fs.readFileSync(file, "utf8"));
    if (index?.schemaVersion !== INDEX_SCHEMA_VERSION || !Array.isArray(index.observations)) {
      return [];
    }
    return index.observations.filter(
      (item) =>
        item &&
        typeof item.repositoryIdentity === "string" &&
        typeof item.gateId === "string" &&
        DIGEST_PATTERN.test(item.taskKey ?? "") &&
        item.receipt &&
        item.locator,
    );
  } catch {
    return [];
  }
}

function createTimeoutController(deadline, timeoutMs = STORE_TIMEOUT_MS) {
  const remaining = deadline ? Date.parse(deadline) - Date.now() : timeoutMs;
  const bounded = Math.max(
    1,
    Math.min(timeoutMs, Number.isFinite(remaining) ? remaining : timeoutMs),
  );
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error("GitHub artifact request exceeded its deadline."));
  }, bounded);
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
    },
  };
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function createDefaultArchive({ requestBytes, temporaryRoot }) {
  const cache = new Map();
  const load = async (artifactId, expectedDigest, expectedSize, requestOptions = {}) => {
    const key = String(artifactId);
    if (!cache.has(key)) {
      cache.set(
        key,
        (async () => {
          const bytes = await requestBytes(`actions/artifacts/${key}/zip`, requestOptions);
          const digest = `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
          if (digest !== expectedDigest) {
            throw new Error("Downloaded GitHub artifact digest contradicts its metadata.");
          }
          if (bytes.length !== expectedSize) {
            throw new Error("Downloaded GitHub artifact size contradicts its metadata.");
          }
          const entries = parseZipEntries(bytes);
          if (
            entries.length !== 1 ||
            entries[0].directory ||
            entries[0].name !== TASK_BUNDLE_FILE
          ) {
            throw new Error("GitHub artifact must contain exactly one canonical task bundle file.");
          }
          if (!new Set([0o600, 0o644]).has(entries[0].mode)) {
            throw new Error("GitHub artifact canonical task bundle file mode is unsupported.");
          }
          const inner = parseCanonicalTaskBundle(entryBytes(bytes, entries[0]));
          return { buffer: bytes, digest, entries, inner };
        })(),
      );
    }
    return await cache.get(key);
  };
  return {
    async inspect({ artifact, deadline, timeoutMs }) {
      const digest = normalizeArtifactDigest(artifact.digest);
      const size = Number(artifact.size_in_bytes);
      const loaded = await load(artifact.id, digest, size, { deadline, timeoutMs });
      return {
        digest: loaded.digest,
        size,
        receipt: clone(loaded.inner.receipt),
        bundle: clone(loaded.inner.bundle),
      };
    },
    async restore({ artifact, outputId, destination, deadline, timeoutMs }) {
      if (!/^[a-z][a-z0-9-]*$/.test(outputId ?? "")) {
        throw new Error("Output ID is invalid.");
      }
      const digest = normalizeArtifactDigest(artifact.digest);
      const size = Number(artifact.size_in_bytes);
      const loaded = await load(artifact.id, digest, size, { deadline, timeoutMs });
      const prefix = `outputs/${outputId}`;
      const selected = loaded.inner.entries.filter(
        ({ path: entryPath }) => entryPath === prefix || entryPath.startsWith(`${prefix}/`),
      );
      if (selected.length === 0) throw new Error(`GitHub artifact output ${outputId} is absent.`);
      const target = path.resolve(destination);
      if (fs.existsSync(target)) throw new Error("Artifact restore destination must be absent.");
      const temporary = fs.mkdtempSync(path.join(temporaryRoot, "task-output-"));
      const payload = path.join(temporary, "payload");
      try {
        const rootEntry = selected.find(({ path: entryPath }) => entryPath === prefix);
        const fileRoot = rootEntry?.type === "file";
        if (fileRoot && selected.length !== 1) {
          throw new Error(`GitHub artifact output ${outputId} mixes file and directory entries.`);
        }
        if (fileRoot) {
          fs.writeFileSync(payload, Buffer.from(rootEntry.contentBase64, "base64"), {
            mode: Number.parseInt(rootEntry.mode, 8),
          });
        } else {
          if (rootEntry?.type !== "directory") {
            throw new Error(`GitHub artifact output ${outputId} has no declared root directory.`);
          }
          fs.mkdirSync(payload, {
            recursive: true,
            mode: Number.parseInt(rootEntry.mode, 8),
          });
          for (const entry of selected) {
            if (entry.path === prefix) continue;
            const relative = entry.path.slice(prefix.length + 1);
            const outputPath = path.join(payload, ...relative.split("/"));
            const mode = Number.parseInt(entry.mode, 8);
            if (entry.type === "directory") {
              fs.mkdirSync(outputPath, { recursive: false, mode });
              fs.chmodSync(outputPath, mode);
            } else {
              fs.writeFileSync(outputPath, Buffer.from(entry.contentBase64, "base64"), { mode });
              fs.chmodSync(outputPath, mode);
            }
          }
          fs.chmodSync(payload, Number.parseInt(rootEntry.mode, 8));
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.renameSync(payload, target);
        return {
          digest,
          fileCount: selected.filter(({ type }) => type === "file").length,
        };
      } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
      }
    },
  };
}

export function createGitHubValidationTaskStore(options) {
  const repository = requireRepository(options.repository);
  const token = options.token;
  if (typeof token !== "string" || token.length === 0) throw new Error("GitHub token is required.");
  const apiUrl = (options.apiUrl ?? "https://api.github.com").replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("A Fetch implementation is required.");
  const indexFile = options.indexFile ? path.resolve(options.indexFile) : null;
  const currentRunId = options.currentRunId
    ? requirePositiveString(options.currentRunId, "Current run ID")
    : null;
  const temporaryRoot = path.resolve(options.temporaryRoot ?? os.tmpdir());
  fs.mkdirSync(temporaryRoot, { recursive: true });

  const request = async (endpoint, { deadline, timeoutMs = STORE_TIMEOUT_MS } = {}, consume) => {
    const timeout = createTimeoutController(deadline, timeoutMs);
    try {
      let response;
      try {
        response = await fetchImpl(`${apiUrl}/repos/${repository}/${endpoint}`, {
          headers: githubHeaders(token),
          redirect: "follow",
          signal: timeout.signal,
        });
      } catch (error) {
        throw storeError(
          "ERR_STORE_UNAVAILABLE",
          `GitHub artifact request failed: ${error.message}`,
        );
      }
      if (response.status === 404)
        throw storeError("ERR_STORE_ABSENT", "GitHub artifact is absent.");
      if (!response.ok) {
        throw storeError(
          "ERR_STORE_UNAVAILABLE",
          `GitHub artifact request failed with HTTP ${response.status}.`,
        );
      }
      try {
        const value = await consume(response);
        if (timeout.signal.aborted) throw timeout.signal.reason;
        return value;
      } catch (error) {
        if (timeout.signal.aborted) {
          throw storeError(
            "ERR_STORE_UNAVAILABLE",
            `GitHub artifact request failed: ${timeout.signal.reason?.message ?? "deadline exceeded"}`,
          );
        }
        throw error;
      }
    } finally {
      timeout.dispose();
    }
  };
  const requestJson = async (endpoint, requestOptions) =>
    await request(endpoint, requestOptions, async (response) => {
      try {
        return await response.json();
      } catch (error) {
        throw new Error(`GitHub returned malformed JSON for ${endpoint}: ${error.message}`);
      }
    });
  const requestBytes = async (endpoint, requestOptions) => {
    const bytes = await request(endpoint, requestOptions, async (response) =>
      Buffer.from(await response.arrayBuffer()),
    );
    if (bytes.length === 0 || bytes.length > MAX_ARCHIVE_BYTES) {
      throw new Error("Downloaded GitHub artifact has an invalid size.");
    }
    return bytes;
  };
  const producerControlPlaneCache = new Map();
  const defaultVerifyProducerControlPlane = async ({ sha, deadline, timeoutMs }) => {
    if (!/^[a-f0-9]{40}$/.test(sha ?? "")) throw new Error("Producer SHA is malformed.");
    if (!producerControlPlaneCache.has(sha)) {
      producerControlPlaneCache.set(
        sha,
        (async () => {
          let calls = 0;
          let treeCount = 0;
          let treeEntryCount = 0;
          let fileCount = 0;
          let totalBytes = 0;
          const boundedJson = async (endpoint) => {
            calls += 1;
            if (calls > MAX_CONTROL_PLANE_CALLS) {
              throw new Error("Producer control-plane API call bound was exceeded.");
            }
            return await requestJson(endpoint, {
              deadline,
              timeoutMs: Math.min(timeoutMs ?? STORE_TIMEOUT_MS, 5_000),
            });
          };
          const commit = await boundedJson(`git/commits/${sha}`);
          if (
            commit?.sha !== sha ||
            !/^[a-f0-9]{40}$/.test(commit?.tree?.sha ?? "") ||
            !Array.isArray(commit?.parents) ||
            commit.parents.some((parent) => !/^[a-f0-9]{40}$/.test(parent?.sha ?? ""))
          ) {
            throw new Error("Producer Git commit tree metadata is malformed.");
          }
          const loadTree = async (treeSha) => {
            treeCount += 1;
            if (treeCount > MAX_CONTROL_PLANE_TREES) {
              throw new Error("Producer control-plane tree bound was exceeded.");
            }
            const tree = await boundedJson(`git/trees/${treeSha}`);
            if (tree?.sha !== treeSha || tree?.truncated !== false || !Array.isArray(tree.tree)) {
              throw new Error("Producer Git tree is truncated or malformed.");
            }
            treeEntryCount += tree.tree.length;
            if (treeEntryCount > MAX_CONTROL_PLANE_TREE_ENTRIES) {
              throw new Error("Producer control-plane tree-entry bound was exceeded.");
            }
            const byName = new Map();
            for (const entry of tree.tree) {
              if (
                typeof entry?.path !== "string" ||
                entry.path.length === 0 ||
                entry.path === "." ||
                entry.path === ".." ||
                entry.path.includes("/") ||
                entry.path.includes("\\") ||
                entry.path.includes("\0") ||
                byName.has(entry.path) ||
                !/^[a-f0-9]{40}$/.test(entry.sha ?? "")
              ) {
                throw new Error("Producer Git tree contains an unsafe or duplicate entry.");
              }
              byName.set(entry.path, entry);
            }
            return byName;
          };
          const requireTree = (entry, label) => {
            if (entry?.type !== "tree" || entry?.mode !== "040000") {
              throw new Error(`Producer control-plane ${label} is not a regular Git tree.`);
            }
            return entry.sha;
          };
          const loadBlobWitness = async (entry, relative) => {
            if (
              entry?.type !== "blob" ||
              !new Set(["100644", "100755"]).has(entry.mode) ||
              !Number.isSafeInteger(entry.size) ||
              entry.size < 0 ||
              entry.size > MAX_CONTROL_PLANE_FILE_BYTES
            ) {
              throw new Error(`Producer control-plane entry is unsupported: ${relative}`);
            }
            fileCount += 1;
            totalBytes += entry.size;
            if (fileCount > MAX_CONTROL_PLANE_FILES || totalBytes > MAX_CONTROL_PLANE_BYTES) {
              throw new Error("Producer control-plane file or byte bound was exceeded.");
            }
            const blob = await boundedJson(`git/blobs/${entry.sha}`);
            if (
              blob?.sha !== entry.sha ||
              blob?.encoding !== "base64" ||
              typeof blob.content !== "string" ||
              Number(blob.size) !== entry.size
            ) {
              throw new Error(`Producer control-plane blob is malformed: ${relative}`);
            }
            const compact = blob.content.replace(/\s/g, "");
            const bytes = Buffer.from(compact, "base64");
            if (
              bytes.toString("base64") !== compact ||
              bytes.length !== entry.size ||
              gitBlobSha(bytes) !== entry.sha
            ) {
              throw new Error(`Producer control-plane blob bytes are contradictory: ${relative}`);
            }
            return {
              path: relative,
              mode: entry.mode === "100755" ? "0755" : "0644",
              size: entry.size,
              digest: sha256Bytes(bytes),
            };
          };
          const witnesses = [];
          const rootTree = await loadTree(commit.tree.sha);
          const dotGitHub = await loadTree(requireTree(rootTree.get(".github"), ".github"));
          const workflows = await loadTree(
            requireTree(dotGitHub.get("workflows"), ".github/workflows"),
          );
          witnesses.push(
            await loadBlobWitness(workflows.get("validate.yml"), ".github/workflows/validate.yml"),
          );
          const scripts = await loadTree(requireTree(rootTree.get("scripts"), "scripts"));
          const ciSha = requireTree(scripts.get("ci"), "scripts/ci");
          const walkCi = async (treeSha, relativeDirectory) => {
            const entries = await loadTree(treeSha);
            for (const name of [...entries.keys()].sort(bytewiseCompare)) {
              const entry = entries.get(name);
              const relative = `${relativeDirectory}/${name}`;
              if (entry.type === "tree") {
                requireTree(entry, relative);
                await walkCi(entry.sha, relative);
              } else {
                if (entry.type !== "blob" || !new Set(["100644", "100755"]).has(entry.mode)) {
                  throw new Error(`Producer control-plane entry is unsupported: ${relative}`);
                }
                if (!name.endsWith(".test.mjs")) {
                  witnesses.push(await loadBlobWitness(entry, relative));
                }
              }
            }
          };
          await walkCi(ciSha, "scripts/ci");
          return {
            ...controlPlaneFromWitnesses(witnesses),
            commit: {
              sha: commit.sha,
              parents: commit.parents.map(({ sha: parentSha }) => parentSha),
            },
          };
        })(),
      );
    }
    return await producerControlPlaneCache.get(sha);
  };
  const verifyProducerControlPlane =
    options.verifyProducerControlPlane ?? defaultVerifyProducerControlPlane;
  const archive = options.archive ?? createDefaultArchive({ requestBytes, temporaryRoot });
  let inventoryPromise = null;
  const inventory = async ({ deadline, timeoutMs = STORE_TIMEOUT_MS } = {}) => {
    if (inventoryPromise) return await inventoryPromise;
    inventoryPromise = (async () => {
      const artifacts = [];
      let totalCount = null;
      for (let page = 1; artifacts.length < MAX_ARTIFACTS; page += 1) {
        const document = await requestJson(`actions/artifacts?per_page=${PAGE_SIZE}&page=${page}`, {
          deadline,
          timeoutMs,
        });
        if (!Array.isArray(document?.artifacts) || !Number.isSafeInteger(document.total_count)) {
          throw new Error("GitHub artifact inventory is malformed.");
        }
        totalCount ??= document.total_count;
        artifacts.push(...document.artifacts.slice(0, MAX_ARTIFACTS - artifacts.length));
        if (document.artifacts.length < PAGE_SIZE || artifacts.length >= totalCount) break;
      }
      return artifacts;
    })();
    return await inventoryPromise;
  };

  const exactArtifact = async (id, requestOptions = {}) => {
    const artifact = await requestJson(
      `actions/artifacts/${requirePositiveString(id, "Artifact ID")}`,
      requestOptions,
    );
    if (String(artifact?.id ?? "") !== String(id)) {
      throw new Error("GitHub artifact metadata returned a contradictory ID.");
    }
    return artifact;
  };

  const exactRun = async (runId, requestOptions = {}) =>
    await requestJson(`actions/runs/${requirePositiveString(runId, "Run ID")}`, requestOptions);

  const jobCheckRunId = (job) =>
    /^https:\/\/api\.github\.com\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/check-runs\/([1-9]\d*)$/.exec(
      job?.check_run_url ?? "",
    )?.[1] ?? null;

  const exactJob = async (runId, runAttempt, jobId, requestOptions = {}) => {
    const expectedId = requirePositiveString(jobId, "Job check-run ID");
    let found = null;
    for (let page = 1; page <= 10; page += 1) {
      const document = await requestJson(
        `actions/runs/${requirePositiveString(runId, "Run ID")}/attempts/${requirePositiveString(runAttempt, "Run attempt")}/jobs?per_page=${PAGE_SIZE}&page=${page}`,
        requestOptions,
      );
      if (!Array.isArray(document?.jobs)) throw new Error("GitHub job inventory is malformed.");
      const matches = document.jobs.filter((job) => jobCheckRunId(job) === expectedId);
      if (matches.length > 1 || (found && matches.length)) {
        throw new Error("GitHub job inventory contains a duplicate producer job.");
      }
      found ??= matches[0] ?? null;
      if (document.jobs.length < PAGE_SIZE) break;
    }
    if (!found) throw storeError("ERR_STORE_ABSENT", "GitHub producer job is absent.");
    return found;
  };

  const verify = async ({
    locator,
    receipt,
    trustContext,
    deadline,
    timeoutMs = STORE_TIMEOUT_MS,
  }) => {
    if (locator?.kind !== "github-artifact")
      throw new Error("Producer locator is not a GitHub artifact.");
    if (locator.repository !== repository || receipt?.source?.repository !== repository) {
      throw new Error("Producer repository is contradictory.");
    }
    for (const [field, value] of Object.entries({
      repository,
      workflowPath: receipt.source.workflowPath,
      workflowDigest: receipt.source.workflowDigest,
      controlPlaneDigest: receipt.source.controlPlaneDigest,
    })) {
      if (trustContext?.[field] !== value) {
        throw new Error(`Producer ${field} is outside the current trust context.`);
      }
    }
    const artifact = await exactArtifact(locator.id, { deadline, timeoutMs });
    const digest = normalizeArtifactDigest(artifact.digest);
    const size = Number(artifact.size_in_bytes);
    for (const [actual, expected, label] of [
      [String(artifact.id), locator.id, "artifact ID"],
      [artifact.name, locator.name, "artifact name"],
      [digest, locator.digest, "artifact digest"],
      [size, locator.size, "artifact size"],
      [String(artifact.workflow_run?.id ?? ""), locator.runId, "artifact run ID"],
    ]) {
      if (actual !== expected) throw new Error(`GitHub ${label} contradicts the producer locator.`);
    }
    if (artifact.expired !== false)
      throw storeError("ERR_STORE_EXPIRED", "GitHub artifact expired.");
    const [run, job, inspected] = await Promise.all([
      exactRun(locator.runId, { deadline, timeoutMs }),
      exactJob(locator.runId, locator.runAttempt, locator.jobId, { deadline, timeoutMs }),
      archive.inspect({ artifact, deadline, timeoutMs }),
    ]);
    const expectedRun = {
      id: locator.runId,
      attempt: locator.runAttempt,
      event: receipt.source.event,
      workflowPath: receipt.source.workflowPath,
    };
    for (const [actual, expected, label] of [
      [String(run.id ?? ""), expectedRun.id, "run ID"],
      [String(run.run_attempt ?? ""), expectedRun.attempt, "run attempt"],
      [run.event, expectedRun.event, "run event"],
      [run.head_sha, artifact.workflow_run?.head_sha, "run head SHA"],
      [String(run.path ?? "").split("@", 1)[0], expectedRun.workflowPath, "workflow path"],
      [jobCheckRunId(job), locator.jobId, "job check-run ID"],
      [job.name, locator.jobName, "job name"],
      [job.status, "completed", "job status"],
      [job.conclusion, receipt.source.jobConclusion, "job conclusion"],
    ]) {
      if (actual !== expected) throw new Error(`GitHub producer ${label} is contradictory.`);
    }
    const isCurrentRun = currentRunId !== null && locator.runId === currentRunId;
    if (isCurrentRun) {
      if (
        run.status !== "in_progress" &&
        !(run.status === "completed" && new Set(["success", "failure"]).has(run.conclusion))
      ) {
        throw new Error("Current GitHub producer run is not active or completed.");
      }
    } else if (run.status !== "completed" || !new Set(["success", "failure"]).has(run.conclusion)) {
      throw new Error("Reusable GitHub producer run is not safely completed.");
    }
    if (
      run.repository?.full_name !== repository ||
      run.head_repository?.full_name !== repository ||
      !Number.isSafeInteger(run.repository?.id) ||
      run.repository.id <= 0 ||
      !Number.isSafeInteger(run.head_repository?.id) ||
      run.head_repository.id <= 0 ||
      run.head_repository.id !== run.repository.id ||
      String(artifact.workflow_run?.repository_id ?? "") !== String(run.repository.id) ||
      String(artifact.workflow_run?.head_repository_id ?? "") !== String(run.head_repository.id)
    ) {
      throw new Error("GitHub producer run repository identity is contradictory.");
    }
    const producerIdentity = await verifyProducerControlPlane({
      repository,
      sha: receipt.source.sha,
      deadline,
      timeoutMs,
    });
    if (
      producerIdentity.workflowDigest !== receipt.source.workflowDigest ||
      producerIdentity.controlPlaneDigest !== receipt.source.controlPlaneDigest ||
      producerIdentity.workflowDigest !== trustContext.workflowDigest ||
      producerIdentity.controlPlaneDigest !== trustContext.controlPlaneDigest
    ) {
      throw new Error("Producer Git control-plane bytes do not match the current trust context.");
    }
    if (receipt.source.event === "pull_request") {
      const refMatch = /^refs\/pull\/([1-9]\d*)\/merge$/.exec(receipt.source.ref ?? "");
      const pullRequests = run.pull_requests;
      if (
        !refMatch ||
        !Array.isArray(pullRequests) ||
        pullRequests.length !== 1 ||
        String(pullRequests[0]?.number ?? "") !== refMatch[1] ||
        pullRequests[0]?.head?.repo?.id !== run.head_repository.id ||
        pullRequests[0]?.base?.repo?.id !== run.repository.id
      ) {
        throw new Error("GitHub pull-request source metadata is contradictory.");
      }
      if (
        producerIdentity.commit?.sha !== receipt.source.sha ||
        producerIdentity.commit?.parents?.length !== 2 ||
        producerIdentity.commit.parents[1] !== run.head_sha
      ) {
        throw new Error("GitHub pull-request merge candidate parents are contradictory.");
      }
    } else if (run.head_sha !== receipt.source.sha) {
      throw new Error("GitHub producer run head SHA is contradictory.");
    }
    if (inspected.digest !== locator.digest || inspected.size !== locator.size) {
      throw new Error("Downloaded GitHub artifact contradicts the producer locator.");
    }
    if (canonicalJson(inspected.receipt) !== canonicalJson(receipt)) {
      throw new Error("Authoritative archived receipt contradicts the lookup receipt.");
    }
    return {
      schemaVersion: 1,
      verified: true,
      checkedAt: new Date().toISOString(),
      repository,
      workflowPath: receipt.source.workflowPath,
      workflowDigest: receipt.source.workflowDigest,
      controlPlaneDigest: receipt.source.controlPlaneDigest,
      runId: locator.runId,
      runAttempt: locator.runAttempt,
      jobId: locator.jobId,
      jobName: locator.jobName,
      jobConclusion: job.conclusion,
      event: run.event,
      ref: receipt.source.ref,
      sha: receipt.source.sha,
      artifact: {
        id: locator.id,
        name: locator.name,
        digest: locator.digest,
        size: locator.size,
        expired: false,
        createdAt: artifact.created_at,
      },
    };
  };

  return {
    async lookup({
      repositoryIdentity,
      gateId,
      taskKey,
      limit = MAX_ARTIFACTS,
      deadline,
      timeoutMs = STORE_TIMEOUT_MS,
    }) {
      if (repositoryIdentity !== repository) {
        throw new Error("Task lookup repository does not match the GitHub store.");
      }
      if (!Number.isSafeInteger(limit) || limit < 0 || limit > MAX_ARTIFACTS) {
        throw new Error("Task lookup limit is invalid.");
      }
      if (limit === 0) {
        return { schemaVersion: 1, order: "newest-first", complete: true, observations: [] };
      }
      const requestOptions = {
        deadline:
          deadline ?? new Date(Date.now() + Math.min(timeoutMs, STORE_TIMEOUT_MS)).toISOString(),
        timeoutMs,
      };
      const prefix = artifactPrefix(gateId, taskKey);
      const indexed = readUntrustedIndex(indexFile).filter(
        (item) =>
          item.repositoryIdentity === repositoryIdentity &&
          item.gateId === gateId &&
          item.taskKey === taskKey,
      );
      const scanned = [];
      for (const hint of indexed) {
        try {
          const artifact = await exactArtifact(hint.locator.id, requestOptions);
          if (artifact.expired !== false || !artifact.name?.startsWith(prefix)) continue;
          const inspected = await archive.inspect({ artifact, ...requestOptions });
          if (
            inspected.receipt?.gateId !== gateId ||
            inspected.receipt?.taskKey !== taskKey ||
            canonicalJson(inspected.receipt) !== canonicalJson(hint.receipt)
          ) {
            continue;
          }
          const source = inspected.receipt.source;
          scanned.push({
            repositoryIdentity,
            gateId,
            taskKey,
            receipt: inspected.receipt,
            locator: {
              kind: "github-artifact",
              id: String(artifact.id),
              name: artifact.name,
              digest: normalizeArtifactDigest(artifact.digest),
              size: Number(artifact.size_in_bytes),
              repository,
              runId: String(source.runId),
              runAttempt: String(source.runAttempt),
              jobId: String(source.jobId),
              jobName: source.jobName,
            },
            observedAt: artifact.created_at,
          });
        } catch {
          // A cache-restored index is an untrusted acceleration hint. Any stale,
          // poisoned, malformed, or unavailable hint is discarded before the
          // bounded authoritative repository scan below.
          continue;
        }
      }
      for (const artifact of await inventory(requestOptions)) {
        if (artifact?.expired !== false || !artifact?.name?.startsWith(prefix)) continue;
        const inspected = await archive.inspect({ artifact, ...requestOptions });
        const document = inspected.receipt;
        if (document?.gateId !== gateId || document?.taskKey !== taskKey) {
          throw new Error("Task artifact name contradicts its authoritative receipt.");
        }
        const source = document.source;
        scanned.push({
          repositoryIdentity,
          gateId,
          taskKey,
          receipt: document,
          locator: {
            kind: "github-artifact",
            id: String(artifact.id),
            name: artifact.name,
            digest: normalizeArtifactDigest(artifact.digest),
            size: Number(artifact.size_in_bytes),
            repository,
            runId: String(source.runId),
            runAttempt: String(source.runAttempt),
            jobId: String(source.jobId),
            jobName: source.jobName,
          },
          observedAt: artifact.created_at,
        });
      }
      const byArtifact = new Map();
      // Index entries are only hints. Every observation in `scanned` has been
      // independently reopened and read from its immutable artifact.
      for (const observation of scanned) {
        const id = String(observation.locator?.id ?? "");
        if (!id) continue;
        const existing = byArtifact.get(id);
        if (existing && canonicalJson(existing) !== canonicalJson(observation)) {
          throw new Error("Task index contradicts authoritative artifact discovery.");
        }
        byArtifact.set(id, observation);
      }
      const observations = [...byArtifact.values()]
        .sort((left, right) => {
          const observed = Date.parse(right.observedAt) - Date.parse(left.observedAt);
          if (!Number.isFinite(observed)) {
            throw new Error("GitHub artifact creation time is malformed.");
          }
          return (
            observed ||
            comparePositiveDecimal(right.locator.runId, left.locator.runId) ||
            comparePositiveDecimal(right.locator.runAttempt, left.locator.runAttempt) ||
            comparePositiveDecimal(right.locator.id, left.locator.id)
          );
        })
        .slice(0, limit)
        .map(({ receipt: document, locator: producer, observedAt }) => ({
          receipt: clone(document),
          locator: clone(producer),
          observedAt,
        }));
      return { schemaVersion: 1, order: "newest-first", complete: true, observations };
    },

    verify,

    async publish({ receipt, locator, verifiedMetadata }) {
      if (verifiedMetadata?.verified !== true) {
        throw new Error("GitHub task publication requires authoritative metadata verification.");
      }
      const observations = readUntrustedIndex(indexFile).filter(
        (item) => String(item.locator?.id ?? "") !== String(locator.id),
      );
      observations.push({
        repositoryIdentity: receipt.source.repository,
        gateId: receipt.gateId,
        taskKey: receipt.taskKey,
        receipt: clone(receipt),
        locator: clone(locator),
        publishedAt: new Date().toISOString(),
      });
      if (indexFile) {
        writeAtomic(indexFile, {
          schemaVersion: INDEX_SCHEMA_VERSION,
          repository,
          updatedAt: new Date().toISOString(),
          observations,
        });
      }
      return clone(locator);
    },

    async restore({ locator, outputId, destination, deadline, timeoutMs = STORE_TIMEOUT_MS }) {
      const artifact = await exactArtifact(locator.id, { deadline, timeoutMs });
      if (artifact.expired !== false)
        throw storeError("ERR_STORE_EXPIRED", "GitHub artifact expired.");
      if (
        normalizeArtifactDigest(artifact.digest) !== locator.digest ||
        Number(artifact.size_in_bytes) !== locator.size ||
        artifact.name !== locator.name
      ) {
        throw new Error("Restore artifact metadata contradicts its verified locator.");
      }
      return await archive.restore({ artifact, outputId, destination, deadline, timeoutMs });
    },

    async resolveCurrentJob({
      runId,
      runAttempt,
      jobId,
      jobName,
      deadline,
      timeoutMs = STORE_TIMEOUT_MS,
    }) {
      const job = await exactJob(runId, runAttempt, jobId, { deadline, timeoutMs });
      if (
        job?.name !== jobName ||
        !new Set(["queued", "in_progress", "completed"]).has(job?.status)
      ) {
        throw new Error("Current GitHub job identity is contradictory.");
      }
      return clone(job);
    },

    async locateArtifact({
      id,
      expectedName,
      runId,
      runAttempt,
      jobId,
      jobName,
      deadline,
      timeoutMs = STORE_TIMEOUT_MS,
    }) {
      const artifact = await exactArtifact(id, { deadline, timeoutMs });
      if (
        artifact.name !== expectedName ||
        String(artifact.workflow_run?.id ?? "") !== String(runId)
      ) {
        throw new Error("Uploaded artifact metadata contradicts its expected producer.");
      }
      return {
        kind: "github-artifact",
        id: String(artifact.id),
        name: artifact.name,
        digest: normalizeArtifactDigest(artifact.digest),
        size: Number(artifact.size_in_bytes),
        repository,
        runId: String(runId),
        runAttempt: String(runAttempt),
        jobId: String(jobId),
        jobName,
      };
    },

    async findArtifact({
      expectedName,
      runId,
      runAttempt,
      jobId,
      jobName,
      deadline,
      timeoutMs = STORE_TIMEOUT_MS,
    }) {
      const document = await requestJson(
        `actions/runs/${requirePositiveString(runId, "Run ID")}/artifacts?name=${encodeURIComponent(expectedName)}&per_page=100`,
        { deadline, timeoutMs },
      );
      if (!Array.isArray(document?.artifacts)) {
        throw new Error("GitHub run artifact inventory is malformed.");
      }
      const matches = document.artifacts.filter(
        (artifact) => artifact?.name === expectedName && artifact?.expired === false,
      );
      if (matches.length !== 1) {
        const error = storeError(
          matches.length === 0 ? "ERR_STORE_ABSENT" : "ERR_STORE_UNAVAILABLE",
          `Expected exactly one current-run artifact named ${expectedName}, found ${matches.length}.`,
        );
        throw error;
      }
      return {
        kind: "github-artifact",
        id: String(matches[0].id),
        name: matches[0].name,
        digest: normalizeArtifactDigest(matches[0].digest),
        size: Number(matches[0].size_in_bytes),
        repository,
        runId: String(runId),
        runAttempt: String(runAttempt),
        jobId: String(jobId),
        jobName,
      };
    },

    async materializeBundle({ locator, destination, deadline, timeoutMs = STORE_TIMEOUT_MS }) {
      const artifact = await exactArtifact(locator.id, { deadline, timeoutMs });
      const inspected = await archive.inspect({ artifact, deadline, timeoutMs });
      const target = path.resolve(destination);
      if (fs.existsSync(target)) throw new Error("Bundle destination must be absent.");
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, "receipt.json"), canonicalJson(inspected.receipt), {
        mode: 0o600,
      });
      fs.writeFileSync(path.join(target, "bundle.json"), canonicalJson(inspected.bundle), {
        mode: 0o600,
      });
      for (const output of inspected.receipt.outputs ?? []) {
        await archive.restore({
          artifact,
          outputId: output.id,
          destination: path.join(target, "outputs", output.id),
          deadline,
          timeoutMs,
        });
      }
      return { inspected, directory: target };
    },
  };
}

export const _internal = Object.freeze({
  canonicalJson,
  parseZipEntries,
  taskArtifactName,
  validateArchivePath,
  validateBundleEntry,
});
