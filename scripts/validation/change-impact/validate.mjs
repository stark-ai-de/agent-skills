import { runHardeningChecks } from "./hardening.test.mjs";
import { runOperationsChecks } from "./operations.test.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  collect,
  digest,
  sensitive,
  verifyPacket,
} from "../../../incubator/skills/engineering-workflows/change-impact/scripts/collect.mjs";
import {
  MODEL,
  buildRequests,
  rank,
  validateResponse,
} from "../../../incubator/skills/engineering-workflows/change-impact/scripts/rank.mjs";
import { report } from "../../../incubator/skills/engineering-workflows/change-impact/scripts/change-impact.mjs";
import {
  compareCaptures,
  createFixture,
  gradeCapture,
  loadCases,
  loadExpected,
} from "./evaluate.mjs";

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "change-impact-validation-"));
const cases = loadCases();
const expected = loadExpected();
const fixtures = new Map();
let count = 0;
async function check(name, fn) {
  await fn();
  count++;
  console.log(`ok ${count} - ${name}`);
}
function responseFor(request) {
  return {
    model: MODEL,
    usage: { input_tokens: 123, output_tokens: 0 },
    answers: Object.fromEntries(
      request.items.map(({ key }) => [
        key,
        {
          type: "choice",
          choice: "unrelated",
          probabilities: {
            old_assumption: 0.01,
            compatible: 0.01,
            unrelated: 0.97,
            uncertain: 0.01,
          },
          confidence: 0.95,
        },
      ]),
    ),
  };
}
function fakeTransport(requests, override) {
  let calls = 0;
  return async (_url, options) => {
    const request = requests.find((r) => JSON.stringify(r.body) === options.body);
    assert.ok(request);
    assert.equal(options.redirect, "error");
    calls++;
    if (override) return override(calls, request);
    return new Response(JSON.stringify(responseFor(request)), { status: 200 });
  };
}

try {
  await check("12 cases with independent pilot and holdout keys", () => {
    assert.equal(cases.cases.length, 12);
    assert.equal(cases.cases.filter((c) => c.split === "pilot").length, 8);
    assert.equal(cases.cases.filter((c) => c.split === "holdout").length, 4);
    assert.equal(new Set(cases.cases.map((c) => c.id)).size, 12);
    assert.deepEqual(
      cases.cases.map((c) => c.id),
      expected.cases.map((c) => c.id),
    );
  });
  await check("all source contracts and reference findings are grounded", () => {
    for (const testCase of cases.cases) {
      const fixture = createFixture(testCase, path.join(temporary, testCase.id));
      fixtures.set(testCase.id, fixture);
      assert.equal(fixture.packet.coverage.omissions.length, 0);
      assert.ok(
        fixture.packet.candidates.length > 10,
        "ranking needs more candidates than the confirmation limit",
      );
      for (const finding of expected.cases.find((e) => e.id === testCase.id).findings) {
        assert.equal(testCase.beforeFiles[finding.path], testCase.afterFiles[finding.path]);
        assert.ok(testCase.afterFiles[finding.path].includes(finding.quote));
        assert.ok(
          fixture.packet.candidates.some(
            (c) => c.path === finding.path && c.content.includes(finding.quote),
          ),
        );
      }
    }
  });
  const fixture = fixtures.get("case-01");
  const packet = fixture.packet;
  const requests = buildRequests(packet);
  await check("prepared runner cannot discover answer key in fixture", () => {
    assert.deepEqual(fs.readdirSync(path.dirname(fixture.root)).sort(), [
      "packet.json",
      "repo",
      "task.json",
    ]);
    assert.equal(fs.existsSync(path.join(fixture.root, "expected.json")), false);
    assert.equal(fs.existsSync(path.join(fixture.root, ".git/index")), false);
  });
  await check("recreated fixtures have identical snapshot identities", () => {
    const other = createFixture(cases.cases[0], path.join(temporary, "recreated"));
    assert.equal(packet.snapshot.digest, other.packet.snapshot.digest);
    assert.notEqual(digest(packet), digest(other.packet));
  });
  await check("collects unchanged semantic targets", () => {
    assert.equal(packet.candidates.find((c) => c.path === "tools/import.mjs").changed, false);
    assert.equal(packet.candidates.find((c) => c.path === "src/projects.mjs").changed, true);
  });
  await check("normalizes relative scopes", () => {
    const a = collect({ ...packet.options, scope: ["src", "docs"] });
    const b = collect({ ...packet.options, scope: ["./src", "./docs"] });
    assert.equal(digest(a), digest(b));
  });
  await check("rejects outside paths and fabricated contracts", () => {
    assert.throws(() => collect({ ...packet.options, scope: ["../"] }));
    const altered = structuredClone(packet.options);
    altered.contracts[0].evidence[0].quote = "unseen source";
    assert.throws(() => collect(altered), /absent/);
  });
  await check("WORKTREE identity includes additions, deletions and content", () => {
    const work = collect({ ...packet.options, head: "WORKTREE" });
    fs.writeFileSync(path.join(fixture.root, "notes.txt"), "new behavior notes\n");
    assert.throws(() => verifyPacket(work), /changed/);
    const added = collect({ ...packet.options, head: "WORKTREE" });
    assert.ok(added.candidates.some((c) => c.path === "notes.txt"));
    fs.unlinkSync(path.join(fixture.root, "notes.txt"));
    fs.unlinkSync(path.join(fixture.root, "docs/search.md"));
    assert.throws(() => verifyPacket(added), /changed/);
    const deleted = collect({ ...packet.options, head: "WORKTREE" });
    assert.equal(deleted.snapshot.manifest.find((f) => f.path === "docs/search.md").after, null);
    fs.writeFileSync(
      path.join(fixture.root, "docs/search.md"),
      cases.cases[0].afterFiles["docs/search.md"],
    );
  });
  await check("rejects packet tampering", () => {
    const altered = structuredClone(packet);
    altered.candidates[0].content += "extra";
    assert.throws(() => verifyPacket(altered), /changed/);
  });
  await check("secret paths, credential formats, binary and symlink exclusions", () => {
    for (const content of [
      '{"api_key":"synthetic_abcdefghijklmnopqrstuvwxyz"}',
      "api_key: synthetic_abcdefghijklmnopqrstuvwxyz",
      "sk-synthetic_abcdefghijklmnopqrstuvwxyz",
      "Bearer synthetic_abcdefghijklmnopqrstuvwxyz",
    ])
      assert.equal(sensitive(content), true);
    assert.equal(sensitive("Choose a secret storage provider."), false);
    fs.writeFileSync(path.join(fixture.root, ".env"), "anything\n");
    fs.writeFileSync(
      path.join(fixture.root, "config.json"),
      '{"api_key":"synthetic_abcdefghijklmnopqrstuvwxyz"}',
    );
    fs.writeFileSync(path.join(fixture.root, "image.bin"), Buffer.from([0, 1]));
    fs.symlinkSync(path.join(temporary, "outside"), path.join(fixture.root, "linked"));
    const result = collect({ ...packet.options, head: "WORKTREE" });
    for (const reason of ["secret-path", "sensitive-content", "binary", "symlink"])
      assert.ok(
        result.coverage.omissions.some((o) => o.reason === reason),
        reason,
      );
    for (const name of [".env", "config.json", "image.bin", "linked"])
      fs.unlinkSync(path.join(fixture.root, name));
  });
  await check("candidate budget exposes omitted content", () => {
    const result = collect({ ...packet.options, limits: { maxCandidates: 1 } });
    assert.equal(result.candidates.length, 1);
    assert.ok(result.coverage.omissions.some((o) => o.reason === "candidate-budget"));
  });
  await check("payload batches stay within byte limits and exclude absolute roots", () => {
    assert.ok(requests.length > 0);
    for (const request of requests) {
      const body = JSON.stringify(request.body);
      assert.ok(Buffer.byteLength(body) <= 24000);
      assert.ok(!body.includes(fixture.root));
      for (const { key } of request.items)
        assert.ok(request.body.questions[key].instructions.includes(`state.excerpts.${key}`));
    }
  });
  await check("valid offline provider fixture returns all pairs", async () => {
    const result = await rank(packet, {
      apiKey: "fixture-only",
      transport: fakeTransport(requests),
    });
    assert.equal(result.status, "ranked");
    assert.equal(result.records.length, packet.candidates.length);
    assert.equal(result.coverage.pendingPairs, 0);
    assert.equal(result.usage.inputTokens, 123 * requests.length);
  });
  await check("missing credential never invokes provider", async () => {
    const result = await rank(packet, {
      apiKey: "",
      transport: () => {
        throw new Error("must not call");
      },
    });
    assert.equal(result.status, "incomplete");
    assert.equal(result.usage.attempts, 0);
  });
  await check("model drift, malformed probabilities and missing answers rejected", () => {
    const request = requests[0];
    for (const mutate of [
      (v) => {
        v.model = "other";
      },
      (v) => {
        delete v.answers[request.items[0].key];
      },
      (v) => {
        v.answers[request.items[0].key].probabilities.unrelated = -1;
      },
      (v) => {
        v.answers[request.items[0].key].choice = "old_assumption";
      },
      (v) => {
        v.usage = {};
      },
    ]) {
      const value = responseFor(request);
      mutate(value);
      assert.throws(() => validateResponse(value, request));
    }
  });
  await check(
    "provider probability rounding is tolerated without accepting bad distributions",
    () => {
      const request = requests[0];
      const rounded = responseFor(request);
      rounded.answers[request.items[0].key].probabilities.unrelated = 0.96;
      assert.equal(validateResponse(rounded, request).records[0].probabilities.unrelated, 0.96);
      rounded.answers[request.items[0].key].probabilities.unrelated = 0.8;
      assert.throws(() => validateResponse(rounded, request), /distribution/);
    },
  );
  await check("timeout aborts transport and preserves incomplete evidence", async () => {
    const keepAlive = setInterval(() => {}, 100);
    try {
      const result = await rank(packet, {
        apiKey: "fixture-only",
        timeoutMs: 5,
        transport: async (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), { once: true });
          }),
      });
      assert.equal(result.status, "incomplete");
      assert.equal(result.usage.attempts, 1);
      assert.equal(result.usage.costComplete, false);
    } finally {
      clearInterval(keepAlive);
    }
  });
  await check("retry budget counts attempts and keeps accounting incomplete", async () => {
    const result = await rank(packet, {
      apiKey: "fixture-only",
      maxRequests: 2,
      sleep: async () => {},
      transport: async () => new Response("upstream", { status: 429 }),
    });
    assert.equal(result.usage.attempts, 2);
    assert.equal(result.usage.costComplete, false);
    assert.equal(result.status, "incomplete");
    assert.ok(result.errors.some((e) => e.reason === "request-budget"));
  });
  await check("HTTP errors and exception details never expose provider text", async () => {
    const value = "DO_NOT_ECHO_SYNTHETIC_PROVIDER_BODY";
    for (const transport of [
      async () => new Response(value, { status: 503 }),
      async () => {
        throw new Error(value);
      },
    ]) {
      const result = await rank(packet, { apiKey: "fixture-only", transport });
      assert.equal(result.status, "incomplete");
      assert.equal(result.usage.costComplete, false);
      assert.ok(!JSON.stringify(result).includes(value));
    }
  });
  await check("long provider retry delay stops the bounded pass", async () => {
    const result = await rank(packet, {
      apiKey: "fixture-only",
      transport: async () => new Response("", { status: 529, headers: { "retry-after": "120" } }),
      sleep: async () => {
        throw new Error("must not wait");
      },
    });
    assert.equal(result.usage.attempts, 1);
    assert.ok(result.errors.some((e) => e.reason === "retry-window-exceeds-budget"));
  });
  await check("snapshot changes during provider work remain incomplete", async () => {
    const work = collect({ ...packet.options, head: "WORKTREE" });
    const workRequests = buildRequests(work);
    const result = await rank(work, {
      apiKey: "fixture-only",
      transport: fakeTransport(workRequests, (_call, request) => {
        fs.writeFileSync(path.join(fixture.root, "extra.txt"), "changed");
        return new Response(JSON.stringify(responseFor(request)));
      }),
    });
    assert.equal(result.status, "incomplete");
    assert.ok(result.errors.some((e) => e.reason === "snapshot-changed"));
    fs.unlinkSync(path.join(fixture.root, "extra.txt"));
  });
  await check("report enforces citations and host confirmation boundaries", () => {
    const candidate = packet.candidates.find((c) => c.path === "tools/import.mjs");
    const confirmation = {
      candidateId: candidate.id,
      contractId: "behavior-1",
      status: "confirmed",
      quote: candidate.content,
      reason: "Dedupe uses a globally unique name despite org-scoped project identity.",
    };
    const result = report({ packet, confirmations: [confirmation] });
    assert.equal(result.findings.length, 1);
    assert.equal(result.status, "incomplete");
    assert.equal(result.findings[0].confirmationBy, "host-agent");
    assert.throws(() =>
      report({ packet, confirmations: [{ ...confirmation, quote: "fabricated" }] }),
    );
    assert.throws(() => report({ packet, confirmations: [confirmation, confirmation] }));
    assert.throws(() => report({ packet, confirmations: Array(11).fill(confirmation) }));
    const unresolved = report({
      packet,
      confirmations: [{ ...confirmation, status: "unresolved" }],
    });
    assert.equal(unresolved.coverage.unresolvedPairs, 1);
    assert.equal(unresolved.findings.length, 0);
    assert.equal(unresolved.status, "incomplete");
    assert.throws(() =>
      report({
        packet,
        ranking: {
          packetDigest: digest(packet),
          snapshotDigest: packet.snapshot.digest,
          status: "ranked",
          model: "invented",
        },
      }),
    );
  });
  const capture = {
    schemaVersion: 1,
    caseId: "case-01",
    caseDigest: digest(cases.cases[0]),
    arm: "host",
    snapshotDigest: packet.snapshot.digest,
    findings: expected.cases[0].findings.map((f) => ({ ...f })),
    reviewedCandidates: 2,
    investigatedPaths: expected.cases[0].findings.map((f) => f.path),
    metrics: { elapsedMs: 1, modelCostUsd: null, inputTokens: null, outputTokens: null },
    provenance: { kind: "mock", runner: "offline-fixture", model: "fake" },
  };
  await check("mechanical grading exposes collection denominator and duplicates", () => {
    const score = gradeCapture(capture, cases.cases[0], expected.cases[0], packet);
    assert.equal(score.truePositives, 2);
    assert.equal(score.collectionMisses, 0);
    const duplicate = gradeCapture(
      { ...capture, findings: [...capture.findings, capture.findings[0]] },
      cases.cases[0],
      expected.cases[0],
      packet,
    );
    assert.equal(duplicate.duplicates, 1);
    assert.throws(() =>
      gradeCapture(
        { ...capture, snapshotDigest: "stale" },
        cases.cases[0],
        expected.cases[0],
        packet,
      ),
    );
  });
  await check("grading rejects inconsistent effort, weak quotes and missing metrics", () => {
    assert.throws(() =>
      gradeCapture(
        { ...capture, reviewedCandidates: 0 },
        cases.cases[0],
        expected.cases[0],
        packet,
      ),
    );
    assert.throws(() =>
      gradeCapture(
        { ...capture, investigatedPaths: ["docs/search.md", "src/projects.mjs"] },
        cases.cases[0],
        expected.cases[0],
        packet,
      ),
    );
    assert.throws(() =>
      gradeCapture({ ...capture, metrics: {} }, cases.cases[0], expected.cases[0], packet),
    );
    const weak = gradeCapture(
      {
        ...capture,
        findings: capture.findings.map((finding) => ({ ...finding, quote: finding.quote[0] })),
      },
      cases.cases[0],
      expected.cases[0],
      packet,
    );
    assert.equal(weak.truePositives, 0);
    assert.equal(weak.falsePositives, 2);
  });
  await check("mock or missing comparison arms never advance", () => {
    const comparison = compareCaptures([capture], cases, expected);
    assert.equal(comparison.summaries[0].decision, "inconclusive");
    assert.equal(comparison.summaries[0].arms.host.modelCostUsd, null);
    assert.throws(() => compareCaptures([capture, capture], cases, expected));
  });
  await check("complete matched arms still cannot advance with unknown workflow costs", () => {
    const miniCases = { schemaVersion: 1, cases: [cases.cases[0]] };
    const miniExpected = { schemaVersion: 1, cases: [expected.cases[0]] };
    const matched = ["ordinary", "host", "jev"].map((arm) => ({
      ...capture,
      arm,
      findings: arm === "host" ? capture.findings.slice(0, 1) : capture.findings,
      provenance: {
        kind: "live",
        runner: "fixture-only",
        model: "fixture-model",
        protocolDigest: "same-protocol",
        candidateDigest: "same-candidates",
        independentlyGraded: true,
        matchedProtocol: true,
      },
      ranking:
        arm === "jev"
          ? {
              model: MODEL,
              status: "ranked",
              snapshotDigest: packet.snapshot.digest,
              usage: { attempts: 1, costComplete: true },
            }
          : undefined,
    }));
    assert.equal(
      compareCaptures(matched, miniCases, miniExpected, {
        schemaVersion: 1,
        complete: true,
        additionalAttempts: 0,
      }).summaries[0].decision,
      "inconclusive-cost",
    );
    const priced = matched.map((row) => ({ ...row, metrics: { ...row.metrics, modelCostUsd: 1 } }));
    assert.equal(
      compareCaptures(priced, miniCases, miniExpected, {
        schemaVersion: 1,
        complete: true,
        additionalAttempts: 0,
      }).summaries[0].decision,
      "advance-candidate",
    );
    priced[2].provenance = { ...priced[2].provenance, candidateDigest: "different-candidates" };
    assert.equal(
      compareCaptures(priced, miniCases, miniExpected, {
        schemaVersion: 1,
        complete: true,
        additionalAttempts: 0,
      }).summaries[0].decision,
      "inconclusive",
    );
  });
  await check("shared request budget includes both splits and discarded provider attempts", () => {
    const subset = { schemaVersion: 1, cases: [cases.cases[0], cases.cases[8]] };
    const keys = { schemaVersion: 1, cases: [expected.cases[0], expected.cases[8]] };
    const captures = subset.cases.flatMap((testCase) => {
      const source = fixtures.get(testCase.id).packet;
      const findings = keys.cases.find((entry) => entry.id === testCase.id).findings;
      return ["ordinary", "host", "jev"].map((arm) => ({
        ...capture,
        caseId: testCase.id,
        caseDigest: digest(testCase),
        snapshotDigest: source.snapshot.digest,
        arm,
        findings: arm === "host" ? [] : findings,
        investigatedPaths: findings.map((finding) => finding.path),
        reviewedCandidates: findings.length,
        metrics: { ...capture.metrics, modelCostUsd: 1 },
        provenance: {
          kind: "live",
          runner: "fixture-only",
          model: "fixture-model",
          protocolDigest: "same-protocol",
          candidateDigest: digest(source.candidates),
          independentlyGraded: true,
          matchedProtocol: true,
        },
        ranking:
          arm === "jev"
            ? {
                model: MODEL,
                status: "ranked",
                snapshotDigest: source.snapshot.digest,
                usage: { attempts: 50, costComplete: true },
              }
            : undefined,
      }));
    });
    const atLimit = compareCaptures(captures, subset, keys, {
      schemaVersion: 1,
      complete: true,
      additionalAttempts: 0,
    });
    assert.equal(atLimit.requestBudget.totalAttempts, 100);
    assert.ok(atLimit.summaries.every((summary) => summary.decision === "advance-candidate"));
    const exceeded = compareCaptures(captures, subset, keys, {
      schemaVersion: 1,
      complete: true,
      additionalAttempts: 1,
    });
    assert.equal(exceeded.requestBudget.totalAttempts, 101);
    assert.ok(exceeded.summaries.every((summary) => summary.decision === "inconclusive"));
    assert.ok(
      compareCaptures(captures, subset, keys).summaries.every(
        (summary) => summary.decision === "inconclusive",
      ),
    );
  });
  count += await runHardeningChecks();
  count += await runOperationsChecks();
  console.log(
    `Passed ${count} offline change-impact checks. No live provider calls or efficacy claims.`,
  );
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
