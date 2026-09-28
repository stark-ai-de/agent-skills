#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import compare from "semver/functions/compare.js";
import valid from "semver/functions/valid.js";

import { pluginArtifactPaths } from "../lib/release-descriptor.mjs";
import { resolveTagCommit } from "../lib/github-release-reconciliation.mjs";
import {
  matchingOpenAiReleaseIssues,
  openAiReleaseIssueReference,
} from "../lib/openai-release-handoff.mjs";
import {
  automatedReleaseVersionSupported,
  FIRST_AUTOMATED_RELEASE_VERSION,
} from "../lib/release-please.mjs";
import { renderOpenAiSubmissionChecklist, openAiIssueMarker } from "../lib/openai-worksheet.mjs";
import { validateReleaseSubjectDocument } from "../lib/release-subject-validation.mjs";
import { RELEASE_SUBJECT_SCHEMA_PATH } from "../lib/release-subject.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ISSUE_TITLE = "Release OpenAI Plugin";
const ISSUE_MARKER_PATTERN =
  /^<!-- openai-plugin-release:([A-Za-z0-9_.-]+)@([0-9]+\.[0-9]+\.[0-9]+) -->$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function parseArgs(argv) {
  const mode = argv[0];
  const repository = argument(argv, "--repository");
  const tag = argument(argv, "--tag");
  const releaseSha = argument(argv, "--release-sha");
  if (!["plan", "apply"].includes(mode) || !repository || !tag || !releaseSha) {
    throw new Error(
      "Usage: reconcile-openai-plugin-issue.mjs <plan|apply> --repository <owner/repo> --tag <vX.Y.Z> --release-sha <sha> [--subject-file <file>] [--github-output <file>]",
    );
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error(`Invalid repository: ${repository}`);
  }
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`Invalid release tag: ${tag}`);
  if (!COMMIT_PATTERN.test(releaseSha)) {
    throw new Error("Release SHA must be a full lowercase 40-hex commit");
  }
  return {
    mode,
    repository,
    tag,
    releaseSha,
    releaseVersion: tag.slice(1),
    subjectFile: argument(argv, "--subject-file"),
    githubOutput: argument(argv, "--github-output"),
  };
}

function commandResult(command, args, { binary = false } = {}) {
  try {
    return execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: binary ? null : "utf8",
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = error.stderr?.toString("utf8") ?? "";
    throw new Error(`${command} ${args.join(" ")} failed: ${stderr.trim() || error.message}`);
  }
}

function ghJson(args) {
  const output = commandResult("gh", ["api", ...args]);
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`GitHub API returned invalid JSON: ${error.message}`);
  }
}

function ghBytes(args) {
  return commandResult("gh", ["api", ...args], { binary: true });
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
  } catch (error) {
    throw new Error(`Could not read release subject ${filePath}: ${error.message}`);
  }
}

function readJsonAtCommit(commit, relativePath) {
  try {
    return JSON.parse(commandResult("git", ["show", `${commit}:${relativePath}`]));
  } catch (error) {
    throw new Error(`Could not read ${relativePath} at release commit ${commit}: ${error.message}`);
  }
}

function readTagCommit(repository, tag) {
  const response = ghJson([`repos/${repository}/git/ref/tags/${encodeURIComponent(tag)}`]);
  const object = response?.object;
  const commit = resolveTagCommit(
    object,
    (tagObjectSha) => ghJson([`repos/${repository}/git/tags/${tagObjectSha}`]).object,
  );
  if (!COMMIT_PATTERN.test(commit ?? "")) {
    throw new Error(`Release tag ${tag} did not resolve to a commit SHA`);
  }
  return commit;
}

function releaseAsset(release, name) {
  const matches = Array.isArray(release?.assets)
    ? release.assets.filter((asset) => asset?.name === name)
    : [];
  if (matches.length !== 1) {
    throw new Error(`Release ${release?.tag_name ?? "(unknown)"} must contain exactly one ${name}`);
  }
  return matches[0];
}

function subjectFromRelease(repository, release) {
  const asset = releaseAsset(release, "release-subject.json");
  try {
    return JSON.parse(
      ghBytes([
        "-H",
        "Accept: application/octet-stream",
        `repos/${repository}/releases/assets/${asset.id}`,
      ]).toString("utf8"),
    );
  } catch (error) {
    throw new Error(
      `Could not read release-subject.json for ${release.tag_name}: ${error.message}`,
    );
  }
}

export function listAllIssues(repository, jsonRequest = ghJson) {
  const pages = jsonRequest([
    "--paginate",
    "--slurp",
    `repos/${repository}/issues?state=all&per_page=100`,
  ]);
  return pages.flatMap((page) => (Array.isArray(page) ? page : []));
}

export function listActivePublicationRuns(repository, jsonRequest = ghJson) {
  const pages = jsonRequest([
    "--paginate",
    "--slurp",
    `repos/${repository}/actions/workflows/publish-release.yml/runs?per_page=100`,
  ]);
  const activeStatuses = new Set(["queued", "in_progress", "waiting", "requested", "pending"]);
  return pages
    .flatMap((page) => (Array.isArray(page?.workflow_runs) ? page.workflow_runs : []))
    .filter((run) => activeStatuses.has(run?.status));
}

export function concurrentPublicationRuns(runs, currentRunId = process.env.GITHUB_RUN_ID ?? "") {
  return (Array.isArray(runs) ? runs : []).filter(
    (run) => String(run?.id ?? "") !== String(currentRunId) && run?.status !== "completed",
  );
}

function assertNoConcurrentPublication(
  repository,
  jsonRequest = ghJson,
  currentRunId = process.env.GITHUB_RUN_ID ?? "",
) {
  const active = concurrentPublicationRuns(
    listActivePublicationRuns(repository, jsonRequest),
    currentRunId,
  );
  if (active.length > 0) {
    const ids = active.map((run) => String(run.id)).join(", ");
    throw new Error(
      `Another publication or release retry is active (${ids}); retry after it completes`,
    );
  }
}

export function applyOpenAiReleasePlan(
  context,
  { jsonRequest = ghJson, currentRunId = process.env.GITHUB_RUN_ID ?? "" } = {},
) {
  const currentIssues = listAllIssues(context.repository, jsonRequest);
  const currentPlan = buildOpenAiReleasePlan({ ...context, issues: currentIssues });
  if (currentPlan.status === "noop") return currentPlan;

  assertNoConcurrentPublication(context.repository, jsonRequest, currentRunId);
  const created = jsonRequest([
    "--method",
    "POST",
    `repos/${context.repository}/issues`,
    "-f",
    `title=${currentPlan.title}`,
    "-f",
    `body=${currentPlan.body}`,
  ]);
  return {
    ...currentPlan,
    status: "created",
    issue: {
      number: created.number ?? null,
      url: created.html_url ?? null,
      state: created.state ?? "open",
    },
  };
}

function stableReleaseVersion(tag) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "")) return null;
  const version = tag.slice(1);
  return automatedReleaseVersionSupported(version) ? version : null;
}

export function selectPreviousPluginRelease(releases, currentReleaseVersion) {
  const eligible = (Array.isArray(releases) ? releases : [])
    .filter(
      (release) =>
        release?.draft !== true &&
        release?.prerelease !== true &&
        stableReleaseVersion(release?.tag_name) &&
        compare(release.tag_name.slice(1), currentReleaseVersion) < 0,
    )
    .sort((left, right) => compare(right.tag_name.slice(1), left.tag_name.slice(1)));
  return eligible[0] ?? null;
}

function assertPublicListing(listing) {
  const publisher = listing?.publisher;
  if (!publisher || typeof publisher !== "object" || Array.isArray(publisher)) {
    throw new Error("release listing must contain a public publisher object");
  }
  const privateFields = Object.keys(publisher).filter((key) => key !== "legalName");
  if (privateFields.length > 0) {
    throw new Error(
      `release listing contains private publisher fields: ${privateFields.join(", ")}`,
    );
  }
  if (typeof publisher.legalName !== "string" || !publisher.legalName.trim()) {
    throw new Error("release listing publisher.legalName is missing");
  }
}

function validateCurrentSubject(subject, options) {
  const errors = validateReleaseSubjectDocument(subject, {
    schemaPath: path.join(repositoryRoot, RELEASE_SUBJECT_SCHEMA_PATH),
    expected: {
      sourceRevision: options.releaseSha,
      sourceState: "clean",
      releaseVersion: options.releaseVersion,
      status: "pass",
    },
    validateSubjectFiles: false,
  });
  if (errors.length > 0) throw new Error(`Release subject is invalid: ${errors.join("; ")}`);
  if (!valid(subject.pluginVersion)) throw new Error("Release subject pluginVersion is invalid");
  return subject;
}

export function buildOpenAiReleasePlan({
  repository,
  tag,
  releaseSha,
  release,
  listing,
  subject,
  previousRelease,
  previousSubject,
  issues,
}) {
  assertPublicListing(listing);
  if (listing.plugin?.version !== subject.pluginVersion) {
    throw new Error("release subject pluginVersion does not match listing.plugin.version");
  }
  if (!valid(listing.plugin?.version)) throw new Error("listing.plugin.version is invalid");
  if (previousRelease && !previousSubject) {
    throw new Error(`Previous release ${previousRelease.tag_name} is missing release-subject.json`);
  }
  const previousVersion = previousSubject?.pluginVersion ?? null;
  if (previousVersion && !valid(previousVersion)) {
    throw new Error(`Previous release ${previousRelease.tag_name} has an invalid pluginVersion`);
  }
  if (previousVersion && compare(subject.pluginVersion, previousVersion) < 0) {
    throw new Error(`Plugin version decreased from ${previousVersion} to ${subject.pluginVersion}`);
  }
  const marker = openAiIssueMarker(listing.plugin.name, subject.pluginVersion);
  const existing = matchingOpenAiReleaseIssues(issues, marker)[0] ?? null;
  const pluginVersionChanged =
    !previousVersion || compare(subject.pluginVersion, previousVersion) !== 0;
  if (!pluginVersionChanged) {
    return {
      status: "noop",
      reason: "plugin_version_unchanged",
      pluginVersionChanged: false,
      marker,
      ...(existing ? { issue: openAiReleaseIssueReference(existing) } : {}),
    };
  }
  if (existing) {
    return {
      status: "noop",
      reason: "issue_already_exists",
      pluginVersionChanged: true,
      marker,
      issue: openAiReleaseIssueReference(existing),
    };
  }
  const openAi = releaseAsset(release, "openai.zip");
  if (typeof openAi.browser_download_url !== "string" || !openAi.browser_download_url) {
    throw new Error("published openai.zip is missing a direct browser download URL");
  }
  const openAiSha256 = subject.subjects?.openai?.sha256;
  if (!SHA256_PATTERN.test(openAiSha256 ?? "")) {
    throw new Error("release subject is missing a valid openai.zip SHA-256");
  }
  if (openAi.digest && openAi.digest !== `sha256:${openAiSha256}`) {
    throw new Error("published openai.zip digest does not match release-subject.json");
  }
  const releaseUrl = release.html_url ?? `https://github.com/${repository}/releases/tag/${tag}`;
  const body = renderOpenAiSubmissionChecklist(listing, {
    repository,
    tag,
    releaseSha,
    releaseUrl,
    openaiAssetUrl: openAi.browser_download_url,
    openaiSha256: openAiSha256,
    firstPublicationUrl: `https://github.com/${repository}/blob/${releaseSha}/docs/listing/openai/${listing.plugin.name}-first-publication.md#composer-icon-handoff`,
  });
  return {
    status: "create",
    reason: previousVersion ? "plugin_version_changed" : "first_automated_plugin_release",
    pluginVersionChanged: true,
    marker,
    title: ISSUE_TITLE,
    body,
    pluginVersion: subject.pluginVersion,
    releaseUrl,
    assetUrl: openAi.browser_download_url,
  };
}

function readCurrentContext(options) {
  const listingPath = pluginArtifactPaths(process.cwd()).listing;
  const listing = readJsonAtCommit(options.releaseSha, listingPath);
  const tagCommit = readTagCommit(options.repository, options.tag);
  if (tagCommit !== options.releaseSha) {
    throw new Error(`release tag ${options.tag} does not point to ${options.releaseSha}`);
  }
  const releasesPages = ghJson([
    "--paginate",
    "--slurp",
    `repos/${options.repository}/releases?per_page=100`,
  ]);
  const releases = releasesPages.flatMap((page) => (Array.isArray(page) ? page : []));
  const matching = releases.filter((release) => release?.tag_name === options.tag);
  if (matching.length !== 1)
    throw new Error(`Expected exactly one published release for ${options.tag}`);
  const release = matching[0];
  if (release.draft === true || release.prerelease === true) {
    throw new Error(`Release ${options.tag} is not a stable published release`);
  }
  const subject = validateCurrentSubject(
    options.subjectFile
      ? readJsonFile(options.subjectFile)
      : subjectFromRelease(options.repository, release),
    options,
  );
  const previousRelease = selectPreviousPluginRelease(releases, options.releaseVersion);
  const previousSubject = previousRelease
    ? subjectFromRelease(options.repository, previousRelease)
    : null;
  return {
    repository: options.repository,
    tag: options.tag,
    releaseSha: options.releaseSha,
    release,
    listing,
    subject,
    previousRelease,
    previousSubject,
    issues: listAllIssues(options.repository),
  };
}

function appendGithubOutput(filePath, result) {
  if (!filePath) return;
  fs.appendFileSync(
    path.resolve(filePath),
    [
      `status=${result.status}`,
      `reason=${result.reason}`,
      `plugin_version_changed=${result.pluginVersionChanged === true ? "true" : "false"}`,
      `marker=${result.marker}`,
      `issue_url=${result.issue?.url ?? ""}`,
      `issue_state=${result.issue?.state ?? ""}`,
    ].join("\n") + "\n",
  );
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const context = readCurrentContext(options);
  const plan = buildOpenAiReleasePlan(context);
  if (options.mode === "plan" || plan.status === "noop") {
    appendGithubOutput(options.githubOutput, plan);
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }
  const result = applyOpenAiReleasePlan(context);
  appendGithubOutput(options.githubOutput, result);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    runCli();
  } catch (error) {
    console.error(`OpenAI plugin issue reconciliation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

export { ISSUE_TITLE, ISSUE_MARKER_PATTERN, FIRST_AUTOMATED_RELEASE_VERSION };
