#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { releaseAssetNamesForTag } from "../lib/release-assets.mjs";
import { HISTORICAL_RELEASES, RELEASE_SUBJECT_FILE, sha256File } from "../lib/release-subject.mjs";
import { validateReleaseSubjectFile } from "../lib/release-subject-validation.mjs";

const repositoryRoot = process.cwd();
const SUBJECT_KEYS = [
  ["openai", "published_openai_sha"],
  ["portable", "published_portable_sha"],
];

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function parseArgs(argv) {
  const tag = argument(argv, "--tag") ?? process.env.RELEASE_TAG;
  const packageStatus = argument(argv, "--package-status") ?? process.env.PACKAGE_STATUS;
  const releaseSha = argument(argv, "--release-sha") ?? process.env.RELEASE_SHA;
  const subjectsDir = argument(argv, "--subjects-dir");
  const publishedDir = argument(argv, "--published-dir");
  const assetNamesFile = argument(argv, "--asset-names-file");
  const githubOutput = argument(argv, "--github-output");
  if (
    !tag ||
    !packageStatus ||
    !releaseSha ||
    !subjectsDir ||
    !publishedDir ||
    !assetNamesFile ||
    !githubOutput
  ) {
    throw new Error(
      "Usage: compare-release-subjects.mjs --tag <tag> --release-sha <sha> --package-status <status> --subjects-dir <directory> --published-dir <directory> --asset-names-file <path> --github-output <path>",
    );
  }
  const versionMatch = /^v([0-9]+\.[0-9]+\.[0-9]+)$/.exec(tag);
  if (!versionMatch) throw new Error(`Refusing non-release tag: ${tag}`);
  if (!/^[0-9a-f]{40}$/.test(releaseSha)) {
    throw new Error(`Release SHA must be a full 40-hex commit: ${releaseSha}`);
  }
  return {
    tag,
    packageStatus,
    releaseSha,
    releaseVersion: versionMatch[1],
    subjectsDir: path.resolve(subjectsDir),
    publishedDir: path.resolve(publishedDir),
    assetNamesFile: path.resolve(assetNamesFile),
    githubOutput: path.resolve(githubOutput),
  };
}

function usableFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function appendOutput(filePath, values) {
  const lines = Object.entries(values).map(([name, value]) => `${name}=${value}`);
  fs.appendFileSync(filePath, `${lines.join("\n")}\n`);
}

function publishedAssetNames(filePath) {
  if (!filePath || !usableFile(filePath)) return null;
  try {
    const names = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(names) || names.some((name) => typeof name !== "string")) return null;
    return [...names].sort();
  } catch {
    return null;
  }
}

function compareSemver(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function semanticReleaseSubject(document) {
  return {
    schemaVersion: document.schemaVersion,
    status: document.status,
    sourceCommit: document.sourceRevision.commit,
    sourceState: document.sourceRevision.state,
    releaseVersion: document.releaseVersion,
    pluginVersion: document.pluginVersion,
    archiveProfile: document.archiveProfile,
    subjects: {
      openai: document.subjects.openai,
      portable: document.subjects.portable,
    },
  };
}

try {
  const {
    tag,
    packageStatus,
    releaseSha,
    releaseVersion,
    subjectsDir,
    publishedDir,
    assetNamesFile,
    githubOutput,
  } = parseArgs(process.argv.slice(2));
  const output = {
    status: "blocked",
    published_openai_sha: "",
    published_portable_sha: "",
  };

  const historical = tag === "v0.19.1";
  const legacyTwoAsset = tag === "v0.20.1";
  const currentThreeAsset = compareSemver(releaseVersion, "0.21.0") >= 0;
  const supportedRelease = historical || legacyTwoAsset || currentThreeAsset;
  const expectedStatus = historical ? "not_applicable" : "pass";
  const pinnedHistoricalSha = HISTORICAL_RELEASES[tag];
  if (historical && releaseSha !== pinnedHistoricalSha) {
    console.error(`- ${tag} must resolve to pinned historical commit ${pinnedHistoricalSha}`);
  } else if (!supportedRelease) {
    console.error(`- ${tag} is not a supported published release boundary`);
  } else if (packageStatus === expectedStatus) {
    const subjectFile = path.join(subjectsDir, RELEASE_SUBJECT_FILE);
    const validation = validateReleaseSubjectFile(subjectFile, {
      schemaPath: path.join(
        repositoryRoot,
        "skill-evals/stark-ai-developer/evidence/release-subject.schema.json",
      ),
      subjectDirectory: subjectsDir,
      validateSubjectFiles: !historical,
      expected: {
        sourceRevision: releaseSha,
        sourceTag: tag,
        ...(!historical ? { sourceState: "clean" } : {}),
        releaseVersion,
        status: expectedStatus,
      },
    });
    if (validation.errors.length > 0) {
      for (const error of validation.errors) console.error(`- ${error}`);
    } else if (historical) {
      output.status = "not_applicable";
    } else {
      const mismatches = [];
      const observedAssetNames = publishedAssetNames(assetNamesFile);
      const expectedAssetNames = releaseAssetNamesForTag(tag).sort();
      if (
        !observedAssetNames ||
        JSON.stringify(observedAssetNames) !== JSON.stringify(expectedAssetNames)
      ) {
        mismatches.push(
          `release assets: expected exactly ${expectedAssetNames.join(", ")}; got ${observedAssetNames?.join(", ") ?? "unavailable"}`,
        );
      }
      for (const [key, outputName] of SUBJECT_KEYS) {
        const subject = validation.document.subjects[key];
        const publishedPath = path.join(publishedDir, subject.name);
        if (!usableFile(publishedPath)) {
          mismatches.push(`${subject.name}: published archive is missing`);
          continue;
        }
        const publishedHash = sha256File(publishedPath);
        output[outputName] = publishedHash;
        const publishedBytes = fs.statSync(publishedPath).size;
        if (publishedHash !== subject.sha256 || publishedBytes !== subject.bytes) {
          mismatches.push(
            `${subject.name}: published bytes or digest differs from release-subject.json`,
          );
        }
      }
      if (currentThreeAsset) {
        const publishedSubjectPath = path.join(publishedDir, RELEASE_SUBJECT_FILE);
        if (!usableFile(publishedSubjectPath)) {
          mismatches.push(`${RELEASE_SUBJECT_FILE}: published metadata asset is missing`);
        } else {
          const publishedValidation = validateReleaseSubjectFile(publishedSubjectPath, {
            schemaPath: path.join(
              repositoryRoot,
              "skill-evals/stark-ai-developer/evidence/release-subject.schema.json",
            ),
            subjectDirectory: publishedDir,
            expected: {
              sourceRevision: releaseSha,
              sourceState: "clean",
              releaseVersion,
              status: "pass",
            },
          });
          if (publishedValidation.errors.length > 0) {
            mismatches.push(
              ...publishedValidation.errors.map((error) => `${RELEASE_SUBJECT_FILE}: ${error}`),
            );
          } else if (
            JSON.stringify(semanticReleaseSubject(publishedValidation.document)) !==
            JSON.stringify(semanticReleaseSubject(validation.document))
          ) {
            mismatches.push(
              `${RELEASE_SUBJECT_FILE}: hosted metadata differs semantically from the tag-bound rebuild`,
            );
          }
        }
      }
      if (mismatches.length === 0) {
        output.status = "pass";
      } else {
        for (const mismatch of mismatches) console.error(`- ${mismatch}`);
      }
    }
  }

  appendOutput(githubOutput, output);
  console.log(`Release subject comparison: ${output.status}`);
} catch (error) {
  console.error(`Release subject comparison failed: ${error.message}`);
  process.exitCode = 1;
}
