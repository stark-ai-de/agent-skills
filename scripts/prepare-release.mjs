import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const semverPattern = /^\d+\.\d+\.\d+$/;

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--version") {
      args.version = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, predicate));
    if (entry.isFile() && predicate(full)) files.push(full);
  }

  return files;
}

function writeIfChanged(file, next, changed, dryRun) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (current === next) return;

  changed.push(path.relative(root, file));
  if (!dryRun) fs.writeFileSync(file, next);
}

function updatePackageVersion(version, changed, dryRun) {
  const file = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  pkg.version = version;
  writeIfChanged(file, `${JSON.stringify(pkg, null, 2)}\n`, changed, dryRun);
}

function updateSkillVersion(text, version) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return text;

  let frontmatter = match[1];
  if (/^metadata:\s*$/m.test(frontmatter)) {
    if (/^\s+version:\s*.*$/m.test(frontmatter)) {
      frontmatter = frontmatter.replace(/^\s+version:\s*.*$/m, `  version: "${version}"`);
    } else {
      frontmatter = frontmatter.replace(/^metadata:\s*$/m, `metadata:\n  version: "${version}"`);
    }
  } else {
    frontmatter = `${frontmatter}\nmetadata:\n  version: "${version}"`;
  }

  return text.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
}

function updatePublicSkillVersions(version, changed, dryRun) {
  const skillsDir = path.join(root, "skills");
  const skillFiles = walk(skillsDir, (file) => path.basename(file) === "SKILL.md").sort();
  if (skillFiles.length === 0) fail("Cannot prepare a release without public skills.");

  for (const file of skillFiles) {
    const text = fs.readFileSync(file, "utf8");
    writeIfChanged(file, updateSkillVersion(text, version), changed, dryRun);
  }
}

function releaseDate() {
  return process.env.RELEASE_DATE ?? new Date().toISOString().slice(0, 10);
}

function updateChangelog(version, changed, dryRun) {
  const file = path.join(root, "CHANGELOG.md");
  const text = fs.readFileSync(file, "utf8");
  if (new RegExp(`^##\\s+v${version}(\\s|$)`, "m").test(text)) return;

  const match = text.match(/^## Unreleased\n([\s\S]*?)(?=^##\s+|\s*$)/m);
  if (!match) fail("CHANGELOG.md must contain a '## Unreleased' section.");

  const unreleasedBody = match[1].trim();
  const emptyUnreleased = [
    "## Unreleased",
    "",
    "### Added",
    "",
    "### Changed",
    "",
    "### Fixed",
    "",
    "### Deprecated",
    "",
    "### Removed",
  ].join("\n");
  const releaseBody = unreleasedBody || "- No changes recorded.";
  const releaseBlock = `## v${version} - ${releaseDate()}\n\n${releaseBody}`;
  const next = text.replace(match[0], `${emptyUnreleased}\n\n${releaseBlock}\n`);

  writeIfChanged(file, next, changed, dryRun);
}

const args = parseArgs(process.argv.slice(2));
if (!args.version) fail("Usage: node scripts/prepare-release.mjs --version <x.y.z> [--dry-run]");
if (!semverPattern.test(args.version))
  fail(`Version must be x.y.z without leading v: ${args.version}`);

const changed = [];
updatePackageVersion(args.version, changed, args.dryRun);
updatePublicSkillVersions(args.version, changed, args.dryRun);
updateChangelog(args.version, changed, args.dryRun);

if (changed.length === 0) {
  console.log(`Release v${args.version} is already prepared.`);
} else if (args.dryRun) {
  console.log(`Dry run would update:\n${changed.map((file) => `- ${file}`).join("\n")}`);
} else {
  console.log(
    `Prepared release v${args.version}:\n${changed.map((file) => `- ${file}`).join("\n")}`,
  );
}
