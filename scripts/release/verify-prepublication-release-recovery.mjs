#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  PRE_PUBLICATION_RECOVERY_IMMUTABLE_PATHS,
  prePublicationRecoveryErrors,
  successfulMainValidateRun,
} from "../lib/release-management.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function commandResult(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  return result;
}

function commandJson(command, args) {
  const result = commandResult(command, args);
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`${command} returned invalid JSON: ${error.message}`);
  }
}

function ghApiJson(endpoint, { allowNotFound = false } = {}) {
  const result = commandResult("gh", [
    "api",
    "-H",
    "Accept: application/vnd.github+json",
    endpoint,
  ]);
  if (result.status !== 0) {
    if (allowNotFound && /HTTP 404/.test(result.stderr)) return null;
    throw new Error(`GitHub API failed for ${endpoint}: ${result.stderr.trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`GitHub returned invalid JSON for ${endpoint}: ${error.message}`);
  }
}

function ghApiPages(endpoint) {
  const pages = commandJson("gh", [
    "api",
    "-H",
    "Accept: application/vnd.github+json",
    "--paginate",
    "--slurp",
    endpoint,
  ]);
  if (!Array.isArray(pages)) throw new Error(`GitHub pagination failed for ${endpoint}`);
  return pages.flatMap((page) => (Array.isArray(page) ? page : []));
}

function repositoryFile(repository, relativePath, revision) {
  const encodedPath = relativePath.split("/").map(encodeURIComponent).join("/");
  const response = ghApiJson(`repos/${repository}/contents/${encodedPath}?ref=${revision}`);
  if (
    response?.type !== "file" ||
    !/^[0-9a-f]{40}$/.test(response?.sha ?? "") ||
    response?.encoding !== "base64" ||
    typeof response?.content !== "string"
  ) {
    throw new Error(`${relativePath} is not an exact repository file at ${revision}`);
  }
  return {
    blobSha: response.sha,
    text: Buffer.from(response.content.replaceAll("\n", ""), "base64").toString("utf8"),
  };
}

function releasePleaseProvenance(repository, releaseOriginSha, expectedAppId) {
  const result = commandResult(process.execPath, [
    path.join(scriptDirectory, "verify-release-please-merge.mjs"),
    "--repository",
    repository,
    "--commit",
    releaseOriginSha,
    "--expected-app-id",
    expectedAppId,
    "--json",
  ]);
  if (result.status !== 0) {
    throw new Error(`release origin provenance failed: ${result.stderr.trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`release origin provenance returned invalid JSON: ${error.message}`);
  }
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

function parseReleaseVersion(packageText, manifestText) {
  let packageDocument;
  let manifestDocument;
  try {
    packageDocument = JSON.parse(packageText);
    manifestDocument = JSON.parse(manifestText);
  } catch (error) {
    throw new Error(`candidate release metadata is invalid JSON: ${error.message}`);
  }
  const version = packageDocument?.version;
  if (
    !/^\d+\.\d+\.\d+$/.test(version ?? "") ||
    Object.keys(manifestDocument ?? {}).length !== 1 ||
    manifestDocument?.["."] !== version
  ) {
    throw new Error("candidate package and manifest do not identify one exact release version");
  }
  const [major, minor] = version.split(".").map(Number);
  if (major === 0 && minor < 21) {
    throw new Error("pre-publication recovery supports only v0.21.0 and newer releases");
  }
  return version;
}

export function runCli(argv = process.argv.slice(2)) {
  const repository = argument(argv, "--repository");
  const releaseOriginSha = argument(argv, "--release-origin");
  const candidateSha = argument(argv, "--candidate");
  const expectedAppId = argument(argv, "--expected-app-id");
  const githubOutput = argv.includes("--github-output") ? process.env.GITHUB_OUTPUT : null;
  const jsonOutput = argv.includes("--json");
  const allowContainedCandidate = argv.includes("--allow-contained-candidate");
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? "") ||
    !/^[0-9a-f]{40}$/.test(releaseOriginSha ?? "") ||
    !/^[0-9a-f]{40}$/.test(candidateSha ?? "") ||
    !/^\d+$/.test(expectedAppId ?? "")
  ) {
    throw new Error(
      "Usage: verify-prepublication-release-recovery.mjs --repository <owner/repo> --release-origin <sha> --candidate <sha> --expected-app-id <id> [--allow-contained-candidate] [--github-output|--json]",
    );
  }

  const provenance = releasePleaseProvenance(repository, releaseOriginSha, expectedAppId);
  if (provenance.authorized !== true || !Number.isSafeInteger(provenance.pullRequest)) {
    throw new Error("release origin is not owned by one configured Release Please App PR");
  }
  const branch = ghApiJson(`repos/${repository}/branches/main`);
  const releasePullRequest = ghApiJson(`repos/${repository}/pulls/${provenance.pullRequest}`);
  const releasePullRequestFiles = ghApiPages(
    `repos/${repository}/pulls/${provenance.pullRequest}/files?per_page=100`,
  );
  const releasePullRequestValidateRuns = commandJson("gh", [
    "run",
    "list",
    "--repo",
    repository,
    "--workflow",
    "validate.yml",
    "--commit",
    releasePullRequest?.head?.sha,
    "--event",
    "pull_request",
    "--limit",
    "50",
    "--json",
    "databaseId,status,conclusion,event,headBranch,headSha,createdAt",
  ]);
  const comparison = ghApiJson(
    `repos/${repository}/compare/${releaseOriginSha}...${candidateSha}?per_page=100`,
  );
  const candidateContainmentComparison = allowContainedCandidate
    ? ghApiJson(`repos/${repository}/compare/${candidateSha}...${branch?.commit?.sha}`)
    : null;
  const validateRuns = commandJson("gh", [
    "run",
    "list",
    "--repo",
    repository,
    "--workflow",
    "validate.yml",
    "--commit",
    releaseOriginSha,
    "--branch",
    "main",
    "--limit",
    "50",
    "--json",
    "databaseId,status,conclusion,event,headBranch,headSha,createdAt",
  ]);
  const immutableFiles = PRE_PUBLICATION_RECOVERY_IMMUTABLE_PATHS.map((relativePath) => {
    const origin = repositoryFile(repository, relativePath, releaseOriginSha);
    const candidate = repositoryFile(repository, relativePath, candidateSha);
    return {
      path: relativePath,
      originBlobSha: origin.blobSha,
      candidateBlobSha: candidate.blobSha,
      candidateText: candidate.text,
    };
  });
  const candidatePackage = immutableFiles.find((file) => file.path === "package.json");
  const candidateManifest = immutableFiles.find(
    (file) => file.path === ".release-please-manifest.json",
  );
  const version = parseReleaseVersion(
    candidatePackage?.candidateText,
    candidateManifest?.candidateText,
  );
  const tag = `v${version}`;
  const release = ghApiJson(`repos/${repository}/releases/tags/${tag}`, {
    allowNotFound: true,
  });
  const tagReference = ghApiJson(`repos/${repository}/git/ref/tags/${tag}`, {
    allowNotFound: true,
  });
  const errors = prePublicationRecoveryErrors({
    releaseOriginSha,
    candidateSha,
    branch,
    comparison,
    candidateContainmentComparison,
    allowContainedCandidate,
    validateRuns,
    releasePullRequest,
    releasePullRequestFiles,
    releasePullRequestValidateRuns,
    immutableFiles,
    releaseExists: release !== null,
    tagExists: tagReference !== null,
  });
  if (errors.length > 0) {
    throw new Error(`pre-publication recovery failed: ${errors.join("; ")}`);
  }
  const originValidateRun = successfulMainValidateRun(validateRuns, releaseOriginSha);
  const result = {
    authorized: true,
    pullRequest: provenance.pullRequest,
    releaseOriginSha,
    candidateSha,
    originValidateRunId: originValidateRun.databaseId ?? originValidateRun.id,
    version,
    tag,
  };
  writeGithubOutput(githubOutput, {
    authorized: true,
    pull_request: result.pullRequest,
    release_origin_sha: result.releaseOriginSha,
    candidate_sha: result.candidateSha,
    origin_validate_run_id: result.originValidateRunId,
    version: result.version,
    tag: result.tag,
  });
  console.log(
    jsonOutput
      ? JSON.stringify(result)
      : `Pre-publication recovery authorized from PR #${result.pullRequest} at ${releaseOriginSha} to protected candidate ${candidateSha}; origin Validate run ${result.originValidateRunId}.`,
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
