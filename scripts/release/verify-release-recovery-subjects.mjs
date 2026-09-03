#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { releaseRecoverySubjectErrors } from "../lib/release-management.mjs";
import { RELEASE_SUBJECT_FILE } from "../lib/release-subject.mjs";
import { validateReleaseSubjectFile } from "../lib/release-subject-validation.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaPath = path.join(
  repositoryRoot,
  "skill-evals/stark-ai-developer/evidence/release-subject.schema.json",
);

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function exactFileBytesEqual(left, right) {
  if (!fs.existsSync(left) || !fs.existsSync(right)) return false;
  const leftStat = fs.statSync(left);
  const rightStat = fs.statSync(right);
  if (!leftStat.isFile() || !rightStat.isFile() || leftStat.size !== rightStat.size) return false;
  return fs.readFileSync(left).equals(fs.readFileSync(right));
}

export function runCli(argv = process.argv.slice(2)) {
  const originDirectoryArgument = argument(argv, "--origin-dir");
  const candidateDirectoryArgument = argument(argv, "--candidate-dir");
  const originDirectory = originDirectoryArgument ? path.resolve(originDirectoryArgument) : null;
  const candidateDirectory = candidateDirectoryArgument
    ? path.resolve(candidateDirectoryArgument)
    : null;
  const originSha = argument(argv, "--origin-sha");
  const candidateSha = argument(argv, "--candidate-sha");
  const releaseVersion = argument(argv, "--release-version");
  const pluginVersion = argument(argv, "--plugin-version");
  const archiveProfile = argument(argv, "--archive-profile");
  if (
    !/^[0-9a-f]{40}$/.test(originSha ?? "") ||
    !/^[0-9a-f]{40}$/.test(candidateSha ?? "") ||
    originSha === candidateSha ||
    !/^\d+\.\d+\.\d+$/.test(releaseVersion ?? "") ||
    !/^\d+\.\d+\.\d+$/.test(pluginVersion ?? "") ||
    !archiveProfile ||
    !originDirectory ||
    !candidateDirectory ||
    !fs.existsSync(originDirectory) ||
    !fs.statSync(originDirectory).isDirectory() ||
    !fs.existsSync(candidateDirectory) ||
    !fs.statSync(candidateDirectory).isDirectory()
  ) {
    throw new Error(
      "Usage: verify-release-recovery-subjects.mjs --origin-dir <dir> --candidate-dir <dir> --origin-sha <sha> --candidate-sha <sha> --release-version <version> --plugin-version <version> --archive-profile <profile>",
    );
  }

  const expected = (sourceRevision) => ({
    sourceRevision,
    sourceState: "clean",
    releaseVersion,
    pluginVersion,
    archiveProfile,
    status: "pass",
  });
  const origin = validateReleaseSubjectFile(path.join(originDirectory, RELEASE_SUBJECT_FILE), {
    schemaPath,
    subjectDirectory: originDirectory,
    expected: expected(originSha),
  });
  const candidate = validateReleaseSubjectFile(
    path.join(candidateDirectory, RELEASE_SUBJECT_FILE),
    {
      schemaPath,
      subjectDirectory: candidateDirectory,
      expected: expected(candidateSha),
    },
  );
  const errors = [
    ...origin.errors.map((error) => `origin: ${error}`),
    ...candidate.errors.map((error) => `candidate: ${error}`),
  ];
  if (origin.document && candidate.document) {
    errors.push(...releaseRecoverySubjectErrors(origin.document, candidate.document));
  }
  for (const archive of ["openai.zip", "portable.zip"]) {
    if (
      !exactFileBytesEqual(
        path.join(originDirectory, archive),
        path.join(candidateDirectory, archive),
      )
    ) {
      errors.push(`${archive} differs between origin and replacement Validate artifacts`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`release recovery subjects failed: ${[...new Set(errors)].join("; ")}`);
  }
  console.log(
    `Release recovery subjects are payload-equivalent for ${releaseVersion}; only source revision advances from ${originSha} to ${candidateSha}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
