import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createReleaseSubject, sha256File } from "../lib/release-subject.mjs";
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
        sourceState: "clean",
        releaseVersion: "0.20.0",
        pluginVersion: "1.0.0",
        archiveProfile: "zip-store-v1",
        status: "pass",
      },
    }).errors,
    [],
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
  historical.sourceRevision.tag = "v0.19.1";
  historical.releaseVersion = "0.19.1";
  writeDocument(historical);
  assert.deepEqual(
    validateReleaseSubjectFile(subjectPath, { schemaPath, subjectDirectory: fixtureRoot }).errors,
    [],
  );

  console.log("Release subject schema and invariant fixtures passed.");
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
