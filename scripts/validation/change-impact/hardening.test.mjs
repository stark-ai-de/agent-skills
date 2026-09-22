import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collect } from "../../../incubator/skills/engineering-workflows/change-impact/scripts/collect.mjs";
import {
  MODEL,
  buildRequests,
  probe,
  rank,
  validateRanking,
} from "../../../incubator/skills/engineering-workflows/change-impact/scripts/rank.mjs";
import { createFixture } from "./evaluate.mjs";

function providerResponse(body) {
  return {
    model: MODEL,
    usage: { input_tokens: 100, output_tokens: 0 },
    answers: Object.fromEntries(
      Object.keys(body.questions).map((key) => [
        key,
        {
          type: "choice",
          choice: "unrelated",
          confidence: 0.96,
          probabilities: {
            old_assumption: 0.01,
            compatible: 0.01,
            unrelated: 0.97,
            uncertain: 0.01,
          },
        },
      ]),
    ),
  };
}

const successfulTransport = async (_url, { body }) =>
  new Response(JSON.stringify(providerResponse(JSON.parse(body))));

export async function runHardeningChecks(log = console.log) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "change-impact-hardening-"));
  let checks = 0;
  async function check(name, fn) {
    await fn();
    checks++;
    log(`ok hardening ${checks} - ${name}`);
  }
  try {
    const beforeFiles = {
      ".env": "placeholder only\n",
      "build/output.txt": "build artifact\n",
      "node_modules/example/index.js": "dependency artifact\n",
      "src/flag.mjs": "export const enabled = false;\n",
      "z-consumer.md": "The flag is disabled.\n",
    };
    const testCase = {
      id: "hardening",
      task: "Enable the flag.",
      scope: ["."],
      beforeFiles,
      afterFiles: { ...beforeFiles, "src/flag.mjs": "export const enabled = true;\n" },
      contracts: [
        {
          id: "flag",
          before: "The flag is disabled.",
          after: "The flag is enabled.",
          evidence: [
            { path: "src/flag.mjs", side: "before", quote: "enabled = false" },
            { path: "src/flag.mjs", side: "after", quote: "enabled = true" },
          ],
        },
      ],
    };
    const fixture = createFixture(testCase, path.join(temporary, "main"));
    const packet = fixture.packet;
    const options = { ...packet.options, head: "WORKTREE" };

    await check("excluded dependency/build/secret paths do not exhaust file budget", () => {
      for (const head of [packet.options.head, "WORKTREE"]) {
        const limited = collect({ ...options, head, limits: { maxFiles: 1 } });
        assert.deepEqual(
          limited.candidates.map((candidate) => candidate.path),
          ["src/flag.mjs"],
        );
        assert.ok(
          limited.coverage.omissions.some(
            (entry) => entry.path === "z-consumer.md" && entry.reason === "file-budget",
          ),
        );
        for (const file of [".env", "build/output.txt", "node_modules/example/index.js"])
          assert.notEqual(
            limited.coverage.omissions.find((entry) => entry.path === file)?.reason,
            "file-budget",
          );
      }
    });

    await check("a growing worktree file is read at most to the byte limit plus one", () => {
      const file = path.join(fixture.root, "z-growing.txt");
      fs.writeFileSync(file, "small\n");
      const inode = fs.statSync(file).ino;
      const fstat = fs.fstatSync;
      const read = fs.readSync;
      let targetFd;
      let consumed = 0;
      fs.fstatSync = (...args) => {
        const result = fstat(...args);
        if (result.ino === inode) {
          targetFd = args[0];
          fs.appendFileSync(file, Buffer.alloc(1024 * 1024, "x"));
        }
        return result;
      };
      fs.readSync = (...args) => {
        const length = read(...args);
        if (args[0] === targetFd) consumed += length;
        return length;
      };
      try {
        const limited = collect({ ...options, limits: { maxFileBytes: 128 } });
        assert.equal(consumed, 129);
        assert.ok(
          limited.coverage.omissions.some(
            (entry) => entry.path === "z-growing.txt" && entry.reason === "large-file",
          ),
        );
        assert.ok(!limited.candidates.some((candidate) => candidate.path === "z-growing.txt"));
      } finally {
        fs.fstatSync = fstat;
        fs.readSync = read;
        fs.unlinkSync(file);
      }
    });

    await check("a worktree file replaced by a FIFO is rejected without blocking", () => {
      const file = path.join(fixture.root, "z-consumer.md");
      const fifo = path.join(temporary, "source-fifo");
      execFileSync("mkfifo", [fifo]);
      const moduleUrl = new URL(
        "../../../incubator/skills/engineering-workflows/change-impact/scripts/collect.mjs",
        import.meta.url,
      ).href;
      const script = [
        'import fs from "node:fs"; import assert from "node:assert/strict";',
        `import { collect } from ${JSON.stringify(moduleUrl)};`,
        `const target = ${JSON.stringify(file)};`,
        "const open = fs.openSync; let swapped = false;",
        "fs.openSync = (name, ...args) => {",
        `  if (name === target && !swapped) { fs.renameSync(${JSON.stringify(fifo)}, target); swapped = true; }`,
        "  return open(name, ...args);",
        "};",
        `const packet = collect(${JSON.stringify(options)});`,
        "assert.equal(swapped, true);",
        'assert.ok(packet.coverage.omissions.some(entry => entry.path === "z-consumer.md" && entry.reason === "unreadable-or-changing"));',
        'assert.ok(!packet.candidates.some(entry => entry.path === "z-consumer.md"));',
      ].join("\n");
      try {
        execFileSync(process.execPath, ["--input-type=module", "-e", script], {
          encoding: "utf8",
          stdio: "pipe",
          timeout: 10000,
        });
      } finally {
        fs.unlinkSync(file);
        fs.writeFileSync(file, testCase.afterFiles["z-consumer.md"]);
      }
    });

    await check("missing promisor blobs stay offline and do not create a Git index", () => {
      const missing = createFixture(testCase, path.join(temporary, "promisor"));
      const git = (args) =>
        execFileSync("git", ["-C", missing.root, ...args], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 5000,
          env: { ...process.env, GIT_NO_LAZY_FETCH: "0" },
        }).trim();
      const blob = git(["rev-parse", `${missing.head}:z-consumer.md`]);
      const marker = path.join(temporary, "fetch-attempted");
      const trap = path.join(temporary, "fetch-trap.mjs");
      fs.writeFileSync(
        trap,
        `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(marker)}, "attempted"); process.exit(1);\n`,
      );
      git(["config", "core.repositoryformatversion", "1"]);
      git(["config", "extensions.partialclone", "origin"]);
      git(["config", "remote.origin.promisor", "true"]);
      git(["config", "remote.origin.url", `ext::${process.execPath} ${trap}`]);
      fs.unlinkSync(path.join(missing.root, ".git/objects", blob.slice(0, 2), blob.slice(2)));
      // Prove this fixture would invoke the transport when lazy fetch is allowed.
      assert.throws(() => git(["-c", "protocol.ext.allow=always", "cat-file", "-s", blob]));
      assert.equal(fs.existsSync(marker), true);
      fs.unlinkSync(marker);
      const result = collect(missing.packet.options);
      assert.equal(fs.existsSync(marker), false);
      assert.equal(fs.existsSync(path.join(missing.root, ".git/index")), false);
      assert.ok(
        result.coverage.omissions.some(
          (entry) => entry.path === "z-consumer.md" && entry.reason === "unreadable-or-changing",
        ),
      );
    });

    await check("oversized streamed responses cancel before draining the source", async () => {
      let chunks = 0;
      let cancelled = false;
      const result = await rank(packet, {
        apiKey: "fixture-only",
        transport: async () =>
          new Response(
            new ReadableStream(
              {
                pull(controller) {
                  chunks++;
                  controller.enqueue(new Uint8Array(65536));
                },
                cancel() {
                  cancelled = true;
                },
              },
              { highWaterMark: 0 },
            ),
          ),
      });
      assert.equal(cancelled, true);
      assert.equal(chunks, 17);
      assert.equal(result.status, "incomplete");
      assert.equal(result.usage.attempts, 1);
      assert.equal(result.usage.costComplete, false);
      assert.equal(result.records.length, 0);
    });

    await check("oversized declared responses and HTTP errors cancel without reading", async () => {
      for (const status of [200, 503]) {
        let chunks = 0;
        let cancelled = false;
        const result = await rank(packet, {
          apiKey: "fixture-only",
          transport: async () =>
            new Response(
              new ReadableStream(
                {
                  pull(controller) {
                    chunks++;
                    controller.enqueue(new Uint8Array(16));
                  },
                  cancel() {
                    cancelled = true;
                  },
                },
                { highWaterMark: 0 },
              ),
              { status, headers: { "content-length": "1048577" } },
            ),
        });
        assert.equal(cancelled, true);
        assert.equal(chunks, 0);
        assert.equal(result.status, "incomplete");
      }
    });

    await check("Retry-After HTTP dates honor the five-second ceiling", async () => {
      const result = await rank(packet, {
        apiKey: "fixture-only",
        transport: async () =>
          new Response("busy", {
            status: 429,
            headers: { "retry-after": new Date(Date.now() + 60000).toUTCString() },
          }),
        sleep: async () => assert.fail("A retry beyond the budget must not sleep"),
      });
      assert.equal(result.usage.attempts, 1);
      assert.ok(result.errors.some((error) => error.reason === "retry-window-exceeds-budget"));
    });

    await check(
      "short HTTP-date retries use the actual delay and cancel the busy body",
      async () => {
        const now = Date.now;
        const instant = Date.UTC(2026, 0, 1);
        Date.now = () => instant;
        let calls = 0;
        let cancelled = false;
        const delays = [];
        try {
          const result = await rank(packet, {
            apiKey: "fixture-only",
            sleep: async (ms) => delays.push(ms),
            transport: async (...args) => {
              calls++;
              if (calls === 1)
                return new Response(
                  new ReadableStream({
                    cancel() {
                      cancelled = true;
                    },
                  }),
                  {
                    status: 529,
                    headers: { "retry-after": new Date(instant + 3000).toUTCString() },
                  },
                );
              return successfulTransport(...args);
            },
          });
          assert.equal(cancelled, true);
          assert.deepEqual(delays, [3000]);
          assert.equal(result.status, "ranked");
          assert.equal(result.usage.costComplete, false);
        } finally {
          Date.now = now;
        }
      },
    );

    const valid = await rank(packet, { apiKey: "fixture-only", transport: successfulTransport });
    await check(
      "ranking validation accepts exact results and historic optional output usage",
      () => {
        assert.equal(validateRanking(packet, valid), valid);
        const historical = structuredClone(valid);
        delete historical.usage.outputTokens;
        assert.equal(validateRanking(packet, historical), historical);
      },
    );

    await check(
      "unsafe provider token counts fail without corrupting usage accounting",
      async () => {
        const result = await rank(packet, {
          apiKey: "fixture-only",
          transport: async (_url, { body }) => {
            const response = providerResponse(JSON.parse(body));
            response.usage.input_tokens = Number.MAX_SAFE_INTEGER + 1;
            return new Response(JSON.stringify(response));
          },
        });
        assert.equal(result.status, "incomplete");
        assert.equal(result.usage.inputTokens, 0);
        assert.equal(result.usage.costComplete, false);
        assert.equal(validateRanking(packet, result), result);
      },
    );

    await check(
      "ranking validation rejects false identity, duplicate pairs and invented judgments",
      () => {
        for (const mutate of [
          (value) => {
            value.model = "another-model";
          },
          (value) => {
            value.packetDigest = "another-packet";
          },
          (value) => {
            value.snapshotDigest = "another-snapshot";
          },
          (value) => {
            value.records[0].candidateId = "unknown";
          },
          (value) => {
            value.records[0].contractId = "unknown";
          },
          (value) => {
            value.records[1] = structuredClone(value.records[0]);
          },
          (value) => {
            value.records[0].probabilities.old_assumption = Infinity;
          },
          (value) => {
            value.records[0].confidence = NaN;
          },
          (value) => {
            value.records[0].priority = Infinity;
          },
          (value) => {
            value.records[0].priority = 0.99;
          },
          (value) => {
            value.records[0].relation = "old_assumption";
          },
        ]) {
          const altered = structuredClone(valid);
          mutate(altered);
          assert.throws(() => validateRanking(packet, altered));
        }
      },
    );

    await check(
      "ranking validation rejects false success, inconsistent coverage and accounting",
      () => {
        for (const mutate of [
          (value) => {
            value.coverage.plannedPairs++;
          },
          (value) => {
            value.coverage.evaluatedPairs--;
          },
          (value) => {
            value.coverage.pendingPairs = 1;
          },
          (value) => {
            value.status = "incomplete";
          },
          (value) => {
            value.errors.push({ reason: "snapshot-changed" });
          },
          (value) => {
            value.errors.push({ reason: "fabricated" });
            value.status = "incomplete";
          },
          (value) => {
            value.usage.attempts = 0;
          },
          (value) => {
            value.usage.attempts = 101;
          },
          (value) => {
            value.usage.inputTokens = 0.5;
          },
          (value) => {
            value.usage.outputTokens = -1;
          },
          (value) => {
            value.usage.costComplete = "true";
          },
          (value) => {
            value.usage.estimatedCostUsd = 1;
          },
          (value) => {
            value.usage.elapsedMs = -1;
          },
        ]) {
          const altered = structuredClone(valid);
          mutate(altered);
          assert.throws(() => validateRanking(packet, altered));
        }
        const partial = structuredClone(valid);
        partial.records.pop();
        partial.coverage.evaluatedPairs--;
        partial.coverage.pendingPairs++;
        partial.status = "incomplete";
        assert.equal(validateRanking(packet, partial), partial);
      },
    );

    await check(
      "synthetic provider probe shares validation and never includes repository excerpts",
      async () => {
        let calls = 0;
        const result = await probe({
          apiKey: "fixture-only",
          transport: async (url, options) => {
            calls++;
            const body = JSON.parse(options.body);
            assert.equal(Object.keys(body.questions).length, 1);
            assert.ok(!options.body.includes(fixture.root));
            assert.ok(!options.body.includes("export const"));
            assert.equal(options.redirect, "error");
            return successfulTransport(url, options);
          },
        });
        assert.equal(calls, 1);
        assert.equal(result.status, "ready");
        assert.equal(result.model, MODEL);
        assert.equal(result.usage.inputTokens, 100);
        assert.ok(!JSON.stringify(result).includes("fixture-only"));
        const missing = await probe({ apiKey: "", transport: () => assert.fail("missing key") });
        assert.equal(missing.status, "incomplete");
        assert.equal(missing.usage.attempts, 0);
        const malformed = await probe({
          apiKey: "fixture-only",
          transport: async () => new Response("secret upstream text"),
        });
        assert.equal(malformed.status, "incomplete");
        assert.ok(!JSON.stringify(malformed).includes("secret upstream text"));
      },
    );
    assert.ok(buildRequests(packet).length > 0);
    return checks;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runHardeningChecks();
}
