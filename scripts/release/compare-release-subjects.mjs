#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { RELEASE_SUBJECT_FILE, sha256File } from "../lib/release-subject.mjs";
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
  const subjectsDir = argument(argv, "--subjects-dir");
  const publishedDir = argument(argv, "--published-dir");
  const githubOutput = argument(argv, "--github-output");
  if (!tag || !packageStatus || !subjectsDir || !publishedDir || !githubOutput) {
    throw new Error(
      "Usage: compare-release-subjects.mjs --tag <tag> --package-status <status> --subjects-dir <directory> --published-dir <directory> --github-output <path>",
    );
  }
  return {
    tag,
    packageStatus,
    subjectsDir: path.resolve(subjectsDir),
    publishedDir: path.resolve(publishedDir),
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

try {
  const { tag, packageStatus, subjectsDir, publishedDir, githubOutput } = parseArgs(
    process.argv.slice(2),
  );
  const output = {
    status: "blocked",
    published_openai_sha: "",
    published_portable_sha: "",
  };

  if (tag === "v0.19.1") {
    output.status = "not_applicable";
  } else if (packageStatus === "pass") {
    const subjectFile = path.join(subjectsDir, RELEASE_SUBJECT_FILE);
    const validation = validateReleaseSubjectFile(subjectFile, {
      schemaPath: path.join(
        repositoryRoot,
        "skill-evals/stark-ai-developer/evidence/release-subject.schema.json",
      ),
      subjectDirectory: subjectsDir,
      expected: { status: "pass" },
    });
    if (validation.errors.length > 0) {
      for (const error of validation.errors) console.error(`- ${error}`);
    } else {
      const mismatches = [];
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
