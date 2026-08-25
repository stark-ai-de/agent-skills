import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createReleaseSubject,
  HISTORICAL_RELEASES,
  sha256File,
} from "../lib/release-subject.mjs";
import { validateReleaseSubjectFile } from "../lib/release-subject-validation.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaPath = path.join(
  repositoryRoot,
  "skill-evals/stark-ai-developer/evidence/release-subject.schema.json",
);
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "release-subject-validation-"));

try {
  const openaiPath = path.join(fixtureRoot, "openai.zip");
  const portablePath = path.join(fixtureRoot, "portable.zip");
  fs.writeFileSync(openaiPath, "openai subject\n");
  fs.writeFileSync(portablePath, "portable subject\n");

  const document = createReleaseSubject({
    status: "pass",
    sourceRevision: {
      commit: "a".repeat(40),
      tag: "v0.20.0",
      state: "clean",
    },
    releaseVersion: "0.20.0",
    pluginVersion: "1.0.0",
    archiveProfile: "zip-store-v1",
    openai: { sha256: sha256File(openaiPath), bytes: fs.statSync(openaiPath).size },
    portable: { sha256: sha256File(portablePath), bytes: fs.statSync(portablePath).size },
  });
  const subjectPath = path.join(fixtureRoot, "release-subject.json");
  const writeDocument = (value) =>
    fs.writeFileSync(subjectPath, `${JSON.stringify(value, null, 2)}\n`);

  writeDocument(document);
  assert.deepEqual(
    validateReleaseSubjectFile(subjectPath, {
      schemaPath,
      subjectDirectory: fixtureRoot,
      expected: {
        sourceRevision: "a".repeat(40),
        sourceTag: "v0.20.0",
        sourceState: "clean",
        releaseVersion: "0.20.0",
        pluginVersion: "1.0.0",
        archiveProfile: "zip-store-v1",
        status: "pass",
      },
    }).errors,
    [],
  );
  assert.doesNotThrow(() =>
    execFileSync(
      process.execPath,
      [
        path.join(repositoryRoot, "scripts/release/validate-release-subject.mjs"),
        "--directory",
        fixtureRoot,
        "--source-revision",
        "a".repeat(40),
        "--source-tag",
        "v0.20.0",
        "--source-state",
        "clean",
        "--release-version",
        "0.20.0",
        "--plugin-version",
        "1.0.0",
        "--archive-profile",
        "zip-store-v1",
        "--status",
        "pass",
      ],
      { cwd: repositoryRoot, stdio: ["ignore", "pipe", "pipe"] },
    ),
  );

  for (const sourceState of ["dirty", "unknown"]) {
    const wrongSourceState = structuredClone(document);
    wrongSourceState.sourceRevision.state = sourceState;
    writeDocument(wrongSourceState);
    assert.match(
      validateReleaseSubjectFile(subjectPath, {
        schemaPath,
        subjectDirectory: fixtureRoot,
        expected: { sourceState: "clean" },
      }).errors.join("\n"),
      /sourceRevision\.state must equal expected source state clean/,
    );
  }

  const wrongSourceTag = structuredClone(document);
  wrongSourceTag.sourceRevision.tag = "v0.21.0";
  writeDocument(wrongSourceTag);
  assert.match(
    validateReleaseSubjectFile(subjectPath, {
      schemaPath,
      subjectDirectory: fixtureRoot,
      expected: { sourceTag: "v0.20.0" },
    }).errors.join("\n"),
    /sourceRevision\.tag must equal expected source tag v0\.20\.0/,
  );

  const swappedSubjects = structuredClone(document);
  [swappedSubjects.subjects.openai, swappedSubjects.subjects.portable] = [
    swappedSubjects.subjects.portable,
    swappedSubjects.subjects.openai,
  ];
  writeDocument(swappedSubjects);
  assert.match(
    validateReleaseSubjectFile(subjectPath, {
      schemaPath,
      subjectDirectory: fixtureRoot,
    }).errors.join("\n"),
    /must be equal to constant/,
  );

  const wrongDigest = structuredClone(document);
  wrongDigest.subjects.openai.sha256 = "b".repeat(64);
  writeDocument(wrongDigest);
  assert.notEqual(
    validateReleaseSubjectFile(subjectPath, { schemaPath, subjectDirectory: fixtureRoot }).errors
      .length,
    0,
  );

  const wrongVersion = structuredClone(document);
  wrongVersion.releaseVersion = "0.21.0";
  writeDocument(wrongVersion);
  assert.notEqual(
    validateReleaseSubjectFile(subjectPath, {
      schemaPath,
      subjectDirectory: fixtureRoot,
      expected: { releaseVersion: "0.20.0" },
    }).errors.length,
    0,
  );

  const differingPass = structuredClone(document);
  differingPass.differences = ["openai.zip differs"];
  writeDocument(differingPass);
  assert.match(
    validateReleaseSubjectFile(subjectPath, {
      schemaPath,
      subjectDirectory: fixtureRoot,
    }).errors.join("\n"),
    /must not contain differences/,
  );

  writeDocument(document);
  fs.writeFileSync(path.join(fixtureRoot, "IDENTITY"), "legacy\n");
  assert.match(
    validateReleaseSubjectFile(subjectPath, {
      schemaPath,
      subjectDirectory: fixtureRoot,
    }).errors.join("\n"),
    /IDENTITY is not part of the release subject contract/,
  );
  fs.rmSync(path.join(fixtureRoot, "IDENTITY"));

  const historical = structuredClone(document);
  historical.status = "not_applicable";
  historical.sourceRevision.commit = HISTORICAL_RELEASES["v0.19.1"];
  historical.sourceRevision.tag = "v0.19.1";
  historical.releaseVersion = "0.19.1";
  writeDocument(historical);
  assert.deepEqual(
    validateReleaseSubjectFile(subjectPath, { schemaPath, subjectDirectory: fixtureRoot }).errors,
    [],
  );

  fs.rmSync(openaiPath);
  fs.rmSync(portablePath);
  assert.match(
    validateReleaseSubjectFile(subjectPath, { schemaPath, subjectDirectory: fixtureRoot }).errors.join(
      "\n",
    ),
    /archive is missing/,
    "normal release-subject validation must still require the archive files",
  );
  assert.deepEqual(
    validateReleaseSubjectFile(subjectPath, {
      schemaPath,
      subjectDirectory: fixtureRoot,
      validateSubjectFiles: false,
      expected: {
        sourceRevision: HISTORICAL_RELEASES["v0.19.1"],
        sourceTag: "v0.19.1",
        releaseVersion: "0.19.1",
        status: "not_applicable",
      },
    }).errors,
    [],
    "the pinned retrospective contract validates metadata without deleted tag-local ZIPs",
  );

  const publishedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "historical-published-assets-"));
  const comparisonOutput = path.join(fixtureRoot, "comparison-output");
  try {
    execFileSync(
      process.execPath,
      [
        path.join(repositoryRoot, "scripts/release/compare-release-subjects.mjs"),
        "--tag",
        "v0.19.1",
        "--release-sha",
        HISTORICAL_RELEASES["v0.19.1"],
        "--package-status",
        "not_applicable",
        "--subjects-dir",
        fixtureRoot,
        "--published-dir",
        publishedRoot,
        "--github-output",
        comparisonOutput,
      ],
      { cwd: repositoryRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.match(fs.readFileSync(comparisonOutput, "utf8"), /^status=not_applicable$/m);
  } finally {
    fs.rmSync(publishedRoot, { recursive: true, force: true });
  }

  console.log("Release subject schema and invariant fixtures passed.");
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
