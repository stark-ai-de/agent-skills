import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const semverPattern = /^\d+\.\d+\.\d+$/;
const errors = [];

function parseArgs(argv) {
  const args = { headRef: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--version") {
      args.version = argv[index + 1];
      index += 1;
    } else if (argument === "--base-ref") {
      args.baseRef = argv[index + 1];
      index += 1;
    } else if (argument === "--head-ref") {
      args.headRef = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return args;
}

function git(arguments_, allowFailure = false) {
  const result = spawnSync("git", arguments_, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    if (allowFailure) return null;
    throw new Error(result.stderr.trim() || `git ${arguments_.join(" ")} failed`);
  }
  return result.stdout.trimEnd();
}

function readGitFile(reference, file) {
  const result = spawnSync("git", ["show", `${reference}:${file}`], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? result.stdout : null;
}

function readCurrentFile(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function readTargetFile(file, headRef) {
  return headRef ? readGitFile(headRef, file) : readCurrentFile(file);
}

function changedFiles(baseRef, headRef) {
  const arguments_ = ["diff", "--name-only", "--diff-filter=ACDMRT", baseRef];
  if (headRef) arguments_.push(headRef);
  return git(arguments_)
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

function walk(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, predicate));
    if (entry.isFile() && predicate(full)) files.push(full);
  }
  return files;
}

function packageVersion(text = readCurrentFile("package.json")) {
  if (!text) return null;
  try {
    return JSON.parse(text).version ?? null;
  } catch {
    return null;
  }
}

function parseSkillText(text, relativePath) {
  if (!text) return null;
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push(`${relativePath}: missing YAML frontmatter`);
    return null;
  }
  const frontmatter = match[1];
  return {
    internal: /^\s+internal:\s*(true|"true"|'true')\s*$/m.test(frontmatter),
    name: frontmatter.match(/^name:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim() ?? relativePath,
    version: frontmatter.match(/^\s+version:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim(),
  };
}

function compareSemver(leftVersion, rightVersion) {
  const left = leftVersion.split(".").map(Number);
  const right = rightVersion.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function hasChangelogRelease(version) {
  const changelog = readCurrentFile("CHANGELOG.md") ?? "";
  return new RegExp(`^##\\s+v${version}(\\s|$)`, "m").test(changelog);
}

function skillFileFor(changedFile) {
  const match = changedFile.match(/^(skills\/[^/]+\/[^/]+)\//);
  return match ? `${match[1]}/SKILL.md` : null;
}

function uniqueSkillFiles(files) {
  return [...new Set(files.map(skillFileFor).filter(Boolean))].sort();
}

function validateCurrentPublicSkills(releaseVersion) {
  const skillFiles = walk(
    path.join(root, "skills"),
    (file) => path.basename(file) === "SKILL.md",
  ).sort();
  if (skillFiles.length === 0) {
    errors.push("No public skills found under skills/");
    return;
  }
  for (const file of skillFiles) {
    const relativePath = path.relative(root, file);
    const properties = parseSkillText(fs.readFileSync(file, "utf8"), relativePath);
    if (!properties) continue;
    if (properties.internal)
      errors.push(`${relativePath}: public skills must not set metadata.internal: true`);
    if (!properties.version) {
      errors.push(`${relativePath}: public skills must set metadata.version`);
    } else if (!semverPattern.test(properties.version)) {
      errors.push(`${relativePath}: metadata.version must use x.y.z semver`);
    } else if (compareSemver(properties.version, releaseVersion) > 0) {
      errors.push(
        `${relativePath}: metadata.version ${properties.version} must not exceed package release ${releaseVersion}`,
      );
    }
  }
}

function validateReleaseDiff(baseRef, headRef, releaseVersion) {
  const basePackageVersion = packageVersion(readGitFile(baseRef, "package.json"));
  if (!basePackageVersion || !semverPattern.test(basePackageVersion)) {
    errors.push(
      `Base package.json version is invalid or missing: ${basePackageVersion ?? "(missing)"}`,
    );
  } else if (compareSemver(releaseVersion, basePackageVersion) <= 0) {
    errors.push(
      `package.json version must increase from ${basePackageVersion} to a higher semver; got ${releaseVersion}`,
    );
  }

  for (const skillFile of uniqueSkillFiles(changedFiles(baseRef, headRef))) {
    const baseText = readGitFile(baseRef, skillFile);
    const currentText = readTargetFile(skillFile, headRef);
    const baseProperties = parseSkillText(baseText, skillFile);
    const currentProperties = parseSkillText(currentText, skillFile);
    if (!baseText && currentText) continue;
    if (baseText && !currentText) continue;
    if (!baseProperties || !currentProperties) continue;
    if (currentProperties.version === baseProperties.version) {
      errors.push(
        `${skillFile} changed without increasing metadata.version from ${baseProperties.version}`,
      );
    } else if (
      !semverPattern.test(baseProperties.version) ||
      !semverPattern.test(currentProperties.version) ||
      compareSemver(currentProperties.version, baseProperties.version) <= 0
    ) {
      errors.push(
        `${skillFile} metadata.version must increase from ${baseProperties.version} to a higher semver; got ${currentProperties.version}`,
      );
    }
  }
}

const args = parseArgs(process.argv.slice(2));
args.version ??= packageVersion();

if (!args.version || !semverPattern.test(args.version)) {
  errors.push(`Version must be x.y.z without leading v: ${args.version ?? "(missing)"}`);
}

if (errors.length === 0) {
  const currentPackageVersion = packageVersion();
  if (currentPackageVersion !== args.version) {
    errors.push(`package.json version is ${currentPackageVersion}; expected ${args.version}`);
  }
  if (!hasChangelogRelease(args.version)) {
    errors.push(`CHANGELOG.md is missing a '## v${args.version}' release section`);
  }
  validateCurrentPublicSkills(args.version);
  if (args.baseRef) validateReleaseDiff(args.baseRef, args.headRef, args.version);
}

if (errors.length) {
  console.error("Release metadata validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Release v${args.version} metadata validated.`);
