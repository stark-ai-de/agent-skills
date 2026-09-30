#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { resolveTagCommit } from "../lib/github-release-reconciliation.mjs";
import {
  RELEASE_COMPLETION_MAX_WAIT_MS,
  RELEASE_COMPLETION_POLL_INTERVAL_MS,
  ReleaseCompletionError,
  waitForReleaseCompletion,
} from "../lib/release-completion.mjs";

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function integerArgument(argv, name, fallback) {
  const raw = argument(argv, name);
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw) || Number(raw) < 1) throw new Error(`${name} must be a positive integer`);
  return Number(raw);
}

function parseArgs(argv) {
  const pluginVersionChanged = argument(argv, "--plugin-version-changed");
  const options = {
    repository: argument(argv, "--repository"),
    tag: argument(argv, "--tag"),
    releaseSha: argument(argv, "--release-sha"),
    releasePullRequest: argument(argv, "--release-pr"),
    handoff: {
      status: argument(argv, "--handoff-status"),
      reason: argument(argv, "--handoff-reason"),
      pluginVersionChanged:
        pluginVersionChanged === "true" ? true : pluginVersionChanged === "false" ? false : null,
      issueUrl: argument(argv, "--issue-url"),
      issueState: argument(argv, "--issue-state"),
      marker: argument(argv, "--marker"),
    },
    summaryFile: argument(argv, "--summary-file") ?? process.env.GITHUB_STEP_SUMMARY ?? null,
    maxWaitMs:
      integerArgument(argv, "--max-wait-seconds", RELEASE_COMPLETION_MAX_WAIT_MS / 1000) * 1000,
    pollIntervalMs:
      integerArgument(argv, "--poll-interval-seconds", RELEASE_COMPLETION_POLL_INTERVAL_MS / 1000) *
      1000,
  };
  if (
    !options.repository ||
    !options.tag ||
    !options.releaseSha ||
    !options.releasePullRequest ||
    !options.handoff.status ||
    !options.handoff.reason ||
    options.handoff.pluginVersionChanged === null ||
    !options.handoff.marker
  ) {
    throw new Error(
      "Usage: verify-release-completion.mjs --repository <owner/repo> --tag <vX.Y.Z> --release-sha <sha> --release-pr <number> --handoff-status <status> --handoff-reason <reason> --plugin-version-changed <true|false> --marker <marker> [--issue-url <url>] [--issue-state <state>] [--max-wait-seconds 600] [--poll-interval-seconds 15] [--summary-file <file>]",
    );
  }
  return options;
}

function defaultExecute(command, args, { binary = false } = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: binary ? null : "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function createGithubReadTransport(execute = defaultExecute) {
  function request(endpoint, { binary = false, paginate = false } = {}) {
    const args = ["api", "--method", "GET"];
    if (paginate) args.push("--paginate", "--slurp");
    if (binary) args.push("-H", "Accept: application/octet-stream");
    args.push(endpoint);
    try {
      return execute("gh", args, { binary });
    } catch (error) {
      const stderr = error.stderr?.toString("utf8") ?? "";
      throw new Error(`GitHub GET ${endpoint} failed: ${stderr.trim() || error.message}`);
    }
  }

  return {
    getJson(endpoint, options = {}) {
      const output = request(endpoint, options);
      try {
        return JSON.parse(output.toString("utf8"));
      } catch (error) {
        throw new Error(`GitHub GET ${endpoint} returned invalid JSON: ${error.message}`);
      }
    },
    getBytes(endpoint) {
      const output = request(endpoint, { binary: true });
      return Buffer.isBuffer(output) ? output : Buffer.from(output);
    },
  };
}

function flattenPages(pages) {
  return (Array.isArray(pages) ? pages : []).flatMap((page) => (Array.isArray(page) ? page : []));
}

function workflowRuns(pages) {
  return (Array.isArray(pages) ? pages : []).flatMap((page) =>
    Array.isArray(page?.workflow_runs) ? page.workflow_runs : [],
  );
}

function releaseAsset(assets, name) {
  const matches = assets.filter((asset) => asset?.name === name);
  return matches.length === 1 ? matches[0] : null;
}

export function collectReleaseCompletionObservation(expected, transport) {
  const release = transport.getJson(`repos/${expected.repository}/releases/latest`);
  const assetPages = Number.isInteger(release?.id)
    ? transport.getJson(`repos/${expected.repository}/releases/${release.id}/assets?per_page=100`, {
        paginate: true,
      })
    : [];
  const assets = flattenPages(assetPages).map((asset) => ({ ...asset }));
  for (const name of ["openai.zip", "portable.zip"]) {
    const asset = releaseAsset(assets, name);
    if (asset && !/^sha256:[a-f0-9]{64}$/.test(asset.digest ?? "")) {
      const bytes = transport.getBytes(`repos/${expected.repository}/releases/assets/${asset.id}`);
      asset.observed_sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
      asset.size = bytes.length;
    }
  }

  const subjectAsset = releaseAsset(assets, "release-subject.json");
  let subject = null;
  if (subjectAsset) {
    const subjectBytes = transport.getBytes(
      `repos/${expected.repository}/releases/assets/${subjectAsset.id}`,
    );
    try {
      subject = JSON.parse(subjectBytes.toString("utf8"));
    } catch (error) {
      throw new Error(`release-subject.json is invalid JSON: ${error.message}`);
    }
  }

  const tagReference = transport.getJson(
    `repos/${expected.repository}/git/ref/tags/${encodeURIComponent(expected.tag)}`,
  );
  const initialTagObject = tagReference?.object;
  const tag = {
    annotated: initialTagObject?.type === "tag",
    commit: resolveTagCommit(
      initialTagObject,
      (tagObjectSha) =>
        transport.getJson(`repos/${expected.repository}/git/tags/${tagObjectSha}`).object,
    ),
  };

  const evidencePages = transport.getJson(
    `repos/${expected.repository}/actions/workflows/post-release-evidence.yml/runs?event=workflow_dispatch&branch=main&per_page=100`,
    { paginate: true },
  );
  const pullRequest = transport.getJson(
    `repos/${expected.repository}/issues/${expected.releasePullRequest}`,
  );
  const issuePages = transport.getJson(
    `repos/${expected.repository}/issues?state=all&per_page=100`,
    { paginate: true },
  );

  return {
    release: { ...release, assets },
    subject,
    tag,
    evidenceRuns: workflowRuns(evidencePages),
    pullRequest,
    issues: flattenPages(issuePages),
  };
}

function link(label, url) {
  return url ? `[${label}](${url})` : label;
}

export function renderReleaseCompletionSummary(
  result,
  expected,
  runId = process.env.GITHUB_RUN_ID,
) {
  const succeeded = result.status === "success";
  const nextAction = succeeded
    ? result.pluginVersionChanged
      ? `Complete the manual OpenAI checklist in ${link("the handoff issue", result.issue?.url)}.`
      : "Review this report; no OpenAI portal action is required because the plugin version is unchanged."
    : `Correct or retry Post-release Evidence as needed, then rerun only failed jobs with \`gh run rerun ${runId || "<run-id>"} --failed\`.`;
  const lines = [
    `# ${succeeded ? "✅" : "❌"} Release completion`,
    "",
    succeeded
      ? "The published GitHub Release and its post-release evidence are complete."
      : "The GitHub Release may already be published; this read-only completion check did not pass.",
    "",
    `- Result: \`${result.reason}\``,
    `- Release: ${link(expected.tag, result.releaseUrl)}`,
    `- Commit: \`${expected.releaseSha}\``,
    `- OpenAI SHA-256: \`${result.hashes?.["openai.zip"] ?? "unavailable"}\``,
    `- Portable SHA-256: \`${result.hashes?.["portable.zip"] ?? "unavailable"}\``,
    `- Evidence: ${link(result.evidence?.displayTitle ?? "not successful", result.evidence?.url)}`,
    `- Release PR: ${link(`#${expected.releasePullRequest}`, result.pullRequestUrl)}`,
    `- OpenAI handoff: \`${result.handoffReason ?? expected.handoff.reason}\``,
    `- OpenAI issue: ${result.issue ? link(`#${result.issue.number}`, result.issue.url) : "none"}`,
    `- **Next action:** ${nextAction}`,
    "",
  ];
  if (!succeeded && result.message) lines.splice(4, 0, `- Detail: ${result.message}`);
  return lines.join("\n");
}

function writeSummary(filePath, markdown) {
  if (!filePath) return;
  fs.appendFileSync(path.resolve(filePath), markdown);
}

export async function runCli(argv = process.argv.slice(2), dependencies = {}) {
  const options = parseArgs(argv);
  const transport = dependencies.transport ?? createGithubReadTransport();
  const expected = {
    repository: options.repository,
    tag: options.tag,
    releaseSha: options.releaseSha,
    releasePullRequest: options.releasePullRequest,
    handoff: options.handoff,
  };
  try {
    const result = await waitForReleaseCompletion({
      observe: () => collectReleaseCompletionObservation(expected, transport),
      expected,
      maxWaitMs: options.maxWaitMs,
      pollIntervalMs: options.pollIntervalMs,
      sleep: dependencies.sleep,
      now: dependencies.now,
      onPoll:
        dependencies.onPoll ??
        ((current) => {
          if (current.status === "pending") {
            console.log(`Waiting: ${current.reason} (${current.message})`);
          }
        }),
    });
    writeSummary(options.summaryFile, renderReleaseCompletionSummary(result, expected));
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    const result =
      error instanceof ReleaseCompletionError
        ? error.result
        : {
            status: "failure",
            reason: "release_completion_observation_failed",
            message: error.message,
          };
    writeSummary(options.summaryFile, renderReleaseCompletionSummary(result, expected));
    throw new ReleaseCompletionError(result);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    await runCli();
  } catch (error) {
    console.error(`Release completion failed: ${error.message}`);
    process.exitCode = 1;
  }
}
