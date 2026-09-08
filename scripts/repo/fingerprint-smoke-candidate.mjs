import path from "node:path";

import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";

function usage() {
  return [
    "Usage: pnpm run smoke:fingerprint -- [--repository <path>] [--json]",
    "",
    "Print the deterministic SHA-256 fingerprint of the Git-derived smoke candidate set.",
  ].join("\n");
}

function parseArguments(arguments_) {
  let repositoryRoot = process.cwd();
  let json = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--repository") {
      const value = arguments_[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--repository requires a path.");
      }
      repositoryRoot = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      return { help: true, json, repositoryRoot };
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return { help: false, json, repositoryRoot };
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
  } else {
    const result = fingerprintGitCandidateRepository(options.repositoryRoot);
    if (options.json) {
      console.log(JSON.stringify(result));
    } else {
      console.log(`Git candidate fingerprint: ${result.algorithm}:${result.digest}`);
      console.log(`Git candidate files: ${result.fileCount}`);
    }
  }
} catch (error) {
  console.error(`Could not fingerprint the smoke candidate set: ${error.message}`);
  process.exitCode = 1;
}
