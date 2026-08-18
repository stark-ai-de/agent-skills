import Ajv2020 from "ajv/dist/2020.js";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlesDir = path.join(root, "bundles");
const schemaPath = path.join(bundlesDir, "bundle.schema.json");
const readmePath = path.join(root, "README.md");
const errors = [];
const bundleFiles = fs.existsSync(bundlesDir)
  ? fs
      .readdirSync(bundlesDir)
      .filter((file) => file.endsWith(".json") && file !== "bundle.schema.json")
      .sort()
  : [];

function addError(message) {
  errors.push(message);
}

function readJson(file) {
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch (error) {
    addError(`${path.relative(root, file)}: invalid JSON (${error.message})`);
    return { ok: false, value: null };
  }
}

function reportSchemaErrors(relativeFile, validator) {
  for (const error of validator.errors ?? []) {
    addError(`${relativeFile}${error.instancePath || ""}: ${error.message}`);
  }
}

function assertNoSymlinkPath(relativePath, location) {
  let current = root;
  for (const segment of relativePath.split("/")) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) return true;
    if (fs.lstatSync(current).isSymbolicLink()) {
      addError(`${location}: symlink path component is forbidden: ${path.relative(root, current)}`);
      return false;
    }
  }
  return true;
}

function frontmatterName(skillFile, location) {
  const text = fs.readFileSync(skillFile, "utf8");
  if (!text.startsWith("---\n")) {
    addError(`${location}: SKILL.md must start with YAML frontmatter`);
    return null;
  }
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) {
    addError(`${location}: SKILL.md frontmatter is not closed`);
    return null;
  }
  const frontmatter = text.slice(4, end);
  const match = frontmatter.match(/^name:\s*(.+?)\s*$/m);
  if (!match) {
    addError(`${location}: SKILL.md frontmatter is missing name`);
    return null;
  }
  const value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseCommandTokens(command) {
  return command.trim() ? command.trim().split(/\s+/) : [];
}

function extractCodexCommand(readme) {
  const summary = "<summary><strong>Install the Codex bundle</strong></summary>";
  const summaryIndex = readme.indexOf(summary);
  if (summaryIndex === -1) return null;

  const fenceStart = readme.indexOf("```", summaryIndex + summary.length);
  if (fenceStart === -1) return null;
  const commandStart = readme.indexOf("\n", fenceStart);
  if (commandStart === -1) return null;
  const fenceEnd = readme.indexOf("```", commandStart + 1);
  if (fenceEnd === -1) return null;
  return readme.slice(commandStart + 1, fenceEnd).trim();
}

if (!fs.existsSync(bundlesDir)) addError("bundles/: directory is missing");
if (!fs.existsSync(schemaPath)) {
  addError("bundles/bundle.schema.json is missing");
}
if (bundleFiles.length === 0) addError("bundles/: no bundle manifests found");

let validateBundle = null;
if (fs.existsSync(schemaPath)) {
  const schemaResult = readJson(schemaPath);
  if (schemaResult.ok) {
    try {
      validateBundle = new Ajv2020({ allErrors: true, strict: true }).compile(schemaResult.value);
    } catch (error) {
      addError(`bundles/bundle.schema.json: invalid JSON Schema (${error.message})`);
    }
  }
}

let membershipCount = 0;
const seenIds = new Set();
for (const file of bundleFiles) {
  const relativeFile = `bundles/${file}`;
  const bundleResult = readJson(path.join(bundlesDir, file));
  if (!bundleResult.ok || !validateBundle) continue;

  const bundle = bundleResult.value;
  if (!validateBundle(bundle)) {
    reportSchemaErrors(relativeFile, validateBundle);
    continue;
  }

  if (seenIds.has(bundle.id)) {
    addError(`${relativeFile}: duplicate bundle id ${bundle.id}`);
  } else {
    seenIds.add(bundle.id);
  }

  const names = new Set();
  const sources = new Set();
  for (const [index, entry] of bundle.skills.entries()) {
    const location = `${relativeFile}: skills[${index}]`;
    if (names.has(entry.name)) {
      addError(`${location}: duplicate skill name ${entry.name}`);
    } else {
      names.add(entry.name);
    }

    if (
      entry.source.startsWith("skills/cursor-operations/") ||
      entry.source.startsWith("skills/claude-operations/") ||
      entry.source.includes("/incubator/")
    ) {
      addError(
        `${location}: Codex bundle source may not select Cursor, Claude, or incubator content`,
      );
    }
    if (sources.has(entry.source)) {
      addError(`${location}: duplicate source ${entry.source}`);
    } else {
      sources.add(entry.source);
    }
    if (path.posix.basename(entry.source) !== entry.name) {
      addError(`${location}: source folder must match name ${entry.name}`);
    }

    if (!assertNoSymlinkPath(entry.source, location)) continue;
    const sourcePath = path.join(root, ...entry.source.split("/"));
    if (!fs.existsSync(sourcePath) || !fs.lstatSync(sourcePath).isDirectory()) {
      addError(`${location}: source directory does not exist: ${entry.source}`);
      continue;
    }
    const skillFile = path.join(sourcePath, "SKILL.md");
    if (!fs.existsSync(skillFile) || !fs.lstatSync(skillFile).isFile()) {
      addError(`${location}: ${entry.source}/SKILL.md is missing`);
      continue;
    }
    if (fs.lstatSync(skillFile).isSymbolicLink()) {
      addError(`${location}: SKILL.md symlinks are forbidden`);
      continue;
    }
    const actualName = frontmatterName(skillFile, location);
    if (actualName && actualName !== entry.name) {
      addError(`${location}: SKILL.md name ${actualName} does not match ${entry.name}`);
    }
    membershipCount += 1;
  }

  if (bundle.id === "codex") {
    if (!fs.existsSync(readmePath)) {
      addError("README.md is missing");
    } else {
      const expectedTokens = [
        "npx",
        "skills@latest",
        "add",
        "stark-ai-de/agent-skills",
        "--skill",
        ...bundle.skills.map((entry) => entry.name),
        "-g",
        "-a",
        bundle.distributions.skillsCliAgent,
        "-y",
      ];
      const command = extractCodexCommand(fs.readFileSync(readmePath, "utf8"));
      const actualTokens = command === null ? null : parseCommandTokens(command);
      if (!actualTokens) {
        addError("README.md: Codex bundle install command is missing");
      } else if (JSON.stringify(actualTokens) !== JSON.stringify(expectedTokens)) {
        addError(
          `README.md: Codex bundle command tokens must be exactly ${JSON.stringify(expectedTokens)}; found ${JSON.stringify(actualTokens)}`,
        );
      }
    }
  }
}

if (errors.length) {
  console.error("Errors:");
  for (const error of new Set(errors)) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Validated ${bundleFiles.length} bundle(s) and ${membershipCount} explicit skill entries.`,
);
