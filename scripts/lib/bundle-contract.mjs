import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { load as parseYaml } from "js-yaml";

import {
  loadReleaseDescriptorFile,
  membershipFromSource,
  PLUGIN_SOURCE_PATH,
  PLUGIN_SOURCE_SCHEMA_PATH,
} from "./release-descriptor.mjs";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const BUNDLE_SCHEMA_PATH = PLUGIN_SOURCE_SCHEMA_PATH;
export const DEFAULT_BUNDLE_PATH = PLUGIN_SOURCE_PATH;
export const EXPECTED_CODEX_SKILL_SOURCES = [
  "skills/codex-operations/codex-memory-curator",
  "skills/codex-operations/codex-spec-interviewer",
  "skills/engineering-workflows/animated-readme-logo",
  "skills/engineering-workflows/architecture-compass",
  "skills/engineering-workflows/codegraph-ast-grep",
  "skills/engineering-workflows/drawio-diagrams",
];
export const OPENAI_PRODUCTS = new Set(["CHAT", "CODEX"]);

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FRONTMATTER_PATTERN = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function resolveRoot(root = moduleRoot) {
  return path.resolve(root);
}

function relativePosix(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function formatAjvErrors(errors = []) {
  return errors.map((error) => {
    const location = error.instancePath || "/";
    return `${location} ${error.message}`;
  });
}

function isSafeIdentifier(value) {
  return typeof value === "string" && IDENTIFIER.test(value);
}

function isSafeSourcePath(source) {
  if (typeof source !== "string" || source.includes("\\") || source.startsWith("/")) {
    return false;
  }

  const segments = source.split("/");
  return (
    segments.length === 3 &&
    segments[0] === "skills" &&
    segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..") &&
    source === path.posix.normalize(source) &&
    segments.slice(1).every(isSafeIdentifier)
  );
}

function assertNoSymlinkPath(root, absolutePath, errors, label) {
  const relative = path.relative(root, absolutePath);
  const segments = relative.split(path.sep).filter(Boolean);
  let current = root;

  for (const segment of segments) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch {
      return true;
    }
    if (stat.isSymbolicLink()) {
      errors.push(`${label} must not traverse symlink ${relativePosix(root, current)}`);
      return false;
    }
  }
  return true;
}

function readSkillName(skillPath) {
  const skillFile = path.join(skillPath, "SKILL.md");
  const content = fs.readFileSync(skillFile, "utf8");
  const frontmatter = content.match(FRONTMATTER_PATTERN);
  if (!frontmatter) {
    throw new Error("SKILL.md is missing YAML frontmatter");
  }

  const metadata = parseYaml(frontmatter[1]);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("SKILL.md frontmatter must be a mapping");
  }
  return metadata.name;
}

function readOpenAiRouting(skillPath) {
  const metadataPath = path.join(skillPath, "agents", "openai.yaml");
  if (!fs.existsSync(metadataPath)) {
    return { metadataPath, metadata: null };
  }

  const metadata = parseYaml(fs.readFileSync(metadataPath, "utf8"));
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("agents/openai.yaml must be a mapping");
  }
  return { metadataPath, metadata };
}

function validateOpenAiRouting(metadata, errors, relativeMetadataPath) {
  if (!metadata) {
    errors.push(`${relativeMetadataPath} is required for bundled skills`);
    return;
  }

  if (Object.prototype.hasOwnProperty.call(metadata, "Narrow trigger")) {
    errors.push(`${relativeMetadataPath} contains unsupported key "Narrow trigger"`);
  }

  if (metadata.policy !== undefined) {
    if (!metadata.policy || typeof metadata.policy !== "object" || Array.isArray(metadata.policy)) {
      errors.push(`${relativeMetadataPath} policy must be a mapping`);
    } else {
      const products = metadata.policy.products;
      if (
        !Array.isArray(products) ||
        products.length === 0 ||
        products.some((product) => typeof product !== "string" || !OPENAI_PRODUCTS.has(product)) ||
        new Set(products).size !== products.length
      ) {
        errors.push(
          `${relativeMetadataPath} policy.products must contain unique CHAT/CODEX values`,
        );
      }

      if (
        metadata.policy.allow_implicit_invocation !== undefined &&
        typeof metadata.policy.allow_implicit_invocation !== "boolean"
      ) {
        errors.push(`${relativeMetadataPath} policy.allow_implicit_invocation must be boolean`);
      }
    }
  } else {
    errors.push(`${relativeMetadataPath} policy is required`);
  }
}

function validateSkillSource(root, entry, errors) {
  const source = entry.source;
  if (!isSafeSourcePath(source)) {
    errors.push(
      `skills[].source must be a normalized POSIX path with exactly three safe segments: ${source}`,
    );
    return;
  }
  if (
    source.startsWith("skills/cursor-operations/") ||
    source.startsWith("skills/claude-operations/") ||
    source.includes("/incubator/")
  ) {
    errors.push(
      `Codex bundle source may not select Cursor, Claude, or incubator content: ${source}`,
    );
  }

  const skillPath = path.join(root, source);
  if (!assertNoSymlinkPath(root, skillPath, errors, "skill source")) return;

  let skillStat;
  try {
    skillStat = fs.lstatSync(skillPath);
  } catch {
    errors.push(`skill source does not exist: ${source}`);
    return;
  }
  if (!skillStat.isDirectory()) {
    errors.push(`skill source must be a directory: ${source}`);
    return;
  }

  const skillFile = path.join(skillPath, "SKILL.md");
  let skillFileStat;
  try {
    skillFileStat = fs.lstatSync(skillFile);
  } catch {
    errors.push(`skill source is missing SKILL.md: ${source}`);
    return;
  }
  if (!skillFileStat.isFile() || skillFileStat.isSymbolicLink()) {
    errors.push(`skill source SKILL.md must be a regular file: ${source}`);
    return;
  }

  try {
    const skillName = readSkillName(skillPath);
    if (skillName !== entry.name) {
      errors.push(`skills[].name ${entry.name} does not match SKILL.md frontmatter ${skillName}`);
    }
    if (skillName !== path.posix.basename(source)) {
      errors.push(`SKILL.md frontmatter name ${skillName} does not match source folder ${source}`);
    }
  } catch (error) {
    errors.push(`${source}/SKILL.md: ${error.message}`);
  }

  const metadataPath = path.join(skillPath, "agents", "openai.yaml");
  if (!assertNoSymlinkPath(root, metadataPath, errors, "skill metadata")) return;
  try {
    const { metadataPath, metadata } = readOpenAiRouting(skillPath);
    validateOpenAiRouting(metadata, errors, relativePosix(root, metadataPath));
  } catch (error) {
    errors.push(
      `${relativePosix(root, path.join(skillPath, "agents/openai.yaml"))}: ${error.message}`,
    );
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${filePath}: ${error.message}`);
  }
}

function readSchema(root) {
  const schemaPath = path.join(root, BUNDLE_SCHEMA_PATH);
  return readJson(schemaPath);
}

function buildValidator(root) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(readSchema(root));
}

function validateBundleSemantics(root, bundle, bundleFile, errors) {
  const skillNames = new Set();
  const sourcePaths = new Set();

  for (const entry of bundle.skills) {
    if (skillNames.has(entry.name)) {
      errors.push(`${bundleFile}: duplicate skill name ${entry.name}`);
    }
    if (sourcePaths.has(entry.source)) {
      errors.push(`${bundleFile}: duplicate skill source ${entry.source}`);
    }
    const combinedIdentity = `${bundle.distributions.openaiPlugin}:${entry.name}`;
    if (combinedIdentity.length > 64) {
      errors.push(
        `${bundleFile}: combined OpenAI identity exceeds 64 characters: ${combinedIdentity}`,
      );
    }
    skillNames.add(entry.name);
    sourcePaths.add(entry.source);
    validateSkillSource(root, entry, errors);
  }

  if (bundle.id === "codex") {
    const sources = bundle.skills.map((entry) => entry.source);
    if (sources.length !== EXPECTED_CODEX_SKILL_SOURCES.length) {
      errors.push(
        `${bundleFile}: codex bundle must contain exactly ${EXPECTED_CODEX_SKILL_SOURCES.length} skills`,
      );
    } else if (JSON.stringify(sources) !== JSON.stringify(EXPECTED_CODEX_SKILL_SOURCES)) {
      errors.push(
        `${bundleFile}: codex skill order/membership must match the canonical six-skill allowlist`,
      );
    }
  }

  const releaseResult = loadReleaseDescriptorFile(root);
  errors.push(...releaseResult.errors);
  const release = releaseResult.release;
  if (release && bundleFile === PLUGIN_SOURCE_PATH) {
    if (bundle.id !== release.bundleId) {
      errors.push(`[BND-001] ${bundleFile}: membership id must match plugin source id`);
    }
    if (
      bundle.distributions?.portablePlugin !== release.pluginId ||
      bundle.distributions?.openaiPlugin !== release.pluginId
    ) {
      errors.push(
        `[BND-001] ${bundleFile}: distribution plugin ids must match the plugin source pluginId`,
      );
    }
  }
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort((left, right) => (left < right ? -1 : 1))) {
      sorted[key] = sortJsonValue(value[key]);
    }
    return sorted;
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`;
}

export function hashBytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function hashJson(value) {
  return hashBytes(Buffer.from(canonicalJson(value)));
}

export function findBundleFiles(root = moduleRoot) {
  const sourcePath = path.join(resolveRoot(root), PLUGIN_SOURCE_PATH);
  if (!fs.existsSync(sourcePath) || !fs.lstatSync(sourcePath).isFile()) {
    return [];
  }
  return [sourcePath];
}

export function validateBundleFile(root = moduleRoot, bundleFile = DEFAULT_BUNDLE_PATH) {
  const resolvedRoot = resolveRoot(root);
  const relativeBundleFile = relativePosix(resolvedRoot, path.resolve(resolvedRoot, bundleFile));
  const errors = [];
  let source;

  try {
    source = readJson(path.join(resolvedRoot, relativeBundleFile));
  } catch (error) {
    return { bundle: null, errors: [error.message] };
  }

  let validSchema = false;
  try {
    const validate = buildValidator(resolvedRoot);
    validSchema = validate(source);
    if (!validSchema) {
      errors.push(
        ...formatAjvErrors(validate.errors).map((error) => `${relativeBundleFile}: ${error}`),
      );
    }
  } catch (error) {
    errors.push(`plugin source schema: ${error.message}`);
  }

  const bundle =
    source && typeof source === "object" && !Array.isArray(source)
      ? membershipFromSource(source)
      : null;
  if (validSchema && bundle) {
    validateBundleSemantics(resolvedRoot, bundle, relativeBundleFile, errors);
  }

  return { bundle: errors.length === 0 ? bundle : null, errors };
}

export function validateAllBundles(root = moduleRoot) {
  const resolvedRoot = resolveRoot(root);
  const errors = [];
  const bundleFiles = findBundleFiles(resolvedRoot);
  const bundleIds = new Set();

  if (!fs.existsSync(path.join(resolvedRoot, PLUGIN_SOURCE_PATH))) {
    errors.push(`${PLUGIN_SOURCE_PATH} is missing`);
  }
  if (!fs.existsSync(path.join(resolvedRoot, PLUGIN_SOURCE_SCHEMA_PATH))) {
    errors.push(`${PLUGIN_SOURCE_SCHEMA_PATH} is missing`);
  }
  if (bundleFiles.length === 0) {
    errors.push("plugin source: no membership file found");
  }

  for (const bundleFile of bundleFiles) {
    const relativeBundleFile = relativePosix(resolvedRoot, bundleFile);
    const result = validateBundleFile(resolvedRoot, relativeBundleFile);
    errors.push(...result.errors);
    if (result.bundle) {
      if (bundleIds.has(result.bundle.id)) {
        errors.push(`${relativeBundleFile}: duplicate bundle id ${result.bundle.id}`);
      }
      bundleIds.add(result.bundle.id);
    }
  }

  const readmePath = path.join(resolvedRoot, "README.md");
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, "utf8");
    if (/Each bundle contains[\s\S]{0,240}(category|every public skill|all public)/i.test(readme)) {
      errors.push("README.md must not claim category/all-public bundle membership inference");
    }
  }

  return { errors, bundleFiles };
}

export function loadValidatedBundle(root = moduleRoot, bundleFile = DEFAULT_BUNDLE_PATH) {
  const result = validateBundleFile(root, bundleFile);
  if (result.errors.length > 0 || !result.bundle) {
    throw new Error(result.errors.join("\n"));
  }
  return result.bundle;
}

export function getRepositoryRoot() {
  return moduleRoot;
}
