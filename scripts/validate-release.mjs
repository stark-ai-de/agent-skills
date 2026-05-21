import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const semverPattern = /^\d+\.\d+\.\d+$/;
const errors = [];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--version") {
      args.version = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
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

function parseFrontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push(`${path.relative(root, file)}: missing YAML frontmatter`);
    return null;
  }

  const frontmatter = match[1];
  const name = frontmatter.match(/^name:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim();
  const version = frontmatter.match(/^\s+version:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim();
  const internal = /^\s+internal:\s*(true|"true"|'true')\s*$/m.test(frontmatter);

  return { internal, name, version };
}

function validatePackageVersion(version) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  if (pkg.version !== version) {
    errors.push(`package.json version is ${pkg.version}; expected ${version}`);
  }
}

function packageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  return pkg.version;
}

function validateChangelog(version) {
  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
  const headingPattern = new RegExp(`^##\\s+v${version}(\\s|$)`, "m");
  if (!headingPattern.test(changelog)) {
    errors.push(`CHANGELOG.md is missing a '## v${version}' release section`);
  }
}

function validateSkills(version) {
  const skillsDir = path.join(root, "skills");
  const skillFiles = walk(skillsDir, (file) => path.basename(file) === "SKILL.md").sort();
  if (skillFiles.length === 0) {
    errors.push("No public skills found under skills/");
    return;
  }

  const releaseVersionSkills = [];
  for (const file of skillFiles) {
    const rel = path.relative(root, file);
    const props = parseFrontmatter(file);
    if (!props) continue;

    if (props.internal) errors.push(`${rel}: public skills must not set metadata.internal: true`);
    if (!props.version) {
      errors.push(`${rel}: public skills must set metadata.version`);
    } else if (!semverPattern.test(props.version)) {
      errors.push(`${rel}: metadata.version must use x.y.z semver`);
    } else if (props.version === version) {
      releaseVersionSkills.push(props.name ?? rel);
    }
  }

  if (releaseVersionSkills.length === 0) {
    errors.push(`At least one public skill metadata.version must equal ${version}`);
  }

  return releaseVersionSkills;
}

function runSkillValidation() {
  const result = spawnSync("npm", ["run", "validate:skills"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    errors.push("npm run validate:skills failed");
  }
}

const args = parseArgs(process.argv.slice(2));
args.version ??= packageVersion();
if (args.version && !semverPattern.test(args.version)) {
  errors.push(`Version must be x.y.z without leading v: ${args.version}`);
}

if (errors.length === 0) {
  runSkillValidation();
  validatePackageVersion(args.version);
  validateChangelog(args.version);
  const releaseVersionSkills = validateSkills(args.version) ?? [];

  if (errors.length === 0) {
    console.log(
      `Release v${args.version} validated. Release-version public skills: ${releaseVersionSkills.join(", ")}.`,
    );
  }
}

if (errors.length) {
  console.error("Release validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
