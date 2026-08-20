import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import Ajv2020 from "ajv/dist/2020.js";
import { canonicalJson, hashBytes, loadValidatedBundle } from "./bundle-contract.mjs";
import {
  assertNoUntrackedReleaseInputs,
  listTrackedSourceFiles,
  normalizedGitFileMode,
} from "./git-index.mjs";
import { readOpenAiListing } from "./openai-listing.mjs";
import { PINNED_AGENT_PLUGINS_SCHEMA_PATH, pluginIdentity } from "./release-descriptor.mjs";
import { writeZipStoreV1 } from "./reproducible-archive.mjs";

export const PORTABLE_PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
export const PORTABLE_TARGET = "plugins/stark-ai-developer";
export const RETIRED_OPENAI_ADAPTER_TARGET = "adapters/openai/stark-ai-developer";
export const STANDALONE_TARGET = "dist/skills";

const GENERATED_ROOT_FILES = new Set([
  "LICENSE",
  "README.md",
  "SOURCE-MANIFEST.json",
  "plugin.json",
]);
const POSIX_SEPARATOR = "/";
const GENERATED_CACHE_SEGMENTS = new Set(["__pycache__"]);
const GENERATED_CACHE_SUFFIX = /\.(?:py[cod]|pyd)$/;

function resolveRoot(root = process.cwd()) {
  return path.resolve(root);
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join(POSIX_SEPARATOR);
}

function fromPosix(relativePath) {
  return path.join(...relativePath.split(POSIX_SEPARATOR));
}

function assertInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`path escapes repository root: ${target}`);
  }
  let current = resolvedRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stat = lstatOrNull(current);
    if (!stat) break;
    if (stat.isSymbolicLink()) {
      throw new Error(`path contains a symlinked component: ${target}`);
    }
  }
}

function lstatOrNull(filePath) {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function assertSafeNode(filePath, relativePath) {
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink()) {
    throw new Error(`symlink is not allowed in generated source: ${relativePath}`);
  }
  if (!stat.isDirectory() && !stat.isFile()) {
    throw new Error(`special file is not allowed in generated source: ${relativePath}`);
  }
  return stat;
}

function normalizedMode(stat, { gitRoot, gitRelative } = {}) {
  if (stat.isDirectory()) return 0o755;
  if (gitRoot && gitRelative) {
    return normalizedGitFileMode(gitRoot, gitRelative);
  }
  return stat.mode & 0o111 ? 0o755 : 0o644;
}

export function packageTreeHash(files) {
  const ordered = [...files].sort((left, right) => comparePosixPaths(left.path, right.path));
  const parts = [];
  for (const file of ordered) {
    const mode = file.mode === "0755" ? "0755" : "0644";
    parts.push(
      Buffer.from(mode, "utf8"),
      Buffer.from([0]),
      Buffer.from(String(file.byteLength), "utf8"),
      Buffer.from([0]),
      Buffer.from(file.sha256, "utf8"),
      Buffer.from([0]),
      Buffer.from(file.path, "utf8"),
      Buffer.from([0]),
    );
  }
  return hashBytes(Buffer.concat(parts));
}

function manifestEntry({ path: relativePath, bytes, mode }) {
  return {
    path: relativePath,
    sha256: hashBytes(bytes),
    mode: mode.toString(8).padStart(4, "0"),
    byteLength: bytes.length,
  };
}

function comparePosixPaths(left, right) {
  return Buffer.from(left).compare(Buffer.from(right));
}

function isGeneratedCachePath(relative) {
  const segments = relative.split(POSIX_SEPARATOR);
  return (
    segments.some((segment) => GENERATED_CACHE_SEGMENTS.has(segment)) ||
    GENERATED_CACHE_SUFFIX.test(segments.at(-1) ?? "")
  );
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o755 });
  fs.chmodSync(directory, 0o755);
}

function enumerateTree(root, relative = "", { excludeGeneratedCaches = false } = {}) {
  const absolute = relative ? path.join(root, fromPosix(relative)) : root;
  assertInside(root, absolute);
  const stat = assertSafeNode(absolute, relative || ".");
  if (stat.isFile()) {
    return [{ relative, absolute, stat }];
  }

  const entries = fs
    .readdirSync(absolute, { withFileTypes: true })
    .map((entry) => toPosix(path.join(relative, entry.name)))
    .filter((entry) => !excludeGeneratedCaches || !isGeneratedCachePath(entry))
    .sort(comparePosixPaths);
  return entries.flatMap((entry) => enumerateTree(root, entry, { excludeGeneratedCaches }));
}

function copyTree(
  sourceRoot,
  targetRoot,
  manifestFiles,
  manifestPrefix = "",
  { gitRoot, gitPrefix = "" } = {},
) {
  if (!gitRoot || !gitPrefix) {
    throw new Error("[REP-001] source copies require a git root and tracked prefix");
  }
  for (const entry of listTrackedSourceFiles(gitRoot, sourceRoot, gitPrefix)) {
    if (isGeneratedCachePath(entry.relative)) continue;
    const stat = assertSafeNode(entry.absolute, entry.relative);
    if (!stat.isFile()) {
      throw new Error(`expected regular file: ${entry.gitPath}`);
    }
    const target = path.join(targetRoot, fromPosix(entry.relative));
    ensureDirectory(path.dirname(target));
    const mode = normalizedGitFileMode(gitRoot, entry.gitPath);
    const bytes = fs.readFileSync(entry.absolute);
    fs.writeFileSync(target, bytes, { mode });
    fs.chmodSync(target, mode);
    const outputPath = toPosix(path.join(manifestPrefix, entry.relative));
    manifestFiles.push(manifestEntry({ path: outputPath, bytes, mode }));
  }
}

function copyRegularFile(
  source,
  target,
  manifestFiles,
  manifestPath,
  { gitRoot, gitRelative } = {},
) {
  const stat = assertSafeNode(source, manifestPath);
  if (!stat.isFile()) {
    throw new Error(`expected regular file: ${manifestPath}`);
  }
  ensureDirectory(path.dirname(target));
  const mode = normalizedMode(stat, { gitRoot, gitRelative });
  const bytes = fs.readFileSync(source);
  fs.writeFileSync(target, bytes, { mode });
  fs.chmodSync(target, mode);
  manifestFiles.push(manifestEntry({ path: manifestPath, bytes, mode }));
}

function writeGeneratedFile(target, content, manifestFiles, manifestPath, mode = 0o644) {
  ensureDirectory(path.dirname(target));
  const bytes = Buffer.from(content);
  fs.writeFileSync(target, bytes, { mode });
  fs.chmodSync(target, mode);
  manifestFiles.push(manifestEntry({ path: manifestPath, bytes, mode }));
}

function readRootFile(root, fileName) {
  const source = path.join(root, fileName);
  assertInside(root, source);
  const stat = lstatOrNull(source);
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`required repository file is not a regular file: ${fileName}`);
  }
  return source;
}

function portableManifest(root) {
  const identity = pluginIdentity(root);
  const description = readOpenAiListing(root).plugin?.longDescription;
  if (typeof description !== "string" || !description.trim()) {
    throw new Error("listing source plugin.longDescription is required for the portable manifest");
  }
  return {
    $schema: PORTABLE_PLUGIN_SCHEMA,
    name: identity.name,
    version: identity.version,
    description,
    author: {
      name: "servrox solutions UG",
      url: "https://stark-ai.de",
    },
    homepage: "https://stark-ai-de.github.io/agent-skills/plugins/stark-ai-developer/",
    repository: "https://github.com/stark-ai-de/agent-skills",
    license: "Apache-2.0",
    keywords: ["developer-tools", "agent-skills", "codex", "documentation", "harness-first"],
  };
}

function generatedReadme({ kind }) {
  const projectionName = kind === "portable" ? "portable Agent Plugin" : "OpenAI-native adapter";
  const clientGuidance =
    kind === "portable"
      ? "Use `plugins/stark-ai-developer/` only with a client that supports the portable Agent Plugins contract."
      : "Use this OpenAI-native `.codex-plugin` package only with a client that requires that native layout. It is generated at package time and is not a committed repository tree.";
  return `# stark AI Developer

${projectionName} generated from the explicit \`plugins/stark-ai-developer.source.json\` allowlist.

This harness-first package contains six developer workflows and has no backend, MCP
server, connectors, authentication, telemetry, analytics, hidden network calls,
or runtime downloads. Canonical skill content remains maintained under
\`skills/<category>/<skill>/\`; this ${kind} copy is generated and must not be edited
as a source.

${clientGuidance}
Standalone skill installation remains available from the repository through
\`npx skills@latest\`.
`;
}

function buildSourceManifest({ root, bundle, kind, manifestFiles }) {
  const files = [...manifestFiles].sort((left, right) => comparePosixPaths(left.path, right.path));
  const identity = pluginIdentity(root);
  return {
    schemaVersion: 1,
    projection: kind,
    bundleHash: hashBytes(Buffer.from(canonicalJson(bundle))),
    plugin: {
      id: identity.name,
      version: identity.version,
    },
    bundle: {
      id: bundle.id,
      displayName: bundle.displayName,
      skills: bundle.skills.map(({ name, source }) => ({ name, source })),
    },
    treeHash: packageTreeHash(files),
    archiveProfile: identity.archiveProfile,
    files,
  };
}

function writePortableStage(root, stage, bundle, { gitRoot = root } = {}) {
  assertNoUntrackedReleaseInputs(
    gitRoot,
    bundle.skills.map((entry) => entry.source),
  );
  const manifestFiles = [];
  const manifest = portableManifest(root);
  writeGeneratedFile(
    path.join(stage, "plugin.json"),
    canonicalJson(manifest),
    manifestFiles,
    "plugin.json",
  );
  for (const entry of bundle.skills) {
    copyTree(
      path.join(root, entry.source),
      path.join(stage, "skills", entry.name),
      manifestFiles,
      `skills/${entry.name}`,
      { gitRoot, gitPrefix: entry.source },
    );
  }
  copyRegularFile(
    readRootFile(root, "LICENSE"),
    path.join(stage, "LICENSE"),
    manifestFiles,
    "LICENSE",
    { gitRoot, gitRelative: "LICENSE" },
  );
  writeGeneratedFile(
    path.join(stage, "README.md"),
    generatedReadme({ kind: "portable", bundle }),
    manifestFiles,
    "README.md",
  );
  writeGeneratedFile(
    path.join(stage, "SOURCE-MANIFEST.json"),
    canonicalJson(buildSourceManifest({ root, bundle, kind: "portable", manifestFiles })),
    manifestFiles,
    "SOURCE-MANIFEST.json",
  );
}

function withStage(root, target, writer) {
  const targetAbsolute = path.join(root, fromPosix(target));
  assertInside(root, targetAbsolute);
  fs.mkdirSync(path.dirname(targetAbsolute), { recursive: true, mode: 0o755 });
  const stage = fs.mkdtempSync(
    path.join(path.dirname(targetAbsolute), `.${path.basename(targetAbsolute)}.stage-`),
  );
  fs.chmodSync(stage, 0o755);
  try {
    writer(stage);
  } catch (error) {
    fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }
  return { stage, targetAbsolute };
}

function withTempStage(prefix, writer) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.chmodSync(stage, 0o755);
  try {
    writer(stage);
    return stage;
  } catch (error) {
    fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }
}

function compareTrees(leftRoot, rightRoot, { excludeGeneratedCaches = false } = {}) {
  const left = new Map(
    enumerateTree(leftRoot, "", { excludeGeneratedCaches }).map((entry) => [
      entry.relative,
      {
        hash: hashBytes(fs.readFileSync(entry.absolute)),
        mode: normalizedMode(entry.stat),
      },
    ]),
  );
  const right = new Map(
    enumerateTree(rightRoot, "", { excludeGeneratedCaches }).map((entry) => [
      entry.relative,
      {
        hash: hashBytes(fs.readFileSync(entry.absolute)),
        mode: normalizedMode(entry.stat),
      },
    ]),
  );
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort(comparePosixPaths);
  const drift = [];
  for (const relative of paths) {
    const expected = left.get(relative);
    const actual = right.get(relative);
    if (!expected) {
      drift.push(`unexpected ${relative}`);
    } else if (!actual) {
      drift.push(`missing ${relative}`);
    } else if (expected.hash !== actual.hash) {
      drift.push(`changed ${relative}`);
    } else if (expected.mode !== actual.mode) {
      drift.push(`mode ${relative}`);
    }
  }
  const leftDirectories = new Map(
    directoryModes(leftRoot, "", { excludeGeneratedCaches }).map(({ relative, mode }) => [
      relative,
      mode,
    ]),
  );
  const rightDirectories = new Map(
    directoryModes(rightRoot, "", { excludeGeneratedCaches }).map(({ relative, mode }) => [
      relative,
      mode,
    ]),
  );
  const directoryPaths = [...new Set([...leftDirectories.keys(), ...rightDirectories.keys()])].sort(
    comparePosixPaths,
  );
  for (const relative of directoryPaths) {
    const expected = leftDirectories.get(relative);
    const actual = rightDirectories.get(relative);
    if (expected === undefined) {
      drift.push(`unexpected directory ${relative}`);
    } else if (actual === undefined) {
      drift.push(`missing directory ${relative}`);
    }
  }
  return drift;
}

function directoryModes(root, relative = "", { excludeGeneratedCaches = false } = {}) {
  const absolute = relative ? path.join(root, fromPosix(relative)) : root;
  assertInside(root, absolute);
  const stat = assertSafeNode(absolute, relative || ".");
  if (!stat.isDirectory()) return [];
  const result = [{ relative: relative || ".", mode: stat.mode & 0o777 }];
  const entries = fs
    .readdirSync(absolute, { withFileTypes: true })
    .map((entry) => toPosix(path.join(relative, entry.name)))
    .filter((entry) => !excludeGeneratedCaches || !isGeneratedCachePath(entry))
    .sort(comparePosixPaths);
  for (const entry of entries) {
    const child = path.join(root, fromPosix(entry));
    const childStat = assertSafeNode(child, entry);
    if (childStat.isDirectory()) {
      result.push(...directoryModes(root, entry, { excludeGeneratedCaches }));
    }
  }
  return result;
}

function createZipArchive(files, output) {
  const entries = Object.entries(files).map(([archivePath, value]) => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      return { path: archivePath, data: value, mode: 0o644 };
    }
    return { path: archivePath, data: value.data, mode: value.mode ?? 0o644 };
  });
  return writeZipStoreV1({ entries, output: path.resolve(output) });
}

function replaceGeneratedDirectory(stage, targetAbsolute) {
  const existing = lstatOrNull(targetAbsolute);
  if (existing?.isSymbolicLink()) {
    throw new Error(
      `generated target must not be a symlink: ${toPosix(path.relative(process.cwd(), targetAbsolute))}`,
    );
  }
  if (existing && !existing.isDirectory()) {
    throw new Error(`generated target must be a directory: ${targetAbsolute}`);
  }

  if (!existing) {
    fs.renameSync(stage, targetAbsolute);
    return;
  }

  const backup = path.join(
    path.dirname(targetAbsolute),
    `.${path.basename(targetAbsolute)}.previous-${crypto.randomUUID()}`,
  );
  fs.renameSync(targetAbsolute, backup);
  try {
    fs.renameSync(stage, targetAbsolute);
  } catch (error) {
    fs.renameSync(backup, targetAbsolute);
    throw error;
  }
  fs.rmSync(backup, { recursive: true, force: true });
}

function finishStagedProjection({ stage, targetAbsolute, check }) {
  if (check) {
    const existing = lstatOrNull(targetAbsolute);
    const drift = existing ? compareTrees(stage, targetAbsolute) : ["projection target is missing"];
    fs.rmSync(stage, { recursive: true, force: true });
    return drift;
  }
  replaceGeneratedDirectory(stage, targetAbsolute);
  return [];
}

export function syncGeneratedProjection({
  root = process.cwd(),
  target,
  check = false,
  writer,
} = {}) {
  const resolvedRoot = resolveRoot(root);
  const bundle = loadValidatedBundle(resolvedRoot);
  const staged = withStage(resolvedRoot, target, (stage) =>
    writer({ root: resolvedRoot, stage, bundle }),
  );
  const drift = finishStagedProjection({ ...staged, check });
  return {
    bundle,
    drift,
    target: path.join(resolvedRoot, fromPosix(target)),
  };
}

export function stagePortableProjection(
  root = process.cwd(),
  target = PORTABLE_TARGET,
  { gitRoot } = {},
) {
  const resolvedRoot = resolveRoot(root);
  const bundle = loadValidatedBundle(resolvedRoot);
  return withStage(resolvedRoot, target, (stage) =>
    writePortableStage(resolvedRoot, stage, bundle, { gitRoot: gitRoot ?? resolvedRoot }),
  );
}

export function syncPortableProjection({
  root = process.cwd(),
  target = PORTABLE_TARGET,
  check = false,
  gitRoot,
} = {}) {
  const resolvedRoot = resolveRoot(root);
  const bundle = loadValidatedBundle(resolvedRoot);
  const staged = withStage(resolvedRoot, target, (stage) =>
    writePortableStage(resolvedRoot, stage, bundle, { gitRoot: gitRoot ?? resolvedRoot }),
  );
  const drift = finishStagedProjection({ ...staged, check });
  return { bundle, drift, target: path.join(resolvedRoot, fromPosix(target)) };
}

export function writeSkillProjection({ root, stage, entry, manifestFiles, gitRoot = root }) {
  assertNoUntrackedReleaseInputs(gitRoot, [entry.source]);
  const yamlPath = path.join(root, entry.source, "agents", "openai.yaml");
  const yamlStat = lstatOrNull(yamlPath);
  if (!yamlStat?.isFile() || yamlStat.isSymbolicLink()) {
    throw new Error(`[META-001] missing canonical agents/openai.yaml for ${entry.name}`);
  }
  copyTree(
    path.join(root, entry.source),
    path.join(stage, "skills", entry.name),
    manifestFiles,
    `skills/${entry.name}`,
    { gitRoot, gitPrefix: entry.source },
  );
}

export function writeSharedPackageFiles({
  root,
  stage,
  bundle,
  kind,
  manifestFiles,
  includePluginManifest = false,
  pluginManifest,
  includeAssets = false,
  assetFiles = [],
  gitRoot = root,
}) {
  assertNoUntrackedReleaseInputs(
    gitRoot,
    bundle.skills.map((entry) => entry.source),
  );
  if (includePluginManifest) {
    writeGeneratedFile(
      path.join(stage, ".codex-plugin", "plugin.json"),
      canonicalJson(pluginManifest),
      manifestFiles,
      ".codex-plugin/plugin.json",
    );
  }
  for (const entry of bundle.skills) {
    writeSkillProjection({ root, stage, entry, manifestFiles, gitRoot });
  }
  copyRegularFile(
    readRootFile(root, "LICENSE"),
    path.join(stage, "LICENSE"),
    manifestFiles,
    "LICENSE",
    { gitRoot, gitRelative: "LICENSE" },
  );
  writeGeneratedFile(
    path.join(stage, "README.md"),
    generatedReadme({ kind, bundle }),
    manifestFiles,
    "README.md",
  );
  if (includeAssets) {
    for (const asset of assetFiles) {
      const relativeAsset = toPosix(path.relative(root, asset.source));
      copyRegularFile(
        asset.source,
        path.join(stage, "assets", asset.name),
        manifestFiles,
        `assets/${asset.name}`,
        { gitRoot, gitRelative: relativeAsset },
      );
    }
  }
  writeGeneratedFile(
    path.join(stage, "SOURCE-MANIFEST.json"),
    canonicalJson(buildSourceManifest({ root, bundle, kind, manifestFiles })),
    manifestFiles,
    "SOURCE-MANIFEST.json",
  );
}

export function createStandaloneArchive({
  root = process.cwd(),
  entry,
  output = path.join(STANDALONE_TARGET, `${entry.name}.zip`),
  gitRoot,
} = {}) {
  const resolvedRoot = resolveRoot(root);
  const indexRoot = gitRoot ?? resolvedRoot;
  const bundle = loadValidatedBundle(resolvedRoot);
  const selected = bundle.skills.find((skill) => skill.name === entry.name);
  if (!selected) {
    throw new Error(`standalone skill is not in the validated bundle: ${entry.name}`);
  }

  const files = {};
  const sourceRoot = path.join(resolvedRoot, selected.source);
  assertNoUntrackedReleaseInputs(indexRoot, [selected.source]);
  for (const sourceFile of listTrackedSourceFiles(indexRoot, sourceRoot, selected.source)) {
    if (isGeneratedCachePath(sourceFile.relative)) continue;
    files[`${selected.name}/${sourceFile.relative}`] = {
      data: fs.readFileSync(sourceFile.absolute),
      mode: normalizedGitFileMode(indexRoot, sourceFile.gitPath),
    };
  }
  const outputAbsolute = path.isAbsolute(output)
    ? output
    : path.join(resolvedRoot, fromPosix(output));
  return {
    bundle,
    entry: selected,
    ...createZipArchive(files, outputAbsolute),
  };
}

function modeMapFromSourceManifest(sourceRoot) {
  const manifestPath = path.join(sourceRoot, "SOURCE-MANIFEST.json");
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return new Map(
    (manifest.files ?? []).map((file) => [file.path, Number.parseInt(file.mode, 8) || 0o644]),
  );
}

export function createDirectoryArchive({ sourceRoot, output, archiveRoot = "" }) {
  const modes = modeMapFromSourceManifest(sourceRoot);
  const files = {};
  for (const sourceFile of enumerateTree(sourceRoot, "", { excludeGeneratedCaches: true })) {
    const archivePath = archiveRoot ? `${archiveRoot}/${sourceFile.relative}` : sourceFile.relative;
    const mode = modes?.get(sourceFile.relative) ?? normalizedMode(sourceFile.stat);
    files[archivePath] = { data: fs.readFileSync(sourceFile.absolute), mode };
  }
  return createZipArchive(files, path.resolve(output));
}

export function validatePortableProjection({
  root = process.cwd(),
  target = PORTABLE_TARGET,
} = {}) {
  const resolvedRoot = resolveRoot(root);
  const bundle = loadValidatedBundle(resolvedRoot);
  const targetRoot = path.join(resolvedRoot, fromPosix(target));
  const errors = [];
  const targetStat = lstatOrNull(targetRoot);
  if (!targetStat || !targetStat.isDirectory() || targetStat.isSymbolicLink()) {
    return { bundle, errors: [`portable projection is missing or not a directory: ${target}`] };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(targetRoot, "plugin.json"), "utf8"));
    const schemaPath = path.join(resolvedRoot, PINNED_AGENT_PLUGINS_SCHEMA_PATH);
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const validator = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
    if (!validator(manifest)) {
      errors.push(
        ...validator.errors.map(
          (error) => `plugin.json${error.instancePath || ""}: ${error.message}`,
        ),
      );
    }
  } catch (error) {
    errors.push(`portable plugin.json: ${error.message}`);
  }

  const expectedRoots = new Set(bundle.skills.map((entry) => `skills/${entry.name}`));
  for (const entry of fs.readdirSync(targetRoot, { withFileTypes: true })) {
    const relative = entry.name;
    if (GENERATED_ROOT_FILES.has(relative)) continue;
    if (relative === "skills" && entry.isDirectory()) continue;
    errors.push(`portable projection contains unexpected root entry: ${relative}`);
  }
  const skillsRoot = path.join(targetRoot, "skills");
  if (!lstatOrNull(skillsRoot)?.isDirectory()) {
    errors.push("portable projection is missing skills/");
  } else {
    const actualRoots = new Set(
      fs.readdirSync(skillsRoot, { withFileTypes: true }).map((entry) => `skills/${entry.name}`),
    );
    for (const expected of expectedRoots) {
      if (!actualRoots.has(expected)) errors.push(`portable projection is missing ${expected}/`);
    }
    for (const actual of actualRoots) {
      if (!expectedRoots.has(actual)) errors.push(`unexpected portable skill root: ${actual}/`);
    }
  }

  for (const file of ["LICENSE", "README.md", "SOURCE-MANIFEST.json"]) {
    const stat = lstatOrNull(path.join(targetRoot, file));
    if (!stat?.isFile() || stat.isSymbolicLink()) {
      errors.push(`portable projection is missing regular ${file}`);
    }
  }

  try {
    const identity = pluginIdentity(resolvedRoot);
    if (manifest?.name !== identity.name || manifest?.version !== identity.version) {
      errors.push("[REL-001] portable plugin.json identity must match the release descriptor");
    }
  } catch (error) {
    errors.push(`[REL-001] ${error.message}`);
  }

  const expectedStage = fs.mkdtempSync(path.join(os.tmpdir(), "portable-validate-"));
  let drift;
  try {
    writePortableStage(resolvedRoot, expectedStage, bundle, { gitRoot: resolvedRoot });
    const expectedManifest = fs.readFileSync(path.join(expectedStage, "SOURCE-MANIFEST.json"));
    const actualManifest = fs.readFileSync(path.join(targetRoot, "SOURCE-MANIFEST.json"));
    if (Buffer.compare(expectedManifest, actualManifest) !== 0) {
      errors.push("SOURCE-MANIFEST.json does not match the validated canonical projection");
    }
    drift = compareTrees(expectedStage, targetRoot);
  } finally {
    fs.rmSync(expectedStage, { recursive: true, force: true });
  }
  errors.push(...drift.map((item) => `portable projection drift: ${item}`));
  return { bundle, errors: [...new Set(errors)] };
}

export function listProjectionFiles(root) {
  return enumerateTree(root).map((entry) => entry.relative);
}

export function fileHash(filePath) {
  return hashBytes(fs.readFileSync(filePath));
}

export {
  canonicalJson,
  comparePosixPaths,
  compareTrees,
  directoryModes,
  enumerateTree,
  fromPosix,
  isGeneratedCachePath,
  listTrackedSourceFiles,
  normalizedMode,
  toPosix,
  assertInside,
  withTempStage,
};
