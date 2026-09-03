import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  changelogReleaseOrder,
  changelogReleaseVersions,
  extractChangelogReleaseNotes,
  removeChangelogReleaseSection,
  splitChangelogSections,
} from "../lib/release-changelog.mjs";
import {
  approvalRunErrors,
  mainCandidateContainmentErrors,
  missingReleasePleaseLifecycleLabels,
  PRE_PUBLICATION_RECOVERY_IMMUTABLE_PATHS,
  PRE_PUBLICATION_RECOVERY_MAX_COMMITS,
  PRE_PUBLICATION_RECOVERY_PATHS,
  prePublicationRecoveryErrors,
  releaseRecoveryComparisonErrors,
  releaseRecoverySubjectErrors,
  RELEASE_PLEASE_LIFECYCLE_LABELS,
  successfulMainValidateRun,
  successfulPullRequestValidateRun,
} from "../lib/release-management.mjs";
import {
  evidenceRunCoversRelease,
  releaseStateChangedAt,
  selectPostReleaseEvidenceRun,
} from "../lib/post-release-evidence.mjs";
import {
  automatedReleaseVersionSupported,
  FIRST_AUTOMATED_RELEASE_VERSION,
  GENERATED_RELEASE_FILES,
  generatedReleasePullRequestForCommit,
  isGeneratedReleaseMerge,
  releasePleasePullRequestOwnershipErrors,
} from "../lib/release-please.mjs";
import { runCli as verifyReleaseRecoverySubjects } from "../release/verify-release-recovery-subjects.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const releaseImpactScript = path.join(repositoryRoot, "scripts/release/check-release-intent.mjs");
const triggerClassifier = path.join(
  repositoryRoot,
  "scripts/release/classify-release-please-trigger.mjs",
);

function read(relative) {
  return fs.readFileSync(path.join(repositoryRoot, relative), "utf8");
}

function occurrences(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function writeJson(root, relative, value) {
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);
}

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

function createReleaseFixture({ manifest = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-release-management-"));
  fs.mkdirSync(path.join(root, "skills/test/demo/references"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(root, "skills/test/demo/SKILL.md"),
    [
      "---",
      "name: demo",
      "description: Test fixture",
      "metadata:",
      '  version: "0.1.0"',
      "---",
      "",
      "# Demo",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(path.join(root, "skills/test/demo/references/note.md"), "baseline\n");
  fs.writeFileSync(path.join(root, "README.md"), "fixture\n");
  fs.writeFileSync(
    path.join(root, "CHANGELOG.md"),
    [
      "# Changelog",
      "",
      "## Unreleased",
      "",
      "### Added",
      "",
      "## v0.20.1 - 2026-08-25",
      "",
      "### Fixed",
      "",
      "- Baseline.",
      "",
    ].join("\n"),
  );
  writeJson(root, "package.json", { name: "fixture", version: "0.20.1" });
  if (manifest) writeJson(root, ".release-please-manifest.json", { ".": "0.20.1" });
  writeJson(root, "plugins/stark-ai-developer.source.json", {
    version: "1.0.0",
    skills: [{ name: "demo", source: "skills/test/demo" }],
  });
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.name", "Release Test"]);
  git(root, ["config", "user.email", "release-test@example.invalid"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "fixture baseline"]);
  return { root, base: git(root, ["rev-parse", "HEAD"]) };
}

function runImpact(root, base) {
  const outputPath = path.join(root, "release-impact-output");
  fs.rmSync(outputPath, { force: true });
  const result = spawnSync(
    process.execPath,
    [releaseImpactScript, "--base-ref", base, "--github-output"],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, GITHUB_OUTPUT: outputPath },
    },
  );
  if (result.error) throw result.error;
  const output = fs.existsSync(outputPath)
    ? Object.fromEntries(
        fs
          .readFileSync(outputPath, "utf8")
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const separator = line.indexOf("=");
            return [line.slice(0, separator), line.slice(separator + 1)];
          }),
      )
    : {};
  return { ...result, githubOutput: output };
}

function releaseChangelog(version, { afterBaseline = false, preamble = "# Changelog" } = {}) {
  const section = [
    `## [${version}](https://github.com/fixture/repo/compare/v0.20.1...v${version}) (2026-08-26)`,
    "",
    "### Features",
    "",
    "* add release automation",
    "",
  ];
  const baseline = ["## v0.20.1 - 2026-08-25", "", "### Fixed", "", "- Baseline.", ""];
  return [
    preamble,
    "",
    "## Unreleased",
    "",
    "### Added",
    "",
    ...(afterBaseline ? [...baseline, ...section] : [...section, ...baseline]),
  ].join("\n");
}

function prepareGeneratedRelease(root, version = "0.21.0", options = {}) {
  const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  rootPackage.version = version;
  if (options.packageExtra) rootPackage.scripts = { unexpected: "true" };
  writeJson(root, "package.json", rootPackage);
  const manifest = { ".": version };
  if (options.manifestExtra) manifest.unexpected = version;
  writeJson(root, ".release-please-manifest.json", manifest);
  fs.writeFileSync(path.join(root, "CHANGELOG.md"), releaseChangelog(version, options));
}

const config = JSON.parse(read("release-please-config.json"));
const bootstrapConfig = JSON.parse(read("release-please-config.v0.21.0.json"));
const manifest = JSON.parse(read(".release-please-manifest.json"));
const rootPackage = JSON.parse(read("package.json"));
assert.equal(config["release-type"], "node");
assert.equal(config["skip-github-release"], true);
assert.equal(config["include-v-in-tag"], true);
assert.equal(config["include-component-in-tag"], false);
assert.equal(config["bump-minor-pre-major"], true);
assert.equal(config["bump-patch-for-minor-pre-major"], false);
assert.equal(config["draft-pull-request"], true);
assert.equal(config["pull-request-title-pattern"], "chore(release): release ${version}");
assert.equal(config.label, "autorelease: pending");
assert.equal(config["release-label"], "autorelease: tagged");
assert.equal(config["release-as"], undefined, "the bootstrap override must not persist in config");
assert.deepEqual(Object.keys(config.packages), ["."]);
assert.equal(bootstrapConfig.packages["."]["release-as"], "0.21.0");
const normalizedBootstrapConfig = structuredClone(bootstrapConfig);
delete normalizedBootstrapConfig.packages["."]["release-as"];
assert.deepEqual(
  normalizedBootstrapConfig,
  config,
  "the one-time manifest config must differ only by its package-local release-as override",
);
assert.ok(
  manifest["."] === "0.20.1" || automatedReleaseVersionSupported(manifest["."]),
  "repository manifest must be the bootstrap baseline or a supported automated release",
);
assert.equal(rootPackage.version, manifest["."], "root package and manifest versions must match");

const mixedChangelog = [
  "# Changelog",
  "",
  "## Unreleased",
  "",
  "### Added",
  "",
  "## [0.21.0](https://github.com/example/repo/compare/v0.20.1...v0.21.0) (2026-08-26)",
  "",
  "### Features",
  "",
  "* add release automation",
  "",
  "## v0.20.1 - 2026-08-25",
  "",
  "### Fixed",
  "",
  "- Baseline.",
  "",
].join("\n");
assert.deepEqual([...changelogReleaseVersions(mixedChangelog)], ["0.21.0", "0.20.1"]);
assert.match(extractChangelogReleaseNotes(mixedChangelog, "0.21.0"), /release automation/);
assert.match(extractChangelogReleaseNotes(mixedChangelog, "0.20.1"), /Baseline/);
assert.ok(splitChangelogSections(mixedChangelog).has("Unreleased"));
assert.deepEqual(changelogReleaseOrder(mixedChangelog), ["0.21.0", "0.20.1"]);
assert.equal(
  removeChangelogReleaseSection(releaseChangelog("0.21.0"), "0.21.0"),
  [
    "# Changelog",
    "",
    "## Unreleased",
    "",
    "### Added",
    "",
    "## v0.20.1 - 2026-08-25",
    "",
    "### Fixed",
    "",
    "- Baseline.",
    "",
  ].join("\n"),
);
assert.equal(automatedReleaseVersionSupported("0.20.2"), false);
assert.equal(automatedReleaseVersionSupported(FIRST_AUTOMATED_RELEASE_VERSION), true);

assert.equal(
  isGeneratedReleaseMerge({
    changedFiles: [...GENERATED_RELEASE_FILES].reverse(),
    associatedTitles: ["chore(release): release 0.21.0"],
  }),
  true,
);
assert.equal(
  isGeneratedReleaseMerge({
    changedFiles: GENERATED_RELEASE_FILES,
    commitTitle: "chore(release): release 0.21.0 (#123)",
  }),
  true,
);
assert.equal(
  isGeneratedReleaseMerge({
    changedFiles: [...GENERATED_RELEASE_FILES, "README.md"],
    associatedTitles: ["chore(release): release 0.21.0"],
  }),
  false,
);
assert.equal(
  isGeneratedReleaseMerge({
    changedFiles: GENERATED_RELEASE_FILES,
    associatedTitles: ["feat: unrelated"],
  }),
  false,
);

const featureFixture = createReleaseFixture();
try {
  const skillPath = path.join(featureFixture.root, "skills/test/demo/SKILL.md");
  fs.writeFileSync(
    skillPath,
    fs.readFileSync(skillPath, "utf8").replace('version: "0.1.0"', 'version: "0.1.1"'),
  );
  const pluginPath = path.join(featureFixture.root, "plugins/stark-ai-developer.source.json");
  const plugin = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
  plugin.version = "1.0.1";
  fs.writeFileSync(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
  const result = runImpact(featureFixture.root, featureFixture.base);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.githubOutput.contract_kind, "feature");
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(featureFixture.root, "package.json"))).version,
    "0.20.1",
  );
} finally {
  fs.rmSync(featureFixture.root, { recursive: true, force: true });
}

const missingBumpFixture = createReleaseFixture();
try {
  fs.writeFileSync(
    path.join(missingBumpFixture.root, "skills/test/demo/references/note.md"),
    "changed without a version bump\n",
  );
  const result = runImpact(missingBumpFixture.root, missingBumpFixture.base);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /metadata\.version must increase/);
  assert.match(result.stderr, /plugin.*must increase its version/i);
} finally {
  fs.rmSync(missingBumpFixture.root, { recursive: true, force: true });
}

const releaseFixture = createReleaseFixture();
try {
  writeJson(releaseFixture.root, "package.json", {
    name: "fixture",
    version: "0.21.0",
  });
  writeJson(releaseFixture.root, ".release-please-manifest.json", {
    ".": "0.21.0",
  });
  fs.writeFileSync(path.join(releaseFixture.root, "CHANGELOG.md"), releaseChangelog("0.21.0"));
  const result = runImpact(releaseFixture.root, releaseFixture.base);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.githubOutput.contract_kind, "release-pr");

  git(releaseFixture.root, ["add", ...GENERATED_RELEASE_FILES]);
  git(releaseFixture.root, ["commit", "--quiet", "-m", "chore(release): release 0.21.0"]);
  const output = path.join(releaseFixture.root, "github-output.txt");
  const classifier = spawnSync(process.execPath, [triggerClassifier, "--github-output"], {
    cwd: releaseFixture.root,
    encoding: "utf8",
    env: {
      ...process.env,
      EVENT_NAME: "push",
      BEFORE_SHA: releaseFixture.base,
      ASSOCIATED_TITLES: "chore(release): release 0.21.0",
      COMMIT_TITLE: "chore(release): release 0.21.0",
      GITHUB_OUTPUT: output,
    },
  });
  assert.equal(classifier.status, 0, classifier.stderr || classifier.stdout);
  assert.equal(fs.readFileSync(output, "utf8"), "skip=true\n");
} finally {
  fs.rmSync(releaseFixture.root, { recursive: true, force: true });
}

const overbroadReleaseFixture = createReleaseFixture();
try {
  writeJson(overbroadReleaseFixture.root, "package.json", {
    name: "fixture",
    version: "0.21.0",
  });
  writeJson(overbroadReleaseFixture.root, ".release-please-manifest.json", {
    ".": "0.21.0",
  });
  fs.writeFileSync(path.join(overbroadReleaseFixture.root, "CHANGELOG.md"), mixedChangelog);
  fs.writeFileSync(path.join(overbroadReleaseFixture.root, "README.md"), "overbroad\n");
  const result = runImpact(overbroadReleaseFixture.root, overbroadReleaseFixture.base);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /may change only/);
} finally {
  fs.rmSync(overbroadReleaseFixture.root, { recursive: true, force: true });
}

for (const [name, prepare, expected] of [
  [
    "unsupported bootstrap patch",
    (root) => prepareGeneratedRelease(root, "0.20.2"),
    /first generated release.*0\.21\.0/i,
  ],
  [
    "generated package extra key",
    (root) => prepareGeneratedRelease(root, "0.21.0", { packageExtra: true }),
    /only package\.json version/,
  ],
  [
    "generated manifest extra key",
    (root) => prepareGeneratedRelease(root, "0.21.0", { manifestExtra: true }),
    /only the root manifest version/,
  ],
  [
    "generated changelog preamble rewrite",
    (root) =>
      prepareGeneratedRelease(root, "0.21.0", {
        preamble: "# Changed Changelog",
      }),
    /all existing bytes must remain unchanged/,
  ],
  [
    "generated changelog release not newest",
    (root) => prepareGeneratedRelease(root, "0.21.0", { afterBaseline: true }),
    /newest CHANGELOG\.md release heading/,
  ],
]) {
  const fixture = createReleaseFixture();
  try {
    prepare(fixture.root);
    const result = runImpact(fixture.root, fixture.base);
    assert.notEqual(result.status, 0, `${name} must fail`);
    assert.match(result.stderr, expected);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

for (const [name, mutate, expected] of [
  [
    "feature manifest edit",
    (root) =>
      writeJson(root, ".release-please-manifest.json", {
        ".": "0.20.1",
        extra: true,
      }),
    /Feature PRs must not change \.release-please-manifest\.json/,
  ],
  [
    "feature root changelog edit",
    (root) => fs.appendFileSync(path.join(root, "CHANGELOG.md"), "feature note\n"),
    /Feature PRs must not change the root CHANGELOG\.md/,
  ],
]) {
  const fixture = createReleaseFixture();
  try {
    mutate(fixture.root);
    const result = runImpact(fixture.root, fixture.base);
    assert.notEqual(result.status, 0, `${name} must fail`);
    assert.match(result.stderr, expected);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

const bootstrapFixture = createReleaseFixture({ manifest: false });
try {
  writeJson(bootstrapFixture.root, ".release-please-manifest.json", {
    ".": "0.20.1",
  });
  const result = runImpact(bootstrapFixture.root, bootstrapFixture.base);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.githubOutput.contract_kind, "none");
} finally {
  fs.rmSync(bootstrapFixture.root, { recursive: true, force: true });
}

const invalidBootstrapFixture = createReleaseFixture({ manifest: false });
try {
  writeJson(invalidBootstrapFixture.root, ".release-please-manifest.json", {
    ".": "0.20.1",
    unexpected: "0.20.1",
  });
  const result = runImpact(invalidBootstrapFixture.root, invalidBootstrapFixture.base);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must contain only the existing package\.json baseline/);
} finally {
  fs.rmSync(invalidBootstrapFixture.root, { recursive: true, force: true });
}

const appId = 12345;
const appSlug = "release-please-test";
const botLogin = `${appSlug}[bot]`;
const releaseCommitSha = "a".repeat(40);
const mergeCommitSha = "b".repeat(40);
const releasePullRequest = {
  number: 42,
  title: "chore(release): release 0.21.0",
  merged_at: "2026-08-26T12:00:00Z",
  merge_commit_sha: mergeCommitSha,
  base: { ref: "main" },
  head: {
    ref: "release-please--branches--main--components--agent-skills",
    sha: releaseCommitSha,
    repo: { full_name: "stark-ai-de/agent-skills" },
  },
  user: {
    id: 67890,
    login: botLogin,
    type: "Bot",
    avatar_url: `https://avatars.githubusercontent.com/in/${appId}?v=4`,
    html_url: `https://github.com/apps/${appSlug}`,
  },
};
const releasePleaseCommit = {
  sha: releaseCommitSha,
  author: { login: botLogin },
  committer: { login: "web-flow" },
  parents: [{ sha: "c".repeat(40) }],
  commit: {
    message: releasePullRequest.title,
    author: {
      name: botLogin,
      email: `${releasePullRequest.user.id}+${botLogin}@users.noreply.github.com`,
    },
    committer: { name: "GitHub", email: "noreply@github.com" },
    verification: { verified: true, reason: "valid" },
  },
};
const provenance = (overrides = {}) =>
  releasePleasePullRequestOwnershipErrors({
    pullRequest: releasePullRequest,
    commits: [releasePleaseCommit],
    repository: "stark-ai-de/agent-skills",
    expectedAppId: appId,
    ...overrides,
  });
const provenanceForUser = (user) =>
  provenance({
    pullRequest: {
      ...releasePullRequest,
      user: { ...releasePullRequest.user, ...user },
    },
  });
assert.deepEqual(provenance(), []);
assert.equal(
  generatedReleasePullRequestForCommit([releasePullRequest], mergeCommitSha)?.number,
  releasePullRequest.number,
);
assert.equal(generatedReleasePullRequestForCommit([releasePullRequest], "d".repeat(40)), null);
assert.match(provenance({ expectedAppId: 999 }).join(";"), /App identity/);
assert.match(provenance({ expectedAppId: "not-an-app-id" }).join(";"), /App identity/);
assert.match(
  provenanceForUser({
    avatar_url: "https://avatars.githubusercontent.com/in/not-an-app-id?v=4",
  }).join(";"),
  /App identity/,
);
assert.match(
  provenanceForUser({ avatar_url: `https://example.com/in/${appId}?v=4` }).join(";"),
  /App identity/,
);
assert.match(provenanceForUser({ avatar_url: undefined }).join(";"), /App identity/);
assert.match(provenanceForUser({ type: "User" }).join(";"), /configured App bot/);
assert.match(provenanceForUser({ id: undefined }).join(";"), /configured App bot/);
assert.match(
  provenanceForUser({ id: String(releasePullRequest.user.id) }).join(";"),
  /configured App bot/,
);
assert.match(provenanceForUser({ login: "other-app[bot]" }).join(";"), /configured App bot/);
assert.match(
  provenanceForUser({ html_url: "https://github.com/apps/other-app" }).join(";"),
  /configured App bot/,
);
assert.match(provenanceForUser({ html_url: undefined }).join(";"), /configured App bot/);
const renamedAppSlug = "renamed-release-please-test";
const renamedBotLogin = `${renamedAppSlug}[bot]`;
const renamedPullRequest = {
  ...releasePullRequest,
  user: {
    ...releasePullRequest.user,
    login: renamedBotLogin,
    html_url: `https://github.com/apps/${renamedAppSlug}`,
  },
};
const renamedReleasePleaseCommit = {
  ...releasePleaseCommit,
  author: { login: renamedBotLogin },
  commit: {
    ...releasePleaseCommit.commit,
    author: {
      name: renamedBotLogin,
      email: `${renamedPullRequest.user.id}+${renamedBotLogin}@users.noreply.github.com`,
    },
  },
};
assert.deepEqual(
  provenance({
    pullRequest: renamedPullRequest,
    commits: [renamedReleasePleaseCommit],
  }),
  [],
  "a self-consistent App slug rename remains bound to the same immutable App ID",
);
assert.match(
  provenance({
    pullRequest: {
      ...releasePullRequest,
      head: {
        ...releasePullRequest.head,
        repo: { full_name: "other/repository" },
      },
    },
  }).join(";"),
  /repository-local/,
);
assert.match(
  provenance({
    commits: [{ ...releasePleaseCommit, author: { login: "human" } }],
  }).join(";"),
  /not authored/,
);
assert.match(
  provenance({ commits: [releasePleaseCommit, releasePleaseCommit] }).join(";"),
  /exactly one/,
);
assert.match(
  provenance({
    commits: [
      {
        ...releasePleaseCommit,
        commit: {
          ...releasePleaseCommit.commit,
          verification: { verified: false, reason: "unsigned" },
        },
      },
    ],
  }).join(";"),
  /signature/,
);

const waitingPublishRun = {
  path: ".github/workflows/publish-release.yml",
  event: "push",
  head_branch: "main",
  head_sha: mergeCommitSha,
  status: "waiting",
  conclusion: null,
};
assert.deepEqual(RELEASE_PLEASE_LIFECYCLE_LABELS, ["autorelease: pending", "autorelease: tagged"]);
assert.deepEqual(
  missingReleasePleaseLifecycleLabels([{ name: "autorelease: tagged" }, { name: "unrelated" }]),
  ["autorelease: pending"],
);
assert.deepEqual(
  missingReleasePleaseLifecycleLabels(RELEASE_PLEASE_LIFECYCLE_LABELS.map((name) => ({ name }))),
  [],
);
const containedCandidate = {
  branch: { protected: true, commit: { sha: mergeCommitSha } },
  comparison: {
    status: "identical",
    ahead_by: 0,
    behind_by: 0,
    total_commits: 0,
    base_commit: { sha: mergeCommitSha },
    merge_base_commit: { sha: mergeCommitSha },
    commits: [],
  },
};
const advancedMainSha = "d".repeat(40);
const containedAfterMainAdvance = {
  branch: { protected: true, commit: { sha: advancedMainSha } },
  comparison: {
    status: "ahead",
    ahead_by: 1,
    behind_by: 0,
    total_commits: 1,
    base_commit: { sha: mergeCommitSha },
    merge_base_commit: { sha: mergeCommitSha },
    commits: [{ sha: advancedMainSha }],
  },
};
assert.deepEqual(approvalRunErrors(waitingPublishRun, containedCandidate), []);
assert.deepEqual(
  approvalRunErrors(waitingPublishRun, containedAfterMainAdvance),
  [],
  "a previously validated release candidate may remain waiting while protected main advances",
);
assert.deepEqual(
  mainCandidateContainmentErrors({
    candidateSha: mergeCommitSha,
    ...containedAfterMainAdvance,
  }),
  [],
);
assert.match(
  mainCandidateContainmentErrors({
    candidateSha: mergeCommitSha,
    ...containedAfterMainAdvance,
    comparison: {
      ...containedAfterMainAdvance.comparison,
      commits: [{ sha: "e".repeat(40) }],
    },
  }).join(";"),
  /comparison head is not the observed main revision/,
);
assert.match(
  mainCandidateContainmentErrors({
    candidateSha: mergeCommitSha,
    ...containedCandidate,
    comparison: {
      ...containedCandidate.comparison,
      merge_base_commit: { sha: "e".repeat(40) },
    },
  }).join(";"),
  /merge base is not the release candidate/,
);
assert.match(
  mainCandidateContainmentErrors({
    candidateSha: mergeCommitSha,
    ...containedCandidate,
    comparison: { ...containedCandidate.comparison, ahead_by: 1 },
  }).join(";"),
  /comparison distance is inconsistent with identical revisions/,
);
assert.match(
  mainCandidateContainmentErrors({
    candidateSha: mergeCommitSha,
    ...containedAfterMainAdvance,
    comparison: { ...containedAfterMainAdvance.comparison, behind_by: 1 },
  }).join(";"),
  /comparison distance is inconsistent with an advanced main revision/,
);
for (const comparison of [
  { ...containedAfterMainAdvance.comparison, ahead_by: 2 },
  { ...containedAfterMainAdvance.comparison, total_commits: 2 },
]) {
  assert.match(
    mainCandidateContainmentErrors({
      candidateSha: mergeCommitSha,
      ...containedAfterMainAdvance,
      comparison,
    }).join(";"),
    /comparison distance is inconsistent with an advanced main revision/,
  );
}
assert.match(
  approvalRunErrors(
    { ...waitingPublishRun, path: ".github/workflows/foreign.yml" },
    containedCandidate,
  ).join(";"),
  /not Publish Release/,
);
assert.match(
  approvalRunErrors(waitingPublishRun, {
    ...containedAfterMainAdvance,
    comparison: { ...containedAfterMainAdvance.comparison, status: "diverged" },
  }).join(";"),
  /not contained/,
);
assert.match(
  approvalRunErrors(waitingPublishRun, {
    ...containedAfterMainAdvance,
    branch: { ...containedAfterMainAdvance.branch, protected: false },
  }).join(";"),
  /not protected/,
);
assert.match(
  approvalRunErrors(
    { ...waitingPublishRun, status: "completed", conclusion: "success" },
    containedCandidate,
  ).join(";"),
  /not waiting/,
);

const recoveryOriginSha = mergeCommitSha;
const recoveryCandidateSha = advancedMainSha;
const recoveryControllerSha = "e".repeat(40);
const recoveryValidationRun = {
  databaseId: 123456,
  event: "push",
  headBranch: "main",
  headSha: recoveryOriginSha,
  status: "completed",
  conclusion: "success",
};
const recoveryReleasePullRequest = {
  number: 70,
  merged_at: "2026-09-03T10:00:00Z",
  merge_commit_sha: recoveryOriginSha,
  base: { ref: "main" },
  head: {
    ref: "release-please--branches--main--components--agent-skills",
    sha: "9".repeat(40),
  },
};
const recoveryPullRequestValidationRun = {
  databaseId: 123455,
  event: "pull_request",
  headBranch: recoveryReleasePullRequest.head.ref,
  headSha: recoveryReleasePullRequest.head.sha,
  status: "completed",
  conclusion: "success",
};
const recoveryComparison = {
  status: "ahead",
  ahead_by: 2,
  behind_by: 0,
  total_commits: 2,
  base_commit: { sha: recoveryOriginSha },
  merge_base_commit: { sha: recoveryOriginSha },
  commits: [{ sha: recoveryControllerSha }, { sha: recoveryCandidateSha }],
  files: PRE_PUBLICATION_RECOVERY_PATHS.map((filename) => ({
    filename,
    status:
      filename.startsWith(
        "docs/adrs/0053-recover-unpublished-releases-through-protected-replacement-candidates.",
      ) || filename.startsWith("scripts/release/verify-")
        ? "added"
        : "modified",
  })),
};
const recoveryImmutableFiles = PRE_PUBLICATION_RECOVERY_IMMUTABLE_PATHS.map(
  (immutablePath, index) => ({
    path: immutablePath,
    originBlobSha: String(index + 1).repeat(40),
    candidateBlobSha: String(index + 1).repeat(40),
  }),
);
const recoveryInput = (overrides = {}) => ({
  releaseOriginSha: recoveryOriginSha,
  candidateSha: recoveryCandidateSha,
  branch: { protected: true, commit: { sha: recoveryCandidateSha } },
  comparison: recoveryComparison,
  validateRuns: [recoveryValidationRun],
  releasePullRequest: recoveryReleasePullRequest,
  releasePullRequestFiles: GENERATED_RELEASE_FILES.map((filename) => ({
    filename,
    status: "modified",
  })),
  releasePullRequestValidateRuns: [recoveryPullRequestValidationRun],
  immutableFiles: recoveryImmutableFiles,
  releaseExists: false,
  tagExists: false,
  ...overrides,
});

assert.equal(PRE_PUBLICATION_RECOVERY_MAX_COMMITS, 4);
assert.equal(new Set(PRE_PUBLICATION_RECOVERY_PATHS).size, PRE_PUBLICATION_RECOVERY_PATHS.length);
assert.deepEqual(
  successfulMainValidateRun([recoveryValidationRun], recoveryOriginSha),
  recoveryValidationRun,
);
assert.deepEqual(
  successfulPullRequestValidateRun(
    [recoveryPullRequestValidationRun],
    recoveryReleasePullRequest.head.sha,
    recoveryReleasePullRequest.head.ref,
  ),
  recoveryPullRequestValidationRun,
);
assert.equal(
  successfulMainValidateRun(
    [{ ...recoveryValidationRun, conclusion: "failure" }],
    recoveryOriginSha,
  ),
  null,
);
assert.deepEqual(prePublicationRecoveryErrors(recoveryInput()), []);
assert.deepEqual(
  recoveryComparison.files.map((file) => file.filename).sort(),
  [...PRE_PUBLICATION_RECOVERY_PATHS].sort(),
  "the accepted recovery fixture must exercise every fixed allowlist path",
);
assert.match(
  prePublicationRecoveryErrors(
    recoveryInput({
      branch: { protected: true, commit: { sha: "f".repeat(40) } },
    }),
  ).join(";"),
  /not the exact protected main revision/,
);
assert.match(
  prePublicationRecoveryErrors(
    recoveryInput({
      comparison: {
        ...recoveryComparison,
        commits: [recoveryControllerSha],
      },
    }),
  ).join(";"),
  /commit response is incomplete/,
);
assert.match(
  releaseRecoveryComparisonErrors({
    releaseOriginSha: recoveryOriginSha,
    candidateSha: recoveryOriginSha,
    comparison: {
      ...recoveryComparison,
      status: "identical",
      ahead_by: 0,
      total_commits: 0,
      commits: [],
    },
  }).join(";"),
  /must be newer|not a strict descendant/,
  "an equal origin and candidate must not enter recovery",
);
assert.match(
  releaseRecoveryComparisonErrors({
    releaseOriginSha: recoveryOriginSha,
    candidateSha: recoveryCandidateSha,
    comparison: {
      ...recoveryComparison,
      status: "diverged",
      behind_by: 1,
    },
  }).join(";"),
  /not a strict descendant/,
  "a diverged candidate must not enter recovery",
);
for (const [boundary, comparison] of [
  ["comparison base", { ...recoveryComparison, base_commit: { sha: recoveryControllerSha } }],
  ["merge base", { ...recoveryComparison, merge_base_commit: { sha: recoveryControllerSha } }],
]) {
  assert.match(
    releaseRecoveryComparisonErrors({
      releaseOriginSha: recoveryOriginSha,
      candidateSha: recoveryCandidateSha,
      comparison,
    }).join(";"),
    new RegExp(`recovery ${boundary} is not the release origin`),
  );
}
assert.match(
  releaseRecoveryComparisonErrors({
    releaseOriginSha: recoveryOriginSha,
    candidateSha: recoveryCandidateSha,
    comparison: {
      ...recoveryComparison,
      ahead_by: PRE_PUBLICATION_RECOVERY_MAX_COMMITS + 1,
      total_commits: PRE_PUBLICATION_RECOVERY_MAX_COMMITS + 1,
      commits: Array.from({ length: PRE_PUBLICATION_RECOVERY_MAX_COMMITS }, (_, index) => ({
        sha: String(index + 1).repeat(40),
      })).concat({ sha: recoveryCandidateSha }),
    },
  }).join(";"),
  /exceeds the reviewed bound/,
);
assert.match(
  prePublicationRecoveryErrors(
    recoveryInput({
      comparison: {
        ...recoveryComparison,
        files: [
          {
            filename: "skills/engineering-workflows/example/SKILL.md",
            status: "modified",
          },
        ],
      },
    }),
  ).join(";"),
  /path is not allowed/,
);
assert.match(
  prePublicationRecoveryErrors(
    recoveryInput({
      comparison: {
        ...recoveryComparison,
        files: [
          {
            filename: "scripts/lib/release-management.mjs",
            previous_filename: "scripts/lib/old-release-management.mjs",
            status: "renamed",
          },
        ],
      },
    }),
  ).join(";"),
  /file status is not allowed/,
);
assert.match(
  prePublicationRecoveryErrors(
    recoveryInput({
      comparison: {
        ...recoveryComparison,
        files: [
          { filename: ".github/workflows/publish-release.yml", status: "modified" },
          { filename: "docs/publishing.md", status: "removed" },
        ],
      },
    }),
  ).join(";"),
  /file status is not allowed/,
  "removed recovery paths must fail even when the publication workflow changed",
);
assert.match(
  prePublicationRecoveryErrors(
    recoveryInput({
      comparison: {
        ...recoveryComparison,
        files: [
          {
            filename:
              "docs/adrs/0053-recover-unpublished-releases-through-protected-replacement-candidates.long.md",
            status: "added",
          },
        ],
      },
    }),
  ).join(";"),
  /does not change the guarded publication workflow/,
);
assert.match(
  prePublicationRecoveryErrors(
    recoveryInput({
      immutableFiles: recoveryImmutableFiles.map((file) =>
        file.path === "package.json" ? { ...file, candidateBlobSha: "f".repeat(40) } : file,
      ),
    }),
  ).join(";"),
  /immutable release input changed.*package\.json/,
);
assert.match(
  prePublicationRecoveryErrors(recoveryInput({ validateRuns: [] })).join(";"),
  /no successful hosted Validate/,
);
assert.match(
  prePublicationRecoveryErrors(
    recoveryInput({
      releasePullRequestFiles: [
        ...GENERATED_RELEASE_FILES.map((filename) => ({
          filename,
          status: "modified",
        })),
        { filename: "README.md", status: "modified" },
      ],
    }),
  ).join(";"),
  /did not change exactly the generated release files/,
);
assert.match(
  prePublicationRecoveryErrors(recoveryInput({ releasePullRequestValidateRuns: [] })).join(";"),
  /pull request has no successful hosted Validate run/,
);
assert.match(
  prePublicationRecoveryErrors(recoveryInput({ releaseExists: true })).join(";"),
  /GitHub Release is not proven absent/,
);
assert.match(
  prePublicationRecoveryErrors(recoveryInput({ tagExists: true })).join(";"),
  /target tag is not proven absent/,
);
assert.match(
  prePublicationRecoveryErrors(
    recoveryInput({
      branch: { protected: false, commit: { sha: recoveryCandidateSha } },
    }),
  ).join(";"),
  /main is not protected/,
  "recovery must not target an unprotected main revision",
);

const mainAfterRecoverySha = "f".repeat(40);
assert.deepEqual(
  prePublicationRecoveryErrors(
    recoveryInput({
      branch: { protected: true, commit: { sha: mainAfterRecoverySha } },
      allowContainedCandidate: true,
      candidateContainmentComparison: {
        status: "ahead",
        ahead_by: 1,
        behind_by: 0,
        total_commits: 1,
        base_commit: { sha: recoveryCandidateSha },
        merge_base_commit: { sha: recoveryCandidateSha },
        commits: [{ sha: mainAfterRecoverySha }],
      },
    }),
  ),
  [],
  "approval may re-prove an already authorized replacement candidate contained in newer main",
);

const releaseSubjects = {
  schemaVersion: 1,
  status: "pass",
  sourceRevision: {
    commit: recoveryOriginSha,
    tag: "manual-review-required",
    state: "clean",
  },
  releaseVersion: "0.21.0",
  pluginVersion: "1.1.0",
  archiveProfile: "zip-store-v1",
  subjects: {
    openai: { name: "openai.zip", sha256: "1".repeat(64), bytes: 10 },
    portable: { name: "portable.zip", sha256: "2".repeat(64), bytes: 20 },
  },
  differences: [],
};
const replacementSubjects = {
  ...structuredClone(releaseSubjects),
  sourceRevision: {
    ...releaseSubjects.sourceRevision,
    commit: recoveryCandidateSha,
  },
};
assert.deepEqual(releaseRecoverySubjectErrors(releaseSubjects, replacementSubjects), []);
assert.match(
  releaseRecoverySubjectErrors(releaseSubjects, {
    ...structuredClone(replacementSubjects),
    subjects: {
      ...replacementSubjects.subjects,
      openai: {
        ...replacementSubjects.subjects.openai,
        sha256: "3".repeat(64),
      },
    },
  }).join(";"),
  /not payload-equivalent/,
);
assert.match(
  releaseRecoverySubjectErrors(releaseSubjects, {
    ...structuredClone(replacementSubjects),
    sourceRevision: { ...replacementSubjects.sourceRevision, tag: "v0.21.0" },
  }).join(";"),
  /untagged validation marker/,
);
assert.throws(
  () =>
    verifyReleaseRecoverySubjects([
      "--origin-sha",
      recoveryOriginSha,
      "--candidate-sha",
      recoveryCandidateSha,
      "--release-version",
      "0.21.0",
      "--plugin-version",
      "1.1.0",
      "--archive-profile",
      "zip-store-v1",
    ]),
  /Usage: verify-release-recovery-subjects/,
  "missing artifact directories must fail instead of resolving to the working directory",
);

const recoverySubjectFixture = fs.mkdtempSync(
  path.join(os.tmpdir(), "agent-skills-release-recovery-subjects-"),
);
try {
  const originDirectory = path.join(recoverySubjectFixture, "origin");
  const candidateDirectory = path.join(recoverySubjectFixture, "candidate");
  fs.mkdirSync(originDirectory, { recursive: true });
  fs.mkdirSync(candidateDirectory, { recursive: true });
  const archiveBytes = {
    "openai.zip": Buffer.from("exact hosted openai zip bytes"),
    "portable.zip": Buffer.from("exact hosted portable zip bytes"),
  };
  const subjects = {};
  for (const [archive, bytes] of Object.entries(archiveBytes)) {
    fs.writeFileSync(path.join(originDirectory, archive), bytes);
    fs.writeFileSync(path.join(candidateDirectory, archive), bytes);
    subjects[archive] = {
      name: archive,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    };
  }
  const originDocument = {
    ...structuredClone(releaseSubjects),
    subjects: {
      openai: subjects["openai.zip"],
      portable: subjects["portable.zip"],
    },
  };
  const candidateDocument = {
    ...structuredClone(originDocument),
    sourceRevision: {
      ...originDocument.sourceRevision,
      commit: recoveryCandidateSha,
    },
  };
  writeJson(originDirectory, "release-subject.json", originDocument);
  writeJson(candidateDirectory, "release-subject.json", candidateDocument);
  const recoverySubjectArguments = [
    "--origin-dir",
    originDirectory,
    "--candidate-dir",
    candidateDirectory,
    "--origin-sha",
    recoveryOriginSha,
    "--candidate-sha",
    recoveryCandidateSha,
    "--release-version",
    "0.21.0",
    "--plugin-version",
    "1.1.0",
    "--archive-profile",
    "zip-store-v1",
  ];
  assert.doesNotThrow(() => verifyReleaseRecoverySubjects(recoverySubjectArguments));
  fs.writeFileSync(path.join(candidateDirectory, "openai.zip"), "different candidate bytes");
  assert.throws(
    () => verifyReleaseRecoverySubjects(recoverySubjectArguments),
    /openai\.zip.*differs|sha256 does not match/,
  );
} finally {
  fs.rmSync(recoverySubjectFixture, { recursive: true, force: true });
}

const releaseWatermark = releaseStateChangedAt(
  {
    published_at: "2026-08-26T12:00:00Z",
    updated_at: "2026-08-26T12:01:00Z",
    assets: [
      {
        name: "openai.zip",
        created_at: "2026-08-26T12:02:00Z",
        updated_at: null,
      },
      {
        name: "portable.zip",
        created_at: "2026-08-26T12:00:30Z",
        updated_at: null,
      },
    ],
  },
  ["openai.zip", "portable.zip"],
);
assert.equal(releaseWatermark, "2026-08-26T12:02:00.000Z");
const evidenceRun = {
  displayTitle: "Post-release Evidence · v0.21.0",
  event: "workflow_dispatch",
  headBranch: "main",
  status: "completed",
  conclusion: "success",
  createdAt: releaseWatermark,
};
assert.equal(
  evidenceRunCoversRelease(evidenceRun, releaseWatermark, {
    requireSuccess: true,
  }),
  false,
  "evidence created in the same timestamp second must not cover a release update",
);
assert.equal(
  evidenceRunCoversRelease(
    { ...evidenceRun, createdAt: "2026-08-26T12:02:01Z" },
    releaseWatermark,
    { requireSuccess: true },
  ),
  true,
);
const failedRetry = {
  ...evidenceRun,
  status: "completed",
  conclusion: "failure",
  createdAt: "2026-08-26T12:04:00Z",
};
const successfulEvidence = {
  ...evidenceRun,
  createdAt: "2026-08-26T12:03:00Z",
};
assert.equal(
  selectPostReleaseEvidenceRun([successfulEvidence, failedRetry], "v0.21.0"),
  failedRetry,
  "reconciliation observes the newest dispatch even when that retry failed",
);
assert.equal(
  selectPostReleaseEvidenceRun([successfulEvidence, failedRetry], "v0.21.0", {
    requireSuccess: true,
  }),
  successfulEvidence,
  "handoff selects the newest successful exact-tag evidence run",
);

const releasePleaseWorkflow = read(".github/workflows/release-please.yml");
const validateWorkflow = read(".github/workflows/validate.yml");
const publishWorkflow = read(".github/workflows/publish-release.yml");
const evidenceWorkflow = read(".github/workflows/post-release-evidence.yml");
const candidateVerifier = read("scripts/release/verify-main-release-candidate.mjs");
const releaseProvenanceVerifier = read("scripts/release/verify-release-please-merge.mjs");
const recoveryVerifier = read("scripts/release/verify-prepublication-release-recovery.mjs");
const recoverySubjectVerifier = read("scripts/release/verify-release-recovery-subjects.mjs");
const formatIgnore = read(".oxfmtignore");
assert.match(
  formatIgnore,
  /^CHANGELOG\.md$/m,
  "the Release Please-owned root changelog must remain outside formatter ownership",
);
assert.match(releasePleaseWorkflow, /actions\/create-github-app-token@v2/);
for (const permission of ["contents", "pull-requests", "issues"]) {
  assert.match(releasePleaseWorkflow, new RegExp(`permission-${permission}: write`));
}
assert.match(releasePleaseWorkflow, /googleapis\/release-please-action@v4/);
assert.match(releasePleaseWorkflow, /classify-release-please-trigger\.mjs --github-output/);
assert.match(releasePleaseWorkflow, /id: release-config/);
assert.match(
  releasePleaseWorkflow,
  /echo "config_file=release-please-config\.v0\.21\.0\.json" >> "\$GITHUB_OUTPUT"/,
);
assert.match(
  releasePleaseWorkflow,
  /config-file: \$\{\{ steps\.release-config\.outputs\.config_file \}\}/,
);
assert.doesNotMatch(releasePleaseWorkflow, /^\s+release-as:/m);
assert.match(releasePleaseWorkflow, /fetch-depth: 0/);
assert.match(releasePleaseWorkflow, /ref: \$\{\{ github\.sha \}\}/);
assert.match(releasePleaseWorkflow, /git fetch --no-tags --depth=1 origin "\$\{BEFORE_SHA\}"/);
assert.match(releasePleaseWorkflow, /Verify trusted protected-main source/);
assert.match(releasePleaseWorkflow, /expected_workflow_ref=.*release-please\.yml/);
assert.match(releasePleaseWorkflow, /branches\/main" --jq '\.protected'/);
assert.ok(
  releasePleaseWorkflow.indexOf("Verify trusted protected-main source") <
    releasePleaseWorkflow.indexOf("actions/create-github-app-token@v2") &&
    releasePleaseWorkflow.indexOf("classify-release-please-trigger.mjs") <
      releasePleaseWorkflow.indexOf("actions/create-github-app-token@v2"),
  "trusted main and merged release PRs must be verified before creating a write token",
);

assert.equal(occurrences(validateWorkflow, /^\s+archive: false$/gm), 3);
for (const asset of ["openai.zip", "portable.zip", "release-subject.json"]) {
  assert.match(validateWorkflow, new RegExp(`name: ${asset.replace(".", "\\.")}`));
}
assert.equal(occurrences(publishWorkflow, /actions\/download-artifact@v8/g), 9);
assert.equal(occurrences(publishWorkflow, /^\s+skip-decompress: true$/gm), 9);
assert.match(publishWorkflow, /^\s+environment: release$/m);
assert.match(publishWorkflow, /^\s+RELEASE_ENVIRONMENT: release$/m);
assert.doesNotMatch(publishWorkflow, /mark_latest|mark-latest/);
assert.match(
  publishWorkflow,
  /release_candidate: \$\{\{ \(steps\.release-intent\.outputs\.contract_kind == 'release-pr' && steps\.release-provenance\.outputs\.authorized == 'true'\) \|\| steps\.release-recovery\.outputs\.authorized == 'true' \}\}/,
);
assert.match(publishWorkflow, /candidate_sha: \$\{\{ github\.sha \}\}/);
assert.match(
  publishWorkflow,
  /run-name: \$\{\{ inputs\.recovery_release_sha != '' && format\('Publish Release · recovery \{0\}', inputs\.recovery_release_sha\) \|\| 'Publish Release' \}\}/,
);
assert.match(publishWorkflow, /^\s+recovery_release_sha:$/m);
assert.match(publishWorkflow, /verify-prepublication-release-recovery\.mjs/);
assert.match(publishWorkflow, /verify-release-recovery-subjects\.mjs/);
assert.match(publishWorkflow, /origin_validate_run_id/);
assert.match(publishWorkflow, /release-origin-subjects/);
assert.match(
  publishWorkflow,
  /ref: \$\{\{ needs\.publication-trigger\.outputs\.candidate_sha \}\}/,
);
assert.equal(occurrences(publishWorkflow, /verify-main-release-candidate\.mjs/g), 2);
assert.equal(
  occurrences(
    publishWorkflow,
    /node scripts\/release\/print-release-notes\.mjs > release-notes\.md/g,
  ),
  2,
);
assert.doesNotMatch(publishWorkflow, /npm run release:notes > release-notes\.md/);
assert.doesNotMatch(publishWorkflow, /main advanced after release readiness/);
assert.match(candidateVerifier, /branches\/main/);
assert.match(candidateVerifier, /compare\/\$\{candidateSha\}\.\.\.\$\{mainSha\}/);
assert.match(candidateVerifier, /mainCandidateContainmentErrors/);
assert.match(
  publishWorkflow,
  /npm run release:intent -- \\\n\s+--base-ref "\$\{base_sha\}" \\\n\s+--head-ref "\$\{GITHUB_SHA\}" \\\n\s+--github-output/,
);
assert.match(
  publishWorkflow,
  /release-readiness:\n\s+needs: publication-trigger\n\s+if: \$\{\{ needs\.publication-trigger\.outputs\.readiness_required == 'true' \}\}/,
);
assert.match(publishWorkflow, /verify-release-please-merge\.mjs/);
assert.match(publishWorkflow, /--expected-app-id "\$EXPECTED_APP_ID"/);
assert.match(recoveryVerifier, /PRE_PUBLICATION_RECOVERY_IMMUTABLE_PATHS/);
assert.match(recoveryVerifier, /releases\/tags\/\$\{tag\}/);
assert.match(recoveryVerifier, /git\/ref\/tags\/\$\{tag\}/);
assert.match(recoveryVerifier, /--workflow",\s+"validate\.yml"/);
assert.doesNotMatch(
  recoveryVerifier,
  /compare\/\$\{candidateSha\}\.\.\.\$\{branch\?\.commit\?\.sha\}\?per_page=/,
  "approval containment must use GitHub's unpaginated comparison head guarantee",
);
assert.doesNotMatch(recoveryVerifier, /reconcile-github-release|release create|git push/);
assert.match(recoverySubjectVerifier, /readFileSync\(left\)\.equals\(fs\.readFileSync\(right\)\)/);
assert.match(recoverySubjectVerifier, /validateReleaseSubjectFile/);
assert.doesNotMatch(releaseProvenanceVerifier, /ghJson\(`apps\//);
assert.doesNotMatch(publishWorkflow, /gh api "apps\/\$\{APP_SLUG\}"/);
assert.match(publishWorkflow, /Publication mutation supports only v0\.21\.0 and newer releases/);
assert.match(
  publishWorkflow,
  /always\(\) && steps\.reconciliation-apply\.outputs\.post_release_dispatch_required == 'true'/,
);
const readiness = publishWorkflow.split("\n  publish:")[0];
assert.doesNotMatch(readiness, /^\s+(?:contents|actions|attestations|id-token): write$/m);
assert.doesNotMatch(readiness, /actions\/attest@|reconcile-github-release\.mjs apply/);
const publishJob = publishWorkflow.split("\n  publish:")[1];
const environmentCheckIndex = publishJob.indexOf("check-release-environment.mjs");
assert.ok(environmentCheckIndex >= 0, "publish must preflight the protected environment");
assert.ok(environmentCheckIndex < publishJob.indexOf("pnpm/setup@v2"));
assert.ok(environmentCheckIndex < publishJob.indexOf("pnpm install"));
assert.ok(environmentCheckIndex < publishJob.indexOf("actions/attest@v4"));
assert.ok(environmentCheckIndex < publishJob.indexOf("reconcile-github-release.mjs apply"));
assert.match(publishJob, /persist-credentials: false/);
assert.match(publishJob, /--ignore-scripts/);
assert.match(publishJob, /^\s+artifact-metadata: write$/m);
assert.match(
  publishJob,
  /if: \$\{\{ steps\.reconciliation\.outputs\.attestation_verification_required == 'true' \}\}/,
);
assert.match(publishJob, /autorelease: tagged/);
assert.match(publishJob, /autorelease%3A%20pending/);
assert.match(validateWorkflow, /Verify generated release-PR provenance/);
assert.match(validateWorkflow, /verify-release-please-merge\.mjs/);
assert.doesNotMatch(validateWorkflow.split("\nconcurrency:")[0], /issues: read/);
assert.match(evidenceWorkflow, /^on:\n  workflow_dispatch:/m);
assert.match(evidenceWorkflow, /^run-name: Post-release Evidence · \$\{\{ inputs\.tag \}\}$/m);
assert.doesNotMatch(evidenceWorkflow, /release:\n\s+types:|release\.published/);

const managerScript = read("scripts/release/manage-release.mjs");
assert.match(managerScript, /tagName,isLatest,isDraft,publishedAt/);
assert.doesNotMatch(managerScript, /tagName,isLatest,isDraft,publishedAt,url/);
assert.match(managerScript, /repos\/\$\{repository\}\/releases\/latest/);
assert.doesNotMatch(managerScript, /"assets,isLatest,isDraft,url"/);
assert.match(managerScript, /displayTitle,status,conclusion,headBranch,event,createdAt,url/);
assert.match(managerScript, /postReleaseEvidenceTitle\(tag\)/);
assert.match(managerScript, /evidenceRunCoversRelease\(evidence, stateChangedAt/);
assert.match(
  managerScript,
  /selectPostReleaseEvidenceRun\(evidenceRuns, tag, \{ requireSuccess: true \}\)/,
);
assert.match(managerScript, /JSON\.stringify\(assetNames\) !== JSON\.stringify\(required\)/);
assert.match(managerScript, /tagIdentity\.annotated !== true/);
assert.match(managerScript, /subject\?\.sourceRevision\?\.commit !== tagIdentity\.commit/);
assert.match(managerScript, /\.github\/workflows\/publish-release\.yml/);
assert.match(managerScript, /pending_deployments/);
assert.match(managerScript, /repos\/\$\{repository\}\/labels\?per_page=100/);
assert.match(managerScript, /Release Please lifecycle labels are missing/);
assert.match(managerScript, /--recovery-release-sha/);
assert.match(managerScript, /Publish Release · recovery/);
assert.match(managerScript, /verify-prepublication-release-recovery\.mjs/);
for (const command of [
  "status",
  "setup-check",
  "impact",
  "release-pr",
  "publish-plan",
  "publish",
  "approve",
  "post-release",
  "openai-handoff",
]) {
  assert.match(managerScript, new RegExp(`(?:case |\\")${command}`));
}
assert.doesNotMatch(managerScript, /commandResult\("git"|\["release", "create"\]/);
const preMajorBreakingImpact = spawnSync(
  process.execPath,
  [
    path.join(repositoryRoot, "scripts/release/manage-release.mjs"),
    "impact",
    "--kind",
    "breaking",
    "--skill",
    "architecture-compass",
  ],
  { cwd: repositoryRoot, encoding: "utf8" },
);
assert.equal(
  preMajorBreakingImpact.status,
  0,
  preMajorBreakingImpact.stderr || preMajorBreakingImpact.stdout,
);
assert.match(preMajorBreakingImpact.stdout, /0\.6\.6 -> 0\.7\.0 \(breaking\)/);
const missingConfirmation = spawnSync(
  process.execPath,
  [path.join(repositoryRoot, "scripts/release/manage-release.mjs"), "release-pr"],
  { cwd: repositoryRoot, encoding: "utf8" },
);
assert.notEqual(missingConfirmation.status, 0);
assert.match(missingConfirmation.stderr, /rerun with --confirm/);
const invalidRecoverySha = spawnSync(
  process.execPath,
  [
    path.join(repositoryRoot, "scripts/release/manage-release.mjs"),
    "publish-plan",
    "--recovery-release-sha",
    "abc123",
    "--confirm",
  ],
  { cwd: repositoryRoot, encoding: "utf8" },
);
assert.notEqual(invalidRecoverySha.status, 0);
assert.match(invalidRecoverySha.stderr, /full lowercase 40-hex commit SHA/);

console.log("Release Please, release-impact, workflow, and management fixtures passed.");
