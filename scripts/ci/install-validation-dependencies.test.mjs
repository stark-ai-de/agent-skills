import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";
import { digestJson, readJson, validateManifest, writeJsonAtomic } from "./validation-contract.mjs";
import { selectedMissInstallProfiles } from "./install-validation-dependencies.mjs";
import {
  createMemoryStore,
  finalizePublication,
  record,
  resolve,
} from "./validation-task-graph.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const helper = path.join(directory, "install-validation-dependencies.mjs");
const manifest = validateManifest(readJson(path.join(directory, "validation-manifest.json")));

function fixture(t, source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "validation-install-test-"));
  const binaryRoot = path.join(root, "bin");
  const planFile = path.join(root, "plan.json");
  fs.mkdirSync(binaryRoot);
  const pnpm = path.join(binaryRoot, process.platform === "win32" ? "pnpm.cmd" : "pnpm");
  fs.writeFileSync(pnpm, source, { mode: 0o700 });
  writeJsonAtomic(planFile, {
    schemaVersion: 1,
    scope: "affected",
    reason: "dependency install test",
    baseSha: "base",
    candidateSha: "candidate",
    changedPaths: ["README.md"],
    selectedGates: ["skills"],
    installProfiles: ["root"],
    manifestDigest: digestJson(manifest),
    basePlanDigest: null,
    candidatePlanDigest: digestJson({ source: "candidate planner" }),
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { binaryRoot, planFile, root };
}

test("selected dependency installation is bounded and fails on timeout", (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX executable fixture is not available on Windows");
    return;
  }
  const fixture_ = fixture(t, `#!${process.execPath}\nsetInterval(() => {}, 1000);\n`);
  const started = Date.now();
  const result = spawnSync(
    process.execPath,
    [helper, "--plan", fixture_.planFile, "--timeout-ms", "75"],
    {
      cwd: path.resolve(directory, "../.."),
      encoding: "utf8",
      env: { ...process.env, PATH: `${fixture_.binaryRoot}${path.delimiter}${process.env.PATH}` },
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.signal, null);
  assert.ok(Date.now() - started >= 70, "dependency timeout must be applied");
  assert.ok(Date.now() - started < 2000, "dependency timeout must be bounded");
});

test("pnpm filter failure flag precedes the install subcommand", (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX executable fixture is not available on Windows");
    return;
  }
  const fixture_ = fixture(
    t,
    `#!${process.execPath}\nrequire("node:fs").writeFileSync(${JSON.stringify("ARGS_FILE")}, JSON.stringify(process.argv.slice(2)));\n`,
  );
  const argumentsFile = path.join(fixture_.root, "arguments.json");
  fs.writeFileSync(
    path.join(fixture_.binaryRoot, "pnpm"),
    `#!${process.execPath}\nrequire("node:fs").writeFileSync(${JSON.stringify(argumentsFile)}, JSON.stringify(process.argv.slice(2)));\n`,
    { mode: 0o700 },
  );
  const result = spawnSync(process.execPath, [helper, "--plan", fixture_.planFile], {
    cwd: path.resolve(directory, "../.."),
    encoding: "utf8",
    env: { ...process.env, PATH: `${fixture_.binaryRoot}${path.delimiter}${process.env.PATH}` },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(argumentsFile, "utf8")), [
    "--filter",
    "agent-skills",
    "--fail-if-no-match",
    "install",
    "--frozen-lockfile",
    "--prefer-offline",
  ]);
});

test("dependency profiles are derived only from task misses and verification runs", async () => {
  const plan = {
    schemaVersion: 1,
    scope: "affected",
    reason: "mixed task result set",
    baseSha: "base",
    candidateSha: "candidate",
    changedPaths: ["README.md"],
    selectedGates: ["skills", "site"],
    installProfiles: ["root", "site"],
    manifestDigest: digestJson(manifest),
    basePlanDigest: null,
    candidatePlanDigest: digestJson({ source: "candidate" }),
  };
  const repository = path.resolve(directory, "../..");
  const controlPlaneDigest = digestJson({ control: 1 });
  const candidate = fingerprintGitCandidateRepository(repository);
  const candidateFingerprint = `${candidate.algorithm}:${candidate.digest}`;
  const sourceContext = {
    repository: "stark-ai-de/agent-skills",
    workflowPath: ".github/workflows/validate.yml",
    workflowDigest: controlPlaneDigest,
    controlPlaneDigest,
    runId: "1",
    runAttempt: "1",
    jobId: "10",
    jobName: "skills",
    jobConclusion: "success",
    artifactName: "validation-task-v1-skills-test-1-1",
    event: "pull_request",
    ref: "refs/pull/52/merge",
    sha: "candidate",
  };
  const common = {
    manifest,
    plan,
    repository,
    repositoryIdentity: sourceContext.repository,
    mode: "auto",
    environment: { CI: "true", TZ: "UTC", LANG: "C.UTF-8", LC_ALL: "C.UTF-8" },
    toolchain: {
      node: "node@test",
      npm: "npm@test",
      pnpm: "pnpm@test",
      runnerLabel: "ubuntu-24.04",
      imageOS: "ubuntu24",
      imageVersion: "20260801.1",
    },
    gitInputs: {},
    controlPlaneDigest,
    candidateFingerprint,
    candidateFileCount: candidate.fileCount,
    sourceContext,
    now: "2026-08-13T12:00:00.000Z",
  };
  const store = createMemoryStore();
  const seed = await resolve(common, { store });
  const publicationRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validation-install-publication-"));
  try {
    const recorded = await record(
      {
        resolution: seed,
        gateId: "skills",
        repository,
        publicationDirectory: path.join(publicationRoot, "bundle"),
        outcome: {
          status: "passed",
          durationMs: 1,
          evidence: { exitCode: 0 },
          outputs: [],
        },
        sourceContext,
        candidateFingerprintBefore: candidateFingerprint,
        candidateFingerprintAfter: candidateFingerprint,
        candidateFileCountBefore: candidate.fileCount,
        candidateFileCountAfter: candidate.fileCount,
        now: common.now,
      },
      { store },
    );
    const locator = await store.upload(recorded);
    await finalizePublication({ recorded, locator, resolution: seed, now: common.now }, { store });
  } finally {
    fs.rmSync(publicationRoot, { recursive: true, force: true });
  }
  const resolution = await resolve(common, { store });
  assert.deepEqual(selectedMissInstallProfiles(resolution, manifest), ["site"]);
  assert.deepEqual(selectedMissInstallProfiles(resolution, manifest, "site"), ["site"]);
  assert.throws(
    () => selectedMissInstallProfiles(resolution, manifest, "skills"),
    /already reused/,
  );
  assert.throws(
    () => selectedMissInstallProfiles(resolution, manifest, "not-selected"),
    /not in the task resolution/,
  );
});
