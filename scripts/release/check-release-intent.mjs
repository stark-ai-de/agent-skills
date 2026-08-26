import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { listChangedGitPaths } from "../lib/git-changed-paths.mjs";

const root = process.cwd();
const semverPattern = /^\d+\.\d+\.\d+$/;
const pluginSourcePath = "plugins/stark-ai-developer.source.json";
const listingPath = "docs/listing/openai/stark-ai-developer.json";

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

function packageVersion(text) {
  if (!text) return null;
  try {
    return JSON.parse(text).version ?? null;
  } catch {
    return null;
  }
}

function jsonObject(text) {
  if (!text) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function pluginVersion(text) {
  return jsonObject(text)?.version ?? null;
}

function pluginSkillSources(...descriptorTexts) {
  const sources = new Set();
  for (const text of descriptorTexts) {
    const descriptor = jsonObject(text);
    if (!Array.isArray(descriptor?.skills)) continue;
    for (const skill of descriptor.skills) {
      if (typeof skill?.source === "string" && skill.source.trim()) {
        sources.add(skill.source.replace(/\/$/, ""));
      }
    }
  }
  return [...sources];
}

function listingAssetPaths(...listingTexts) {
  const assets = new Set();
  for (const text of listingTexts) {
    const listing = jsonObject(text);
    for (const value of Object.values(listing?.plugin?.assets ?? {})) {
      if (typeof value === "string" && value.trim()) assets.add(value);
    }
  }
  return [...assets];
}

function packageProjectionIdentity(text) {
  const manifest = jsonObject(text);
  if (!manifest) return null;
  return JSON.stringify({
    author: manifest.author ?? null,
    repository: manifest.repository ?? null,
    license: manifest.license ?? null,
  });
}

function changedPluginInputs(
  files,
  { baseDescriptor, currentDescriptor, baseListing, currentListing, basePackage, currentPackage },
) {
  const directInputs = new Set([
    pluginSourcePath,
    listingPath,
    "LICENSE",
    ...listingAssetPaths(baseListing, currentListing),
  ]);
  const skillSources = pluginSkillSources(baseDescriptor, currentDescriptor);
  const packageIdentityChanged =
    packageProjectionIdentity(basePackage) !== packageProjectionIdentity(currentPackage);

  return files.filter(
    (file) =>
      directInputs.has(file) ||
      skillSources.some((source) => file === source || file.startsWith(`${source}/`)) ||
      (file === "package.json" && packageIdentityChanged),
  );
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

function normalizeChangelogSection(text) {
  return `${text.replace(/[ \t]+$/gm, "").trim()}\n`;
}

function splitChangelogSections(text) {
  const sections = new Map();
  if (!text) return sections;
  for (const chunk of text.split(/^(?=## )/m)) {
    const heading = chunk.match(/^##\s+(\S.*)$/m)?.[1]?.trim();
    if (!heading) continue;
    const normalized = normalizeChangelogSection(chunk);
    const version = heading.match(/^v(\d+\.\d+\.\d+)(?:\s|$)/);
    if (version) sections.set(version[1], normalized);
    else if (/^Unreleased\b/i.test(heading)) sections.set("Unreleased", normalized);
  }
  return sections;
}

function changelogReleaseVersions(text) {
  return new Set([...splitChangelogSections(text).keys()].filter((key) => key !== "Unreleased"));
}

function changelogSectionHasListItems(section) {
  return /^- /m.test(section ?? "");
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
  const files = listChangedGitPaths({ root, baseRef: args.baseRef, headRef: args.headRef });
  const basePackageText = readGitFile(args.baseRef, "package.json");
  const currentPackageText = readTargetFile("package.json", args.headRef);
  const basePackageVersion = packageVersion(basePackageText);
  const currentPackageVersion = packageVersion(currentPackageText);
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

  const basePluginDescriptor = readGitFile(args.baseRef, pluginSourcePath);
  const currentPluginDescriptor = readTargetFile(pluginSourcePath, args.headRef);
  const baseListing = readGitFile(args.baseRef, listingPath);
  const currentListing = readTargetFile(listingPath, args.headRef);
  const pluginInputFiles = changedPluginInputs(files, {
    baseDescriptor: basePluginDescriptor,
    currentDescriptor: currentPluginDescriptor,
    baseListing,
    currentListing,
    basePackage: basePackageText,
    currentPackage: currentPackageText,
  });

  if (pluginInputFiles.length > 0) {
    const basePluginVersion = pluginVersion(basePluginDescriptor);
    const currentPluginVersion = pluginVersion(currentPluginDescriptor);
    if (!currentPluginVersion || !semverPattern.test(currentPluginVersion)) {
      errors.push(
        `${pluginSourcePath} uses invalid or missing semver version: ${currentPluginVersion ?? "(missing)"}`,
      );
    } else if (basePluginVersion && !semverPattern.test(basePluginVersion)) {
      errors.push(`${pluginSourcePath} base version is invalid semver: ${basePluginVersion}`);
    } else if (basePluginVersion && compareSemver(currentPluginVersion, basePluginVersion) <= 0) {
      errors.push(
        `Bundled plugin inputs changed without increasing ${pluginSourcePath} version from ${basePluginVersion}; got ${currentPluginVersion}. Changed inputs: ${pluginInputFiles.join(", ")}`,
      );
    } else {
      reasons.push(
        `${pluginSourcePath} version changed from ${basePluginVersion ?? "(missing)"} to ${currentPluginVersion}`,
      );
    }

    if (!packageChanged) {
      errors.push(
        `Bundled plugin input changes require a package.json version bump: ${pluginInputFiles.join(", ")}`,
      );
    }
  }

  const baseChangelog = readGitFile(args.baseRef, "CHANGELOG.md") ?? "";
  const currentChangelog = readTargetFile("CHANGELOG.md", args.headRef) ?? "";
  const baseChangelogSections = splitChangelogSections(baseChangelog);
  const currentChangelogSections = splitChangelogSections(currentChangelog);
  const baseChangelogVersions = changelogReleaseVersions(baseChangelog);
  const currentChangelogVersions = changelogReleaseVersions(currentChangelog);
  const addedChangelogVersions = [...currentChangelogVersions].filter(
    (version) => !baseChangelogVersions.has(version),
  );

  for (const version of baseChangelogVersions) {
    const baseSection = baseChangelogSections.get(version);
    const currentSection = currentChangelogSections.get(version);
    if (!currentSection) {
      errors.push(`CHANGELOG.md removed historical release v${version}`);
    } else if (currentSection !== baseSection) {
      errors.push(
        `CHANGELOG.md rewrote historical v${version}; pull requests may only change Unreleased or add the planned v${currentPackageVersion ?? "<package-version>"} section comparing that release with the previous one`,
      );
    }
  }

  if (packageChanged && changelogSectionHasListItems(currentChangelogSections.get("Unreleased"))) {
    errors.push(
      `CHANGELOG.md Unreleased still has list items; fold them into the planned v${currentPackageVersion} section so the GitHub Release describes this release versus the previous one`,
    );
  }

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
