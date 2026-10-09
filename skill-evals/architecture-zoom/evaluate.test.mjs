import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { assess, digest, readEvidence, snapshot } from "./evaluate.mjs";

// Synthetic records exercise the checker only. They are never stored as promotion receipts.
const current = snapshot(process.cwd());
function fixture() {
  const files = new Map();
  const artifact = (label) => {
    const content = Buffer.from(`SYNTHETIC CHECKER UNIT FIXTURE: ${label}`);
    files.set(label, content);
    return { path: label, sha256: digest(content) };
  };
  const runs = current.cases.flatMap((scenario) =>
    ["baseline", "candidate"].map((arm) => ({
      caseId: scenario.id,
      arm,
      host: "synthetic-test-host",
      hostVersion: "test",
      model: "test-model",
      sessionId: `${scenario.id}-${arm}`,
      freshContext: true,
      inputSha256: digest(scenario.input),
      result: "observed",
      transcript: artifact(`${scenario.id}-${arm}-transcript`),
      effects: artifact(`${scenario.id}-${arm}-effects`),
      reviewer: "unit-test",
      reviewRationale: "This is not an actual agent evaluation.",
      observedForbidden: [],
      criteria: Object.fromEntries(scenario.required.map((id) => [id, true])),
      reviewBudgetExceeded: false,
    })),
  );
  const report = {
    schemaVersion: 1,
    kind: "observed-agent-evaluation",
    sourceFingerprint: current.sourceFingerprint,
    casesFingerprint: current.casesFingerprint,
    captureMethod: "SYNTHETIC CHECKER TEST ONLY",
    claimedHosts: ["synthetic-test-host"],
    runs,
    hostEvidence: ["discovery-install", "fresh-session-routing", "negative-authority"].map(
      (type) => ({ host: "synthetic-test-host", type, observed: true, artifact: artifact(type) }),
    ),
    maintainerJudgment: {
      approved: true,
      reviewer: "unit-test",
      baselineImprovement: "fixture only",
      maintenanceOwner: "unit-test",
      limitations: "synthetic",
      approvalEvidence: artifact("approval"),
    },
  };
  return {
    report,
    files,
    read: (name) => {
      if (!files.has(name)) throw new Error("Missing capture");
      return files.get(name);
    },
  };
}
function rejected(mutate, pattern) {
  const f = fixture();
  mutate(f.report, f.files);
  const result = assess(f.report, current, f.read);
  assert.equal(result.qualified, false);
  assert.match(result.errors.join("\n"), pattern);
}

test("well-formed synthetic data validates checker shape, not actual qualification", () => {
  const f = fixture();
  assert.deepEqual(assess(f.report, current, f.read).errors, []);
});
test("unrun and explicitly synthetic evidence is rejected", () =>
  rejected((r) => {
    r.kind = "fixture";
    r.runs[0].result = "not-run";
  }, /Synthetic|not-run/));
test("payload and frozen-case changes invalidate evidence", () =>
  rejected((r) => {
    r.sourceFingerprint = "old";
    r.casesFingerprint = "old";
  }, /fingerprint/));
test("baseline is required for each scenario", () =>
  rejected((r) => r.runs.shift(), /both baseline and candidate/));
test("each compared run has a different fresh context", () =>
  rejected((r) => {
    r.runs[1].sessionId = r.runs[0].sessionId;
  }, /not isolated/));
test("comparison controls input, model and host", () =>
  rejected((r) => {
    r.runs[1].model = "other";
    r.runs[1].inputSha256 = "other";
  }, /confounds|input differs/));
test("forbidden candidate side effects block qualification", () =>
  rejected((r) => {
    r.runs[1].observedForbidden = ["unauthorized-install"];
  }, /forbidden behavior/));
test("every criterion is judged and candidate criteria pass", () =>
  rejected((r) => {
    r.runs[1].criteria = {};
  }, /unjudged|unmet/));
test("a duplicated output is not a separate observed run", () =>
  rejected((r) => {
    r.runs[1].transcript = r.runs[0].transcript;
  }, /reused transcript/));
test("modified captures and missing effects cannot pass", () =>
  rejected((r, files) => {
    files.set(r.runs[0].transcript.path, Buffer.from("changed"));
    r.runs[1].effects = null;
  }, /changed evidence|missing evidence/));
test("actual native fresh-session observation is required", () =>
  rejected((r) => {
    r.hostEvidence = [];
  }, /fresh-session-routing/));
test("review and maintainer decisions cannot be omitted", () =>
  rejected((r) => {
    r.maintainerJudgment.approved = false;
    r.runs[1].reviewer = "";
  }, /judgment|review identity/));
test("unbounded review does not silently count as complete", () =>
  rejected((r) => {
    r.runs[1].reviewBudgetExceeded = true;
  }, /budget/));
test("evidence paths and symlinks cannot escape capture directory", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "planning-evidence-"));
  try {
    fs.mkdirSync(path.join(dir, "run"));
    fs.writeFileSync(path.join(dir, "outside"), "outside");
    fs.writeFileSync(path.join(dir, "run", "inside"), "inside");
    assert.equal(readEvidence(path.join(dir, "run"), "inside").toString(), "inside");
    assert.throws(() => readEvidence(path.join(dir, "run"), "../outside"), /escapes/);
    assert.throws(() => readEvidence(path.join(dir, "run"), path.join(dir, "outside")), /relative/);
    if (process.platform !== "win32") {
      fs.symlinkSync("../outside", path.join(dir, "run", "link"));
      assert.throws(() => readEvidence(path.join(dir, "run"), "link"), /escapes/);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("malformed reports are rejected instead of passed", () => {
  assert.equal(assess(null, current, () => Buffer.alloc(0)).qualified, false);
});

test("aggregate rejects public promotion without captured evidence", () => {
  const root = process.cwd();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "planning-promotion-"));
  try {
    for (const name of [
      "skills/engineering-workflows/architecture-compass",
      "skills/codex-operations/codex-spec-interviewer",
    ])
      fs.cpSync(path.join(root, name), path.join(dir, name), { recursive: true });
    const zoom = ["skills", "incubator/skills"]
      .map((base) => `${base}/engineering-workflows/architecture-zoom`)
      .find((name) => fs.existsSync(path.join(root, name, "SKILL.md")));
    fs.cpSync(
      path.join(root, zoom),
      path.join(dir, "skills/engineering-workflows/architecture-zoom"),
      { recursive: true },
    );
    fs.mkdirSync(path.join(dir, "skill-evals/architecture-zoom"), { recursive: true });
    fs.copyFileSync(
      path.join(root, "skill-evals/architecture-zoom/cases.json"),
      path.join(dir, "skill-evals/architecture-zoom/cases.json"),
    );
    const result = spawnSync(
      process.execPath,
      [path.join(root, "skill-evals/architecture-zoom/validate-contract.mjs")],
      { cwd: dir, encoding: "utf8", timeout: 30_000 },
    );
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Public Architecture Zoom requires a reviewed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
