import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOpenAiReleasePlan,
  concurrentPublicationRuns,
  selectPreviousPluginRelease,
} from "../release/reconcile-openai-plugin-issue.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reproducibilitySource = fs.readFileSync(
  path.join(repositoryRoot, "scripts/release/verify-release-reproducibility.mjs"),
  "utf8",
);
assert.match(reproducibilitySource, /schemaVersion: 2/);
assert.doesNotMatch(reproducibilitySource, /worksheetPath|worksheetSha256/);
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
assert.equal(created.title, "Release OpenAI Plugin");
assert.match(created.body, /openai-plugin-release:stark-ai-developer@1\.7\.1/);
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
        body: `${created.marker}\n\nmanual work`,
        html_url: "https://github.com/example/example/issues/12",
      },
    ],
  });
  assert.equal(existing.status, "noop");
  assert.equal(existing.reason, "issue_already_exists");
}

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
      previousSubject: { pluginVersion: "1.8.0" },
      issues: [],
    }),
  /decreased/,
);

console.log("OpenAI plugin release issue fixtures passed.");
