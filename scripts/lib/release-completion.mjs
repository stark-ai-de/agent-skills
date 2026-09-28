import {
  evidenceRunCoversRelease,
  postReleaseEvidenceTitle,
  releaseStateChangedAt,
  selectPostReleaseEvidenceRun,
} from "./post-release-evidence.mjs";
import { matchingOpenAiReleaseIssues } from "./openai-release-handoff.mjs";

export const RELEASE_COMPLETION_ASSETS = Object.freeze([
  "openai.zip",
  "portable.zip",
  "release-subject.json",
]);
export const RELEASE_COMPLETION_MAX_WAIT_MS = 10 * 60 * 1000;
export const RELEASE_COMPLETION_POLL_INTERVAL_MS = 15 * 1000;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const ISSUE_MARKER_PATTERN =
  /^<!-- openai-plugin-release:([A-Za-z0-9_.-]+)@([0-9]+\.[0-9]+\.[0-9]+) -->$/;
const ACTIVE_EVIDENCE_STATUSES = new Set([
  "queued",
  "waiting",
  "requested",
  "pending",
  "in_progress",
]);

function failure(reason, message, details = {}) {
  return { status: "failure", reason, message, ...details };
}

function pending(reason, message, details = {}) {
  return { status: "pending", reason, message, ...details };
}

function normalizedEvidenceRun(run) {
  if (!run) return null;
  return {
    id: run.id ?? run.databaseId ?? null,
    displayTitle: run.displayTitle ?? run.display_title ?? null,
    event: run.event ?? null,
    headBranch: run.headBranch ?? run.head_branch ?? null,
    status: run.status ?? null,
    conclusion: run.conclusion ?? null,
    createdAt: run.createdAt ?? run.created_at ?? null,
    url: run.html_url ?? run.url ?? null,
  };
}

function releaseAssetMap(release) {
  return new Map(
    (Array.isArray(release?.assets) ? release.assets : []).map((asset) => [asset?.name, asset]),
  );
}

function validateExpected(expected) {
  if (!expected || typeof expected !== "object")
    return "release completion expectations are missing";
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(expected.repository ?? "")) {
    return "release completion repository is invalid";
  }
  if (!/^v\d+\.\d+\.\d+$/.test(expected.tag ?? "")) {
    return "release completion tag is invalid";
  }
  if (!COMMIT_PATTERN.test(expected.releaseSha ?? "")) {
    return "release completion SHA is invalid";
  }
  if (!/^\d+$/.test(String(expected.releasePullRequest ?? ""))) {
    return "release completion pull request is invalid";
  }
  return null;
}

function validateReleaseIdentity(observation, expected) {
  const release = observation?.release;
  if (!release || release.tag_name !== expected.tag) {
    return failure("latest_release_mismatch", `${expected.tag} is not the stable latest release`);
  }
  if (release.draft !== false || release.prerelease !== false) {
    return failure("latest_release_not_stable", `${expected.tag} is draft or prerelease`);
  }
  if (observation?.tag?.annotated !== true) {
    return failure("release_tag_not_annotated", `${expected.tag} is not an annotated tag`);
  }
  if (observation?.tag?.commit !== expected.releaseSha) {
    return failure(
      "release_tag_commit_mismatch",
      `${expected.tag} does not resolve to ${expected.releaseSha}`,
    );
  }

  const assetNames = (Array.isArray(release.assets) ? release.assets : [])
    .map((asset) => asset?.name)
    .filter(Boolean)
    .sort();
  const required = [...RELEASE_COMPLETION_ASSETS].sort();
  if (JSON.stringify(assetNames) !== JSON.stringify(required)) {
    return failure(
      "release_asset_set_mismatch",
      `${expected.tag} must contain exactly ${required.join(", ")}`,
      { assetNames },
    );
  }

  const subject = observation?.subject;
  if (
    subject?.status !== "pass" ||
    subject?.sourceRevision?.commit !== expected.releaseSha ||
    subject?.sourceRevision?.state !== "clean" ||
    subject?.releaseVersion !== expected.tag.slice(1)
  ) {
    return failure(
      "release_subject_identity_mismatch",
      "release-subject.json does not match the published release identity",
    );
  }

  const assets = releaseAssetMap(release);
  const hashes = {};
  for (const [subjectKey, assetName] of [
    ["openai", "openai.zip"],
    ["portable", "portable.zip"],
  ]) {
    const asset = assets.get(assetName);
    const expectedSubject = subject.subjects?.[subjectKey];
    if (
      expectedSubject?.name !== assetName ||
      !SHA256_PATTERN.test(expectedSubject?.sha256 ?? "") ||
      !Number.isInteger(expectedSubject?.bytes) ||
      expectedSubject.bytes < 1
    ) {
      return failure(
        "release_subject_asset_invalid",
        `release-subject.json has no valid ${assetName} identity`,
      );
    }
    if (asset?.size !== expectedSubject.bytes) {
      return failure("release_asset_size_mismatch", `${assetName} size does not match the subject`);
    }
    const digest =
      /^sha256:([a-f0-9]{64})$/.exec(asset?.digest ?? "")?.[1] ?? asset?.observed_sha256;
    if (digest !== expectedSubject.sha256) {
      return failure(
        "release_asset_digest_mismatch",
        `${assetName} SHA-256 does not match release-subject.json`,
      );
    }
    hashes[assetName] = expectedSubject.sha256;
  }

  const stateChangedAt = releaseStateChangedAt(release, RELEASE_COMPLETION_ASSETS);
  if (!stateChangedAt) {
    return failure(
      "release_state_watermark_missing",
      "the release or one of its required assets has no usable mutation timestamp",
    );
  }
  return { status: "success", hashes, stateChangedAt };
}

function validateReleasePullRequest(observation) {
  const pullRequest = observation?.pullRequest;
  const labels = new Set(
    (Array.isArray(pullRequest?.labels) ? pullRequest.labels : [])
      .map((label) => (typeof label === "string" ? label : label?.name))
      .filter(Boolean),
  );
  if (!labels.has("autorelease: tagged") || labels.has("autorelease: pending")) {
    return failure(
      "release_pull_request_labels_incomplete",
      "the release PR must have autorelease: tagged and no autorelease: pending label",
    );
  }
  return { status: "success", pullRequestUrl: pullRequest?.html_url ?? null };
}

function validateHandoff(observation, expected) {
  const handoff = expected?.handoff;
  const markerMatch = ISSUE_MARKER_PATTERN.exec(handoff?.marker ?? "");
  if (!handoff || !markerMatch) {
    return failure("openai_handoff_invalid", "the OpenAI handoff marker is invalid");
  }
  if (markerMatch[2] !== observation?.subject?.pluginVersion) {
    return failure(
      "openai_handoff_invalid",
      "the OpenAI handoff marker does not match the published plugin version",
    );
  }
  if (typeof handoff.pluginVersionChanged !== "boolean") {
    return failure("openai_handoff_invalid", "the OpenAI handoff plugin-version result is missing");
  }

  const matches = matchingOpenAiReleaseIssues(observation?.issues, handoff.marker);
  if (matches.length > 1) {
    return failure(
      "openai_handoff_duplicate",
      `multiple trusted OpenAI handoff issues use ${handoff.marker}`,
    );
  }
  const issue = matches[0] ?? null;
  const issueUrl = issue?.html_url ?? null;
  const issueState = issue?.state ?? null;

  if (handoff.pluginVersionChanged === false) {
    if (handoff.status !== "noop" || handoff.reason !== "plugin_version_unchanged") {
      return failure(
        "openai_handoff_semantics_mismatch",
        "an unchanged plugin must report noop/plugin_version_unchanged",
      );
    }
  } else if (handoff.status === "noop" && handoff.reason === "issue_already_exists" && issue) {
    // A retry found the one already-created handoff issue.
  } else if (
    handoff.status === "created" &&
    ["plugin_version_changed", "first_automated_plugin_release"].includes(handoff.reason) &&
    issue
  ) {
    // The publish job created the one required handoff issue.
  } else {
    return failure(
      "openai_handoff_semantics_mismatch",
      "a changed plugin must create or reuse exactly one trusted handoff issue",
    );
  }

  if ((handoff.issueUrl || null) !== issueUrl || (handoff.issueState || null) !== issueState) {
    return failure(
      "openai_handoff_reference_mismatch",
      "the handoff outputs do not match the observed issue reference",
    );
  }
  return {
    status: "success",
    handoffReason: handoff.reason,
    pluginVersionChanged: handoff.pluginVersionChanged,
    issue: issue ? { number: issue.number ?? null, url: issueUrl, state: issueState } : null,
  };
}

function validateEvidence(observation, expected, stateChangedAt) {
  const runs = (Array.isArray(observation?.evidenceRuns) ? observation.evidenceRuns : [])
    .map(normalizedEvidenceRun)
    .filter(Boolean);
  const evidence = selectPostReleaseEvidenceRun(runs, expected.tag);
  if (!evidence) {
    return pending(
      "post_release_evidence_not_visible",
      `${postReleaseEvidenceTitle(expected.tag)} is not visible yet`,
    );
  }
  if (!evidenceRunCoversRelease(evidence, stateChangedAt)) {
    return pending(
      "post_release_evidence_stale",
      `${postReleaseEvidenceTitle(expected.tag)} predates the latest release mutation`,
      { evidence },
    );
  }
  if (ACTIVE_EVIDENCE_STATUSES.has(evidence.status)) {
    return pending(
      "post_release_evidence_running",
      `${postReleaseEvidenceTitle(expected.tag)} is ${evidence.status}`,
      { evidence },
    );
  }
  if (evidence.status !== "completed" || evidence.conclusion !== "success") {
    return failure(
      "post_release_evidence_failed",
      `${postReleaseEvidenceTitle(expected.tag)} completed without success`,
      { evidence },
    );
  }
  return { status: "success", evidence };
}

export function evaluateReleaseCompletion(observation, expected) {
  const expectedError = validateExpected(expected);
  if (expectedError) return failure("invalid_expectations", expectedError);

  const release = validateReleaseIdentity(observation, expected);
  if (release.status !== "success") return release;
  const pullRequest = validateReleasePullRequest(observation);
  if (pullRequest.status !== "success") return pullRequest;
  const handoff = validateHandoff(observation, expected);
  if (handoff.status !== "success") return handoff;
  const evidence = validateEvidence(observation, expected, release.stateChangedAt);
  if (evidence.status !== "success") {
    return {
      ...evidence,
      releaseUrl: observation.release?.html_url ?? null,
      hashes: release.hashes,
      handoffReason: handoff.handoffReason,
      issue: handoff.issue,
    };
  }

  return {
    status: "success",
    reason: "release_complete",
    releaseUrl: observation.release?.html_url ?? null,
    releaseSha: expected.releaseSha,
    tag: expected.tag,
    hashes: release.hashes,
    evidence: evidence.evidence,
    pullRequestUrl: pullRequest.pullRequestUrl,
    handoffReason: handoff.handoffReason,
    pluginVersionChanged: handoff.pluginVersionChanged,
    issue: handoff.issue,
  };
}

export class ReleaseCompletionError extends Error {
  constructor(result) {
    super(result.message);
    this.name = "ReleaseCompletionError";
    this.result = result;
  }
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForReleaseCompletion({
  observe,
  expected,
  maxWaitMs = RELEASE_COMPLETION_MAX_WAIT_MS,
  pollIntervalMs = RELEASE_COMPLETION_POLL_INTERVAL_MS,
  sleep = defaultSleep,
  now = Date.now,
  onPoll = () => {},
}) {
  if (typeof observe !== "function") throw new Error("release completion requires an observer");
  if (!Number.isInteger(maxWaitMs) || maxWaitMs < 1) {
    throw new Error("release completion maxWaitMs must be a positive integer");
  }
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 1) {
    throw new Error("release completion pollIntervalMs must be a positive integer");
  }

  const startedAt = now();
  while (true) {
    const result = evaluateReleaseCompletion(await observe(), expected);
    onPoll(result);
    if (result.status === "success") return result;
    if (result.status === "failure") throw new ReleaseCompletionError(result);

    const elapsed = now() - startedAt;
    if (elapsed >= maxWaitMs) {
      throw new ReleaseCompletionError({
        ...result,
        status: "failure",
        reason: "post_release_evidence_timeout",
        message: `Post-release Evidence did not succeed within ${Math.ceil(maxWaitMs / 1000)} seconds`,
      });
    }
    await sleep(Math.min(pollIntervalMs, maxWaitMs - elapsed));
  }
}
