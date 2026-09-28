#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Incident-specific preparation only. This helper cannot publish a release.
export const FORWARD_RELEASE = Object.freeze({
  repository: "stark-ai-de/agent-skills",
  abandonedVersion: "0.25.2",
  abandonedPullRequest: 118,
  abandonedSha: "7dbf2e96c9305d42120394e615c3fa8cb19d13fa",
  baselineVersion: "0.25.1",
  baselineSha: "f186e5ab3c43cc13f70af2adc1dc70bb1bf3ed3b",
  nextVersion: "0.25.3",
  libraryVersion: "17.6.0",
});

export function githubReader(token, fetchImpl = fetch) {
  assert.ok(token, "GH_TOKEN is required");
  return async (endpoint, allowAbsent = false) => {
    assert.ok(endpoint.startsWith(`repos/${FORWARD_RELEASE.repository}/`));
    const response = await fetchImpl(`https://api.github.com/${endpoint}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 404 && allowAbsent) return null;
    assert.ok(response.ok, `GitHub GET ${endpoint}: HTTP ${response.status}`);
    return response.json();
  };
}

export async function verifyForwardState({ read, candidateSha, rootPackage, manifest }) {
  const config = FORWARD_RELEASE;
  assert.match(candidateSha ?? "", /^[0-9a-f]{40}$/);
  assert.equal(rootPackage.version, config.abandonedVersion, "forward lane is no longer applicable");
  assert.deepEqual(manifest, { ".": config.abandonedVersion });
  const prefix = `repos/${config.repository}`;
  const branch = await read(`${prefix}/branches/main`);
  assert.equal(branch.protected, true, "main must remain protected");
  assert.equal(branch.commit.sha, candidateSha, "main moved; inspect before starting another run");
  const comparison = await read(`${prefix}/compare/${config.abandonedSha}...${candidateSha}`);
  assert.ok(["ahead", "identical"].includes(comparison.status), "candidate must contain PR #118");
  const previous = await read(`${prefix}/releases/latest`);
  assert.equal(previous.tag_name, `v${config.baselineVersion}`);
  assert.equal(previous.draft, false);
  assert.equal(previous.prerelease, false);
  const ref = await read(`${prefix}/git/ref/tags/v${config.baselineVersion}`);
  const object = ref.object.type === "tag"
    ? (await read(`${prefix}/git/tags/${ref.object.sha}`)).object
    : ref.object;
  assert.equal(object.type, "commit");
  assert.equal(object.sha, config.baselineSha, "published baseline changed");
  for (const version of [config.abandonedVersion, config.nextVersion]) {
    assert.equal(await read(`${prefix}/git/ref/tags/v${version}`, true), null, `v${version} tag exists`);
    assert.equal(await read(`${prefix}/releases/tags/v${version}`, true), null, `v${version} release exists`);
  }
  const pull = await read(`${prefix}/pulls/${config.abandonedPullRequest}`);
  assert.equal(pull.state, "closed");
  assert.ok(pull.merged_at);
  assert.equal(pull.merge_commit_sha, config.abandonedSha);
  assert.equal(pull.base.ref, "main");
  assert.equal(pull.title, `chore(release): release ${config.abandonedVersion}`);
  const labels = pull.labels.map((label) => label.name);
  assert.ok(!labels.includes("autorelease: tagged"), "unpublished PR must not be marked tagged");
  assert.ok(
    !labels.includes("autorelease: pending"),
    "Record the authorized abandonment on PR #118 and remove only autorelease: pending first",
  );
}

export function configureForwardManifest(manifest, library) {
  assert.equal(library.VERSION, FORWARD_RELEASE.libraryVersion);
  assert.deepEqual(Object.keys(manifest.repositoryConfig), ["."]);
  assert.equal(manifest.releasedVersions["."].toString(), FORWARD_RELEASE.abandonedVersion);
  const config = manifest.repositoryConfig["."];
  assert.equal(config.releaseType, "node");
  assert.equal(config.changelogType, "github");
  assert.equal(config.skipGitHubRelease, true);
  // Change only Release Please's in-memory interpretation of the published baseline.
  // The real repository manifest remains 0.25.2 until Release Please generates its PR.
  manifest.releasedVersions["."] = library.Version.parse(FORWARD_RELEASE.baselineVersion);
  config.releaseAs = FORWARD_RELEASE.nextVersion;
  return manifest;
}

export async function prepareForwardRelease({ library, github, verify, apply = false }) {
  await verify();
  const manifest = configureForwardManifest(
    await library.Manifest.fromManifest(
      github, "main", "release-please-config.json", ".release-please-manifest.json",
    ),
    library,
  );
  const candidates = await manifest.buildPullRequests();
  assert.equal(candidates.length, 1, "expected exactly one generated release PR");
  const pull = candidates[0].pullRequest;
  assert.equal(pull.title.toString(), `chore(release): release ${FORWARD_RELEASE.nextVersion}`);
  assert.equal(pull.version.toString(), FORWARD_RELEASE.nextVersion);
  assert.equal(pull.draft, true, "the generated release must remain a draft");
  assert.equal(pull.headRefName, "release-please--branches--main--components--agent-skills");
  await verify();
  if (!apply) return { mode: "plan", version: FORWARD_RELEASE.nextVersion };
  // Use the upstream producer; never hand-author its commit or call createReleases().
  const created = (await manifest.createPullRequests()).filter(Boolean);
  assert.equal(created.length, 1, "inspect remote PR state before retrying an uncertain write");
  return { mode: "applied", version: FORWARD_RELEASE.nextVersion, number: created[0].number };
}

export async function runCli(argv = process.argv.slice(2)) {
  assert.ok(argv.every((value) => ["--preflight", "--plan", "--apply"].includes(value)));
  assert.ok(argv.length === 1, "Use exactly one of --preflight, --plan, or --apply");
  const env = process.env;
  const config = FORWARD_RELEASE;
  assert.equal(env.GITHUB_ACTIONS, "true", "run through the trusted Release Please workflow");
  assert.equal(env.GITHUB_REPOSITORY, config.repository);
  assert.equal(env.GITHUB_REF, "refs/heads/main");
  assert.equal(env.WORKFLOW_REF, `${config.repository}/.github/workflows/release-please.yml@refs/heads/main`);
  assert.equal(env.WORKFLOW_SHA, env.GITHUB_SHA);
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  assert.equal(head, env.GITHUB_SHA);
  assert.match(env.EXPECTED_APP_ID ?? "", /^\d+$/);
  const read = githubReader(env.GH_TOKEN);
  const verify = () => verifyForwardState({
    read,
    candidateSha: head,
    rootPackage: JSON.parse(fs.readFileSync("package.json", "utf8")),
    manifest: JSON.parse(fs.readFileSync(".release-please-manifest.json", "utf8")),
  });
  await verify();
  execFileSync(process.execPath, [
    "scripts/release/verify-release-please-merge.mjs",
    "--repository", config.repository,
    "--commit", config.abandonedSha,
    "--expected-app-id", env.EXPECTED_APP_ID,
  ], { stdio: "inherit" });
  if (argv[0] === "--preflight") {
    console.log("Forward preparation preflight passed; no release or PR was created.");
    return;
  }
  assert.ok(env.RUNNER_TEMP);
  const require = createRequire(path.join(env.RUNNER_TEMP, "release-please-forward", "package.json"));
  const library = require("release-please");
  const github = await library.GitHub.create({
    owner: "stark-ai-de", repo: "agent-skills", token: env.GH_TOKEN, defaultBranch: "main",
  });
  const result = await prepareForwardRelease({ library, github, verify, apply: argv[0] === "--apply" });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
