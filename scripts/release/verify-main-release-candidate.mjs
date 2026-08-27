#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

import { mainCandidateContainmentErrors } from "../lib/release-management.mjs";

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function ghJson(endpoint) {
  const result = spawnSync("gh", ["api", endpoint], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`gh api ${endpoint} failed: ${result.stderr.trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`GitHub returned invalid JSON for ${endpoint}: ${error.message}`);
  }
}

function main() {
  const repository = argument(process.argv.slice(2), "--repository");
  const candidateSha = argument(process.argv.slice(2), "--candidate");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? "")) {
    throw new Error("--repository must use owner/name");
  }
  if (!/^[0-9a-f]{40}$/.test(candidateSha ?? "")) {
    throw new Error("--candidate must be a full lowercase commit SHA");
  }

  const branch = ghJson(`repos/${repository}/branches/main`);
  const mainSha = branch?.commit?.sha;
  if (!/^[0-9a-f]{40}$/.test(mainSha ?? "")) {
    throw new Error("GitHub did not return a valid main SHA");
  }
  const comparison = ghJson(`repos/${repository}/compare/${candidateSha}...${mainSha}`);
  const errors = mainCandidateContainmentErrors({ candidateSha, branch, comparison });
  if (errors.length > 0) {
    throw new Error(`Release candidate containment failed: ${errors.join("; ")}`);
  }
  console.log(
    JSON.stringify({
      candidateSha,
      mainSha,
      status: comparison.status,
      protected: true,
    }),
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
