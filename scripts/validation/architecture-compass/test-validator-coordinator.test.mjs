import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCoordinator } from "./test-validator.mjs";

const fakeWorkerSource = `
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const values = {};
for (let index = 2; index < process.argv.length; index += 2) {
  values[process.argv[index]] = process.argv[index + 1];
}
const workerIndex = Number(values["--worker-index"]);
const workerCount = Number(values["--worker-count"]);
const reportFile = values["--worker-report"];
const mode = process.env.FAKE_ARCHITECTURE_WORKER_MODE ?? "pass";
function writeReport(report) {
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, JSON.stringify(report));
  if (workerIndex === 0 && process.env.FAKE_ARCHITECTURE_CAPTURE_WORKER_REPORT) {
    fs.writeFileSync(
      process.env.FAKE_ARCHITECTURE_CAPTURE_WORKER_REPORT,
      JSON.stringify(report),
    );
  }
}

if (mode === "hang-until-timeout") {
  setTimeout(
    () => fs.writeFileSync(process.env.FAKE_ARCHITECTURE_TIMEOUT_MARKER, "survived"),
    600,
  );
  setInterval(() => {}, 1000);
} else if (mode === "fail-after-observed-preflight") {
  const marker = process.env.FAKE_ARCHITECTURE_PREFLIGHT_MARKER;
  const eventLog = process.env.FAKE_ARCHITECTURE_EVENT_LOG;
  fs.appendFileSync(
    eventLog,
    fs.existsSync(marker) ? "worker-after-preflight\\n" : "worker-before-preflight\\n",
  );
  process.exitCode = 7;
} else if (mode === "structured-failure-with-lower-index-hanging-sibling") {
  if (workerIndex === 0) {
    setInterval(() => {}, 1000);
  } else {
    const inventory = JSON.parse(
      fs.readFileSync(process.env.ARCHITECTURE_FIXTURE_INVENTORY_PATH, "utf8"),
    );
    const ordinal = 1;
    const failedCase = inventory.cases[ordinal];
    const reason = "sentinel structured fixture failure";
    writeReport({
        schemaVersion: 1,
        workerIndex,
        workerCount,
        inventoryDigest: process.env.ARCHITECTURE_FIXTURE_INVENTORY_DIGEST,
        results: [
          {
            id: failedCase.id,
            ordinal,
            expectedOutcome: failedCase.expectedOutcome,
            status: "failed",
            skipBucket: null,
            reason,
            durationMs: 0,
          },
        ],
        fatal: { message: reason, stack: null },
      });
    process.exitCode = 1;
  }
} else if (mode === "failure-with-hanging-sibling") {
  if (workerIndex === 0) process.exit(7);
  setInterval(() => {}, 1000);
} else if (mode === "leader-exits-descendant-ignores-term") {
  if (workerIndex === 0) {
    const readyFile = process.env.FAKE_ARCHITECTURE_DESCENDANT_READY;
    const deadline = Date.now() + 5000;
    while (!fs.existsSync(readyFile)) {
      if (Date.now() >= deadline) throw new Error("descendant did not become ready");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    process.exit(7);
  }

  process.on("SIGTERM", () => process.exit(0));
  const descendantSource = [
    'import fs from "node:fs";',
    'process.on("SIGTERM", () => {});',
    'fs.writeFileSync(process.env.FAKE_ARCHITECTURE_DESCENDANT_READY, "ready");',
    'setTimeout(() => fs.writeFileSync(process.env.FAKE_ARCHITECTURE_DESCENDANT_MARKER, "survived"), 600);',
    'setInterval(() => {}, 1000);',
  ].join("\\n");
  spawn(process.execPath, ["--input-type=module", "-e", descendantSource], {
    env: process.env,
    stdio: ["ignore", "inherit", "inherit"],
  });
  setInterval(() => {}, 1000);
} else {
  const inventory = JSON.parse(
    fs.readFileSync(process.env.ARCHITECTURE_FIXTURE_INVENTORY_PATH, "utf8"),
  );
  const results = inventory.cases
    .map((entry, ordinal) => ({ ...entry, ordinal }))
    .filter(({ ordinal }) => ordinal % workerCount === workerIndex)
    .map(({ id, ordinal, expectedOutcome, applicability }) => {
      const notApplicable = process.platform === "win32" && applicability === "posix";
      return {
        id,
        ordinal,
        expectedOutcome,
        status: notApplicable ? "not-applicable" : "passed",
        skipBucket: notApplicable ? "platform" : null,
        reason: notApplicable ? "POSIX fixture is not applicable on Windows" : null,
        durationMs: 0,
      };
    });
  writeReport({
      schemaVersion: 1,
      workerIndex,
      workerCount,
      inventoryDigest:
        mode === "malformed" ? "sha256:invalid" : process.env.ARCHITECTURE_FIXTURE_INVENTORY_DIGEST,
      results,
      fatal: null,
    });
}
`;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-coordinator-test-"));
  const worker = path.join(root, "fake-worker.mjs");
  fs.writeFileSync(worker, fakeWorkerSource);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, worker };
}

test("coordinator merges equivalent exact accounting for one, two, and three workers", async (t) => {
  const accountingDigests = new Set();
  for (const workerCount of [1, 2, 3]) {
    const { root, worker } = fixture(t);
    const reportFile = path.join(root, `coordinator-${workerCount}.json`);
    const capturedWorkerReport = path.join(root, `worker-${workerCount}.json`);
    await runCoordinator({
      workerProgram: worker,
      workerCount,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => {},
      workerEnvironment: {
        FAKE_ARCHITECTURE_CAPTURE_WORKER_REPORT: capturedWorkerReport,
      },
    });
    const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
    const workerReport = JSON.parse(fs.readFileSync(capturedWorkerReport, "utf8"));
    assert.equal(report.workerCount, workerCount);
    assert.equal(report.preflight, "passed");
    assert.equal(report.results.length, 325);
    assert.equal(new Set(report.results.map(({ id }) => id)).size, 325);
    assert.equal(Object.hasOwn(workerReport, "preflight"), false);
    accountingDigests.add(report.accountingDigest);
    assert.deepEqual(fs.readdirSync(root).sort(), [
      `coordinator-${workerCount}.json`,
      "fake-worker.mjs",
      `worker-${workerCount}.json`,
    ]);
  }
  assert.equal(accountingDigests.size, 1);
});

test("coordinator terminates a hanging sibling and cleans its exact run root", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 2,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => {},
      workerEnvironment: { FAKE_ARCHITECTURE_WORKER_MODE: "failure-with-hanging-sibling" },
    }),
    /worker 0 failed/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test("coordinator surfaces a structured fatal over a lower-index cancelled sibling", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 2,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => {},
      workerEnvironment: {
        FAKE_ARCHITECTURE_WORKER_MODE: "structured-failure-with-lower-index-hanging-sibling",
      },
    }),
    (error) => {
      assert.equal(
        error.message,
        "Architecture Compass fixture worker 1 failed case local-negative:HTML-comment-only legacy-case target marker: sentinel structured fixture failure",
      );
      return true;
    },
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test(
  "coordinator escalates after a worker leader exits and awaits descendant cleanup",
  { skip: process.platform === "win32" },
  async (t) => {
    const { root, worker } = fixture(t);
    const reportFile = path.join(root, "must-not-exist.json");
    const readyFile = path.join(root, "descendant-ready");
    const markerFile = path.join(root, "descendant-survived");
    await assert.rejects(
      runCoordinator({
        workerProgram: worker,
        workerCount: 2,
        temporaryParent: root,
        reportFile,
        coordinatorPreflight: () => {},
        workerEnvironment: {
          FAKE_ARCHITECTURE_WORKER_MODE: "leader-exits-descendant-ignores-term",
          FAKE_ARCHITECTURE_DESCENDANT_READY: readyFile,
          FAKE_ARCHITECTURE_DESCENDANT_MARKER: markerFile,
        },
        terminationGraceMs: 100,
        killGraceMs: 1000,
        settlementPollMs: 10,
      }),
      /worker 0 failed/,
    );
    assert.equal(fs.existsSync(reportFile), false);
    assert.equal(fs.existsSync(markerFile), false);
    assert.deepEqual(fs.readdirSync(root).sort(), ["descendant-ready", "fake-worker.mjs"]);

    await new Promise((resolve) => setTimeout(resolve, 650));
    assert.equal(fs.existsSync(markerFile), false);
  },
);

test("coordinator rejects malformed worker proof and does not publish success", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 2,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => {},
      workerEnvironment: { FAKE_ARCHITECTURE_WORKER_MODE: "malformed" },
    }),
    /invalid report/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});

test("coordinator times out a lone worker, settles its process group, and withholds success", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  const markerFile = path.join(root, "timed-out-worker-survived");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 1,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => {},
      workerEnvironment: {
        FAKE_ARCHITECTURE_WORKER_MODE: "hang-until-timeout",
        FAKE_ARCHITECTURE_TIMEOUT_MARKER: markerFile,
      },
      workerTimeoutMs: 100,
      terminationGraceMs: 100,
      killGraceMs: 1000,
      settlementPollMs: 10,
    }),
    (error) => {
      assert.equal(error.message, "Architecture Compass fixture workers timed out after 100ms.");
      return true;
    },
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.equal(fs.existsSync(markerFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);

  await new Promise((resolve) => setTimeout(resolve, 650));
  assert.equal(fs.existsSync(markerFile), false);
});

test("coordinator completes shared preflight before spawning a failing worker", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  const markerFile = path.join(root, "preflight-complete");
  const eventLog = path.join(root, "events.log");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 1,
      temporaryParent: root,
      reportFile,
      async coordinatorPreflight() {
        fs.appendFileSync(eventLog, "preflight-started\n");
        await new Promise((resolve) => setTimeout(resolve, 25));
        fs.writeFileSync(markerFile, "complete");
        fs.appendFileSync(eventLog, "preflight-complete\n");
      },
      workerEnvironment: {
        FAKE_ARCHITECTURE_WORKER_MODE: "fail-after-observed-preflight",
        FAKE_ARCHITECTURE_PREFLIGHT_MARKER: markerFile,
        FAKE_ARCHITECTURE_EVENT_LOG: eventLog,
      },
    }),
    /worker 0 failed/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.equal(
    fs.readFileSync(eventLog, "utf8"),
    "preflight-started\npreflight-complete\nworker-after-preflight\n",
  );
  assert.deepEqual(fs.readdirSync(root).sort(), [
    "events.log",
    "fake-worker.mjs",
    "preflight-complete",
  ]);
});

test("coordinator removes an owned run root when restrictive-mode setup fails", async (t) => {
  const { root, worker } = fixture(t);
  const reportFile = path.join(root, "must-not-exist.json");
  await assert.rejects(
    runCoordinator({
      workerProgram: worker,
      workerCount: 1,
      temporaryParent: root,
      reportFile,
      coordinatorPreflight: () => {},
      runRootModeSetter() {
        throw new Error("sentinel restrictive-mode setup failure");
      },
    }),
    /sentinel restrictive-mode setup failure/,
  );
  assert.equal(fs.existsSync(reportFile), false);
  assert.deepEqual(fs.readdirSync(root), ["fake-worker.mjs"]);
});
