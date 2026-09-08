#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  generatedReleasePullRequest,
  generatedReleasePullRequests,
  releasePleasePullRequestOwnershipErrors,
} from "../lib/release-please.mjs";

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function ghJson(endpoint) {
  const result = spawnSync("gh", ["api", "-H", "Accept: application/vnd.github+json", endpoint], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`GitHub API failed for ${endpoint}: ${result.stderr.trim()}`);
  return JSON.parse(result.stdout);
}

function ghJsonPages(endpoint) {
  const result = spawnSync(
    "gh",
    ["api", "-H", "Accept: application/vnd.github+json", "--paginate", "--slurp", endpoint],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`GitHub API failed for ${endpoint}: ${result.stderr.trim()}`);
  return JSON.parse(result.stdout).flatMap((page) => (Array.isArray(page) ? page : []));
}

function writeGithubOutput(filePath, values) {
  if (!filePath) return;
  fs.appendFileSync(
    filePath,
    `${Object.entries(values)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n")}\n`,
  );
}

export function runCli(argv = process.argv.slice(2)) {
  const repository = argument(argv, "--repository");
  const commit = argument(argv, "--commit");
  const pullRequestNumber = argument(argv, "--pull-request");
  const expectedAppId = argument(argv, "--expected-app-id");
  const githubOutput = argv.includes("--github-output") ? process.env.GITHUB_OUTPUT : null;
  const allowUnmatched = argv.includes("--allow-unmatched");
  const jsonOutput = argv.includes("--json");
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? "") ||
    (!/^[0-9a-f]{40}$/.test(commit ?? "") && !/^\d+$/.test(pullRequestNumber ?? "")) ||
    (commit && pullRequestNumber) ||
    !/^\d+$/.test(expectedAppId ?? "")
  ) {
    throw new Error(
      "Usage: verify-release-please-merge.mjs --repository <owner/repo> (--commit <sha> | --pull-request <number>) --expected-app-id <id> [--github-output]",
    );
  }
  let pullRequest;
  if (commit) {
    const associated = ghJson(`repos/${repository}/commits/${commit}/pulls`);
    const matches = generatedReleasePullRequests(associated).filter(
      (candidate) => candidate?.merge_commit_sha === commit,
    );
    if (matches.length > 1) {
      throw new Error("Candidate commit is claimed by multiple generated release pull requests");
    }
    pullRequest = matches[0] ?? null;
    if (matches.length === 0 && allowUnmatched) {
      const result = { authorized: false, pullRequest: null, transitionBase: null };
      writeGithubOutput(githubOutput, {
        authorized: false,
        pull_request: "",
        transition_base: "",
      });
      console.log(
        jsonOutput ? JSON.stringify(result) : "No generated release PR owns this commit.",
      );
      return result;
    }
    if (!pullRequest) {
      throw new Error(
        "Automatic publication requires exactly one generated release pull request merged as the candidate commit",
      );
    }
  } else {
    pullRequest = ghJson(`repos/${repository}/pulls/${pullRequestNumber}`);
    if (!generatedReleasePullRequest(pullRequest)) {
      throw new Error(
        "Release validation requires a generated release pull request targeting main",
      );
    }
  }
  const commits = ghJsonPages(
    `repos/${repository}/pulls/${pullRequest.number}/commits?per_page=100`,
  );
  const ownershipErrors = releasePleasePullRequestOwnershipErrors({
    pullRequest,
    commits,
    repository,
    expectedAppId,
  });
  if (ownershipErrors.length > 0) {
    throw new Error(
      `Generated release pull request provenance failed: ${ownershipErrors.join("; ")}`,
    );
  }
  let transitionBase = null;
  if (commit) {
    const mergeCommit = ghJson(`repos/${repository}/commits/${commit}`);
    transitionBase = mergeCommit?.parents?.[0]?.sha ?? null;
    if (!/^[0-9a-f]{40}$/.test(transitionBase ?? "")) {
      throw new Error(
        "Generated release merge does not expose an exact first-parent transition base",
      );
    }
  }
  const result = { authorized: true, pullRequest: pullRequest.number, transitionBase };
  writeGithubOutput(githubOutput, {
    authorized: true,
    pull_request: pullRequest.number,
    transition_base: transitionBase ?? "",
  });
  console.log(
    jsonOutput
      ? JSON.stringify(result)
      : `Release Please App ${expectedAppId} solely owns release pull request #${pullRequest.number}${commit ? " merged as the candidate commit" : ""}.`,
  );
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
