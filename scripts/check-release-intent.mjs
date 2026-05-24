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

function compareSemver(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

function changelogReleaseVersions(text) {
  if (!text) return new Set();
  const versions = new Set();
  for (const match of text.matchAll(/^##\s+v(\d+\.\d+\.\d+)(?:\s|$)/gm)) {
    versions.add(match[1]);
  }
  return versions;
}

function skillFileFor(changedFile) {
  const match = changedFile.match(/^(skills\/[^/]+\/[^/]+)\//);
  if (!match) return null;
  return `${match[1]}/SKILL.md`;
}

function uniqueSkillFiles(files) {
  return [...new Set(files.map(skillFileFor).filter(Boolean))].sort();
}

function writeGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

const args = parseArgs(process.argv.slice(2));
const errors = [];
const reasons = [];
const skillReasons = [];

if (!args.baseRef || /^0+$/.test(args.baseRef)) {
  errors.push("A non-empty --base-ref is required to detect release intent.");
} else if (git(["rev-parse", "--verify", `${args.baseRef}^{commit}`], true) === null) {
  errors.push(`Base ref is not available locally: ${args.baseRef}`);
}

if (errors.length === 0) {
  const files = changedFiles(args.baseRef, args.headRef);
  const basePackageVersion = packageVersion(readGitFile(args.baseRef, "package.json"));
  const currentPackageVersion = packageVersion(readTargetFile("package.json", args.headRef));
  const packageChanged = basePackageVersion !== currentPackageVersion;

  if (packageChanged) {
    if (!currentPackageVersion || !semverPattern.test(currentPackageVersion)) {
      errors.push(
        `package.json uses invalid or missing semver version: ${currentPackageVersion ?? "(missing)"}`,
      );
    } else if (
      basePackageVersion &&
      semverPattern.test(basePackageVersion) &&
      compareSemver(currentPackageVersion, basePackageVersion) <= 0
    ) {
      errors.push(
        `package.json version must increase from ${basePackageVersion} to a higher semver; got ${currentPackageVersion}`,
      );
    } else {
      reasons.push(
        `package.json version changed from ${basePackageVersion ?? "(missing)"} to ${currentPackageVersion}`,
      );
    }
  }

  const baseChangelogVersions = changelogReleaseVersions(readGitFile(args.baseRef, "CHANGELOG.md"));
  const currentChangelogVersions = changelogReleaseVersions(
    readTargetFile("CHANGELOG.md", args.headRef),
  );
  const addedChangelogVersions = [...currentChangelogVersions].filter(
    (version) => !baseChangelogVersions.has(version),
  );

  if (addedChangelogVersions.length > 0) {
    if (!packageChanged) {
      errors.push(
        `CHANGELOG.md release sections require a package.json version bump: v${addedChangelogVersions.join(", v")}`,
      );
    }
    for (const version of addedChangelogVersions) {
      if (version !== currentPackageVersion) {
        errors.push(
          `CHANGELOG.md added v${version}, but package.json is ${currentPackageVersion ?? "(missing)"}`,
        );
      } else {
        reasons.push(`CHANGELOG.md added v${version}`);
      }
    }
  } else if (packageChanged && currentPackageVersion) {
    errors.push(
      `package.json version bump to ${currentPackageVersion} requires a CHANGELOG.md v${currentPackageVersion} section`,
    );
  }

  for (const skillFile of uniqueSkillFiles(files)) {
    const baseText = readGitFile(args.baseRef, skillFile);
    const currentText = readTargetFile(skillFile, args.headRef);
    const baseVersion = metadataVersion(baseText);
    const currentVersion = metadataVersion(currentText);

    if (!baseText && currentText) {
      if (!currentVersion || !semverPattern.test(currentVersion)) {
        errors.push(`${skillFile}: new public skills must set metadata.version with x.y.z semver`);
      } else {
        skillReasons.push(`${skillFile} added at ${currentVersion}`);
      }
      continue;
    }

    if (baseText && !currentText) {
      skillReasons.push(`${skillFile} removed`);
      continue;
    }

    if (!baseVersion || !currentVersion) {
      errors.push(
        `${skillFile}: public skill changes require metadata.version in base and current file`,
      );
    } else if (!semverPattern.test(currentVersion)) {
      errors.push(`${skillFile}: metadata.version must use x.y.z semver`);
    } else if (currentVersion === baseVersion) {
      errors.push(`${skillFile} changed without increasing metadata.version from ${baseVersion}`);
    } else if (
      !semverPattern.test(baseVersion) ||
      compareSemver(currentVersion, baseVersion) <= 0
    ) {
      errors.push(
        `${skillFile} metadata.version must increase from ${baseVersion} to a higher semver; got ${currentVersion}`,
      );
    } else {
      skillReasons.push(
        `${skillFile} metadata.version changed from ${baseVersion} to ${currentVersion}`,
      );
    }
  }

  if (skillReasons.length > 0) {
    reasons.push(...skillReasons);
    if (!packageChanged) {
      errors.push(
        `Public skill changes require a package.json version bump: ${skillReasons.join("; ")}`,
      );
    }
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
  const releaseVersion = packageVersion(readTargetFile("package.json", args.headRef));
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
