import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { unzipSync } from "fflate";

import { canonicalJson, hashBytes, loadValidatedBundle } from "./lib/bundle-contract.mjs";
import { validateOpenAiListing } from "./lib/openai-contract.mjs";
import { comparePosixPaths, enumerateTree } from "./lib/plugin-projections.mjs";
import { openAiManifestFromListing, readOpenAiListing } from "./lib/openai-projection.mjs";
import { pluginIdentity } from "./lib/release-descriptor.mjs";
import {
  assertNoPathCollisions,
  assertSafeArchivePath,
  inspectZipStoreV1,
} from "./lib/reproducible-archive.mjs";

const MAX_COMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;
const MAX_ENTRY_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_ENTRIES = 5000;

function inspectZipCentralDirectory(bytes) {
  const eocdSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const eocdOffset = bytes.lastIndexOf(eocdSignature);
  if (eocdOffset < 0 || eocdOffset + 22 > bytes.length) {
    throw new Error("OpenAI submission archive has no valid ZIP end record");
  }
  const entryCount = bytes.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = bytes.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = bytes.readUInt32LE(eocdOffset + 16);
  if (
    entryCount === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    throw new Error("ZIP64 archives are not supported by the submission validator");
  }
  if (centralDirectoryOffset + centralDirectorySize > eocdOffset) {
    throw new Error("ZIP central directory is outside the archive");
  }

  const entries = [];
  let cursor = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("ZIP central directory contains an invalid entry");
    }
    const versionMadeBy = bytes.readUInt16LE(cursor + 4);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const uncompressedSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const externalAttributes = bytes.readUInt32LE(cursor + 38);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length) throw new Error("ZIP central directory entry is truncated");
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    const unixMode = versionMadeBy >>> 8 === 3 ? (externalAttributes >>> 16) & 0xffff : 0;
    const unixType = unixMode & 0o170000;
    const isDirectory =
      name.endsWith("/") ||
      (versionMadeBy >>> 8 !== 3 && (externalAttributes & 0x10) !== 0) ||
      unixType === 0o040000;
    const isRegularFile = versionMadeBy >>> 8 !== 3 || unixType === 0 || unixType === 0o100000;
    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      isDirectory,
      isRegularFile,
    });
    cursor = end;
  }
  if (cursor !== centralDirectoryOffset + centralDirectorySize) {
    throw new Error("ZIP central directory size does not match its entries");
  }
  return entries;
}

function validateArchivePath(name) {
  const withoutDirectoryMarker = name.endsWith("/") ? name.slice(0, -1) : name;
  const segments = withoutDirectoryMarker.split("/");
  if (
    !withoutDirectoryMarker ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    return "contains an empty, dot, or parent path segment";
  }
  if (segments.length > 20) return "contains more than 20 path segments";
  if (name.includes("\\") || name.startsWith("/")) return "contains an absolute or Windows path";
  const normalized = `${path.posix.normalize(withoutDirectoryMarker)}${name.endsWith("/") ? "/" : ""}`;
  if (normalized !== name) return "is not normalized";
  try {
    assertSafeArchivePath(withoutDirectoryMarker);
  } catch (error) {
    return error.message.replace(/^\[[^\]]+\]\s*/, "");
  }
  return null;
}

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const archiveIndex = argv.indexOf("--archive");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  return {
    root,
    archive:
      archiveIndex === -1
        ? path.join(root, pluginIdentity(root).openaiArchive)
        : path.resolve(argv[archiveIndex + 1]),
  };
}

try {
  const { root, archive: archivePath } = parseArgs(process.argv.slice(2));
  const listingValidation = validateOpenAiListing(root);
  const bundle = loadValidatedBundle(root);
  const listing = listingValidation.listing ?? readOpenAiListing(root);
  const errors = [...listingValidation.errors];
  const archiveBytes = fs.readFileSync(archivePath);
  if (archiveBytes.length > MAX_COMPRESSED_BYTES) {
    errors.push("OpenAI submission archive exceeds 100 MB compressed");
  }
  try {
    inspectZipStoreV1(archiveBytes);
  } catch (error) {
    errors.push(`[REP-001] ${error.message}`);
  }
  const zipEntries = inspectZipCentralDirectory(archiveBytes);
  if (zipEntries.length > MAX_ENTRIES)
    errors.push("OpenAI submission archive exceeds 5,000 entries");
  const seenNames = new Map();
  for (const entry of zipEntries) {
    if (!entry.isRegularFile && !entry.isDirectory) {
      errors.push(`OpenAI submission archive contains unsupported entry ${entry.name}`);
    }
    const pathError = validateArchivePath(entry.name);
    if (pathError) errors.push(`OpenAI submission archive path ${entry.name} ${pathError}`);
    const normalized = path.posix.normalize(entry.name);
    const previous = seenNames.get(normalized);
    if (previous) {
      errors.push(
        `OpenAI submission archive contains a normalization collision: ${previous} and ${entry.name}`,
      );
    } else {
      seenNames.set(normalized, entry.name);
    }
    if (entry.uncompressedSize > MAX_ENTRY_UNCOMPRESSED_BYTES) {
      errors.push(`OpenAI submission archive entry exceeds 100 MiB: ${entry.name}`);
    }
  }
  const centralUncompressedBytes = zipEntries.reduce(
    (total, entry) => total + entry.uncompressedSize,
    0,
  );
  if (centralUncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
    errors.push("OpenAI submission archive exceeds 512 MiB extracted");
  }
  const files = unzipSync(archiveBytes);
  const names = zipEntries
    .filter((entry) => !entry.isDirectory)
    .map((entry) => entry.name)
    .sort(comparePosixPaths);
  try {
    assertNoPathCollisions(names);
  } catch (error) {
    errors.push(`[REP-001] ${error.message}`);
  }
  const uncompressedBytes = names.reduce((total, name) => total + (files[name]?.length ?? 0), 0);
  if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
    errors.push("OpenAI submission archive exceeds 512 MiB extracted");
  }
  for (const name of names) {
    if (!Object.prototype.hasOwnProperty.call(files, name)) {
      errors.push(`OpenAI submission archive entry could not be extracted: ${name}`);
    }
  }
  for (const entry of zipEntries) {
    if (
      !entry.isDirectory &&
      Object.prototype.hasOwnProperty.call(files, entry.name) &&
      files[entry.name].length !== entry.uncompressedSize
    ) {
      errors.push(`OpenAI submission archive size metadata is wrong: ${entry.name}`);
    }
  }

  const expectedRoots = new Set([
    ".codex-plugin/plugin.json",
    "assets/composer-icon.png",
    "assets/logo.png",
    "LICENSE",
    "README.md",
    "SOURCE-MANIFEST.json",
  ]);
  for (const rootEntry of expectedRoots) {
    if (!Object.prototype.hasOwnProperty.call(files, rootEntry)) {
      errors.push(`OpenAI submission archive is missing ${rootEntry}`);
    }
  }
  const expectedFiles = new Set(expectedRoots);
  for (const entry of bundle.skills) {
    for (const sourceFile of enumerateTree(path.join(root, entry.source), "", {
      excludeGeneratedCaches: true,
    })) {
      expectedFiles.add(`skills/${entry.name}/${sourceFile.relative}`);
    }
  }
  const expectedDirectories = new Set();
  for (const file of expectedFiles) {
    const segments = file.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      expectedDirectories.add(`${segments.slice(0, index).join("/")}/`);
    }
  }
  for (const entry of zipEntries) {
    if (entry.isDirectory && !expectedDirectories.has(entry.name)) {
      errors.push(`OpenAI submission archive contains unexpected directory ${entry.name}`);
    }
  }
  for (const expected of expectedFiles) {
    if (!Object.prototype.hasOwnProperty.call(files, expected)) {
      errors.push(`OpenAI submission archive is missing ${expected}`);
    }
  }
  for (const name of names) {
    if (!expectedFiles.has(name)) {
      errors.push(`OpenAI submission archive contains unexpected file ${name}`);
    }
  }
  for (const name of names) {
    if (
      !name.startsWith(".codex-plugin/") &&
      !name.startsWith("assets/") &&
      !name.startsWith("skills/") &&
      !["LICENSE", "README.md", "SOURCE-MANIFEST.json"].includes(name)
    ) {
      errors.push(`OpenAI submission archive contains unexpected root entry ${name}`);
    }
  }

  if (files[".codex-plugin/plugin.json"]) {
    const manifest = JSON.parse(Buffer.from(files[".codex-plugin/plugin.json"]).toString("utf8"));
    if (canonicalJson(manifest) !== canonicalJson(openAiManifestFromListing(listing))) {
      errors.push("submitted plugin manifest does not match listing source");
    }
  }
  const expectedSkillRoots = new Set(bundle.skills.map((entry) => `skills/${entry.name}/`));
  const actualSkillRoots = new Set(
    names
      .filter((name) => name.startsWith("skills/"))
      .map((name) => name.split("/").slice(0, 2).join("/") + "/"),
  );
  for (const expected of expectedSkillRoots) {
    if (!actualSkillRoots.has(expected)) errors.push(`submission archive is missing ${expected}`);
  }
  for (const actual of actualSkillRoots) {
    if (!expectedSkillRoots.has(actual)) errors.push(`submission archive contains ${actual}`);
  }

  for (const entry of bundle.skills) {
    const sourceRoot = path.join(root, entry.source);
    for (const sourceFile of enumerateTree(sourceRoot, "", {
      excludeGeneratedCaches: true,
    })) {
      const archiveName = `skills/${entry.name}/${sourceFile.relative}`;
      if (!files[archiveName]) {
        errors.push(`submission archive is missing ${archiveName}`);
      } else if (
        hashBytes(files[archiveName]) !== hashBytes(fs.readFileSync(sourceFile.absolute))
      ) {
        errors.push(`submission archive changed ${archiveName}`);
      }
    }
  }
  if (names.some((name) => /\.(mcp|app)\.json$/.test(name) || name.includes("hooks/"))) {
    errors.push("OpenAI submission archive contains a skills-only exclusion");
  }
  const combined = names.map((name) => Buffer.from(files[name]).toString("utf8")).join("\n");
  if (
    /(?:\/home\/(?!<)[^/\s]+\/|\/Users\/(?!<)[^/\s]+\/|BEGIN (?:RSA|OPENSSH) PRIVATE KEY|ghp_|(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9])/.test(
      combined,
    )
  ) {
    errors.push("OpenAI submission archive contains a private path or token-like value");
  }

  if (errors.length > 0) {
    console.error("OpenAI submission validation errors:");
    for (const error of [...new Set(errors)]) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Validated OpenAI submission archive (${names.length} entries, ${archiveBytes.length} compressed bytes, SHA-256 ${hashBytes(archiveBytes)}).`,
    );
  }
} catch (error) {
  console.error(`OpenAI submission validation failed: ${error.message}`);
  process.exitCode = 1;
}
