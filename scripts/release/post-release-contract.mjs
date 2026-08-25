#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

// Closed capture set: restored trees do not include release-descriptor.mjs, so
// this path stays literal here instead of being derived at restore time.
export const POST_RELEASE_RECEIPT_SCHEMA_PATH =
  "skill-evals/stark-ai-developer/evidence/post-release-receipt.schema.json";

export const POST_RELEASE_CONTRACT_FILES = Object.freeze([
  "scripts/release/post-release-contract.mjs",
  "scripts/release/resolve-release-tag.mjs",
  "scripts/release/prepare-release-subjects.mjs",
  "scripts/release/compare-release-subjects.mjs",
  "scripts/release/validate-post-release-receipt.mjs",
  "scripts/release/render-post-release-receipt.mjs",
  "scripts/lib/release-subject.mjs",
  "scripts/lib/release-subject-validation.mjs",
  "scripts/lib/post-release-receipt-renderer.mjs",
  POST_RELEASE_RECEIPT_SCHEMA_PATH,
  "skill-evals/stark-ai-developer/evidence/release-subject.schema.json",
  ".github/actions/write-run-summary/action.yml",
]);

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function parseArgs(argv) {
  const mode = argv[0];
  const destinationValue = argument(argv, "--destination");
  if (!(mode === "capture" || mode === "restore") || !destinationValue) {
    throw new Error("Usage: post-release-contract.mjs <capture|restore> --destination <directory>");
  }
  return { mode, destination: path.resolve(destinationValue) };
}

function contractRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

function copyContract(sourceRoot, destinationRoot) {
  fs.mkdirSync(destinationRoot, { recursive: true, mode: 0o755 });
  for (const relative of POST_RELEASE_CONTRACT_FILES) {
    const sourcePath = path.join(sourceRoot, relative);
    const destinationPath = path.join(destinationRoot, relative);
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true, mode: 0o755 });
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function runCli() {
  try {
    const { mode, destination } = parseArgs(process.argv.slice(2));
    copyContract(contractRoot(), destination);
    console.log(
      `${mode === "capture" ? "Captured" : "Restored"} post-release contract: ${destination}`,
    );
  } catch (error) {
    console.error(`Post-release contract operation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli();
}
