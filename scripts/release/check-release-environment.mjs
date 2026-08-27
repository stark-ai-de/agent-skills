#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function argument(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  if (index === -1) return fallback;
  const value = argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

export function validateReleaseEnvironment(environment, branch, branchPolicies, expected = {}) {
  const errors = [];
  const environmentName = expected.environment ?? "release";
  const branchName = expected.branch ?? "main";
  if (environment?.name !== environmentName) {
    errors.push(`environment name must be ${environmentName}`);
  }
  const requiredReviewers = environment?.protection_rules?.find(
    (rule) => rule?.type === "required_reviewers",
  )?.reviewers;
  if (!Array.isArray(requiredReviewers) || requiredReviewers.length === 0) {
    errors.push("environment must have at least one required reviewer");
  }
  if (environment?.can_admins_bypass !== false) {
    errors.push("environment administrator bypass must be disabled");
  }
  if (
    environment?.deployment_branch_policy?.protected_branches !== false ||
    environment?.deployment_branch_policy?.custom_branch_policies !== true
  ) {
    errors.push(
      "environment must use custom branch policies and disable all-protected-branches mode",
    );
  }
  if (branch?.name !== branchName || branch?.protected !== true) {
    errors.push(`${branchName} must exist and be protected`);
  }
  const policies = branchPolicies?.branch_policies;
  if (
    branchPolicies?.total_count !== 1 ||
    !Array.isArray(policies) ||
    policies.length !== 1 ||
    policies[0]?.name !== branchName ||
    (policies[0]?.type !== undefined && policies[0].type !== "branch")
  ) {
    errors.push(`environment must have exactly one custom branch policy named ${branchName}`);
  }
  return errors;
}

function ghJson(endpoint) {
  const result = spawnSync("gh", ["api", endpoint], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`GitHub API preflight failed for ${endpoint}: ${result.stderr.trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`GitHub API returned invalid JSON for ${endpoint}: ${error.message}`);
  }
}

export function runCli(argv = process.argv.slice(2)) {
  const repository = argument(argv, "--repository");
  const environmentName = argument(argv, "--environment", "release");
  const branchName = argument(argv, "--branch", "main");
  if (!repository || !environmentName || !branchName) {
    throw new Error(
      "Usage: check-release-environment.mjs --repository <owner/repo> [--environment release] [--branch main]",
    );
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error(`Invalid repository: ${repository}`);
  }
  if (process.env.GITHUB_REF && process.env.GITHUB_REF !== `refs/heads/${branchName}`) {
    throw new Error(`Release publication must run from refs/heads/${branchName}`);
  }
  const environment = ghJson(
    `repos/${repository}/environments/${encodeURIComponent(environmentName)}`,
  );
  const branch = ghJson(`repos/${repository}/branches/${encodeURIComponent(branchName)}`);
  const branchPolicies = ghJson(
    `repos/${repository}/environments/${encodeURIComponent(environmentName)}/deployment-branch-policies?per_page=100`,
  );
  const errors = validateReleaseEnvironment(environment, branch, branchPolicies, {
    environment: environmentName,
    branch: branchName,
  });
  if (errors.length > 0) {
    throw new Error(`Release environment preflight failed: ${errors.join("; ")}`);
  }
  console.log(
    `Release environment ${environmentName} allows only protected ${branchName}, has required reviewers, and disables administrator bypass.`,
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
