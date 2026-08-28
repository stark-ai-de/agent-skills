#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  changelogReleaseOrder,
  changelogReleaseVersions,
  removeChangelogReleaseSection,
  splitChangelogSections,
} from "../lib/release-changelog.mjs";
import {
  automatedReleaseVersionSupported,
  FIRST_AUTOMATED_RELEASE_VERSION,
  GENERATED_RELEASE_FILES,
} from "../lib/release-please.mjs";

const root = process.cwd();
const semverPattern = /^\d+\.\d+\.\d+$/;
function parseArgs(argv) {
  const args = { githubOutput: false, headRef: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-ref") {
      args.baseRef = argv[index + 1];
      index += 1;
    } else if (arg === "--head-ref") {
      args.headRef = argv[index + 1];
      index += 1;
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
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}

function readGitFile(ref, file) {
  try {
    return execFileSync("git", ["show", `${ref}:${file}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
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
    .filter(Boolean)
    .sort();
}

function jsonValue(text, selector) {
  if (!text) return null;
  try {
    return selector(JSON.parse(text));
  } catch {
    return null;
  }
}

function jsonDocument(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function jsonDiffChangesOnlyKey(baseText, currentText, key) {
  const base = jsonDocument(baseText);
  const current = jsonDocument(currentText);
  if (!base || !current || !Object.hasOwn(base, key) || !Object.hasOwn(current, key)) return false;
  current[key] = base[key];
  return isDeepStrictEqual(current, base);
}

function packageVersion(text) {
  return jsonValue(text, (document) => document.version ?? null);
}

function manifestVersion(text) {
  return jsonValue(text, (document) => document["."] ?? null);
}

function pluginSource(text) {
  return jsonValue(text, (document) => document);
}

function metadataVersion(text) {
  if (!text) return null;
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
  return frontmatter?.match(/^\s+version:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim() ?? null;
}

function compareSemver(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function changedSkillFile(changedFile) {
  const match = changedFile.match(/^((?:skills|incubator\/skills)\/[^/]+\/[^/]+)\//);
  return match ? `${match[1]}/SKILL.md` : null;
}

function uniqueChangedSkillFiles(files) {
  return [...new Set(files.map(changedSkillFile).filter(Boolean))].sort();
}

function writeGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

function validateChangedSkills(files, baseRef, headRef, errors, reasons) {
  for (const skillFile of uniqueChangedSkillFiles(files)) {
    const baseText = readGitFile(baseRef, skillFile);
    const currentText = readTargetFile(skillFile, headRef);
    const baseVersion = metadataVersion(baseText);
    const currentVersion = metadataVersion(currentText);
    if (!baseText && currentText) {
      if (!currentVersion || !semverPattern.test(currentVersion)) {
        errors.push(`${skillFile}: new skills must set metadata.version with x.y.z semver`);
      } else {
        reasons.push(`${skillFile} added at ${currentVersion}`);
      }
      continue;
    }
    if (baseText && !currentText) {
      reasons.push(`${skillFile} removed`);
      continue;
    }
    if (!baseVersion || !currentVersion || !semverPattern.test(currentVersion)) {
      errors.push(`${skillFile}: changed skills require metadata.version with x.y.z semver`);
    } else if (
      !semverPattern.test(baseVersion) ||
      compareSemver(currentVersion, baseVersion) <= 0
    ) {
      errors.push(
        `${skillFile} metadata.version must increase from ${baseVersion} to a higher semver; got ${currentVersion}`,
      );
    } else {
      reasons.push(
        `${skillFile} metadata.version changed from ${baseVersion} to ${currentVersion}`,
      );
    }
  }
}

function validateBundledPlugin(files, baseRef, headRef, errors, reasons) {
  const descriptor = "plugins/stark-ai-developer.source.json";
  const base = pluginSource(readGitFile(baseRef, descriptor));
  const current = pluginSource(readTargetFile(descriptor, headRef));
  const bundledRoots = new Set(
    [...(base?.skills ?? []), ...(current?.skills ?? [])]
      .map((skill) => skill?.source)
      .filter((source) => typeof source === "string"),
  );
  const bundledChanged = files.some((file) =>
    [...bundledRoots].some((source) => file === source || file.startsWith(`${source}/`)),
  );
  const descriptorChanged = files.includes(descriptor);
  if (bundledChanged && !descriptorChanged) {
    errors.push(`${descriptor} must increase its version when a bundled skill changes`);
  }
  if (!descriptorChanged) return;
  if (
    !base?.version ||
    !current?.version ||
    !semverPattern.test(base.version) ||
    !semverPattern.test(current.version) ||
    compareSemver(current.version, base.version) <= 0
  ) {
    errors.push(
      `${descriptor} version must increase from ${base?.version ?? "(missing)"} to a higher semver; got ${current?.version ?? "(missing)"}`,
    );
  } else {
    reasons.push(`${descriptor} version changed from ${base.version} to ${current.version}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const errors = [];
const reasons = [];

if (!args.baseRef || /^0+$/.test(args.baseRef)) {
  errors.push("A non-empty --base-ref is required to detect release impact.");
} else if (git(["rev-parse", "--verify", `${args.baseRef}^{commit}`], true) === null) {
  errors.push(`Base ref is not available locally: ${args.baseRef}`);
}

let contractKind = "none";
let releaseVersion = "";
if (errors.length === 0) {
  const files = changedFiles(args.baseRef, args.headRef);
  const basePackageText = readGitFile(args.baseRef, "package.json");
  const currentPackageText = readTargetFile("package.json", args.headRef);
  const baseManifestText = readGitFile(args.baseRef, ".release-please-manifest.json");
  const currentManifestText = readTargetFile(".release-please-manifest.json", args.headRef);
  const basePackageVersion = packageVersion(basePackageText);
  const currentPackageVersion = packageVersion(currentPackageText);
  const baseManifestVersion = manifestVersion(baseManifestText);
  const currentManifestVersion = manifestVersion(currentManifestText);
  const packageChanged = basePackageVersion !== currentPackageVersion;
  const manifestChanged =
    baseManifestVersion !== null && baseManifestVersion !== currentManifestVersion;
  if (baseManifestVersion === null) {
    const currentManifest = jsonDocument(currentManifestText);
    if (
      currentManifestVersion !== basePackageVersion ||
      !currentManifest ||
      JSON.stringify(Object.keys(currentManifest).sort()) !== JSON.stringify(["."])
    ) {
      errors.push(
        "The initial Release Please manifest must contain only the existing package.json baseline",
      );
    }
  }

  const baseChangelog = readGitFile(args.baseRef, "CHANGELOG.md") ?? "";
  const currentChangelog = readTargetFile("CHANGELOG.md", args.headRef) ?? "";
  const baseSections = splitChangelogSections(baseChangelog);
  const currentSections = splitChangelogSections(currentChangelog);
  const baseVersions = changelogReleaseVersions(baseChangelog);
  const currentVersions = changelogReleaseVersions(currentChangelog);
  const addedVersions = [...currentVersions].filter((version) => !baseVersions.has(version));

  for (const version of baseVersions) {
    if (!currentSections.has(version)) {
      errors.push(`CHANGELOG.md removed historical release ${version}`);
    } else if (currentSections.get(version) !== baseSections.get(version)) {
      errors.push(`CHANGELOG.md rewrote historical release ${version}`);
    }
  }

  const generatedRelease = packageChanged || manifestChanged || addedVersions.length > 0;
  if (generatedRelease) {
    contractKind = "release-pr";
    releaseVersion = currentPackageVersion ?? "";
    if (!packageChanged || !manifestChanged || addedVersions.length !== 1) {
      errors.push(
        "Generated release PRs must update package.json, .release-please-manifest.json, and exactly one CHANGELOG.md release section together",
      );
    }
    if (
      !currentPackageVersion ||
      !semverPattern.test(currentPackageVersion) ||
      !basePackageVersion ||
      !semverPattern.test(basePackageVersion) ||
      compareSemver(currentPackageVersion, basePackageVersion) <= 0
    ) {
      errors.push(
        `package.json version must increase from ${basePackageVersion ?? "(missing)"}; got ${currentPackageVersion ?? "(missing)"}`,
      );
    }
    if (!automatedReleaseVersionSupported(currentPackageVersion)) {
      errors.push(
        `Generated release versions must be ${FIRST_AUTOMATED_RELEASE_VERSION} or newer; got ${currentPackageVersion ?? "(missing)"}`,
      );
    }
    if (
      basePackageVersion === "0.20.1" &&
      currentPackageVersion !== FIRST_AUTOMATED_RELEASE_VERSION
    ) {
      errors.push(
        `The first generated release after 0.20.1 must be ${FIRST_AUTOMATED_RELEASE_VERSION}; got ${currentPackageVersion ?? "(missing)"}`,
      );
    }
    if (baseManifestVersion !== basePackageVersion) {
      errors.push("The base Release Please manifest and package.json versions must match");
    }
    if (currentManifestVersion !== currentPackageVersion) {
      errors.push("The generated Release Please manifest and package.json versions must match");
    }
    if (!jsonDiffChangesOnlyKey(basePackageText, currentPackageText, "version")) {
      errors.push("Generated release PRs may change only package.json version");
    }
    if (!jsonDiffChangesOnlyKey(baseManifestText, currentManifestText, ".")) {
      errors.push("Generated release PRs may change only the root manifest version");
    }
    if (addedVersions.length === 1 && addedVersions[0] !== currentPackageVersion) {
      errors.push(
        `CHANGELOG.md added ${addedVersions[0]}, but the generated package version is ${currentPackageVersion ?? "(missing)"}`,
      );
    }
    if (currentSections.get("Unreleased") !== baseSections.get("Unreleased")) {
      errors.push("Generated release PRs must preserve the existing Unreleased section");
    }
    if (changelogReleaseOrder(currentChangelog)[0] !== currentPackageVersion) {
      errors.push("The generated release must be the newest CHANGELOG.md release heading");
    }
    if (
      addedVersions.length !== 1 ||
      removeChangelogReleaseSection(currentChangelog, addedVersions[0]) !== baseChangelog
    ) {
      errors.push(
        "Generated release PRs may only insert one new CHANGELOG.md release section; all existing bytes must remain unchanged",
      );
    }
    if (JSON.stringify(files) !== JSON.stringify([...GENERATED_RELEASE_FILES])) {
      errors.push(
        `Generated release PRs may change only ${GENERATED_RELEASE_FILES.join(", ")}; got ${files.join(", ")}`,
      );
    }
    reasons.push(`generated catalog release ${currentPackageVersion ?? "(missing)"}`);
  } else {
    if (baseManifestVersion !== null && files.includes(".release-please-manifest.json")) {
      errors.push("Feature PRs must not change .release-please-manifest.json");
    }
    if (files.includes("CHANGELOG.md")) {
      errors.push("Feature PRs must not change the root CHANGELOG.md");
    }
    validateChangedSkills(files, args.baseRef, args.headRef, errors, reasons);
    validateBundledPlugin(files, args.baseRef, args.headRef, errors, reasons);
    if (reasons.length > 0) contractKind = "feature";
  }
}

if (errors.length > 0) {
  console.error("Release impact check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const output = {
  release_intent: contractKind === "release-pr" ? "true" : "false",
  component_impact: contractKind === "feature" ? "true" : "false",
  contract_kind: contractKind,
  release_version: releaseVersion,
  release_reasons: reasons.join("; "),
};
if (args.githubOutput) writeGithubOutput(output);
if (contractKind === "none") {
  console.log("No release impact detected.");
} else {
  console.log(`${contractKind} contract passed: ${output.release_reasons}`);
}
