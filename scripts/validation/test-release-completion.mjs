import assert from "node:assert/strict";

import {
  evaluateReleaseCompletion,
  ReleaseCompletionError,
  waitForReleaseCompletion,
} from "../lib/release-completion.mjs";
import {
  collectReleaseCompletionObservation,
  createGithubReadTransport,
  renderReleaseCompletionSummary,
} from "../release/verify-release-completion.mjs";

const releaseSha = "a".repeat(40);
const openAiSha = "b".repeat(64);
const portableSha = "c".repeat(64);
const marker = "<!-- openai-plugin-release:stark-ai-developer@1.7.1 -->";
const tag = "v0.25.2";
const evidenceTitle = `Post-release Evidence · ${tag}`;

const expected = {
  repository: "example/example",
  tag,
  releaseSha,
  releasePullRequest: "120",
  handoff: {
    status: "noop",
    reason: "plugin_version_unchanged",
    pluginVersionChanged: false,
    issueUrl: null,
    issueState: null,
    marker,
  },
};

function releaseAssets() {
  return [
    {
      id: 1,
      name: "openai.zip",
      size: 10,
      digest: `sha256:${openAiSha}`,
      created_at: "2026-09-28T00:00:20Z",
      updated_at: "2026-09-28T00:00:20Z",
    },
    {
      id: 2,
      name: "portable.zip",
      size: 20,
      digest: `sha256:${portableSha}`,
      created_at: "2026-09-28T00:00:21Z",
      updated_at: "2026-09-28T00:00:21Z",
    },
    {
      id: 3,
      name: "release-subject.json",
      size: 300,
      created_at: "2026-09-28T00:00:22Z",
      updated_at: "2026-09-28T00:00:22Z",
    },
  ];
}

function subject() {
  return {
    status: "pass",
    sourceRevision: { commit: releaseSha, state: "clean" },
    releaseVersion: tag.slice(1),
    pluginVersion: "1.7.1",
    subjects: {
      openai: { name: "openai.zip", sha256: openAiSha, bytes: 10 },
      portable: { name: "portable.zip", sha256: portableSha, bytes: 20 },
    },
  };
}

function evidence(
  status = "completed",
  conclusion = "success",
  createdAt = "2026-09-28T00:01:00Z",
) {
  return {
    id: 44,
    display_title: evidenceTitle,
    event: "workflow_dispatch",
    head_branch: "main",
    status,
    conclusion,
    created_at: createdAt,
    html_url: "https://github.com/example/example/actions/runs/44",
  };
}

function observation() {
  return {
    release: {
      id: 25,
      tag_name: tag,
      draft: false,
      prerelease: false,
      html_url: `https://github.com/example/example/releases/tag/${tag}`,
      created_at: "2026-09-28T00:00:00Z",
      published_at: "2026-09-28T00:00:10Z",
      updated_at: "2026-09-28T00:00:22Z",
      assets: releaseAssets(),
    },
    subject: subject(),
    tag: { annotated: true, commit: releaseSha },
    evidenceRuns: [evidence()],
    pullRequest: {
      html_url: "https://github.com/example/example/pull/120",
      labels: [{ name: "autorelease: tagged" }],
    },
    issues: [],
  };
}

assert.equal(evaluateReleaseCompletion(observation(), expected).status, "success");

for (const state of ["open", "closed"]) {
  const fixture = observation();
  const issue = {
    number: 114,
    state,
    html_url: "https://github.com/example/example/issues/114",
    user: { type: "Bot" },
    body: `${marker}\n\nmanual state`,
  };
  fixture.issues = [issue];
  const result = evaluateReleaseCompletion(fixture, {
    ...expected,
    handoff: { ...expected.handoff, issueUrl: issue.html_url, issueState: state },
  });
  assert.equal(result.status, "success", `unchanged plugin with ${state} issue must pass`);
  assert.equal(result.issue.state, state);
}

for (const handoff of [
  { status: "created", reason: "plugin_version_changed" },
  { status: "noop", reason: "issue_already_exists" },
]) {
  const fixture = observation();
  const issue = {
    number: 121,
    state: "open",
    html_url: "https://github.com/example/example/issues/121",
    user: { type: "User", login: "servrox" },
    body: `${marker}\n\nnew handoff`,
  };
  fixture.issues = [issue];
  const result = evaluateReleaseCompletion(fixture, {
    ...expected,
    handoff: {
      ...handoff,
      pluginVersionChanged: true,
      issueUrl: issue.html_url,
      issueState: issue.state,
      marker,
    },
  });
  assert.equal(result.status, "success", `${handoff.status}/${handoff.reason} must pass`);
}

const missingEvidence = observation();
missingEvidence.evidenceRuns = [];
assert.equal(
  evaluateReleaseCompletion(missingEvidence, expected).reason,
  "post_release_evidence_not_visible",
);
for (const status of ["queued", "in_progress"]) {
  const fixture = observation();
  fixture.evidenceRuns = [evidence(status, null)];
  const result = evaluateReleaseCompletion(fixture, expected);
  assert.equal(result.status, "pending");
  assert.equal(result.reason, "post_release_evidence_running");
}
const failedEvidence = observation();
failedEvidence.evidenceRuns = [evidence("completed", "failure")];
assert.equal(
  evaluateReleaseCompletion(failedEvidence, expected).reason,
  "post_release_evidence_failed",
);
const staleEvidence = observation();
staleEvidence.evidenceRuns = [evidence("completed", "success", "2026-09-28T00:00:15Z")];
assert.equal(
  evaluateReleaseCompletion(staleEvidence, expected).reason,
  "post_release_evidence_stale",
);

for (const [mutate, reason] of [
  [(fixture) => (fixture.tag.commit = "d".repeat(40)), "release_tag_commit_mismatch"],
  [(fixture) => (fixture.tag.annotated = false), "release_tag_not_annotated"],
  [(fixture) => fixture.release.assets.pop(), "release_asset_set_mismatch"],
  [
    (fixture) =>
      fixture.release.assets.push({ ...fixture.release.assets[0], id: 9, name: "extra.zip" }),
    "release_asset_set_mismatch",
  ],
  [
    (fixture) => (fixture.release.assets[0].digest = `sha256:${"d".repeat(64)}`),
    "release_asset_digest_mismatch",
  ],
  [
    (fixture) => fixture.pullRequest.labels.push({ name: "autorelease: pending" }),
    "release_pull_request_labels_incomplete",
  ],
  [(fixture) => (fixture.pullRequest.labels = []), "release_pull_request_labels_incomplete"],
]) {
  const fixture = observation();
  mutate(fixture);
  assert.equal(evaluateReleaseCompletion(fixture, expected).reason, reason);
}

const wrongMarker = {
  ...expected,
  handoff: {
    ...expected.handoff,
    marker: "<!-- openai-plugin-release:stark-ai-developer@9.9.9 -->",
  },
};
assert.equal(
  evaluateReleaseCompletion(observation(), wrongMarker).reason,
  "openai_handoff_invalid",
);

const duplicateIssue = observation();
duplicateIssue.issues = [1, 2].map((number) => ({
  number,
  state: "open",
  html_url: `https://github.com/example/example/issues/${number}`,
  user: { type: "Bot" },
  body: marker,
}));
assert.equal(
  evaluateReleaseCompletion(duplicateIssue, expected).reason,
  "openai_handoff_duplicate",
);

let clock = 0;
await assert.rejects(
  waitForReleaseCompletion({
    observe: () => missingEvidence,
    expected,
    maxWaitMs: 30,
    pollIntervalMs: 15,
    now: () => clock,
    sleep: async (milliseconds) => {
      clock += milliseconds;
    },
  }),
  (error) =>
    error instanceof ReleaseCompletionError &&
    error.result.reason === "post_release_evidence_timeout",
);

const requestArgs = [];
const transportFixture = observation();
const tagObjectSha = "d".repeat(40);
const fakeExecute = (_command, args, { binary } = {}) => {
  requestArgs.push(args);
  const endpoint = args.at(-1);
  let value;
  if (endpoint === "repos/example/example/releases/latest") value = transportFixture.release;
  else if (endpoint === "repos/example/example/releases/25/assets?per_page=100") {
    value = [transportFixture.release.assets];
  } else if (endpoint === "repos/example/example/releases/assets/3") {
    return Buffer.from(JSON.stringify(transportFixture.subject));
  } else if (endpoint === `repos/example/example/git/ref/tags/${tag}`) {
    value = { object: { type: "tag", sha: tagObjectSha } };
  } else if (endpoint === `repos/example/example/git/tags/${tagObjectSha}`) {
    value = { object: { type: "commit", sha: releaseSha } };
  } else if (endpoint.includes("actions/workflows/post-release-evidence.yml/runs?")) {
    value = [{ workflow_runs: transportFixture.evidenceRuns }];
  } else if (endpoint === "repos/example/example/issues/120") {
    value = transportFixture.pullRequest;
  } else if (endpoint === "repos/example/example/issues?state=all&per_page=100") value = [[]];
  else throw new Error(`unexpected endpoint ${endpoint}`);
  const serialized = JSON.stringify(value);
  return binary ? Buffer.from(serialized) : serialized;
};
const collected = collectReleaseCompletionObservation(
  expected,
  createGithubReadTransport(fakeExecute),
);
assert.equal(evaluateReleaseCompletion(collected, expected).status, "success");
assert.ok(requestArgs.length > 0);
for (const args of requestArgs) {
  assert.equal(args[args.indexOf("--method") + 1], "GET");
  assert.ok(!args.includes("POST") && !args.includes("PATCH") && !args.includes("DELETE"));
}

const successSummary = renderReleaseCompletionSummary(
  evaluateReleaseCompletion(observation(), expected),
  expected,
  "700",
);
assert.equal((successSummary.match(/Next action:/g) ?? []).length, 1);
const failureSummary = renderReleaseCompletionSummary(
  evaluateReleaseCompletion(failedEvidence, expected),
  expected,
  "700",
);
assert.match(failureSummary, /GitHub Release may already be published/);
assert.match(failureSummary, /gh run rerun 700 --failed/);
assert.equal((failureSummary.match(/Next action:/g) ?? []).length, 1);

console.log("Release completion fixtures passed.");
