#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import { POST_RELEASE_RECEIPT_SCHEMA_PATH } from "./post-release-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaRelativePath = POST_RELEASE_RECEIPT_SCHEMA_PATH;

function parseArgs(argv) {
  const fileIndex = argv.indexOf("--file");
  const schemaIndex = argv.indexOf("--schema");
  return {
    file: fileIndex === -1 ? null : path.resolve(argv[fileIndex + 1]),
    schema:
      schemaIndex === -1
        ? path.join(repositoryRoot, schemaRelativePath)
        : path.resolve(argv[schemaIndex + 1]),
  };
}

function formatAjvErrors(errors = []) {
  return errors.map((error) => `${error.instancePath || "/"} ${error.message}`);
}

const rfc3339DateTime = {
  type: "string",
  validate: (value) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value)),
};

const sensitiveTextPattern =
  /\b(?:api[_ -]?key|access[_ -]?token|authorization|cookie|session(?:[_ -]?id)?|password|secret)\s*[:=]\s*\S+/i;
const rawContentLabelPattern = /\b(?:raw\s+)?(?:prompt|transcript)\s*[:=]/i;
const privateHostPattern =
  /\b(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})\b|\b(?:[A-Za-z0-9-]+\.)*(?:internal|private|corp|intranet|local|lan|test|invalid)(?:\.[A-Za-z0-9-]+)*\b/i;

function findSensitiveFields(value, location = "$", findings = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => findSensitiveFields(child, `${location}[${index}]`, findings));
    return findings;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      const allowedPublicPredicateUrl =
        location.endsWith(".predicateType") && value === "https://slsa.dev/provenance/v1";
      const sensitiveValue =
        (/https?:\/\//i.test(value) && !allowedPublicPredicateUrl) ||
        /\b(?:sk|pk|rk|ghp|gho|ghu|ghs|ghr|github_pat)(?:[-_])[A-Za-z0-9_-]{10,}\b/i.test(value) ||
        /\bBearer\s+\S+/i.test(value) ||
        sensitiveTextPattern.test(value) ||
        rawContentLabelPattern.test(value) ||
        privateHostPattern.test(value);
      if (sensitiveValue) findings.push(`${location} contains a secret-like or endpoint value`);
    }
    return findings;
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      /(?:api[_-]?key|access[_-]?token|authorization|cookie|credential|password|private|secret|session|token|transcript|prompt|endpoint|base[_-]?url)/i.test(
        key,
      )
    ) {
      findings.push(`${location}.${key} is not permitted in a sanitized receipt`);
    }
    findSensitiveFields(child, `${location}.${key}`, findings);
  }
  return findings;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${filePath}: ${error.message}`);
  }
}

function validateReceiptInvariants(receipt) {
  const findings = [];
  const counts = receipt?.tests?.counts;
  const isArchiveReceipt = ["pre_release_archive", "post_release_archive"].includes(
    receipt?.receiptType,
  );
  const isManualReceipt = receipt?.receiptType === "manual_client_lifecycle";
  if (counts && Object.values(counts).every((value) => Number.isInteger(value))) {
    const sum = counts.passed + counts.blocked + counts.notRun + counts.notApplicable;
    if (counts.total !== sum) {
      findings.push("$.tests.counts total must equal passed + blocked + notRun + notApplicable");
    }
  }

  if (receipt?.status === "pass") {
    if (Array.isArray(receipt.blockers) && receipt.blockers.length > 0) {
      findings.push("$.blockers must be empty when status is pass");
    }
    if (isArchiveReceipt && receipt?.release?.archiveSubjectsStatus !== "pass") {
      findings.push("$.release.archiveSubjectsStatus must be pass when status is pass");
    }
  }

  if (isManualReceipt) {
    const artifacts = Array.isArray(receipt.artifacts) ? receipt.artifacts : [];
    const subjects = Array.isArray(receipt?.attestation?.subjects)
      ? receipt.attestation.subjects
      : [];
    if (artifacts.length !== 0) {
      findings.push("manual lifecycle receipts must not contain archive artifacts");
    }
    if (subjects.length !== 0) {
      findings.push("manual lifecycle receipts must not contain attestation subjects");
    }
    if (receipt.status === "pass") {
      if (receipt?.release?.archiveSubjectsStatus !== "not_applicable") {
        findings.push("manual pass receipts require release.archiveSubjectsStatus not_applicable");
      }
      if (receipt?.attestation?.status !== "not_applicable") {
        findings.push("manual pass receipts require attestation.status not_applicable");
      }
    }

    const operationStatuses = Object.values(receipt?.lifecycle?.operations ?? {}).map(
      (operation) => operation?.status,
    );
    const statusToCounter = {
      pass: "passed",
      blocked: "blocked",
      not_run: "notRun",
      not_applicable: "notApplicable",
    };
    const derivedCounts = {
      total: operationStatuses.length,
      passed: 0,
      blocked: 0,
      notRun: 0,
      notApplicable: 0,
    };
    for (const status of operationStatuses) {
      const counter = statusToCounter[status];
      if (!counter) {
        findings.push(`manual lifecycle operation status has no counter: ${status ?? "missing"}`);
        continue;
      }
      derivedCounts[counter] += 1;
      if (receipt.status === "pass" && !["pass", "not_applicable"].includes(status)) {
        findings.push("manual pass receipts allow only pass and not_applicable operations");
      }
    }
    if (counts) {
      for (const [name, expected] of Object.entries(derivedCounts)) {
        if (counts[name] !== expected) {
          findings.push(`$.tests.counts.${name} must equal lifecycle operations (${expected})`);
        }
      }
    }
  }

  if (receipt?.attestation?.status === "verified") {
    if (!Array.isArray(receipt.attestation.subjects) || receipt.attestation.subjects.length === 0) {
      findings.push("$.attestation.subjects must contain evidence when attestation is verified");
    }
    if (!receipt.attestation.repository || !receipt.attestation.sourceDigest) {
      findings.push(
        "$.attestation.repository and sourceDigest are required when attestation is verified",
      );
    }
  }

  const isPassingArchive = receipt?.status === "pass" && isArchiveReceipt;
  if (!isPassingArchive) return findings;

  const expectedNames = ["openai.zip", "portable.zip"];
  const artifacts = Array.isArray(receipt.artifacts) ? receipt.artifacts : [];
  const subjects = Array.isArray(receipt.attestation?.subjects) ? receipt.attestation.subjects : [];
  const artifactByName = new Map();
  const subjectByName = new Map();

  for (const artifact of artifacts) {
    if (artifact && typeof artifact.name === "string") {
      if (artifactByName.has(artifact.name)) {
        findings.push(`duplicate archive artifact subject: ${artifact.name}`);
      }
      artifactByName.set(artifact.name, artifact);
    }
  }
  for (const subject of subjects) {
    if (subject && typeof subject.name === "string") {
      if (subjectByName.has(subject.name)) {
        findings.push(`duplicate attestation subject: ${subject.name}`);
      }
      subjectByName.set(subject.name, subject);
    }
  }

  if (
    artifacts.length !== expectedNames.length ||
    expectedNames.some((name) => !artifactByName.has(name))
  ) {
    findings.push(
      "archive receipts must contain exactly one openai.zip and one portable.zip artifact",
    );
  }
  if (
    subjects.length !== expectedNames.length ||
    expectedNames.some((name) => !subjectByName.has(name))
  ) {
    findings.push("archive receipts must contain exactly one attestation subject for each archive");
  }
  if (receipt.attestation?.status !== "verified") {
    findings.push("passing archive receipts require verified attestation status");
  }
  if (receipt.attestation?.sourceDigest !== receipt.release?.sourceCommit) {
    findings.push("attestation sourceDigest must equal release sourceCommit");
  }
  if (receipt.attestation?.predicateType !== "https://slsa.dev/provenance/v1") {
    findings.push("passing archive receipts require the SLSA provenance predicate");
  }

  for (const name of expectedNames) {
    const artifact = artifactByName.get(name);
    const subject = subjectByName.get(name);
    if (artifact && subject && artifact.sha256 !== subject.sha256) {
      findings.push(`attestation subject hash must match ${name} artifact hash`);
    }
    if (
      receipt.receiptType === "post_release_archive" &&
      artifact &&
      artifact.publishedSha256 !== artifact.sha256
    ) {
      findings.push(`publishedSha256 must match ${name} artifact hash`);
    }
  }
  return findings;
}

const { file, schema: schemaPath } = parseArgs(process.argv.slice(2));
if (!file) {
  console.error(
    "Usage: node scripts/release/validate-post-release-receipt.mjs --file <receipt.json> [--schema <schema.json>]",
  );
  process.exitCode = 1;
} else {
  try {
    const schema = readJson(schemaPath);
    const receipt = readJson(file);
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    ajv.addFormat("date-time", rfc3339DateTime);
    const validate = ajv.compile(schema);
    const errors = [];

    if (!validate(receipt)) errors.push(...formatAjvErrors(validate.errors));
    errors.push(...findSensitiveFields(receipt));
    errors.push(...validateReceiptInvariants(receipt));

    if (errors.length > 0) {
      console.error("Post-release receipt validation errors:");
      for (const error of [...new Set(errors)]) console.error(`- ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`Post-release receipt is valid: ${file}`);
    }
  } catch (error) {
    console.error(`Post-release receipt validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
