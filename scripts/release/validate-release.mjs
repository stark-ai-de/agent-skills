import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { changelogReleaseOrder, splitChangelogSections } from "../lib/release-changelog.mjs";
import {
  automatedReleaseVersionSupported,
  FIRST_AUTOMATED_RELEASE_VERSION,
} from "../lib/release-please.mjs";

const root = process.cwd();
const semverPattern = /^\d+\.\d+\.\d+$/;
const errors = [];

function parseArgs(argv) {
  const args = { headRef: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--version") {
      args.version = argv[i + 1];
      i += 1;
    } else if (arg === "--base-ref") {
      args.baseRef = argv[i + 1];
      i += 1;
    } else if (arg === "--head-ref") {
      args.headRef = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function git(args, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    if (allowFailure) return null;
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trimEnd();
}

function readGitFile(ref, file) {
  const result = spawnSync("git", ["show", `${ref}:${file}`], {
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
  const args = ["diff", "--name-only", "--diff-filter=ACDMRT", baseRef];
  if (headRef) args.push(headRef);
  return git(args)
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
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

function packageVersion(text = readCurrentFile("package.json")) {
  if (!text) return null;
  try {
    return JSON.parse(text).version ?? null;
  } catch {
    return null;
  }
}

function manifestVersion(text = readCurrentFile(".release-please-manifest.json")) {
  if (!text) return null;
  try {
    return JSON.parse(text)["."] ?? null;
  } catch {
    return null;
  }
}

function parseSkillText(text, rel) {
  if (!text) return null;
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push(`${rel}: missing YAML frontmatter`);
    return null;
  }
  const frontmatter = match[1];
  return {
    internal: /^\s+internal:\s*(true|"true"|'true')\s*$/m.test(frontmatter),
    name: frontmatter.match(/^name:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim() ?? rel,
    version: frontmatter.match(/^\s+version:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim(),
  };
}

function compareSemver(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

function hasChangelogRelease(version) {
  const changelog = readCurrentFile("CHANGELOG.md") ?? "";
  return splitChangelogSections(changelog).has(version);
}

function newestChangelogRelease() {
  return changelogReleaseOrder(readCurrentFile("CHANGELOG.md") ?? "")[0] ?? null;
}

function skillFileFor(changedFile) {
  const match = changedFile.match(/^(skills\/[^/]+\/[^/]+)\//);
  if (!match) return null;
  return `${match[1]}/SKILL.md`;
}

function uniqueSkillFiles(files) {
  return [...new Set(files.map(skillFileFor).filter(Boolean))].sort();
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

function runImpactValidation(baseRef, headRef) {
  const commandArgs = [
    path.join(root, "scripts/release/check-release-intent.mjs"),
    "--base-ref",
    baseRef,
  ];
  if (headRef) commandArgs.push("--head-ref", headRef);
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    errors.push("release impact contract failed");
  }
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
    const rel = path.relative(root, file);
    const props = parseSkillText(fs.readFileSync(file, "utf8"), rel);
    if (!props) continue;
    if (props.internal) errors.push(`${rel}: public skills must not set metadata.internal: true`);
    if (!props.version) {
      errors.push(`${rel}: public skills must set metadata.version`);
    } else if (!semverPattern.test(props.version)) {
      errors.push(`${rel}: metadata.version must use x.y.z semver`);
    } else if (compareSemver(props.version, releaseVersion) > 0) {
      errors.push(
        `${rel}: metadata.version ${props.version} must not exceed package release ${releaseVersion}`,
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

  const files = changedFiles(baseRef, headRef);
  for (const skillFile of uniqueSkillFiles(files)) {
    const baseText = readGitFile(baseRef, skillFile);
    const currentText = readTargetFile(skillFile, headRef);
    const baseProps = parseSkillText(baseText, skillFile);
    const currentProps = parseSkillText(currentText, skillFile);

    if (!baseText && currentText) continue;
    if (baseText && !currentText) continue;
    if (!baseProps || !currentProps) continue;

    if (currentProps.version === baseProps.version) {
      errors.push(
        `${skillFile} changed without increasing metadata.version from ${baseProps.version}`,
      );
    } else if (
      !semverPattern.test(baseProps.version) ||
      !semverPattern.test(currentProps.version) ||
      compareSemver(currentProps.version, baseProps.version) <= 0
    ) {
      errors.push(
        `${skillFile} metadata.version must increase from ${baseProps.version} to a higher semver; got ${currentProps.version}`,
      );
    }
  }
}

const args = parseArgs(process.argv.slice(2));
args.version ??= packageVersion();

if (!args.version || !semverPattern.test(args.version)) {
  errors.push(`Version must be x.y.z without leading v: ${args.version ?? "(missing)"}`);
} else if (args.version !== "0.20.1" && !automatedReleaseVersionSupported(args.version)) {
  errors.push(
    `Automated release versions must be ${FIRST_AUTOMATED_RELEASE_VERSION} or newer; got ${args.version}`,
  );
}

if (errors.length === 0) {
  runSkillValidation();
  const currentPackageVersion = packageVersion();
  if (currentPackageVersion !== args.version) {
    errors.push(`package.json version is ${currentPackageVersion}; expected ${args.version}`);
  }
  validateCurrentPublicSkills(args.version);
  if (args.baseRef) {
    runImpactValidation(args.baseRef, args.headRef);
    const basePackageVersion = packageVersion(readGitFile(args.baseRef, "package.json"));
    if (basePackageVersion !== currentPackageVersion) {
      if (!hasChangelogRelease(args.version)) {
        errors.push(`CHANGELOG.md is missing a ${args.version} release section`);
      } else if (newestChangelogRelease() !== args.version) {
        errors.push(`CHANGELOG.md newest release is not ${args.version}`);
      }
      if (manifestVersion() !== args.version) {
        errors.push(`.release-please-manifest.json is not synchronized to ${args.version}`);
      }
      validateReleaseDiff(args.baseRef, args.headRef, args.version);
    }
  } else {
    if (!hasChangelogRelease(args.version)) {
      errors.push(`CHANGELOG.md is missing a ${args.version} release section`);
    } else if (newestChangelogRelease() !== args.version) {
      errors.push(`CHANGELOG.md newest release is not ${args.version}`);
    }
    if (manifestVersion() !== args.version) {
      errors.push(`.release-please-manifest.json is not synchronized to ${args.version}`);
    }
  }
}

if (errors.length) {
  console.error("Release validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Release v${args.version} validated.`);
