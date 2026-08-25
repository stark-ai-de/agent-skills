#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { RELEASE_SUBJECT_FILE, RELEASE_SUBJECT_SCHEMA_PATH } from "../lib/release-subject.mjs";
import { validateReleaseSubjectFile } from "../lib/release-subject-validation.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function parseArgs(argv) {
  const directory = path.resolve(
    argument(argv, "--directory") ?? process.env.RELEASE_SUBJECTS_DIR ?? ".",
  );
  const file = path.resolve(argument(argv, "--file") ?? path.join(directory, RELEASE_SUBJECT_FILE));
  return {
    directory,
    file,
    schemaPath: path.resolve(
      argument(argv, "--schema") ?? path.join(repositoryRoot, RELEASE_SUBJECT_SCHEMA_PATH),
    ),
    expected: {
      sourceRevision: argument(argv, "--source-revision") ?? process.env.RELEASE_SHA,
      sourceState: argument(argv, "--source-state"),
      releaseVersion: argument(argv, "--release-version") ?? process.env.VERSION,
      pluginVersion: argument(argv, "--plugin-version") ?? process.env.PLUGIN_VERSION,
      archiveProfile: argument(argv, "--archive-profile") ?? process.env.ARCHIVE_PROFILE,
      status: argument(argv, "--status"),
    },
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const { errors, document } = validateReleaseSubjectFile(options.file, {
    schemaPath: options.schemaPath,
    subjectDirectory: options.directory,
    expected: options.expected,
  });
  if (errors.length > 0) {
    console.error("Release subject validation errors:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Release subject valid: ${document.status} ${document.sourceRevision.commit} (${document.archiveProfile})`,
    );
  }
} catch (error) {
  console.error(`Release subject validation failed: ${error.message}`);
  process.exitCode = 1;
}
