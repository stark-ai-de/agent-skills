import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { digestJson } from "./validation-contract.mjs";
import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const verifier = path.join(scriptDirectory, "verify-release-proof.mjs");
const expectedSiteDigest = "c7ab11fe65461ae4caecfba94baa99b8ef7be2709d6a02495979f9a30fa1ac0a";

function run(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    encoding: "utf8",
    ...options,
  });
  if (result.error && result.status === null) throw result.error;
  return result;
}

function requireSuccess(result, label) {
  assert.equal(
    result.status,
    0,
    `${label}\nerror: ${result.error?.message ?? "none"}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
}

function requireFailure(result, pattern, label) {
  assert.notEqual(
    result.status,
    0,
    `${label} unexpectedly succeeded\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(result.stderr, pattern, `${label} did not fail closed with the expected reason`);
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function git(repository, ...arguments_) {
  const result = run("git", arguments_, { cwd: repository });
  requireSuccess(result, `git ${arguments_.join(" ")}`);
  return result.stdout.trim();
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-proof-verifier-"));
  const repository = path.join(root, "repository");
  const remote = path.join(root, "remote.git");
  const proofRoot = path.join(root, "proof");
  const bin = path.join(root, "bin");
  fs.mkdirSync(repository, { recursive: true, mode: 0o700 });
  fs.mkdirSync(proofRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(bin, { recursive: true, mode: 0o700 });

  git(repository, "init", "--initial-branch=main");
  git(repository, "config", "user.name", "Release Proof Test");
  git(repository, "config", "user.email", "release-proof@example.invalid");

  const version = "1.2.3";
  const inventory = { cases: [{ id: "fixture-one" }] };
  const manifest = {
    schemaVersion: 1,
    globalInvalidators: [],
    knownPaths: ["package.json"],
    gates: ["skills", "architecture-compass", "smoke-install"].map((id) => ({
      id,
      command: ["node", "--version"],
      paths: [],
      installProfiles: [],
      timeoutMs: 1000,
      prerequisites: [],
      aggregate: true,
      trustedProofRequired: true,
    })),
  };
  const manifestFile = path.join(repository, "scripts/ci/validation-manifest.json");
  writeJson(path.join(repository, "package.json"), {
    name: "release-proof-fixture",
    version,
    devDependencies: { skills: "1.5.22" },
  });
  writeJson(
    path.join(
      repository,
      "scripts/validation/architecture-compass/test-validator-case-inventory.json",
    ),
    inventory,
  );
  writeJson(manifestFile, manifest);
  git(repository, "add", ".");
  git(repository, "commit", "-m", "fixture");
  const releaseSha = git(repository, "rev-parse", "HEAD");
  requireSuccess(run("git", ["init", "--bare", remote]), "initialize bare remote");
  git(repository, "remote", "add", "origin", remote);
  git(repository, "push", "origin", "main");

  const candidate = fingerprintGitCandidateRepository(repository);
  const candidateFingerprint = `${candidate.algorithm}:${candidate.digest}`;
  const fixtureInventoryDigest = digestJson(inventory.cases);
  const reportWithoutDigest = {
    schemaVersion: 1,
    planDigest: `sha256:${"c".repeat(64)}`,
    manifestDigest: digestJson(manifest),
    scope: "full",
    selectedGates: manifest.gates.map(({ id }) => id),
    gates: manifest.gates.map(({ id }) => ({
      id,
      status: "passed",
      exitCode: 0,
      durationMs: 1,
      reason: null,
    })),
    candidateFingerprintBefore: candidateFingerprint,
    candidateFileCountBefore: candidate.fileCount,
    candidateFingerprintAfter: candidateFingerprint,
    candidateFileCountAfter: candidate.fileCount,
    fingerprintError: null,
    smokeEvidence: {
      candidateFingerprint,
      candidateFileCount: candidate.fileCount,
    },
    skillsCliVersion: "1.5.22",
    skillsSmokeCli: "configured",
    skillsSmokeForceTty: "0",
    fixtureInventoryDigest,
  };
  const report = {
    ...reportWithoutDigest,
    reportDigest: digestJson(reportWithoutDigest),
  };

  const runId = "424242";
  const runAttempt = "3";
  const pagesArtifactId = "7002";
  const pagesArtifactName = `github-pages-${runId}-${runAttempt}`;
  const validationArtifactName = `validation-receipt-${runId}-${runAttempt}`;
  const receipt = {
    schema_version: 2,
    workflow: "Validate",
    workflow_path: ".github/workflows/validate.yml",
    run_id: runId,
    run_attempt: runAttempt,
    validation_job_attempt: runAttempt,
    event: "push",
    branch: "main",
    sha: releaseSha,
    version,
    validation_scope: "full",
    plan_digest: report.planDigest,
    manifest_digest: report.manifestDigest,
    full_gate_ids: report.selectedGates,
    gate_report_digest: report.reportDigest,
    fixture_inventory_digest: fixtureInventoryDigest,
    skills_gate_success: true,
    smoke_install_success: true,
    candidate_fingerprint: candidateFingerprint,
    candidate_file_count: candidate.fileCount,
    skills_cli_version: "1.5.22",
    skills_smoke_cli: "configured",
    skills_smoke_force_tty: "0",
    site_digest: expectedSiteDigest,
    pages_artifact_name: pagesArtifactName,
    pages_artifact_id: pagesArtifactId,
    validation_artifact_name: validationArtifactName,
    validation_report_name: "validation-report.json",
  };
  const receiptFile = path.join(proofRoot, "validation-receipt.json");
  const reportFile = path.join(proofRoot, "validation-report.json");
  writeJson(receiptFile, receipt);
  writeJson(reportFile, report);

  const site = path.join(root, "site");
  fs.mkdirSync(path.join(site, "nested"), { recursive: true });
  fs.writeFileSync(path.join(site, "index.html"), "alpha\n");
  fs.writeFileSync(path.join(site, "nested/beta.txt"), "beta\n");
  const pagesArchive = path.join(proofRoot, "artifact.tar");
  requireSuccess(run("tar", ["-C", site, "-cf", pagesArchive, "."]), "create Pages archive");

  const validationMetadataFile = path.join(root, "validation-metadata.json");
  const pagesMetadataFile = path.join(root, "pages-metadata.json");
  writeJson(validationMetadataFile, [
    {
      artifacts: [
        {
          id: 7001,
          name: validationArtifactName,
          expired: false,
          workflow_run: { id: Number(runId), head_sha: releaseSha, head_branch: "main" },
        },
      ],
    },
  ]);
  writeJson(pagesMetadataFile, {
    id: Number(pagesArtifactId),
    name: pagesArtifactName,
    expired: false,
    workflow_run: { id: Number(runId), head_sha: releaseSha, head_branch: "main" },
  });

  const fakeGh = path.join(bin, "gh");
  fs.writeFileSync(
    fakeGh,
    `#!/usr/bin/env node
import fs from "node:fs";
const arguments_ = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify(arguments_) + "\\n");
if (arguments_[0] !== "api") process.exit(90);
const endpoint = arguments_[1];
if (endpoint === process.env.FAKE_VALIDATION_ENDPOINT) {
  process.stdout.write(fs.readFileSync(process.env.FAKE_VALIDATION_METADATA));
} else if (endpoint === process.env.FAKE_PAGES_ENDPOINT) {
  process.stdout.write(fs.readFileSync(process.env.FAKE_PAGES_METADATA));
} else {
  process.stderr.write("Unexpected gh endpoint: " + endpoint + "\\n");
  process.exit(91);
}
`,
    { mode: 0o700 },
  );

  const ghLog = path.join(root, "gh.log");
  fs.writeFileSync(ghLog, "");
  const arguments_ = [
    verifier,
    "--boundary",
    "release-readiness",
    "--repository-root",
    repository,
    "--github-repository",
    "example/release-proof",
    "--manifest",
    manifestFile,
    "--receipt",
    receiptFile,
    "--report",
    reportFile,
    "--pages-archive",
    pagesArchive,
    "--release-sha",
    releaseSha,
    "--version",
    version,
    "--validate-run-id",
    runId,
    "--validate-job-attempt",
    runAttempt,
    "--pages-artifact-name",
    pagesArtifactName,
    "--validation-artifact-name",
    validationArtifactName,
  ];
  const environment = {
    ...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    FAKE_GH_LOG: ghLog,
    FAKE_VALIDATION_ENDPOINT: `repos/example/release-proof/actions/runs/${runId}/artifacts`,
    FAKE_VALIDATION_METADATA: validationMetadataFile,
    FAKE_PAGES_ENDPOINT: `repos/example/release-proof/actions/artifacts/${pagesArtifactId}`,
    FAKE_PAGES_METADATA: pagesMetadataFile,
  };
  return {
    arguments_,
    environment,
    ghLog,
    pagesArchive,
    pagesMetadataFile,
    releaseSha,
    repository,
    root,
    site,
    validationMetadataFile,
  };
}

function runVerifier(fixture) {
  return run(process.execPath, fixture.arguments_, {
    cwd: fixture.repository,
    env: fixture.environment,
  });
}

test("release verifier accepts exact proof without live GitHub writes", (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  const result = runVerifier(fixture);
  requireSuccess(result, "verify exact release proof");
  assert.match(result.stdout, /Verified release-readiness release proof/);
  assert.equal(fs.readFileSync(fixture.ghLog, "utf8").trim().split("\n").length, 2);
});

test("release verifier rejects expired validation artifact metadata", (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const metadata = JSON.parse(fs.readFileSync(fixture.validationMetadataFile, "utf8"));
  metadata[0].artifacts[0].expired = true;
  writeJson(fixture.validationMetadataFile, metadata);

  requireFailure(
    runVerifier(fixture),
    /Expected exactly one unexpired validation artifact/,
    "reject expired validation artifact metadata",
  );
});

test("release verifier rejects expired Pages artifact metadata", (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const metadata = JSON.parse(fs.readFileSync(fixture.pagesMetadataFile, "utf8"));
  metadata.expired = true;
  writeJson(fixture.pagesMetadataFile, metadata);

  requireFailure(
    runVerifier(fixture),
    /Pages artifact expired state mismatch/,
    "reject expired Pages artifact metadata",
  );
});

test("release verifier rejects path traversal before extracting Pages artifacts", (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  requireSuccess(
    run("tar", [
      "-C",
      fixture.site,
      "--create",
      "--file",
      fixture.pagesArchive,
      "--transform=s,^,../,",
      "index.html",
    ]),
    "create path-traversing Pages archive",
  );

  requireFailure(
    runVerifier(fixture),
    /entry escapes its extraction root/,
    "reject path-traversing Pages archive",
  );
});

test("release verifier rejects non-regular Pages archive entries", (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const unsafeSite = path.join(fixture.root, "unsafe-site");
  fs.mkdirSync(unsafeSite);
  fs.writeFileSync(path.join(unsafeSite, "target.txt"), "target\n");
  fs.symlinkSync("target.txt", path.join(unsafeSite, "link.txt"));
  requireSuccess(
    run("tar", ["-C", unsafeSite, "--create", "--file", fixture.pagesArchive, "."]),
    "create symlink-bearing Pages archive",
  );

  requireFailure(
    runVerifier(fixture),
    /non-regular archive entry/,
    "reject non-regular Pages archive entry",
  );
});

test("release verifier rejects a Pages artifact digest mismatch", (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture.site, "index.html"), "changed\n");
  requireSuccess(
    run("tar", ["-C", fixture.site, "--create", "--file", fixture.pagesArchive, "."]),
    "create changed Pages archive",
  );

  requireFailure(
    runVerifier(fixture),
    /Pages artifact digest mismatch/,
    "reject changed Pages artifact",
  );
});

test("release verifier rejects a checked-out candidate mismatch", (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  const packageFile = path.join(fixture.repository, "package.json");
  const packageDocument = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  packageDocument.description = "candidate changed after validation";
  writeJson(packageFile, packageDocument);

  requireFailure(
    runVerifier(fixture),
    /checked-out candidate fingerprint mismatch/,
    "reject changed release candidate",
  );
});

test("release verifier rejects stale main", (context) => {
  const fixture = createFixture();
  context.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  git(fixture.repository, "commit", "--allow-empty", "-m", "advance main");
  git(fixture.repository, "push", "origin", "main");
  git(fixture.repository, "checkout", "--detach", fixture.releaseSha);

  requireFailure(runVerifier(fixture), /origin main SHA mismatch/, "reject stale main");
});
