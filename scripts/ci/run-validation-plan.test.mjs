import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { executeValidationPlan } from "./run-validation-plan.mjs";
import { digestJson, isFormatSupported, writeJsonAtomic } from "./validation-contract.mjs";
import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";

function fixture(t, gates, selectedGates = gates.map((gate) => gate.id)) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "validation-runner-repo-"));
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validation-runner-output-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outputRoot, { recursive: true, force: true }));
  execute("git", ["init", "--quiet"], { cwd: root });
  execute("git", ["config", "user.email", "validation@example.invalid"], { cwd: root });
  execute("git", ["config", "user.name", "Validation Test"], { cwd: root });
  fs.writeFileSync(path.join(root, "tracked.txt"), "original\n");
  execute("git", ["add", "tracked.txt"], { cwd: root });
  execute("git", ["commit", "--quiet", "-m", "fixture"], { cwd: root });
  const manifest = {
    schemaVersion: 1,
    globalInvalidators: [],
    knownPaths: ["tracked.txt"],
    gates: gates.map((gate) => ({
      paths: ["tracked.txt"],
      installProfiles: [],
      timeoutMs: 5000,
      prerequisites: [],
      aggregate: false,
      trustedProofRequired: true,
      ...gate,
    })),
  };
  const manifestFile = path.join(outputRoot, "manifest.json");
  const planFile = path.join(outputRoot, "plan.json");
  const reportFile = path.join(outputRoot, "report.json");
  writeJsonAtomic(manifestFile, manifest);
  writeJsonAtomic(planFile, {
    schemaVersion: 1,
    scope: selectedGates.length === gates.length ? "full" : "affected",
    reason: "test plan",
    baseSha: "base",
    candidateSha: "candidate",
    changedPaths: ["tracked.txt"],
    selectedGates,
    installProfiles: [],
    manifestDigest: digestJson(manifest),
    basePlanDigest: null,
    candidatePlanDigest: digestJson({ source: "candidate planner" }),
  });
  return { root, outputRoot, manifestFile, planFile, reportFile };
}

function execute(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    ...options,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `${command} ${arguments_.join(" ")} failed.`);
  }
  return result.stdout;
}

function run(fixture_) {
  return executeValidationPlan({
    repository: fixture_.root,
    manifest: fixture_.manifestFile,
    plan: fixture_.planFile,
    report: fixture_.reportFile,
    event: "pull_request",
    baseSha: "base",
    architectureWorkers: "1",
    githubOutput: false,
  });
}

async function waitForFile(file, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(file)) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${file}.`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

async function waitForChild(child) {
  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

test("runner executes selected gates exactly once in manifest order", async (t) => {
  const log = path.join(os.tmpdir(), `validation-order-${process.pid}-${Date.now()}`);
  t.after(() => fs.rmSync(log, { force: true }));
  const fixture_ = fixture(t, [
    {
      id: "first",
      command: [
        process.execPath,
        "-e",
        `require('fs').appendFileSync(${JSON.stringify(log)}, 'first\\n')`,
      ],
    },
    {
      id: "second",
      command: [
        process.execPath,
        "-e",
        `require('fs').appendFileSync(${JSON.stringify(log)}, 'second\\n')`,
      ],
    },
  ]);
  const result = await run(fixture_);
  assert.equal(result.failed, false);
  assert.equal(fs.readFileSync(log, "utf8"), "first\nsecond\n");
  assert.deepEqual(
    result.report.gates.map(({ id, status }) => ({ id, status })),
    [
      { id: "first", status: "passed" },
      { id: "second", status: "passed" },
    ],
  );
  assert.match(result.report.reportDigest, /^sha256:[a-f0-9]{64}$/);
});

test("runner rejects an effective plan without candidate planner provenance", async (t) => {
  const fixture_ = fixture(t, [
    { id: "gate", command: [process.execPath, "-e", "process.exit(0)"] },
  ]);
  const plan = JSON.parse(fs.readFileSync(fixture_.planFile, "utf8"));
  plan.candidatePlanDigest = null;
  writeJsonAtomic(fixture_.planFile, plan);
  await assert.rejects(run(fixture_), /candidatePlanDigest must be a SHA-256 digest/);
  assert.equal(fs.existsSync(fixture_.reportFile), false);
});

test("runner reports later selected gates skipped after failure", async (t) => {
  const fixture_ = fixture(t, [
    { id: "failure", command: [process.execPath, "-e", "process.exit(7)"] },
    { id: "later", command: [process.execPath, "-e", "process.exit(0)"] },
  ]);
  const result = await run(fixture_);
  assert.equal(result.failed, true);
  assert.equal(result.report.gates[0].status, "failed");
  assert.equal(result.report.gates[0].exitCode, 7);
  assert.equal(result.report.gates[1].status, "skipped");
});

test("runner emits complete skipped accounting when dependency installation fails", async (t) => {
  const fixture_ = fixture(t, [
    { id: "first", command: [process.execPath, "-e", "process.exit(0)"] },
    { id: "second", command: [process.execPath, "-e", "process.exit(0)"] },
  ]);
  const result = await executeValidationPlan({
    repository: fixture_.root,
    manifest: fixture_.manifestFile,
    plan: fixture_.planFile,
    report: fixture_.reportFile,
    event: "pull_request",
    baseSha: "base",
    architectureWorkers: "1",
    dependencyInstallOutcome: "failure",
    githubOutput: false,
  });
  assert.equal(result.failed, true);
  assert.deepEqual(
    result.report.gates.map(({ status, reason }) => ({ status, reason })),
    [
      { status: "skipped", reason: "skipped because selected dependency installation failed" },
      { status: "skipped", reason: "skipped because selected dependency installation failed" },
    ],
  );
});

test("runner terminates and reports a timed-out gate", async (t) => {
  const fixture_ = fixture(t, [
    {
      id: "timeout",
      command: [process.execPath, "-e", "setInterval(() => {}, 1000)"],
      timeoutMs: 100,
    },
  ]);
  const result = await run(fixture_);
  assert.equal(result.failed, true);
  assert.equal(result.report.gates[0].status, "failed");
  assert.match(result.report.gates[0].reason, /timed out/);
});

test("runner timeout terminates the complete POSIX process group", async (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX process-group semantics are not available on Windows");
    return;
  }
  const marker = path.join(os.tmpdir(), `validation-grandchild-${process.pid}-${Date.now()}`);
  t.after(() => fs.rmSync(marker, { force: true }));
  const grandchild = `setTimeout(() => require('fs').writeFileSync(${JSON.stringify(marker)}, 'survived'), 600)`;
  const parent = `require('child_process').spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], { stdio: 'ignore' }); setInterval(() => {}, 1000)`;
  const fixture_ = fixture(t, [
    {
      id: "timeout-tree",
      command: [process.execPath, "-e", parent],
      timeoutMs: 100,
    },
  ]);
  const result = await run(fixture_);
  assert.equal(result.failed, true);
  await new Promise((resolve) => setTimeout(resolve, 750));
  assert.equal(fs.existsSync(marker), false);
});

test("runner escalates after the group leader exits and a descendant ignores TERM", async (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX process-group semantics are not available on Windows");
    return;
  }
  const marker = path.join(os.tmpdir(), `validation-term-ignore-${process.pid}-${Date.now()}`);
  t.after(() => fs.rmSync(marker, { force: true }));
  const grandchild = `process.on('SIGTERM', () => {}); setTimeout(() => require('fs').writeFileSync(${JSON.stringify(marker)}, 'survived'), 5300); setInterval(() => {}, 1000)`;
  const parent = `require('child_process').spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], { stdio: 'ignore' }); process.on('SIGTERM', () => process.exit(0)); setInterval(() => {}, 1000)`;
  const fixture_ = fixture(t, [
    {
      id: "term-ignore-tree",
      command: [process.execPath, "-e", parent],
      timeoutMs: 100,
    },
  ]);
  const started = Date.now();
  const result = await run(fixture_);
  assert.equal(result.failed, true);
  assert.ok(Date.now() - started >= 4800, "runner must await TERM-to-KILL escalation");
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(fs.existsSync(marker), false);
});

test("runner rejects a successful leader with a live mutating process-group descendant", async (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX process-group semantics are not available on Windows");
    return;
  }
  const descendant = `setTimeout(() => require('fs').writeFileSync('tracked.txt', 'late mutation\\n'), 600)`;
  const leader = `const child = require('child_process').spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], { stdio: 'ignore' }); child.unref();`;
  const fixture_ = fixture(t, [
    {
      id: "successful-leader-tree",
      command: [process.execPath, "-e", leader],
    },
  ]);

  const result = await run(fixture_);
  await new Promise((resolve) => setTimeout(resolve, 750));

  assert.equal(result.failed, true);
  assert.equal(result.report.gates[0].status, "failed");
  assert.match(result.report.gates[0].reason, /process group remained active/);
  assert.equal(fs.readFileSync(path.join(fixture_.root, "tracked.txt"), "utf8"), "original\n");
});

test("affected formatter is a deterministic no-op for deletion-only supported paths", async (t) => {
  const fixture_ = fixture(
    t,
    [
      {
        id: "format",
        command: [process.execPath, "-e", "process.exit(9)"],
        changedFiles: true,
      },
      { id: "unselected", command: [process.execPath, "-e", "process.exit(0)"] },
    ],
    ["format"],
  );
  fs.unlinkSync(path.join(fixture_.root, "tracked.txt"));
  const plan = JSON.parse(fs.readFileSync(fixture_.planFile, "utf8"));
  plan.scope = "affected";
  plan.changedPaths = ["tracked.txt"];
  writeJsonAtomic(fixture_.planFile, plan);
  const result = await run(fixture_);
  assert.equal(result.failed, false);
  assert.equal(result.report.gates[0].status, "passed");
  assert.equal(result.report.gates[0].reason, "no extant supported changed files");
});

test("affected formatter is a deterministic no-op for unsupported extant paths", async (t) => {
  const fixture_ = fixture(
    t,
    [
      {
        id: "format",
        command: [process.execPath, "-e", "process.exit(9)"],
        changedFiles: true,
      },
      { id: "unselected", command: [process.execPath, "-e", "process.exit(0)"] },
    ],
    ["format"],
  );
  fs.writeFileSync(path.join(fixture_.root, "Dockerfile"), "FROM scratch\n");
  const plan = JSON.parse(fs.readFileSync(fixture_.planFile, "utf8"));
  plan.scope = "affected";
  plan.changedPaths = ["Dockerfile"];
  writeJsonAtomic(fixture_.planFile, plan);
  const result = await run(fixture_);
  assert.equal(result.failed, false);
  assert.equal(result.report.gates[0].status, "passed");
  assert.equal(result.report.gates[0].reason, "no extant supported changed files");
});

for (const extension of ["mts", "cts"]) {
  test(`affected formatter executes an extant .${extension} path`, async (t) => {
    const fixture_ = fixture(
      t,
      [
        {
          id: "format",
          command: [process.execPath, "-e", "process.exit(9)"],
          changedFiles: true,
        },
        { id: "unselected", command: [process.execPath, "-e", "process.exit(0)"] },
      ],
      ["format"],
    );
    const changedPath = `config.${extension}`;
    fs.writeFileSync(path.join(fixture_.root, changedPath), "export const value = 1;\n");
    execute("git", ["add", changedPath], { cwd: fixture_.root });
    execute("git", ["commit", "--quiet", "-m", `add ${extension} fixture`], {
      cwd: fixture_.root,
    });
    const plan = JSON.parse(fs.readFileSync(fixture_.planFile, "utf8"));
    plan.scope = "affected";
    plan.changedPaths = [changedPath];
    writeJsonAtomic(fixture_.planFile, plan);

    const result = await run(fixture_);

    assert.equal(result.failed, true);
    assert.equal(result.report.gates[0].status, "failed");
    assert.equal(result.report.gates[0].exitCode, 9);
  });
}

test("changed-file formatting recognizes TypeScript module variants and TOML", () => {
  assert.equal(isFormatSupported("src/config.mts"), true);
  assert.equal(isFormatSupported("src/config.cts"), true);
  assert.equal(isFormatSupported("fixtures/config.toml"), true);
  assert.equal(isFormatSupported("site/Dockerfile"), false);
});

test("affected formatter passes when every extant supported path is ignored", async (t) => {
  const oxfmt = fileURLToPath(new URL("../../node_modules/.bin/oxfmt", import.meta.url));
  const fixture_ = fixture(
    t,
    [
      {
        id: "format",
        command: [
          oxfmt,
          "--config",
          "oxfmt.json",
          "--ignore-path",
          ".oxfmtignore",
          "--check",
          "--no-error-on-unmatched-pattern",
        ],
        changedFiles: true,
      },
      { id: "unselected", command: [process.execPath, "-e", "process.exit(0)"] },
    ],
    ["format"],
  );
  fs.mkdirSync(path.join(fixture_.root, "ignored"));
  fs.writeFileSync(path.join(fixture_.root, "ignored", "only.md"), "# ignored\n");
  fs.writeFileSync(path.join(fixture_.root, "oxfmt.json"), "{}\n");
  fs.writeFileSync(path.join(fixture_.root, ".oxfmtignore"), "ignored/**\n");
  execute("git", ["add", "ignored/only.md", "oxfmt.json", ".oxfmtignore"], {
    cwd: fixture_.root,
  });
  execute("git", ["commit", "--quiet", "-m", "ignored formatter path"], {
    cwd: fixture_.root,
  });
  const plan = JSON.parse(fs.readFileSync(fixture_.planFile, "utf8"));
  plan.scope = "affected";
  plan.changedPaths = ["ignored/only.md"];
  writeJsonAtomic(fixture_.planFile, plan);
  const result = await run(fixture_);
  assert.equal(result.failed, false);
  assert.equal(result.report.gates[0].status, "passed");
});

test("affected formatter separates an option-like supported filename from command options", async (t) => {
  const observed = path.join(
    os.tmpdir(),
    `validation-format-arguments-${process.pid}-${Date.now()}`,
  );
  t.after(() => fs.rmSync(observed, { force: true }));
  const fixture_ = fixture(
    t,
    [
      {
        id: "format",
        command: [
          process.execPath,
          "-e",
          `require('fs').writeFileSync(${JSON.stringify(observed)}, JSON.stringify(process.argv.slice(1)))`,
        ],
        changedFiles: true,
      },
      { id: "unselected", command: [process.execPath, "-e", "process.exit(0)"] },
    ],
    ["format"],
  );
  fs.writeFileSync(path.join(fixture_.root, "-danger.md"), "# option-like path\n");
  execute("git", ["add", "--", "-danger.md"], { cwd: fixture_.root });
  execute("git", ["commit", "--quiet", "-m", "option-like path"], { cwd: fixture_.root });
  const plan = JSON.parse(fs.readFileSync(fixture_.planFile, "utf8"));
  plan.scope = "affected";
  plan.changedPaths = ["-danger.md"];
  writeJsonAtomic(fixture_.planFile, plan);
  const result = await run(fixture_);
  assert.equal(result.failed, false);
  assert.deepEqual(JSON.parse(fs.readFileSync(observed, "utf8")), ["-danger.md"]);
});

test("runner fails architecture immediately when a successful command omits fixture proof", async (t) => {
  const laterMarker = path.join(
    os.tmpdir(),
    `validation-architecture-later-${process.pid}-${Date.now()}`,
  );
  t.after(() => fs.rmSync(laterMarker, { force: true }));
  const fixture_ = fixture(t, [
    { id: "architecture-compass", command: [process.execPath, "-e", "process.exit(0)"] },
    {
      id: "later",
      command: [
        process.execPath,
        "-e",
        `require('fs').writeFileSync(${JSON.stringify(laterMarker)}, 'ran')`,
      ],
    },
  ]);
  const result = await run(fixture_);
  assert.equal(result.failed, true);
  assert.equal(result.report.gates[0].status, "failed");
  assert.match(result.report.gates[0].reason, /did not write its fixture report/);
  assert.equal(result.report.gates[1].status, "skipped");
  assert.equal(fs.existsSync(laterMarker), false);
  assert.equal(result.report.fixtureInventoryDigest, null);
});

test("runner fails architecture immediately when fixture proof is malformed", async (t) => {
  const writeMalformedReport = `const fs=require('fs'); const path=require('path'); const report=process.env.ARCHITECTURE_FIXTURE_REPORT; fs.mkdirSync(path.dirname(report), {recursive:true}); fs.writeFileSync(report, '{malformed');`;
  const fixture_ = fixture(t, [
    {
      id: "architecture-compass",
      command: [process.execPath, "-e", writeMalformedReport],
    },
    { id: "later", command: [process.execPath, "-e", "process.exit(0)"] },
  ]);
  const result = await run(fixture_);
  assert.equal(result.failed, true);
  assert.equal(result.report.gates[0].status, "failed");
  assert.match(result.report.gates[0].reason, /fixture report is malformed/);
  assert.equal(result.report.gates[1].status, "skipped");
});

test("runner fails smoke immediately when the installed CLI version is not the exact pin", async (t) => {
  const laterMarker = path.join(os.tmpdir(), `validation-smoke-later-${process.pid}-${Date.now()}`);
  t.after(() => fs.rmSync(laterMarker, { force: true }));
  const fixture_ = fixture(t, [
    { id: "smoke-install", command: [process.execPath, "-e", "process.exit(0)"] },
    {
      id: "later",
      command: [
        process.execPath,
        "-e",
        `require('fs').writeFileSync(${JSON.stringify(laterMarker)}, 'ran')`,
      ],
    },
  ]);
  fs.writeFileSync(
    path.join(fixture_.root, "package.json"),
    `${JSON.stringify({ devDependencies: { skills: "1.5.22" } }, null, 2)}\n`,
  );
  execute("git", ["add", "package.json"], { cwd: fixture_.root });
  execute("git", ["commit", "--quiet", "-m", "package pin"], { cwd: fixture_.root });
  const executable = path.join(fixture_.root, "node_modules", ".bin", "skills");
  fs.mkdirSync(path.dirname(executable), { recursive: true });
  fs.writeFileSync(executable, "#!/bin/sh\nprintf 'skills 9.9.9\\n'\n");
  fs.chmodSync(executable, 0o755);
  const candidate = fingerprintGitCandidateRepository(fixture_.root);
  const manifest = JSON.parse(fs.readFileSync(fixture_.manifestFile, "utf8"));
  manifest.gates[0].command = [
    "printf",
    `Git candidate fingerprint: sha256:${candidate.digest}\nSmoke install copied ${candidate.fileCount} Git candidate file(s).\n`,
  ];
  writeJsonAtomic(fixture_.manifestFile, manifest);
  const plan = JSON.parse(fs.readFileSync(fixture_.planFile, "utf8"));
  plan.manifestDigest = digestJson(manifest);
  writeJsonAtomic(fixture_.planFile, plan);
  const result = await run(fixture_);
  assert.equal(result.failed, true);
  assert.equal(result.report.gates[0].status, "failed");
  assert.match(result.report.gates[0].reason, /does not match root devDependency 1\.5\.22/);
  assert.equal(result.report.gates[1].status, "skipped");
  assert.equal(fs.existsSync(laterMarker), false);
});

test("runner marks smoke failed when SIGINT interrupts the exact CLI version check", async (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX signal delivery is not available on Windows");
    return;
  }
  const versionReady = path.join(
    os.tmpdir(),
    `validation-version-ready-${process.pid}-${Date.now()}`,
  );
  const laterMarker = path.join(
    os.tmpdir(),
    `validation-version-later-${process.pid}-${Date.now()}`,
  );
  t.after(() => fs.rmSync(versionReady, { force: true }));
  t.after(() => fs.rmSync(laterMarker, { force: true }));
  const fixture_ = fixture(t, [
    { id: "smoke-install", command: ["printf", "placeholder"] },
    {
      id: "later",
      command: [
        process.execPath,
        "-e",
        `require('fs').writeFileSync(${JSON.stringify(laterMarker)}, 'ran')`,
      ],
    },
  ]);
  fs.writeFileSync(
    path.join(fixture_.root, "package.json"),
    `${JSON.stringify({ devDependencies: { skills: "1.5.22" } }, null, 2)}\n`,
  );
  execute("git", ["add", "package.json"], { cwd: fixture_.root });
  execute("git", ["commit", "--quiet", "-m", "package pin"], { cwd: fixture_.root });
  const executable = path.join(fixture_.root, "node_modules", ".bin", "skills");
  fs.mkdirSync(path.dirname(executable), { recursive: true });
  fs.writeFileSync(
    executable,
    `#!/bin/sh\nprintf ready > ${JSON.stringify(versionReady)}\ntrap 'exit 0' TERM\nwhile :; do sleep 1; done\n`,
  );
  fs.chmodSync(executable, 0o755);
  const candidate = fingerprintGitCandidateRepository(fixture_.root);
  const manifest = JSON.parse(fs.readFileSync(fixture_.manifestFile, "utf8"));
  manifest.gates[0].command = [
    "printf",
    `Git candidate fingerprint: sha256:${candidate.digest}\nSmoke install copied ${candidate.fileCount} Git candidate file(s).\n`,
  ];
  writeJsonAtomic(fixture_.manifestFile, manifest);
  const plan = JSON.parse(fs.readFileSync(fixture_.planFile, "utf8"));
  plan.manifestDigest = digestJson(manifest);
  writeJsonAtomic(fixture_.planFile, plan);
  const runner = fileURLToPath(new URL("./run-validation-plan.mjs", import.meta.url));
  const child = spawn(
    process.execPath,
    [
      runner,
      "--repository",
      fixture_.root,
      "--manifest",
      fixture_.manifestFile,
      "--plan",
      fixture_.planFile,
      "--report",
      fixture_.reportFile,
      "--event",
      "pull_request",
      "--base-sha",
      "base",
      "--architecture-workers",
      "1",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const completion = waitForChild(child);
  await waitForFile(versionReady);
  child.kill("SIGINT");
  const outcome = await completion;
  assert.equal(outcome.code, 1, `${outcome.stdout}\n${outcome.stderr}`);
  const report = JSON.parse(fs.readFileSync(fixture_.reportFile, "utf8"));
  assert.equal(report.gates[0].status, "failed");
  assert.match(report.gates[0].reason, /version check received SIGINT/);
  assert.equal(report.gates[1].status, "skipped");
  assert.equal(fs.existsSync(laterMarker), false);
});

test("runner fails when a gate mutates the materialized candidate", async (t) => {
  const fixture_ = fixture(t, [
    {
      id: "mutator",
      command: [process.execPath, "-e", "require('fs').writeFileSync('tracked.txt', 'mutated\\n')"],
    },
  ]);
  const result = await run(fixture_);
  assert.equal(result.failed, true);
  assert.match(result.report.fingerprintError, /candidate changed/);
  assert.notEqual(
    result.report.candidateFingerprintBefore,
    result.report.candidateFingerprintAfter,
  );
});

test("runner validates prerequisites without executing a dependent gate", async (t) => {
  const fixture_ = fixture(t, [
    { id: "required", command: [process.execPath, "-e", "process.exit(3)"] },
    {
      id: "dependent",
      command: [process.execPath, "-e", "process.exit(0)"],
      prerequisites: ["required"],
    },
  ]);
  const result = await run(fixture_);
  assert.equal(result.report.gates[1].status, "skipped");
  assert.match(result.report.gates[1].reason, /earlier gate failure|prerequisite/);
});

test("runner preserves complete failure accounting and fingerprints after SIGINT", async (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX signal delivery is not available on Windows");
    return;
  }
  const ready = path.join(os.tmpdir(), `validation-signal-ready-${process.pid}-${Date.now()}`);
  const later = path.join(os.tmpdir(), `validation-signal-later-${process.pid}-${Date.now()}`);
  const survived = path.join(
    os.tmpdir(),
    `validation-signal-descendant-${process.pid}-${Date.now()}`,
  );
  t.after(() => fs.rmSync(ready, { force: true }));
  t.after(() => fs.rmSync(later, { force: true }));
  t.after(() => fs.rmSync(survived, { force: true }));
  const active = `trap 'exit 0' TERM; (trap '' TERM; sleep 5.3; printf survived > ${JSON.stringify(survived)}; while :; do sleep 1; done) & printf ready > ${JSON.stringify(ready)}; while :; do sleep 1; done`;
  const fixture_ = fixture(t, [
    {
      id: "active",
      command: ["bash", "-c", active],
    },
    {
      id: "later",
      command: [
        process.execPath,
        "-e",
        `require('fs').writeFileSync(${JSON.stringify(later)}, 'ran')`,
      ],
    },
  ]);
  const runner = fileURLToPath(new URL("./run-validation-plan.mjs", import.meta.url));
  const child = spawn(
    process.execPath,
    [
      runner,
      "--repository",
      fixture_.root,
      "--manifest",
      fixture_.manifestFile,
      "--plan",
      fixture_.planFile,
      "--report",
      fixture_.reportFile,
      "--event",
      "pull_request",
      "--base-sha",
      "base",
      "--architecture-workers",
      "1",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const completion = waitForChild(child);
  await waitForFile(ready);
  const interruptedAt = Date.now();
  child.kill("SIGINT");
  const outcome = await completion;
  assert.ok(Date.now() - interruptedAt >= 4600, "runner must await cancellation escalation");
  assert.equal(outcome.signal, null);
  assert.equal(outcome.code, 1, `${outcome.stdout}\n${outcome.stderr}`);
  assert.equal(fs.existsSync(fixture_.reportFile), true);
  const report = JSON.parse(fs.readFileSync(fixture_.reportFile, "utf8"));
  assert.deepEqual(
    report.gates.map(({ id, status }) => ({ id, status })),
    [
      { id: "active", status: "failed" },
      { id: "later", status: "skipped" },
    ],
  );
  assert.match(report.gates[0].reason, /received SIGINT/);
  assert.match(report.gates[1].reason, /received SIGINT/);
  assert.match(report.candidateFingerprintBefore, /^sha256:[a-f0-9]{64}$/);
  assert.equal(report.candidateFingerprintAfter, report.candidateFingerprintBefore);
  assert.equal(report.candidateFileCountAfter, report.candidateFileCountBefore);
  assert.equal(fs.existsSync(later), false);
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(fs.existsSync(survived), false);
});
