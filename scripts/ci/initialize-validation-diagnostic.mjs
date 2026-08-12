#!/usr/bin/env node
import path from "node:path";

import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";
import { writeJsonAtomic } from "./validation-contract.mjs";

const outputIndex = process.argv.indexOf("--output");
if (outputIndex < 0 || !process.argv[outputIndex + 1]) {
  throw new Error("--output is required.");
}
if (process.argv.length !== 4) throw new Error("Unknown diagnostic initialization argument.");

const output = process.argv[outputIndex + 1];
const recoveryBoundary = {
  schemaVersion: 1,
  candidateFingerprint: null,
  candidateFileCount: null,
  fingerprintError: "Initial candidate fingerprint did not complete.",
};
writeJsonAtomic(output, recoveryBoundary);

let fingerprint;
try {
  fingerprint = fingerprintGitCandidateRepository(process.cwd());
} catch (error) {
  const message = `Initial candidate fingerprint failed: ${error instanceof Error ? error.message : String(error)}`;
  writeJsonAtomic(output, { ...recoveryBoundary, fingerprintError: message });
  console.error(message);
  process.exitCode = 1;
}

if (fingerprint) {
  writeJsonAtomic(output, {
    schemaVersion: 1,
    candidateFingerprint: `${fingerprint.algorithm}:${fingerprint.digest}`,
    candidateFileCount: fingerprint.fileCount,
  });
  console.log(`Validation diagnostic boundary initialized at ${path.resolve(output)}.`);
}
