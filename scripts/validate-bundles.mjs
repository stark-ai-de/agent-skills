import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlesDir = path.join(root, "bundles");
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
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    addError(`${path.relative(root, file)}: invalid JSON (${error.message})`);
    return null;
  }
}

function assertPlainObject(value, location) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    addError(`${location}: expected an object`);
    return false;
  }
  return true;
}

function assertOnlyKeys(value, keys, location) {
  if (!assertPlainObject(value, location)) return;
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) addError(`${location}: unexpected field ${JSON.stringify(key)}`);
  }
  for (const key of keys) {
    if (!(key in value)) addError(`${location}: missing field ${JSON.stringify(key)}`);
  }
}

function assertNoSymlinkPath(relativePath, location) {
  let current = root;
  for (const segment of relativePath.split("/")) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) return;
    if (fs.lstatSync(current).isSymbolicLink()) {
      addError(`${location}: symlink path component is forbidden: ${path.relative(root, current)}`);
      return;
    }
  }
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

if (!fs.existsSync(bundlesDir)) addError("bundles/: directory is missing");
if (!fs.existsSync(path.join(bundlesDir, "bundle.schema.json"))) {
  addError("bundles/bundle.schema.json is missing");
} else {
  readJson(path.join(bundlesDir, "bundle.schema.json"));
}
if (bundleFiles.length === 0) addError("bundles/: no bundle manifests found");

let membershipCount = 0;
const seenIds = new Set();
for (const file of bundleFiles) {
  const relativeFile = `bundles/${file}`;
  const bundle = readJson(path.join(bundlesDir, file));
  if (!bundle) continue;

  assertOnlyKeys(
    bundle,
    ["$schema", "schemaVersion", "id", "displayName", "description", "skills", "distributions"],
    relativeFile,
  );
  if (bundle.$schema !== "./bundle.schema.json") {
    addError(`${relativeFile}: $schema must be ./bundle.schema.json`);
  }
  if (bundle.schemaVersion !== 1) addError(`${relativeFile}: schemaVersion must be 1`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bundle.id ?? "")) {
    addError(`${relativeFile}: id must be lower-kebab-case`);
  } else if (seenIds.has(bundle.id)) {
    addError(`${relativeFile}: duplicate bundle id ${bundle.id}`);
  } else {
    seenIds.add(bundle.id);
  }
  if (typeof bundle.displayName !== "string" || !bundle.displayName.trim()) {
    addError(`${relativeFile}: displayName must be a non-empty string`);
  }
  if (typeof bundle.description !== "string" || !bundle.description.trim()) {
    addError(`${relativeFile}: description must be a non-empty string`);
  }
  if (!Array.isArray(bundle.skills) || bundle.skills.length === 0) {
    addError(`${relativeFile}: skills must be a non-empty array`);
    continue;
  }

  const names = new Set();
  const sources = new Set();
  for (const [index, entry] of bundle.skills.entries()) {
    const location = `${relativeFile}: skills[${index}]`;
    assertOnlyKeys(entry, ["name", "source"], location);
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name ?? "") || entry.name.length > 64) {
      addError(`${location}: name must be a valid Agent Skill name no longer than 64 characters`);
    } else if (names.has(entry.name)) {
      addError(`${location}: duplicate skill name ${entry.name}`);
    } else {
      names.add(entry.name);
    }

    if (typeof entry.source !== "string") {
      addError(`${location}: source must be a string`);
      continue;
    }
    if (!entry.source.startsWith("skills/") || entry.source.includes("..") || path.isAbsolute(entry.source)) {
      addError(`${location}: source must stay under public skills/`);
      continue;
    }
    if (
      entry.source.startsWith("skills/cursor-operations/") ||
      entry.source.startsWith("skills/claude-operations/") ||
      entry.source.includes("/incubator/")
    ) {
      addError(`${location}: Codex bundle source may not select Cursor, Claude, or incubator content`);
    }
    if (sources.has(entry.source)) {
      addError(`${location}: duplicate source ${entry.source}`);
    } else {
      sources.add(entry.source);
    }
    if (path.posix.basename(entry.source) !== entry.name) {
      addError(`${location}: source folder must match name ${entry.name}`);
    }

    assertNoSymlinkPath(entry.source, location);
    const sourcePath = path.join(root, ...entry.source.split("/"));
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
      addError(`${location}: source directory does not exist: ${entry.source}`);
      continue;
    }
    const skillFile = path.join(sourcePath, "SKILL.md");
    if (!fs.existsSync(skillFile) || !fs.statSync(skillFile).isFile()) {
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

  const distributions = bundle.distributions;
  assertOnlyKeys(
    distributions,
    ["skillsCliAgent", "portablePlugin", "openaiPlugin"],
    `${relativeFile}: distributions`,
  );
  if (distributions && typeof distributions === "object" && !Array.isArray(distributions)) {
    if (distributions.skillsCliAgent !== bundle.id) {
      addError(`${relativeFile}: distributions.skillsCliAgent must equal bundle id ${bundle.id}`);
    }
    for (const key of ["portablePlugin", "openaiPlugin"]) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(distributions[key] ?? "")) {
        addError(`${relativeFile}: distributions.${key} must be lower-kebab-case`);
      }
    }
  }

  if (bundle.id === "codex") {
    if (!fs.existsSync(readmePath)) {
      addError("README.md is missing");
    } else {
      const command = `npx skills@latest add stark-ai-de/agent-skills --skill ${bundle.skills
        .map((entry) => entry.name)
        .join(" ")} -g -a ${bundle.distributions?.skillsCliAgent} -y`;
      const readme = fs.readFileSync(readmePath, "utf8");
      if (!readme.includes(command)) {
        addError(`README.md: Codex bundle command must be exactly:\n${command}`);
      }
    }
  }
}

if (errors.length) {
  console.error("Errors:");
  for (const error of new Set(errors)) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${bundleFiles.length} bundle(s) and ${membershipCount} explicit skill entries.`);
