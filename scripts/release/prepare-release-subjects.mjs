#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  isSha256,
  normalizeReleaseSubject,
  RELEASE_SUBJECT_FILE,
} from "../lib/release-subject.mjs";

// Seed path only. This file is captured without release-descriptor.mjs.
const PLUGIN_SOURCE_PATH = "plugins/stark-ai-developer.source.json";
const PACKAGE_JSON_PATH = "package.json";
const REPRODUCIBILITY_SCRIPTS = [
  "scripts/release/verify-release-reproducibility.mjs",
  "scripts/verify-release-reproducibility.mjs",
];

function parseArgs(argv) {
  const value = (name) => {
    const index = argv.indexOf(name);
    const result = index === -1 ? null : (argv[index + 1] ?? null);
    return result && !result.startsWith("--") ? result : null;
  };
  const githubOutput = value("--github-output");
  if (!githubOutput) {
    throw new Error("--github-output is required");
  }
  return {
    evidence: value("--evidence"),
    subjectsDir: value("--subjects-dir"),
    githubOutput: path.resolve(githubOutput),
    reportFile: value("--report-file"),
  };
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function appendOutput(filePath, values) {
  const lines = Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => `${name}=${value}`);
  if (lines.length > 0) fs.appendFileSync(filePath, `${lines.join("\n")}\n`);
}

function printChildOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function hasCurrentReport(report) {
  const normalized = normalizeReport(report);
  const historical = normalized?.sourceRevision?.tag === "v0.19.1";
  const allowedStatus = historical
    ? normalized?.status === "not_applicable" || normalized?.status === "blocked"
    : normalized?.status === "pass" || normalized?.status === "blocked";
  return Boolean(
    normalized &&
    allowedStatus &&
    (!historical || normalized.releaseVersion === "0.19.1") &&
    isSha256(normalized.subjects.openai.sha256) &&
    isSha256(normalized.subjects.portable.sha256),
  );
}

function legacyReleaseIdentity(evidence) {
  const validatedReleaseTag = process.env.RELEASE_TAG;
  const evidenceReleaseTag = evidence.releaseTag;
  if (validatedReleaseTag && evidenceReleaseTag && evidenceReleaseTag !== validatedReleaseTag) {
    throw new Error(
      `legacy evidence release tag ${evidenceReleaseTag} does not match ${validatedReleaseTag}`,
    );
  }
  const releaseTag = validatedReleaseTag ?? evidenceReleaseTag;
  const tagMatch = /^v([0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?)$/.exec(releaseTag ?? "");
  if (!tagMatch) throw new Error("legacy release evidence requires a validated release tag");

  const tagVersion = tagMatch[1];
  const packageVersion = readJson(path.join(process.cwd(), PACKAGE_JSON_PATH))?.version;
  if (packageVersion && packageVersion !== tagVersion) {
    throw new Error(`tag-local package version ${packageVersion} does not match ${releaseTag}`);
  }
  if (evidence.releaseVersion && evidence.releaseVersion !== tagVersion) {
    throw new Error(
      `legacy evidence release version ${evidence.releaseVersion} does not match ${releaseTag}`,
    );
  }

  return { releaseTag, releaseVersion: packageVersion ?? tagVersion };
}

function legacyReport(evidence) {
  const archives = evidence?.archives ?? {};
  const openai = archives["openai.zip"];
  const portable = archives["portable.zip"];
  if (!openai || !portable) return null;

  const pluginSourcePath = path.join(process.cwd(), PLUGIN_SOURCE_PATH);
  const pluginSource = readJson(pluginSourcePath) ?? {};
  const pluginVersion = evidence.package?.version ?? pluginSource.version ?? "unknown";
  const { releaseTag, releaseVersion } = legacyReleaseIdentity(evidence);
  const byteIdentical = evidence.reproducibility?.byteIdentical === true;
  const historical = releaseTag === "v0.19.1";
  return {
    status: byteIdentical ? (historical ? "not_applicable" : "pass") : "blocked",
    sourceRevision: {
      commit: process.env.RELEASE_SHA ?? evidence.sourceCommit,
      tag: releaseTag,
      state: evidence.sourceState ?? "unknown",
    },
    releaseVersion,
    pluginVersion,
    archiveProfile: evidence.reproducibility?.archiveProfile ?? "zip-store-v1",
    openai: { sha256: openai.sha256, bytes: openai.bytes },
    portable: { sha256: portable.sha256, bytes: portable.bytes },
    differences: evidence.reproducibility?.differences ?? [],
  };
}

function normalizeReport(report) {
  try {
    return normalizeReleaseSubject(report, { releaseTag: process.env.RELEASE_TAG });
  } catch {
    return null;
  }
}

function writeReport(filePath, report) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true, mode: 0o755 });
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(report, null, 2)}\n`);
}

function writeSubjectFile(subjectsDir, report) {
  if (!subjectsDir) return;
  for (const legacyName of ["SHA256SUMS", "IDENTITY"]) {
    fs.rmSync(path.join(subjectsDir, legacyName), { force: true });
  }
  fs.mkdirSync(subjectsDir, { recursive: true, mode: 0o755 });
  fs.writeFileSync(
    path.join(subjectsDir, RELEASE_SUBJECT_FILE),
    `${JSON.stringify(report, null, 2)}\n`,
    { mode: 0o644 },
  );
}

function appendSubjectOutputs(githubOutput, report) {
  appendOutput(githubOutput, {
    status: report.status,
    source_sha: report.sourceRevision.commit,
    plugin_version: report.pluginVersion,
    openai_sha: report.subjects.openai.sha256,
    portable_sha: report.subjects.portable.sha256,
    openai_bytes: report.subjects.openai.bytes,
    portable_bytes: report.subjects.portable.bytes,
    archive_profile: report.archiveProfile,
  });
}

function reproducibilityScript(root) {
  const relative = REPRODUCIBILITY_SCRIPTS.find((candidate) =>
    fs.existsSync(path.join(root, candidate)),
  );
  if (!relative) {
    throw new Error(
      `missing verify-release-reproducibility.mjs (tried ${REPRODUCIBILITY_SCRIPTS.join(", ")})`,
    );
  }
  return relative;
}

let temporaryRoot;

try {
  const { evidence, subjectsDir, githubOutput, reportFile } = parseArgs(process.argv.slice(2));
  temporaryRoot = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP ?? "/tmp", "release-subjects-"));
  const childOutput = path.join(temporaryRoot, "github-output");
  const childReport = path.join(temporaryRoot, "report.json");
  const childEvidence = evidence
    ? path.resolve(evidence)
    : path.join(temporaryRoot, "legacy-release-evidence.json");
  const args = [
    reproducibilityScript(process.cwd()),
    "--evidence",
    childEvidence,
    "--github-output",
    childOutput,
    "--report-file",
    childReport,
  ];
  if (subjectsDir) args.push("--subjects-dir", path.resolve(subjectsDir));

  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  printChildOutput(result);

  const current = readJson(childReport);
  if (hasCurrentReport(current)) {
    const normalized = normalizeReport(current);
    writeSubjectFile(subjectsDir, normalized);
    appendSubjectOutputs(githubOutput, normalized);
    writeReport(reportFile, normalized);
    process.exitCode = result.status ?? 1;
  } else if (result.status === 0) {
    const legacy = legacyReport(readJson(childEvidence));
    const normalized = normalizeReport(legacy);
    if (!normalized || !hasCurrentReport(legacy)) {
      throw new Error("Reproducibility completed without current or legacy subject output");
    }
    writeSubjectFile(subjectsDir, normalized);
    appendSubjectOutputs(githubOutput, normalized);
    writeReport(reportFile, normalized);
    console.log("Translated legacy reproducibility evidence into release-subject outputs.");
  } else {
    appendOutput(githubOutput, { status: "blocked" });
    process.exitCode = result.status ?? 1;
  }
} catch (error) {
  console.error(`Release subject preparation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (temporaryRoot) fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
