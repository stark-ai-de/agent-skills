import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const semverPattern = /^\d+\.\d+\.\d+$/;

function parseArgs(argv) {
  const args = { githubOutput: false, headRef: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base-ref") {
      args.baseRef = argv[i + 1];
      i += 1;
    } else if (arg === "--head-ref") {
      args.headRef = argv[i + 1];
      i += 1;
    } else if (arg === "--github-output") {
      args.githubOutput = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function git(args, allowFailure = false) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trimEnd();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function readCurrentFile(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function readGitFile(ref, file) {
  return git(["show", `${ref}:${file}`], true);
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

function packageVersion(text) {
  if (!text) return null;
  try {
    return JSON.parse(text).version ?? null;
  } catch {
    return null;
  }
}

function metadataVersion(text) {
  if (!text) return null;
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
  return frontmatter?.match(/^\s+version:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim() ?? null;
}

function changelogReleaseVersions(text) {
  if (!text) return new Set();
  const versions = new Set();
  for (const match of text.matchAll(/^##\s+v(\d+\.\d+\.\d+)(?:\s|$)/gm)) {
    versions.add(match[1]);
  }
  return versions;
}

function addCandidate(candidates, errors, version, reason) {
  if (!version || !semverPattern.test(version)) {
    errors.push(`${reason} uses invalid or missing semver version: ${version ?? "(missing)"}`);
    return;
  }
  candidates.set(version, [...(candidates.get(version) ?? []), reason]);
}

function writeGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

const args = parseArgs(process.argv.slice(2));
const errors = [];
const candidates = new Map();
const reasons = [];

if (!args.baseRef || /^0+$/.test(args.baseRef)) {
  errors.push("A non-empty --base-ref is required to detect release intent.");
} else if (git(["rev-parse", "--verify", `${args.baseRef}^{commit}`], true) === null) {
  errors.push(`Base ref is not available locally: ${args.baseRef}`);
}

if (errors.length === 0) {
  const files = changedFiles(args.baseRef, args.headRef);

  if (files.includes("package.json")) {
    const baseVersion = packageVersion(readGitFile(args.baseRef, "package.json"));
    const currentVersion = packageVersion(readTargetFile("package.json", args.headRef));
    if (baseVersion !== currentVersion) {
      reasons.push(
        `package.json version changed from ${baseVersion ?? "(missing)"} to ${currentVersion ?? "(missing)"}`,
      );
      addCandidate(candidates, errors, currentVersion, "package.json");
    }
  }

  if (files.includes("CHANGELOG.md")) {
    const baseVersions = changelogReleaseVersions(readGitFile(args.baseRef, "CHANGELOG.md"));
    const currentVersions = changelogReleaseVersions(readTargetFile("CHANGELOG.md", args.headRef));
    for (const version of currentVersions) {
      if (!baseVersions.has(version)) {
        reasons.push(`CHANGELOG.md added v${version}`);
        addCandidate(candidates, errors, version, "CHANGELOG.md");
      }
    }
  }

  for (const file of files.filter(
    (name) => name.startsWith("skills/") && name.endsWith("/SKILL.md"),
  )) {
    const baseVersion = metadataVersion(readGitFile(args.baseRef, file));
    const currentVersion = metadataVersion(readTargetFile(file, args.headRef));

    if (baseVersion !== currentVersion) {
      reasons.push(
        `${file} metadata.version changed from ${baseVersion ?? "(missing)"} to ${currentVersion ?? "(missing)"}`,
      );
      if (currentVersion) {
        addCandidate(candidates, errors, currentVersion, file);
      }
    }
  }

  if (reasons.length > 0 && candidates.size === 0) {
    errors.push("Release intent was detected, but no release version candidate was found.");
  }

  if (candidates.size > 1) {
    const versions = [...candidates.entries()]
      .map(([version, versionReasons]) => `v${version} (${versionReasons.join(", ")})`)
      .join("; ");
    errors.push(`Release metadata points at multiple versions: ${versions}`);
  }
}

if (errors.length > 0) {
  console.error("Release intent check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (reasons.length === 0) {
  if (args.githubOutput) {
    writeGithubOutput({
      release_intent: "false",
      release_version: "",
      release_reasons: "",
    });
  }
  console.log("No release intent detected.");
} else {
  const releaseVersion = [...candidates.keys()][0];
  const releaseReasons = reasons.join("; ");
  if (args.githubOutput) {
    writeGithubOutput({
      release_intent: "true",
      release_version: releaseVersion,
      release_reasons: releaseReasons,
    });
  }
  console.log(`Release intent detected for v${releaseVersion}: ${releaseReasons}`);
}
