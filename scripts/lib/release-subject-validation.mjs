import fs from "node:fs";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";

import { RELEASE_SUBJECT_SCHEMA_PATH, readReleaseSubject, sha256File } from "./release-subject.mjs";

function formatAjvErrors(errors = []) {
  return errors.map((error) => `${error.instancePath || "/"} ${error.message}`);
}

function readSchema(schemaPath) {
  return JSON.parse(fs.readFileSync(schemaPath, "utf8"));
}

function validateExpected(document, expected) {
  const errors = [];
  if (!expected) return errors;
  if (expected.sourceRevision && document.sourceRevision.commit !== expected.sourceRevision) {
    errors.push(
      `sourceRevision.commit must equal expected source revision ${expected.sourceRevision}`,
    );
  }
  if (expected.sourceTag && document.sourceRevision.tag !== expected.sourceTag) {
    errors.push(`sourceRevision.tag must equal expected source tag ${expected.sourceTag}`);
  }
  if (expected.sourceState && document.sourceRevision.state !== expected.sourceState) {
    errors.push(`sourceRevision.state must equal expected source state ${expected.sourceState}`);
  }
  if (expected.releaseVersion && document.releaseVersion !== expected.releaseVersion) {
    errors.push(`releaseVersion must equal expected release version ${expected.releaseVersion}`);
  }
  if (expected.pluginVersion && document.pluginVersion !== expected.pluginVersion) {
    errors.push(`pluginVersion must equal expected plugin version ${expected.pluginVersion}`);
  }
  if (expected.archiveProfile && document.archiveProfile !== expected.archiveProfile) {
    errors.push(`archiveProfile must equal expected archive profile ${expected.archiveProfile}`);
  }
  if (expected.status && document.status !== expected.status) {
    errors.push(`status must equal expected status ${expected.status}`);
  }
  return errors;
}

export function validateReleaseSubjectDocument(
  document,
  { schemaPath, subjectDirectory, expected, validateSubjectFiles = true } = {},
) {
  const errors = [];
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return ["release subject must be a JSON object"];
  }

  if (!schemaPath) {
    throw new Error("schemaPath is required to validate a release subject");
  }
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(readSchema(schemaPath));
  if (!validate(document)) errors.push(...formatAjvErrors(validate.errors));
  if (errors.length > 0) return errors;

  errors.push(...validateExpected(document, expected));

  if (document.status === "pass" && document.differences.length > 0) {
    errors.push("pass release subjects must not contain differences");
  }

  if (subjectDirectory && validateSubjectFiles) {
    const directory = path.resolve(subjectDirectory);
    for (const legacyName of ["SHA256SUMS", "IDENTITY"]) {
      if (fs.existsSync(path.join(directory, legacyName))) {
        errors.push(`${legacyName} is not part of the release subject contract`);
      }
    }
    for (const key of ["openai", "portable"]) {
      const subject = document.subjects[key];
      const archivePath = path.join(directory, subject.name);
      if (!fs.existsSync(archivePath) || !fs.statSync(archivePath).isFile()) {
        errors.push(`subjects.${key}.name archive is missing: ${subject.name}`);
        continue;
      }
      const stat = fs.statSync(archivePath);
      const digest = sha256File(archivePath);
      if (stat.size !== subject.bytes) {
        errors.push(`subjects.${key}.bytes does not match ${subject.name}`);
      }
      if (digest !== subject.sha256) {
        errors.push(`subjects.${key}.sha256 does not match ${subject.name}`);
      }
    }
  }

  return errors;
}

export function validateReleaseSubjectFile(filePath, options = {}) {
  const absoluteFile = path.resolve(filePath);
  try {
    const document = readReleaseSubject(absoluteFile);
    const schemaPath =
      options.schemaPath ??
      path.resolve(path.dirname(absoluteFile), "../", RELEASE_SUBJECT_SCHEMA_PATH);
    return {
      document,
      errors: validateReleaseSubjectDocument(document, {
        ...options,
        schemaPath,
        subjectDirectory:
          options.validateSubjectFiles === false
            ? undefined
            : (options.subjectDirectory ?? path.dirname(absoluteFile)),
      }),
    };
  } catch (error) {
    return { document: null, errors: [error.message] };
  }
}
