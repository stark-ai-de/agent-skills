import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { credential } from "../../../incubator/skills/engineering-workflows/change-impact/scripts/credentials.mjs";
import { digest } from "../../../incubator/skills/engineering-workflows/change-impact/scripts/collect.mjs";
import {
  queue,
  report,
} from "../../../incubator/skills/engineering-workflows/change-impact/scripts/review.mjs";
import { MODEL } from "../../../incubator/skills/engineering-workflows/change-impact/scripts/rank.mjs";
import {
  createFixture,
  loadCases,
  loadOperationalCases,
  loadOperationalExpected,
} from "./evaluate.mjs";

const cli = fileURLToPath(
  new URL(
    "../../../incubator/skills/engineering-workflows/change-impact/scripts/change-impact.mjs",
    import.meta.url,
  ),
);
export async function runOperationsChecks() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "change-impact-operations-"));
  let count = 0;
  const check = (name, fn) => {
    fn();
    count++;
    console.log(`ok operations ${count} - ${name}`);
  };
  try {
    const { packet } = createFixture(loadCases().cases[0], path.join(temporary, "repo-fixture"));
    const records = packet.candidates.map((candidate) => ({
      candidateId: candidate.id,
      contractId: packet.contracts[0].id,
      relation: "unrelated",
      probabilities: { old_assumption: 0, compatible: 0, unrelated: 1, uncertain: 0 },
      confidence: 1,
      priority: 0,
    }));
    const preferred = records.find(
      (row) => packet.candidates.find((c) => c.id === row.candidateId).path === "tools/import.mjs",
    );
    Object.assign(preferred, {
      relation: "old_assumption",
      probabilities: { old_assumption: 1, compatible: 0, unrelated: 0, uncertain: 0 },
      priority: 1,
    });
    const ranking = {
      schemaVersion: 1,
      packetDigest: digest(packet),
      snapshotDigest: packet.snapshot.digest,
      model: MODEL,
      status: "ranked",
      records,
      errors: [],
      coverage: { plannedPairs: records.length, evaluatedPairs: records.length, pendingPairs: 0 },
      usage: {
        attempts: 1,
        inputTokens: 100,
        outputTokens: 30,
        estimatedCostUsd: (100 * 0.042) / 1000000,
        costComplete: true,
        elapsedMs: 1,
      },
    };
    check(
      "mandatory source precedes provider preference and pending coverage stays explicit",
      () => {
        const first = queue({ packet, ranking, limit: 1 });
        assert.equal(first.items[0].candidate.path, "src/projects.mjs");
        assert.equal(first.items[0].mandatory, true);
        assert.equal(first.coverage.pendingPairs, packet.candidates.length);
        assert.equal(first.coverage.remainingAfterBatch, packet.candidates.length - 1);
        assert.ok(!JSON.stringify(first).includes(packet.options.root));
        const selected = queue({
          packet,
          ranking,
          requiredPaths: ["docs/onboarding.de.md"],
          limit: 2,
        });
        assert.ok(selected.items.some((item) => item.candidate.path === "docs/onboarding.de.md"));
        assert.throws(() => queue({ packet, ranking, requiredPaths: ["outside.txt"] }));
      },
    );
    check(
      "accumulated confirmations allow continued batches without forgetting unresolved pairs",
      () => {
        const confirmations = [];
        let result;
        while ((result = queue({ packet, ranking, confirmations, limit: 3 })).items.length) {
          for (const item of result.items)
            confirmations.push({
              candidateId: item.candidate.id,
              contractId: item.contractId,
              status: "dismissed",
              quote: item.candidate.content,
              reason: "Synthetic test witness: all collected artifacts were inspected.",
            });
        }
        assert.ok(confirmations.length > 10);
        assert.equal(report({ packet, ranking, confirmations }).status, "reviewed");
        confirmations[0].status = "unresolved";
        assert.equal(
          queue({ packet, ranking, confirmations, limit: 1 }).items[0].candidate.id,
          confirmations[0].candidateId,
        );
        assert.equal(report({ packet, ranking, confirmations }).status, "incomplete");
      },
    );
    check("queue and reporting refuse fabricated ranking provenance", () => {
      const invalid = { ...ranking, records: [], errors: [{ reason: "request-budget" }] };
      assert.throws(() => queue({ packet, ranking: invalid }));
      assert.throws(() => report({ packet, ranking: invalid }));
      assert.throws(() => queue({ packet, preferredCandidateIds: ["unknown"] }));
    });
    check(
      "large evidence files prioritize exact anchors with conservative ambiguous fallback",
      () => {
        for (const kind of ["exact", "cross-chunk", "repeated"]) {
          const testCase = structuredClone(loadCases().cases[0]);
          const evidence = testCase.contracts[0].evidence.find((entry) => entry.side === "after");
          const source = testCase.afterFiles[evidence.path];
          testCase.afterFiles[evidence.path] =
            Array.from({ length: 81 }, (_, i) => "// context " + i).join("\n") + "\n" + source;
          if (kind === "cross-chunk") evidence.quote = "// context 79\n// context 80";
          if (kind === "repeated") {
            evidence.quote = "// shared context";
            testCase.afterFiles[evidence.path] = testCase.afterFiles[evidence.path]
              .replace("// context 0\n", "// shared context\n")
              .replace("// context 40\n", "// shared context\n");
          }
          const fixture = createFixture(testCase, path.join(temporary, "anchors-" + kind));
          const batch = queue({ packet: fixture.packet, limit: 50 });
          const mandatory = batch.items.filter((item) => item.mandatory);
          const sourceItems = batch.items.filter((item) => item.candidate.path === evidence.path);
          assert.ok(sourceItems.length > 1);
          if (kind === "exact") {
            assert.equal(mandatory.length, 1);
            assert.ok(mandatory[0].candidate.content.includes(evidence.quote));
            assert.equal(
              queue({
                packet: fixture.packet,
                requiredPaths: [evidence.path],
                limit: 50,
              }).items.filter((item) => item.mandatory).length,
              sourceItems.length,
            );
          } else assert.equal(mandatory.length, sourceItems.length);
        }
      },
    );
    check("overriding repository instructions remain mandatory before preferred candidates", () => {
      const testCase = loadCases().cases[0];
      const instruction = { "nested/AGENTS.override.md": "Inspect the local consumer contract.\n" };
      const fixture = createFixture(
        {
          ...testCase,
          beforeFiles: { ...testCase.beforeFiles, ...instruction },
          afterFiles: { ...testCase.afterFiles, ...instruction },
        },
        path.join(temporary, "override-instructions"),
      );
      const preferredCandidate = fixture.packet.candidates.find(
        (candidate) => candidate.path === "tools/import.mjs",
      );
      const batch = queue({
        packet: fixture.packet,
        preferredCandidateIds: [preferredCandidate.id],
        limit: 2,
      });
      assert.ok(batch.items.every((item) => item.mandatory));
      assert.ok(batch.items.some((item) => item.candidate.path === "nested/AGENTS.override.md"));
    });
    const keyPath = path.join(temporary, "key");
    fs.writeFileSync(keyPath, "synthetic-fixture-credential\n", { mode: 0o600 });
    check("credential files and explicit environment precedence remain local and bounded", () => {
      assert.equal(
        credential({ TYPESAFE_API_KEY_FILE: keyPath }).key,
        "synthetic-fixture-credential",
      );
      assert.equal(
        credential({ TYPESAFE_API_KEY: "", TYPESAFE_API_KEY_FILE: keyPath }).reason,
        "credential-missing",
      );
      assert.equal(credential({ TYPESAFE_API_KEY: "two words" }).reason, "credential-invalid");
      fs.writeFileSync(keyPath, "a".repeat(4097));
      assert.equal(
        credential({ TYPESAFE_API_KEY_FILE: keyPath }).reason,
        "credential-file-too-large",
      );
      fs.writeFileSync(keyPath, "synthetic-fixture-credential\n");
      const link = path.join(temporary, "link");
      fs.symlinkSync(keyPath, link);
      assert.equal(
        credential({ TYPESAFE_API_KEY_FILE: link }).reason,
        "credential-file-unreadable",
      );
    });
    check(
      "installed-style CLI doctor succeeds offline without exposing credential or location",
      () => {
        const env = { ...process.env, TYPESAFE_API_KEY_FILE: keyPath };
        delete env.TYPESAFE_API_KEY;
        const output = execFileSync(process.execPath, [cli, "doctor"], { env, encoding: "utf8" });
        const value = JSON.parse(output);
        assert.equal(value.status, "configured");
        assert.equal(value.networkAttempted, false);
        assert.ok(!output.includes(keyPath) && !output.includes("synthetic-fixture-credential"));
        delete env.TYPESAFE_API_KEY_FILE;
        assert.throws(
          () =>
            execFileSync(process.execPath, [cli, "doctor"], {
              env,
              encoding: "utf8",
              stdio: "pipe",
            }),
          (error) => error.status === 2 && JSON.parse(error.stdout).status === "incomplete",
        );
      },
    );
    check("a FIFO credential is rejected without waiting for a writer", () => {
      const fifo = path.join(temporary, "credential-fifo");
      execFileSync("mkfifo", [fifo]);
      const env = { ...process.env, TYPESAFE_API_KEY_FILE: fifo };
      delete env.TYPESAFE_API_KEY;
      assert.throws(
        () =>
          execFileSync(process.execPath, [cli, "doctor"], {
            env,
            encoding: "utf8",
            stdio: "pipe",
            timeout: 5000,
          }),
        (error) =>
          error.status === 2 &&
          JSON.parse(error.stdout).credential.reason === "credential-file-not-regular",
      );
    });
    check("CLI errors are actionable, redact raw input and enforce live opt-in", () => {
      assert.throws(
        () =>
          execFileSync(process.execPath, [cli, "rank"], {
            input: JSON.stringify(packet),
            encoding: "utf8",
            stdio: "pipe",
          }),
        (error) =>
          error.status === 2 && JSON.parse(error.stderr).error.code === "live-opt-in-required",
      );
      assert.throws(
        () =>
          execFileSync(process.execPath, [cli, "collect"], {
            input: "DO_NOT_ECHO_PRIVATE_INPUT",
            encoding: "utf8",
            stdio: "pipe",
          }),
        (error) => error.status === 2 && !error.stderr.includes("DO_NOT_ECHO_PRIVATE_INPUT"),
      );
      const first = JSON.parse(
        execFileSync(process.execPath, [cli, "queue"], {
          input: JSON.stringify({ packet, ranking, limit: 2 }),
          encoding: "utf8",
        }),
      );
      assert.equal(first.items.length, 2);
    });
    check(
      "fresh operational fixtures retain exact source contracts and independent anchors",
      () => {
        const cases = loadOperationalCases();
        const expected = loadOperationalExpected();
        assert.equal(cases.cases.length, 3);
        for (const testCase of cases.cases) {
          const fixture = createFixture(testCase, path.join(temporary, testCase.id));
          assert.equal(fixture.packet.coverage.omissions.length, 0);
          assert.ok(fixture.packet.candidates.length > 12);
          const reference = expected.cases.find((entry) => entry.id === testCase.id);
          assert.ok(reference);
          for (const finding of reference.findings) {
            assert.equal(testCase.beforeFiles[finding.path], testCase.afterFiles[finding.path]);
            assert.ok(
              fixture.packet.candidates.some(
                (candidate) =>
                  candidate.path === finding.path && candidate.content.includes(finding.quote),
              ),
            );
          }
        }
      },
    );
    check("missing-credential CLI result remains valid incomplete provenance", () => {
      let failed;
      try {
        execFileSync(process.execPath, [cli, "rank", "--live"], {
          env: { ...process.env, TYPESAFE_API_KEY: "" },
          input: JSON.stringify(packet),
          encoding: "utf8",
          stdio: "pipe",
        });
      } catch (error) {
        assert.equal(error.status, 2);
        failed = JSON.parse(error.stdout);
      }
      assert.ok(failed);
      assert.equal(failed.usage.attempts, 0);
      assert.equal(failed.credential.reason, "credential-missing");
      assert.equal(queue({ packet, ranking: failed }).rankingStatus, "incomplete");
      assert.equal(report({ packet, ranking: failed }).status, "incomplete");
    });
    return count;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  runOperationsChecks().then((count) => console.log(`Passed ${count} operational checks.`));
