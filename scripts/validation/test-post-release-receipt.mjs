import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createReleaseSubject, sha256File } from "../lib/release-subject.mjs";
import { pluginArtifactPaths } from "../lib/release-descriptor.mjs";
import { POST_RELEASE_CONTRACT_FILES } from "../release/post-release-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const validator = path.join(repositoryRoot, "scripts/release/validate-post-release-receipt.mjs");
const renderer = path.join(repositoryRoot, "scripts/release/render-post-release-receipt.mjs");
const artifactPaths = pluginArtifactPaths(repositoryRoot);
const schema = path.join(repositoryRoot, artifactPaths.postReleaseReceiptSchema);
const manualTemplatePath = path.join(repositoryRoot, artifactPaths.manualClientLifecycleTemplate);

const lifecycleOperation = (status, reason) => ({ status, reason });
const manualReceiptFixture = () => JSON.parse(fs.readFileSync(manualTemplatePath, "utf8"));

function workflowStepBlock(workflow, stepName) {
  const nameIndex = workflow.indexOf(stepName);
  assert.notEqual(nameIndex, -1, `workflow step is missing: ${stepName}`);
  const start = workflow.lastIndexOf("\n      - name:", nameIndex);
  assert.notEqual(start, -1, `workflow step boundary is missing: ${stepName}`);
  const next = workflow.indexOf("\n      - name:", nameIndex + stepName.length);
  return workflow.slice(start, next === -1 ? workflow.length : next);
}

const archiveReceipt = () => {
  const openaiSha = "a".repeat(64);
  const portableSha = "b".repeat(64);
  const sourceCommit = "c".repeat(40);
  const artifact = (name, sha) => ({
    name,
    role: "publication-subject",
    sha256: sha,
    publishedSha256: sha,
    bytes: 128,
  });
  return {
    schemaVersion: "1",
    receiptType: "post_release_archive",
    status: "pass",
    evidenceClass: "repo-verified",
    generatedAt: "2026-08-20T00:00:00Z",
    release: {
      tag: "v0.20.0",
      sourceCommit,
      sourceState: "clean",
      event: "release.published",
      archiveSubjectsStatus: "pass",
    },
    artifacts: [artifact("openai.zip", openaiSha), artifact("portable.zip", portableSha)],
    attestation: {
      status: "verified",
      repository: "stark-ai-de/agent-skills",
      sourceDigest: sourceCommit,
      predicateType: "https://slsa.dev/provenance/v1",
      subjects: [
        { name: "openai.zip", sha256: openaiSha },
        { name: "portable.zip", sha256: portableSha },
      ],
    },
    client: { name: "GitHub Actions", surface: "post-release-verifier" },
    tests: {
      ids: ["POST-RELEASE-PACKAGE", "POST-RELEASE-RELEASE-SUBJECTS", "POST-RELEASE-ATTESTATION"],
      commandFamily: "gh_attestation_verify",
      counts: { total: 3, passed: 3, blocked: 0, notRun: 0, notApplicable: 0 },
    },
    lifecycle: {
      operations: {
        add: lifecycleOperation("not_applicable", "not_a_client_lifecycle_receipt"),
        enable: lifecycleOperation("not_applicable", "not_a_client_lifecycle_receipt"),
        disable: lifecycleOperation("not_applicable", "not_a_client_lifecycle_receipt"),
        update: lifecycleOperation("not_applicable", "not_a_client_lifecycle_receipt"),
        remove: lifecycleOperation("not_applicable", "not_a_client_lifecycle_receipt"),
      },
    },
    blockers: [],
    reason: "tag_bound_archives_and_attestations_verified",
  };
};

function validateFixture(receipt) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "post-release-receipt-"));
  const fixturePath = path.join(fixtureRoot, "receipt.json");
  fs.writeFileSync(fixturePath, `${JSON.stringify(receipt, null, 2)}\n`);
  try {
    return {
      ok: true,
      output: execFileSync(
        process.execPath,
        [validator, "--schema", schema, "--file", fixturePath],
        {
          cwd: repositoryRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      ),
    };
  } catch (error) {
    return { ok: false, stderr: error.stderr?.toString() ?? "" };
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function renderFixture(kind, environment) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "post-release-render-"));
  const fixturePath = path.join(fixtureRoot, "receipt.json");
  try {
    execFileSync(process.execPath, [renderer, "--render", kind, "--file", fixturePath], {
      cwd: repositoryRoot,
      env: { ...process.env, ...environment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const receipt = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    assert.equal(validateFixture(receipt).ok, true, `${kind} renderer produced an invalid receipt`);
    return receipt;
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

assert.equal(validateFixture(manualReceiptFixture()).ok, true);
assert.deepEqual(manualReceiptFixture().tests.counts, {
  total: 5,
  passed: 0,
  blocked: 0,
  notRun: 4,
  notApplicable: 1,
});

const passingManualReceipt = manualReceiptFixture();
passingManualReceipt.status = "pass";
passingManualReceipt.evidenceClass = "live-observed";
passingManualReceipt.blockers = [];
passingManualReceipt.reason = "manual_client_lifecycle_verified";
for (const operation of ["add", "enable", "disable", "remove"]) {
  passingManualReceipt.lifecycle.operations[operation] = lifecycleOperation(
    "pass",
    "manual_observation_passed",
  );
}
passingManualReceipt.tests.counts = {
  total: 5,
  passed: 4,
  blocked: 0,
  notRun: 0,
  notApplicable: 1,
};
assert.equal(validateFixture(passingManualReceipt).ok, true);

const staleManualCounts = structuredClone(passingManualReceipt);
staleManualCounts.tests.counts.notRun = 1;
staleManualCounts.tests.counts.notApplicable = 0;
assert.equal(validateFixture(staleManualCounts).ok, false);

const mismatchedManualOperation = structuredClone(passingManualReceipt);
mismatchedManualOperation.lifecycle.operations.disable.status = "blocked";
assert.equal(validateFixture(mismatchedManualOperation).ok, false);

const retrospectiveManualOperation = manualReceiptFixture();
retrospectiveManualOperation.lifecycle.operations.add.status = "retrospective";
assert.equal(validateFixture(retrospectiveManualOperation).ok, false);

const historicalReceipt = manualReceiptFixture();
historicalReceipt.status = "retrospective";
historicalReceipt.evidenceClass = "historical";
historicalReceipt.release.tag = "v0.19.1";
historicalReceipt.release.sourceCommit = "35101f206b2416b2ac5a5fb7205fdd65c3f843b1";
historicalReceipt.release.archiveSubjectsStatus = "not_applicable";
historicalReceipt.attestation.status = "not-pre-publication-attested";
historicalReceipt.blockers = ["historical_unsigned_release_not_pre_publication_attested"];
assert.equal(validateFixture(historicalReceipt).ok, true);

const passingArchive = archiveReceipt();
assert.equal(validateFixture(passingArchive).ok, true);

const missingArchive = archiveReceipt();
missingArchive.artifacts.pop();
assert.equal(validateFixture(missingArchive).ok, false);

const duplicateArchive = archiveReceipt();
duplicateArchive.artifacts[1] = structuredClone(duplicateArchive.artifacts[0]);
assert.equal(validateFixture(duplicateArchive).ok, false);

const unverifiedArchive = archiveReceipt();
unverifiedArchive.attestation.status = "blocked";
assert.equal(validateFixture(unverifiedArchive).ok, false);

const mismatchedAttestationSubject = archiveReceipt();
mismatchedAttestationSubject.attestation.subjects[0].sha256 = "d".repeat(64);
assert.equal(validateFixture(mismatchedAttestationSubject).ok, false);

const renderSourceCommit = "e".repeat(40);
const renderOpenaiSha = "f".repeat(64);
const renderPortableSha = "0".repeat(64);
const renderArchiveEnvironment = {
  RECEIPT_TAG: "v0.20.0",
  SOURCE_COMMIT: renderSourceCommit,
  EVENT_NAME: "release.published",
  REPOSITORY: "stark-ai-de/agent-skills",
  OPENAI_SHA: renderOpenaiSha,
  PORTABLE_SHA: renderPortableSha,
  OPENAI_BYTES: "128",
  PORTABLE_BYTES: "256",
};

const expectedArchiveLifecycle = {
  add: lifecycleOperation("not_applicable", "not_a_client_lifecycle_receipt"),
  enable: lifecycleOperation("not_applicable", "not_a_client_lifecycle_receipt"),
  disable: lifecycleOperation("not_applicable", "not_a_client_lifecycle_receipt"),
  update: lifecycleOperation("not_applicable", "not_a_client_lifecycle_receipt"),
  remove: lifecycleOperation("not_applicable", "not_a_client_lifecycle_receipt"),
};
const preReleaseRendered = renderFixture("pre_release_archive", {
  ...renderArchiveEnvironment,
});
assert.equal(preReleaseRendered.status, "pass");
assert.deepEqual(preReleaseRendered.lifecycle.operations, expectedArchiveLifecycle);
const postReleaseRendered = renderFixture("post_release_archive", {
  ...renderArchiveEnvironment,
  PACKAGE_STATUS: "pass",
  ASSET_STATUS: "pass",
  PUBLISHED_OPENAI_SHA: renderOpenaiSha,
  PUBLISHED_PORTABLE_SHA: renderPortableSha,
  ATTESTATION_STATUS: "verified",
});
assert.equal(postReleaseRendered.status, "pass");
assert.deepEqual(postReleaseRendered.lifecycle.operations, expectedArchiveLifecycle);
const assetMismatchRendered = renderFixture("post_release_archive", {
  ...renderArchiveEnvironment,
  PACKAGE_STATUS: "pass",
  ASSET_STATUS: "blocked",
  PUBLISHED_OPENAI_SHA: "1".repeat(64),
  PUBLISHED_PORTABLE_SHA: renderPortableSha,
  ATTESTATION_STATUS: "verified",
});
assert.equal(assetMismatchRendered.status, "blocked");
assert.equal(assetMismatchRendered.attestation.status, "blocked");
const preparationBlockedRendered = renderFixture("post_release_archive", {
  ...renderArchiveEnvironment,
  PACKAGE_STATUS: "blocked",
  ASSET_STATUS: "blocked",
  ATTESTATION_STATUS: "blocked",
});
assert.equal(preparationBlockedRendered.status, "blocked");
assert.ok(preparationBlockedRendered.blockers.includes("tag_bound_archive_rebuild_failed"));
assert.equal(
  renderFixture("post_release_archive", {
    ...renderArchiveEnvironment,
    PACKAGE_STATUS: "pass",
    ASSET_STATUS: "pass",
    PUBLISHED_OPENAI_SHA: renderOpenaiSha,
    PUBLISHED_PORTABLE_SHA: renderPortableSha,
    ATTESTATION_STATUS: "blocked",
  }).status,
  "blocked",
);
const historicalRendered = renderFixture("post_release_archive", {
  ...renderArchiveEnvironment,
  RECEIPT_TAG: "v0.19.1",
  SOURCE_COMMIT: "35101f206b2416b2ac5a5fb7205fdd65c3f843b1",
  PACKAGE_STATUS: "not_applicable",
  ASSET_STATUS: "not_applicable",
  ATTESTATION_STATUS: "not-pre-publication-attested",
});
assert.equal(historicalRendered.status, "retrospective");
assert.deepEqual(historicalRendered.lifecycle.operations, expectedArchiveLifecycle);
assert.deepEqual(historicalRendered.blockers, [
  "historical_unsigned_release_not_pre_publication_attested",
]);
assert.equal(historicalRendered.artifacts.length, 2);
assert.deepEqual(historicalRendered.attestation.subjects, []);
assert.equal(historicalRendered.tests.counts.passed, 0);
assert.equal(historicalRendered.tests.counts.notApplicable, 3);
const historicalMismatchRendered = renderFixture("post_release_archive", {
  ...renderArchiveEnvironment,
  RECEIPT_TAG: "v0.19.1",
  SOURCE_COMMIT: "35101f206b2416b2ac5a5fb7205fdd65c3f843b1",
  PACKAGE_STATUS: "blocked",
  ASSET_STATUS: "not_applicable",
  ATTESTATION_STATUS: "blocked",
});
assert.equal(historicalMismatchRendered.status, "blocked");
assert.equal(historicalMismatchRendered.artifacts.length, 0);
function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function outputValue(filePath, name) {
  const line = fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((entry) => entry.startsWith(`${name}=`))
    .at(-1);
  return line?.slice(name.length + 1) ?? null;
}

const contractFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "post-release-contract-"));
try {
  const capturedRoot = path.join(contractFixtureRoot, "captured");
  const restoredRoot = path.join(contractFixtureRoot, "restored");
  run(process.execPath, [
    path.join(repositoryRoot, "scripts/release/post-release-contract.mjs"),
    "capture",
    "--destination",
    capturedRoot,
  ]);
  run(process.execPath, [
    path.join(capturedRoot, "scripts/release/post-release-contract.mjs"),
    "restore",
    "--destination",
    restoredRoot,
  ]);
  for (const relativePath of POST_RELEASE_CONTRACT_FILES) {
    assert.equal(fs.existsSync(path.join(capturedRoot, relativePath)), true, relativePath);
    assert.equal(fs.existsSync(path.join(restoredRoot, relativePath)), true, relativePath);
  }
} finally {
  fs.rmSync(contractFixtureRoot, { recursive: true, force: true });
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const tagFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "post-release-tag-"));
try {
  const remoteRoot = path.join(tagFixtureRoot, "remote.git");
  const workRoot = path.join(tagFixtureRoot, "work");
  fs.mkdirSync(workRoot, { recursive: true });
  git(["init", "--bare", remoteRoot], tagFixtureRoot);
  git(["init", "--initial-branch=main"], workRoot);
  git(["config", "user.email", "test@example.invalid"], workRoot);
  git(["config", "user.name", "Release Test"], workRoot);
  fs.writeFileSync(path.join(workRoot, "README.md"), "release fixture\n");
  git(["add", "README.md"], workRoot);
  git(["commit", "-m", "fixture"], workRoot);
  git(["tag", "v0.20.0"], workRoot);
  git(["remote", "add", "origin", remoteRoot], workRoot);
  git(["push", "origin", "HEAD:refs/heads/main", "refs/tags/v0.20.0"], workRoot);

  const outputPath = path.join(tagFixtureRoot, "tag-output");
  run(
    process.execPath,
    [
      path.join(repositoryRoot, "scripts/release/resolve-release-tag.mjs"),
      "--tag",
      "v0.20.0",
      "--github-output",
      outputPath,
    ],
    { cwd: workRoot },
  );
  assert.equal(outputValue(outputPath, "release_sha"), git(["rev-parse", "HEAD"], workRoot));
  assert.throws(() =>
    run(
      process.execPath,
      [
        path.join(repositoryRoot, "scripts/release/resolve-release-tag.mjs"),
        "--tag",
        "main",
        "--github-output",
        outputPath,
      ],
      { cwd: workRoot },
    ),
  );
  fs.writeFileSync(path.join(workRoot, "dirty.txt"), "dirty\n");
  assert.throws(() =>
    run(
      process.execPath,
      [
        path.join(repositoryRoot, "scripts/release/resolve-release-tag.mjs"),
        "--tag",
        "v0.20.0",
        "--github-output",
        outputPath,
      ],
      { cwd: workRoot },
    ),
  );
} finally {
  fs.rmSync(tagFixtureRoot, { recursive: true, force: true });
}

const subjectFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "post-release-subjects-"));
try {
  const subjectsRoot = path.join(subjectFixtureRoot, "subjects");
  const publishedRoot = path.join(subjectFixtureRoot, "published");
  const outputPath = path.join(subjectFixtureRoot, "github-output");
  fs.mkdirSync(subjectsRoot, { recursive: true });
  fs.mkdirSync(publishedRoot, { recursive: true });
  for (const name of ["openai.zip", "portable.zip"]) {
    fs.writeFileSync(path.join(subjectsRoot, name), `${name}:verified\n`);
    fs.copyFileSync(path.join(subjectsRoot, name), path.join(publishedRoot, name));
  }
  fs.writeFileSync(
    path.join(subjectsRoot, "release-subject.json"),
    `${JSON.stringify(
      createReleaseSubject({
        status: "pass",
        sourceRevision: {
          commit: "d".repeat(40),
          tag: "v0.20.0",
          state: "clean",
        },
        releaseVersion: "0.20.0",
        pluginVersion: "0.20.0",
        archiveProfile: "zip-store-v1",
        openai: {
          sha256: sha256File(path.join(subjectsRoot, "openai.zip")),
          bytes: fs.statSync(path.join(subjectsRoot, "openai.zip")).size,
        },
        portable: {
          sha256: sha256File(path.join(subjectsRoot, "portable.zip")),
          bytes: fs.statSync(path.join(subjectsRoot, "portable.zip")).size,
        },
      }),
      null,
      2,
    )}\n`,
  );
  const compareArgs = [
    path.join(repositoryRoot, "scripts/release/compare-release-subjects.mjs"),
    "--tag",
    "v0.20.0",
    "--package-status",
    "pass",
    "--subjects-dir",
    subjectsRoot,
    "--published-dir",
    publishedRoot,
    "--github-output",
    outputPath,
  ];
  run(process.execPath, compareArgs);
  assert.equal(outputValue(outputPath, "status"), "pass");
  fs.writeFileSync(path.join(publishedRoot, "openai.zip"), "tampered\n");
  run(process.execPath, compareArgs);
  assert.equal(outputValue(outputPath, "status"), "blocked");
  fs.rmSync(path.join(publishedRoot, "portable.zip"));
  run(process.execPath, compareArgs);
  assert.equal(outputValue(outputPath, "status"), "blocked");
  const historicalCompareArgs = [...compareArgs];
  historicalCompareArgs[2] = "v0.19.1";
  run(process.execPath, historicalCompareArgs);
  assert.equal(outputValue(outputPath, "status"), "not_applicable");
} finally {
  fs.rmSync(subjectFixtureRoot, { recursive: true, force: true });
}

const legacyFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "post-release-legacy-"));
try {
  const scriptsRoot = path.join(legacyFixtureRoot, "scripts");
  const libRoot = path.join(legacyFixtureRoot, "lib");
  const runnerRoot = path.join(legacyFixtureRoot, "runner");
  fs.mkdirSync(scriptsRoot, { recursive: true });
  fs.mkdirSync(libRoot, { recursive: true });
  fs.mkdirSync(runnerRoot, { recursive: true });
  fs.copyFileSync(
    path.join(repositoryRoot, "scripts/release/prepare-release-subjects.mjs"),
    path.join(scriptsRoot, "prepare-release-subjects.mjs"),
  );
  fs.copyFileSync(
    path.join(repositoryRoot, "scripts/lib/release-subject.mjs"),
    path.join(libRoot, "release-subject.mjs"),
  );
  fs.writeFileSync(
    path.join(scriptsRoot, "verify-release-reproducibility.mjs"),
    `import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const evidence = args[args.indexOf("--evidence") + 1];
const releaseTag = process.env.LEGACY_EVIDENCE_RELEASE_TAG;
const releaseVersion = process.env.LEGACY_EVIDENCE_RELEASE_VERSION;
fs.mkdirSync(path.dirname(evidence), { recursive: true });
fs.writeFileSync(evidence, JSON.stringify({
  ...(releaseTag ? { releaseTag } : {}),
  ...(releaseVersion ? { releaseVersion } : {}),
  package: { version: "1.0.0" },
  archives: {
    "openai.zip": { sha256: "${"a".repeat(64)}", bytes: 10 },
    "portable.zip": { sha256: "${"b".repeat(64)}", bytes: 20 }
  },
  reproducibility: {
    byteIdentical: process.env.LEGACY_BYTE_IDENTICAL !== "false",
    archiveProfile: "zip-store-v1"
  }
}));
if (process.env.LEGACY_BYTE_IDENTICAL === "false") process.exitCode = 1;
`,
  );
  const outputPath = path.join(legacyFixtureRoot, "github-output");
  const reportPath = path.join(legacyFixtureRoot, "report.json");
  const subjectsPath = path.join(legacyFixtureRoot, "subjects");
  const prepareArgs = [
    path.join(scriptsRoot, "prepare-release-subjects.mjs"),
    "--evidence",
    path.join(legacyFixtureRoot, "legacy-evidence.json"),
    "--subjects-dir",
    subjectsPath,
    "--github-output",
    outputPath,
    "--report-file",
    reportPath,
  ];
  const resetLegacyOutput = () => {
    fs.rmSync(outputPath, { force: true });
    fs.rmSync(reportPath, { force: true });
    fs.rmSync(subjectsPath, { recursive: true, force: true });
  };
  const prepareLegacy = (extraEnvironment = {}) =>
    run(process.execPath, prepareArgs, {
      cwd: legacyFixtureRoot,
      env: {
        ...process.env,
        RUNNER_TEMP: runnerRoot,
        RELEASE_SHA: "e".repeat(40),
        RELEASE_TAG: "v0.19.1",
        ...extraEnvironment,
      },
    });

  fs.writeFileSync(
    path.join(legacyFixtureRoot, "package.json"),
    `${JSON.stringify({ version: "0.19.1" })}\n`,
  );
  prepareLegacy();
  assert.equal(outputValue(outputPath, "status"), "not_applicable");
  const legacySubject = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(legacySubject.schemaVersion, 1);
  assert.equal(legacySubject.sourceRevision.commit, "e".repeat(40));
  assert.equal(legacySubject.releaseVersion, "0.19.1");
  assert.equal(legacySubject.pluginVersion, "1.0.0");
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(legacyFixtureRoot, "subjects/release-subject.json"), "utf8"),
    ).status,
    "not_applicable",
  );

  resetLegacyOutput();
  fs.rmSync(path.join(legacyFixtureRoot, "package.json"));
  prepareLegacy();
  assert.equal(JSON.parse(fs.readFileSync(reportPath, "utf8")).releaseVersion, "0.19.1");

  resetLegacyOutput();
  fs.writeFileSync(
    path.join(legacyFixtureRoot, "package.json"),
    `${JSON.stringify({ version: "0.20.0" })}\n`,
  );
  assert.throws(() => prepareLegacy());

  resetLegacyOutput();
  fs.writeFileSync(
    path.join(legacyFixtureRoot, "package.json"),
    `${JSON.stringify({ version: "0.19.1" })}\n`,
  );
  assert.throws(() => prepareLegacy({ LEGACY_EVIDENCE_RELEASE_VERSION: "0.20.0" }));

  resetLegacyOutput();
  assert.throws(() => prepareLegacy({ LEGACY_EVIDENCE_RELEASE_TAG: "v0.20.0" }));

  resetLegacyOutput();
  assert.throws(() => prepareLegacy({ LEGACY_BYTE_IDENTICAL: "false" }));
  assert.equal(outputValue(outputPath, "status"), "blocked");
  assert.equal(fs.existsSync(reportPath), false);
  assert.equal(fs.existsSync(path.join(subjectsPath, "release-subject.json")), false);
  assert.deepEqual(fs.readdirSync(runnerRoot), []);
} finally {
  fs.rmSync(legacyFixtureRoot, { recursive: true, force: true });
}

const lyingArchiveLifecycle = archiveReceipt();
lyingArchiveLifecycle.lifecycle.operations.add.status = "not_run";
assert.equal(validateFixture(lyingArchiveLifecycle).ok, false);

const tamperedArchive = archiveReceipt();
tamperedArchive.artifacts[0].publishedSha256 = "d".repeat(64);
assert.equal(validateFixture(tamperedArchive).ok, false);

const wrongSourceDigest = archiveReceipt();
wrongSourceDigest.attestation.sourceDigest = "d".repeat(40);
assert.equal(validateFixture(wrongSourceDigest).ok, false);

const wrongTag = manualReceiptFixture();
wrongTag.release.tag = "main";
assert.equal(validateFixture(wrongTag).ok, false);

for (const forbiddenText of [
  "raw prompt: do something private",
  "transcript: user supplied text",
  "api_key=not-a-real-key",
  "https://internal.example.test/service",
  "localhost:8080",
]) {
  const receipt = manualReceiptFixture();
  receipt.reason = forbiddenText;
  const result = validateFixture(receipt);
  assert.equal(result.ok, false, `sanitizer accepted forbidden text: ${forbiddenText}`);
  assert.match(result.stderr, /Post-release receipt validation errors/);
}

const publishWorkflow = fs.readFileSync(
  path.join(repositoryRoot, ".github/workflows/publish-release.yml"),
  "utf8",
);
const postReleaseWorkflow = fs.readFileSync(
  path.join(repositoryRoot, ".github/workflows/post-release-evidence.yml"),
  "utf8",
);
const postReleaseAction = fs.readFileSync(
  path.join(repositoryRoot, ".github/actions/post-release-subjects/action.yml"),
  "utf8",
);
const attestWorkflow = fs.readFileSync(
  path.join(repositoryRoot, ".github/workflows/attest-release.yml"),
  "utf8",
);
const rendererImplementationSource = fs.readFileSync(
  path.join(repositoryRoot, "scripts/lib/post-release-receipt-renderer.mjs"),
  "utf8",
);
assert.ok(
  publishWorkflow.indexOf("Verify tag and release do not exist") <
    publishWorkflow.indexOf("Attest release subjects"),
  "publication existence checks must precede attestation",
);
assert.ok(
  !publishWorkflow.includes("node scripts/release/prepare-release-subjects.mjs"),
  "publication proof must not package release subjects twice",
);
assert.doesNotMatch(publishWorkflow, /npm run validate:release-proof/);
assert.doesNotMatch(publishWorkflow, /verify-release-reproducibility/);
assert.match(publishWorkflow, /test -z "\$\(git status --porcelain --untracked-files=all\)"/);
assert.match(publishWorkflow, /test "\$\{GITHUB_SHA\}" = "\$\{RELEASE_SHA\}"/);
assert.equal(
  publishWorkflow.match(/--source-state clean/g)?.length,
  2,
  "both publication subject validations must require clean source state",
);
assert.doesNotMatch(
  postReleaseWorkflow,
  /RUNNER_TEMP\/write-run-summary\/action\.yml/,
  "post-release caller must not duplicate summary-helper preservation",
);
assert.doesNotMatch(
  attestWorkflow,
  /RUNNER_TEMP\/write-run-summary\/action\.yml/,
  "attestation caller must not duplicate summary-helper preservation",
);
assert.match(postReleaseWorkflow, /uses: \.\/\.github\/actions\/post-release-subjects/);
assert.match(attestWorkflow, /uses: \.\/\.github\/actions\/post-release-subjects/);
assert.match(
  postReleaseWorkflow,
  /Prepare tag-bound release subjects[\s\S]*?continue-on-error: true[\s\S]*?uses: \.\/\.github\/actions\/post-release-subjects/,
  "only the evidence-preserving post-release caller may continue after preparation failure",
);
for (const stepName of [
  "Compare published release subjects",
  "Verify tag-bound attestations",
  "Write sanitized post-release receipt",
  "Validate the sanitized receipt",
  "Upload post-release evidence",
]) {
  assert.match(
    workflowStepBlock(postReleaseWorkflow, stepName),
    /\n        if: \$\{\{ always\(\) \}\}/,
    `${stepName} must run under always()`,
  );
}
assert.ok(
  postReleaseWorkflow.indexOf("Upload post-release evidence") <
    postReleaseWorkflow.indexOf("Require valid post-release evidence"),
  "blocked receipt upload must precede the terminal failure gate",
);
assert.match(
  postReleaseWorkflow,
  /Require valid post-release evidence[\s\S]*steps\.release\.outcome != 'success'[\s\S]*steps\.receipt\.outcome != 'success'[\s\S]*steps\.receipt-validation\.outcome != 'success'[\s\S]*steps\.receipt\.outputs\.status != 'pass'[\s\S]*steps\.receipt\.outputs\.status != 'retrospective'/,
  "terminal gate must reject preparation, rendering, validation, and receipt-status failures",
);
assert.match(postReleaseAction, /RELEASE_TAG: \$\{\{ inputs\.tag \}\}/);
assert.match(postReleaseAction, /--tag "\$RELEASE_TAG"/);
assert.doesNotMatch(
  postReleaseAction,
  /--tag "\$\{\{ inputs\.tag \}\}"/,
  "release tags must reach the resolver through a quoted environment variable",
);
assert.match(postReleaseAction, /set -euo pipefail/);
assert.doesNotMatch(
  postReleaseAction,
  /set \+e/,
  "release-subject preparation failures must fail the composite action",
);
assert.doesNotMatch(
  postReleaseAction,
  /continue-on-error/,
  "the fail-fast composite action must not suppress preparation failures",
);
assert.doesNotMatch(
  attestWorkflow,
  /continue-on-error/,
  "the attestation caller must remain fail-fast",
);
assert.match(attestWorkflow, /PREPARATION_OUTCOME: \$\{\{ steps\.release\.outcome \}\}/);
assert.match(attestWorkflow, /PACKAGE_STATUS: \$\{\{ steps\.release\.outputs\.package_status \}\}/);
assert.match(attestWorkflow, /RELEASE_SHA: \$\{\{ steps\.release\.outputs\.release_sha \}\}/);
assert.match(attestWorkflow, /WORKFLOW_SHA: \$\{\{ github\.sha \}\}/);
assert.match(
  attestWorkflow,
  /WORKFLOW_SHA}" != "\$\{RELEASE_SHA}/,
  "current release attestations must bind the workflow source to the resolved tag source",
);
assert.match(
  attestWorkflow,
  /RELEASE_TAG}" = "v0\.19\.1"[\s\S]*PACKAGE_STATUS}" != "not_applicable"[\s\S]*PACKAGE_STATUS}" != "pass"/,
  "attestation must enforce v0.19.1/not_applicable and current/pass pairings",
);
assert.doesNotMatch(publishWorkflow, /SHA256SUMS|IDENTITY/);
assert.ok(
  postReleaseWorkflow.includes("uses: ./.github/actions/write-run-summary"),
  "post-release summary must resolve from the restored helper",
);
assert.ok(
  attestWorkflow.includes("uses: ./.github/actions/write-run-summary"),
  "attestation summary must resolve from the restored helper",
);
assert.match(rendererImplementationSource, /not_a_client_lifecycle_receipt/);
assert.doesNotMatch(rendererImplementationSource, /manual_web_desktop_evidence_required/);

console.log("Post-release receipt and release sequencing fixtures passed.");
