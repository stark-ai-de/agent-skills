import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyOpenAiReleasePlan,
  buildOpenAiReleasePlan,
  concurrentPublicationRuns,
  selectPreviousPluginRelease,
} from "../release/reconcile-openai-plugin-issue.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reproducibilitySource = fs.readFileSync(
  path.join(repositoryRoot, "scripts/release/verify-release-reproducibility.mjs"),
  "utf8",
);
const reconcilerSource = fs.readFileSync(
  path.join(repositoryRoot, "scripts/release/reconcile-openai-plugin-issue.mjs"),
  "utf8",
);
assert.match(reproducibilitySource, /schemaVersion: 2/);
assert.doesNotMatch(reproducibilitySource, /worksheetPath|worksheetSha256/);
for (const output of [
  "status",
  "reason",
  "plugin_version_changed",
  "issue_url",
  "issue_state",
  "marker",
]) {
  assert.match(reconcilerSource, new RegExp(`${output}=`));
}
const listing = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "docs/listing/openai/stark-ai-developer.json"), "utf8"),
);
assert.deepEqual(Object.keys(listing.publisher), ["legalName"]);
const releaseSha = "a".repeat(40);
const archiveSha = "b".repeat(64);
const subject = {
  pluginVersion: listing.plugin.version,
  subjects: { openai: { sha256: archiveSha } },
};
const release = {
  tag_name: "v0.25.0",
  html_url: "https://github.com/example/example/releases/tag/v0.25.0",
  assets: [
    {
      name: "openai.zip",
      digest: `sha256:${archiveSha}`,
      browser_download_url:
        "https://github.com/example/example/releases/download/v0.25.0/openai.zip",
    },
  ],
};

const previousRelease = { tag_name: "v0.24.0", draft: false, prerelease: false };
const previousSubject = { pluginVersion: "1.6.0" };

const created = buildOpenAiReleasePlan({
  repository: "example/example",
  tag: release.tag_name,
  releaseSha,
  release,
  listing,
  subject,
  previousRelease,
  previousSubject,
  issues: [],
});
assert.equal(created.status, "create");
assert.equal(created.pluginVersionChanged, true);
assert.equal(created.title, "Release OpenAI Plugin");
assert.ok(
  created.body.startsWith(
    `<!-- openai-plugin-release:stark-ai-developer@${listing.plugin.version} -->`,
  ),
);
assert.match(created.body, /Post-release Evidence/);
assert.match(created.body, /does not assert an OpenAI upload, approval, or public portal state/);
assert.match(created.body, /openai\.zip/);
assert.match(created.body, new RegExp(archiveSha));
assert.doesNotMatch(created.body, /organization ID|verified identity|submission ID/i);

for (const state of ["open", "closed"]) {
  const existing = buildOpenAiReleasePlan({
    repository: "example/example",
    tag: release.tag_name,
    releaseSha,
    release,
    listing,
    subject,
    previousRelease,
    previousSubject,
    issues: [
      {
        number: 12,
        state,
        user: { type: "Bot" },
        author_association: "NONE",
        body: `${created.marker}\n\nmanual work`,
        html_url: "https://github.com/example/example/issues/12",
      },
    ],
  });
  assert.equal(existing.status, "noop");
  assert.equal(existing.reason, "issue_already_exists");
}

const manualMaintainerIssue = buildOpenAiReleasePlan({
  repository: "example/example",
  tag: release.tag_name,
  releaseSha,
  release,
  listing,
  subject,
  previousRelease,
  previousSubject,
  issues: [
    {
      number: 13,
      state: "open",
      user: { type: "User", login: "servrox" },
      author_association: "MEMBER",
      body: `${created.marker}\n\nmanual retry`,
    },
  ],
});
assert.equal(manualMaintainerIssue.status, "noop");
assert.equal(manualMaintainerIssue.reason, "issue_already_exists");

for (const state of ["open", "closed"]) {
  for (const authorAssociation of ["MEMBER", "OWNER", "COLLABORATOR"]) {
    for (const login of ["unapproved-maintainer", undefined]) {
      const unauthorizedManualIssue = buildOpenAiReleasePlan({
        repository: "example/example",
        tag: release.tag_name,
        releaseSha,
        release,
        listing,
        subject,
        previousRelease,
        previousSubject,
        issues: [
          {
            number: 15,
            state,
            user: { type: "User", login },
            author_association: authorAssociation,
            body: `${created.marker}\n\nunauthorized manual match`,
          },
        ],
      });
      assert.equal(
        unauthorizedManualIssue.status,
        "create",
        `${state} ${authorAssociation} issue from ${login ?? "a missing login"} must not suppress the handoff`,
      );
      assert.notEqual(unauthorizedManualIssue.reason, "issue_already_exists");
    }
  }
}

const caseInsensitiveMaintainerIssue = buildOpenAiReleasePlan({
  repository: "example/example",
  tag: release.tag_name,
  releaseSha,
  release,
  listing,
  subject,
  previousRelease,
  previousSubject,
  issues: [
    {
      number: 16,
      state: "closed",
      user: { type: "User", login: "ServRox" },
      author_association: "NONE",
      body: `${created.marker}\n\ncompleted manual handoff`,
    },
  ],
});
assert.equal(caseInsensitiveMaintainerIssue.status, "noop");
assert.equal(caseInsensitiveMaintainerIssue.reason, "issue_already_exists");

const spoofedPublicIssue = buildOpenAiReleasePlan({
  repository: "example/example",
  tag: release.tag_name,
  releaseSha,
  release,
  listing,
  subject,
  previousRelease,
  previousSubject,
  issues: [
    {
      number: 14,
      state: "open",
      user: { type: "User" },
      author_association: "NONE",
      body: `${created.marker}\n\nuntrusted marker`,
    },
  ],
});
assert.equal(spoofedPublicIssue.status, "create");

const unchanged = buildOpenAiReleasePlan({
  repository: "example/example",
  tag: release.tag_name,
  releaseSha,
  release,
  listing,
  subject,
  previousRelease,
  previousSubject: { pluginVersion: listing.plugin.version },
  issues: [],
});
assert.equal(unchanged.status, "noop");
assert.equal(unchanged.reason, "plugin_version_unchanged");
assert.equal(unchanged.pluginVersionChanged, false);

for (const state of ["open", "closed"]) {
  const issue = {
    number: 114,
    state,
    user: { type: "Bot" },
    body: `${created.marker}\n\nmanual state`,
    html_url: "https://github.com/example/example/issues/114",
  };
  const unchangedWithIssue = buildOpenAiReleasePlan({
    repository: "example/example",
    tag: release.tag_name,
    releaseSha,
    release,
    listing,
    subject,
    previousRelease,
    previousSubject: { pluginVersion: listing.plugin.version },
    issues: [issue],
  });
  assert.equal(unchangedWithIssue.status, "noop");
  assert.equal(unchangedWithIssue.reason, "plugin_version_unchanged");
  assert.equal(unchangedWithIssue.pluginVersionChanged, false);
  assert.equal(unchangedWithIssue.issue.state, state);
}

assert.equal(
  selectPreviousPluginRelease(
    [
      { tag_name: "v0.20.1", draft: false, prerelease: false },
      { tag_name: "v0.24.0", draft: false, prerelease: false },
      { tag_name: "v0.26.0", draft: false, prerelease: false },
      { tag_name: "v0.23.0", draft: false, prerelease: true },
    ],
    "0.25.0",
  ).tag_name,
  "v0.24.0",
);
assert.equal(selectPreviousPluginRelease([], "0.25.0"), null);
assert.deepEqual(
  concurrentPublicationRuns(
    [
      { id: 41, status: "in_progress" },
      { id: 42, status: "queued" },
      { id: 43, status: "completed" },
    ],
    "41",
  ),
  [{ id: 42, status: "queued" }],
);

assert.throws(
  () =>
    buildOpenAiReleasePlan({
      repository: "example/example",
      tag: release.tag_name,
      releaseSha,
      release,
      listing,
      subject: { ...subject, pluginVersion: "1.5.0" },
      previousRelease,
      previousSubject,
      issues: [],
    }),
  /does not match listing\.plugin\.version/,
);

assert.throws(
  () =>
    buildOpenAiReleasePlan({
      repository: "example/example",
      tag: release.tag_name,
      releaseSha,
      release,
      listing: {
        ...listing,
        publisher: { ...listing.publisher, openaiOrganizationId: "synthetic" },
      },
      subject,
      previousRelease,
      previousSubject,
      issues: [],
    }),
  /private publisher fields/,
);

assert.throws(
  () =>
    buildOpenAiReleasePlan({
      repository: "example/example",
      tag: release.tag_name,
      releaseSha,
      release,
      listing,
      subject,
      previousRelease,
      previousSubject: {
        pluginVersion: `${Number(listing.plugin.version.split(".")[0]) + 1}.0.0`,
      },
      issues: [],
    }),
  /decreased/,
);

function simulatedGitHubTransport({ issuePages = [[]], runPages = [{ workflow_runs: [] }] } = {}) {
  const pages = issuePages.map((page) => page.map((issue) => ({ ...issue })));
  const requestedEndpoints = [];
  let postCount = 0;
  let loseNextPostResponse = false;

  return {
    jsonRequest(args) {
      const endpoint = args.find(
        (value) => typeof value === "string" && value.startsWith("repos/"),
      );
      requestedEndpoints.push(endpoint);
      if (endpoint?.includes("/issues?state=all")) return pages;
      if (endpoint?.includes("/actions/workflows/publish-release.yml/runs?")) return runPages;
      if (endpoint?.endsWith("/issues") && args.includes("POST")) {
        postCount += 1;
        const body = args.find((value) => value.startsWith("body="))?.slice(5) ?? "";
        const created = {
          number: 100 + postCount,
          state: "open",
          user: { type: "User", login: "servrox" },
          author_association: "MEMBER",
          body,
          html_url: `https://github.com/example/example/issues/${100 + postCount}`,
        };
        pages.at(-1).push(created);
        if (loseNextPostResponse) {
          loseNextPostResponse = false;
          throw new Error("simulated lost POST response");
        }
        return created;
      }
      throw new Error(`Unexpected simulated GitHub request: ${args.join(" ")}`);
    },
    loseNextPostResponse() {
      loseNextPostResponse = true;
    },
    get postCount() {
      return postCount;
    },
    get requestedEndpoints() {
      return requestedEndpoints;
    },
  };
}

const transportContext = {
  repository: "example/example",
  tag: release.tag_name,
  releaseSha,
  release,
  listing,
  subject,
  previousRelease,
  previousSubject,
  issues: [],
};

const paginatedTransport = simulatedGitHubTransport({
  issuePages: [
    [{ number: 8, state: "open", body: "unrelated" }],
    [
      {
        number: 9,
        state: "closed",
        user: { type: "Bot" },
        author_association: "NONE",
        body: `${created.marker}\n\nmanual completion retained`,
        html_url: "https://github.com/example/example/issues/9",
      },
    ],
  ],
});
const paginatedRetry = applyOpenAiReleasePlan(transportContext, {
  jsonRequest: paginatedTransport.jsonRequest,
});
assert.equal(paginatedRetry.reason, "issue_already_exists");
assert.equal(paginatedRetry.issue.state, "closed");
assert.equal(paginatedTransport.postCount, 0);

const successfulTransport = simulatedGitHubTransport();
const applied = applyOpenAiReleasePlan(transportContext, {
  jsonRequest: successfulTransport.jsonRequest,
});
assert.equal(applied.status, "created");
assert.equal(successfulTransport.postCount, 1);
assert.ok(
  successfulTransport.requestedEndpoints.includes(
    "repos/example/example/actions/workflows/publish-release.yml/runs?per_page=100",
  ),
  "concurrency checks must query only Publish Release runs",
);
const repeatedApply = applyOpenAiReleasePlan(transportContext, {
  jsonRequest: successfulTransport.jsonRequest,
});
assert.equal(repeatedApply.reason, "issue_already_exists");
assert.equal(successfulTransport.postCount, 1);

const lostResponseTransport = simulatedGitHubTransport();
lostResponseTransport.loseNextPostResponse();
assert.throws(
  () =>
    applyOpenAiReleasePlan(transportContext, {
      jsonRequest: lostResponseTransport.jsonRequest,
    }),
  /simulated lost POST response/,
);
const recoveredAfterLostResponse = applyOpenAiReleasePlan(transportContext, {
  jsonRequest: lostResponseTransport.jsonRequest,
});
assert.equal(recoveredAfterLostResponse.reason, "issue_already_exists");
assert.equal(lostResponseTransport.postCount, 1);

const concurrentTransport = simulatedGitHubTransport({
  runPages: [{ workflow_runs: [{ id: 501, status: "in_progress" }] }],
});
assert.throws(
  () =>
    applyOpenAiReleasePlan(transportContext, {
      jsonRequest: concurrentTransport.jsonRequest,
      currentRunId: "500",
    }),
  /Another publication or release retry is active/,
);
assert.equal(concurrentTransport.postCount, 0);

console.log("OpenAI plugin release issue fixtures passed.");
