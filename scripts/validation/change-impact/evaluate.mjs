import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  collect,
  digest,
  relative,
  requireValue,
} from "../../../incubator/skills/engineering-workflows/change-impact/scripts/collect.mjs";
import {
  MODEL,
  rank,
} from "../../../incubator/skills/engineering-workflows/change-impact/scripts/rank.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const evidenceRoot = path.join(repositoryRoot, "skill-evals/change-impact");
export const loadCases = () =>
  JSON.parse(fs.readFileSync(path.join(evidenceRoot, "cases.json"), "utf8"));
export const loadOperationalCases = () =>
  JSON.parse(fs.readFileSync(path.join(evidenceRoot, "operational-cases.json"), "utf8"));
export const loadOperationalExpected = () =>
  JSON.parse(fs.readFileSync(path.join(evidenceRoot, "operational-expected.json"), "utf8"));
export const loadExpected = () =>
  JSON.parse(fs.readFileSync(path.join(evidenceRoot, "expected.json"), "utf8"));

export function createFixture(testCase, output) {
  requireValue(!fs.existsSync(output), "Refusing to overwrite an existing evaluation directory");
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  const root = path.join(output, "repo");
  fs.mkdirSync(root);
  const git = (args, input) =>
    execFileSync("git", ["-C", root, ...args], {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Synthetic Fixture",
        GIT_AUTHOR_EMAIL: "fixture@example.invalid",
        GIT_COMMITTER_NAME: "Synthetic Fixture",
        GIT_COMMITTER_EMAIL: "fixture@example.invalid",
        GIT_AUTHOR_DATE: "2000-01-01T00:00:00Z",
        GIT_COMMITTER_DATE: "2000-01-01T00:00:00Z",
      },
    }).trim();
  git(["init", "--quiet"]);
  function commit(files, parent) {
    const entries = new Map();
    for (const [file, content] of Object.entries(files)) {
      relative(file);
      requireValue(typeof content === "string", "Fixture content must be text");
      const parts = file.split("/");
      let branch = entries;
      for (const part of parts.slice(0, -1)) {
        if (!branch.has(part)) branch.set(part, new Map());
        branch = branch.get(part);
      }
      branch.set(parts.at(-1), git(["hash-object", "-w", "--stdin"], content));
    }
    function tree(map) {
      return git(
        ["mktree", "-z"],
        [...map]
          .map(([name, value]) =>
            value instanceof Map
              ? `040000 tree ${tree(value)}\t${name}\0`
              : `100644 blob ${value}\t${name}\0`,
          )
          .join(""),
      );
    }
    return git(
      ["commit-tree", tree(entries), ...(parent ? ["-p", parent] : [])],
      "Synthetic behavior snapshot\n",
    );
  }
  const base = commit(testCase.beforeFiles);
  const head = commit(testCase.afterFiles, base);
  git(["update-ref", "refs/heads/fixture", head]);
  git(["symbolic-ref", "HEAD", "refs/heads/fixture"]);
  for (const [file, content] of Object.entries(testCase.afterFiles)) {
    const full = path.join(root, relative(file));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  const packet = collect({
    root,
    base,
    head,
    scope: testCase.scope,
    contracts: testCase.contracts,
  });
  fs.writeFileSync(path.join(output, "packet.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(
    path.join(output, "task.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        caseId: testCase.id,
        task: testCase.task,
        base,
        head,
        snapshotDigest: packet.snapshot.digest,
        caseDigest: digest(testCase),
        maxConfirmations: 10,
      },
      null,
      2,
    ) + "\n",
  );
  return { root, base, head, packet };
}

export function gradeCapture(capture, testCase, expected, packet) {
  requireValue(
    capture.schemaVersion === 1 &&
      capture.caseId === testCase.id &&
      ["ordinary", "host", "jev"].includes(capture.arm),
    "Invalid capture identity",
  );
  requireValue(
    capture.caseDigest === digest(testCase) && capture.snapshotDigest === packet.snapshot.digest,
    "Capture uses different fixture or snapshot",
  );
  requireValue(
    capture.provenance?.kind === "live" || capture.provenance?.kind === "mock",
    "Capture must identify live or mock provenance",
  );
  requireValue(
    typeof capture.provenance?.runner === "string" && typeof capture.provenance?.model === "string",
    "Capture needs runner and model identity",
  );
  requireValue(
    Number.isInteger(capture.reviewedCandidates) &&
      capture.reviewedCandidates >= 0 &&
      capture.reviewedCandidates <= 10,
    "Invalid investigation count",
  );
  requireValue(
    Array.isArray(capture.findings) && capture.findings.length <= 10,
    "Invalid findings",
  );
  requireValue(
    Array.isArray(capture.investigatedPaths) &&
      new Set(capture.investigatedPaths).size === capture.investigatedPaths.length &&
      capture.investigatedPaths.length === capture.reviewedCandidates &&
      capture.investigatedPaths.every((file) => Object.hasOwn(testCase.afterFiles, file)),
    "Investigated paths must match the investigation count and current source",
  );
  requireValue(
    capture.findings.every((finding) => capture.investigatedPaths.includes(finding.path)),
    "Findings require an investigated artifact",
  );
  requireValue(
    Number.isFinite(capture.metrics?.elapsedMs) && capture.metrics.elapsedMs >= 0,
    "Capture needs measured elapsed time",
  );
  for (const field of ["modelCostUsd", "inputTokens", "outputTokens"])
    requireValue(
      capture.metrics[field] === null ||
        (Number.isFinite(capture.metrics[field]) && capture.metrics[field] >= 0),
      "Unknown costs/tokens must be explicitly null",
    );
  const seen = new Set();
  const found = new Set();
  let falsePositives = 0;
  let duplicates = 0;
  for (const finding of capture.findings) {
    const key = `${finding.contractId}:${finding.path}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    const source = testCase.afterFiles[finding.path];
    const match = expected.findings.find(
      (e) => e.contractId === finding.contractId && e.path === finding.path,
    );
    if (
      match &&
      typeof finding.quote === "string" &&
      finding.quote.trim() &&
      source?.includes(finding.quote) &&
      finding.quote.includes(match.quote) &&
      finding.rationale?.trim()
    )
      found.add(key);
    else falsePositives++;
  }
  const collected = expected.findings.filter((finding) =>
    packet.candidates.some((c) => c.path === finding.path && c.content.includes(finding.quote)),
  ).length;
  return {
    caseId: testCase.id,
    split: testCase.split,
    arm: capture.arm,
    truePositives: found.size,
    falsePositives,
    falseNegatives: expected.findings.length - found.size,
    duplicates,
    expected: expected.findings.length,
    collectedReferences: collected,
    collectionMisses: expected.findings.length - collected,
    confirmedKeys: [...found].sort(),
    reviewedCandidates: capture.reviewedCandidates,
    metrics: capture.metrics,
    provenance: capture.provenance,
    ranking: capture.ranking,
    snapshotDigest: capture.snapshotDigest,
    caseDigest: capture.caseDigest,
    semanticGrading:
      "Path and exact-quote matching is mechanical; independent rationale review is required for advancement.",
  };
}

export function compareCaptures(captures, cases, expected, ledger) {
  if (ledger !== undefined)
    requireValue(
      ledger.schemaVersion === 1 &&
        typeof ledger.complete === "boolean" &&
        Number.isInteger(ledger.additionalAttempts) &&
        ledger.additionalAttempts >= 0,
      "Invalid provider attempt ledger",
    );
  const jevCaptures = captures.filter((capture) => capture.arm === "jev");
  const attemptsKnown = jevCaptures.every(
    (capture) =>
      Number.isInteger(capture.ranking?.usage?.attempts) && capture.ranking.usage.attempts >= 0,
  );
  const capturedAttempts = attemptsKnown
    ? jevCaptures.reduce((sum, capture) => sum + capture.ranking.usage.attempts, 0)
    : null;
  const totalAttempts =
    attemptsKnown && ledger?.complete ? capturedAttempts + ledger.additionalAttempts : null;
  const requestBudget = {
    limit: 100,
    capturedAttempts,
    additionalAttempts: ledger?.additionalAttempts ?? null,
    totalAttempts,
    withinBudget: totalAttempts !== null && totalAttempts <= 100,
  };
  const rows = [];
  const seen = new Set();
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "change-impact-compare-"));
  try {
    for (const testCase of cases.cases) {
      const relevant = captures.filter((c) => c.caseId === testCase.id);
      if (!relevant.length) continue;
      const { packet } = createFixture(testCase, path.join(temporary, testCase.id));
      for (const capture of relevant) {
        const identity = `${capture.caseId}:${capture.arm}`;
        requireValue(!seen.has(identity), "Duplicate capture for one case and arm");
        seen.add(identity);
        rows.push(
          gradeCapture(
            capture,
            testCase,
            expected.cases.find((e) => e.id === testCase.id),
            packet,
          ),
        );
      }
    }
    requireValue(rows.length === captures.length, "Unknown case in captures");
    const summaries = ["pilot", "holdout"].map((split) => {
      const splitCases = cases.cases.filter((c) => c.split === split);
      const selected = rows.filter((r) => r.split === split);
      const arms = Object.fromEntries(
        ["ordinary", "host", "jev"].map((arm) => {
          const armRows = selected.filter((r) => r.arm === arm);
          const costKnown =
            armRows.length > 0 &&
            armRows.every(
              (r) =>
                typeof r.metrics?.modelCostUsd === "number" &&
                Number.isFinite(r.metrics.modelCostUsd) &&
                r.metrics.modelCostUsd >= 0,
            );
          return [
            arm,
            {
              cases: armRows.length,
              truePositives: armRows.reduce((s, r) => s + r.truePositives, 0),
              falsePositives: armRows.reduce((s, r) => s + r.falsePositives, 0),
              effort: armRows.reduce((s, r) => s + r.reviewedCandidates, 0),
              modelCostUsd: costKnown
                ? armRows.reduce((s, r) => s + r.metrics.modelCostUsd, 0)
                : null,
            },
          ];
        }),
      );
      const protocolMatched = splitCases.every((testCase) => {
        const group = selected.filter((row) => row.caseId === testCase.id);
        return (
          group.length === 3 &&
          group.every(
            (row) =>
              typeof row.provenance.protocolDigest === "string" &&
              row.provenance.protocolDigest === group[0].provenance.protocolDigest &&
              row.provenance.model === group[0].provenance.model,
          ) &&
          group
            .filter((row) => row.arm !== "ordinary")
            .every(
              (row) =>
                row.provenance.candidateDigest &&
                row.provenance.candidateDigest ===
                  group.find((entry) => entry.arm === "host").provenance.candidateDigest,
            )
        );
      });
      const rankingsComplete = selected
        .filter((row) => row.arm === "jev")
        .every(
          (row) =>
            row.ranking?.model === MODEL &&
            row.ranking.status === "ranked" &&
            row.ranking.snapshotDigest === row.snapshotDigest &&
            row.ranking.usage?.costComplete === true &&
            Number.isInteger(row.ranking.usage.attempts) &&
            row.ranking.usage.attempts > 0,
        );
      const complete =
        requestBudget.withinBudget &&
        protocolMatched &&
        rankingsComplete &&
        selected.length === splitCases.length * 3 &&
        selected.every(
          (r) =>
            r.provenance.kind === "live" &&
            r.provenance.independentlyGraded === true &&
            r.provenance.matchedProtocol === true,
        );
      const preserves = selected
        .filter((r) => r.arm === "host")
        .every((host) => {
          const jev = selected.find((r) => r.caseId === host.caseId && r.arm === "jev");
          return jev && host.confirmedKeys.every((key) => jev.confirmedKeys.includes(key));
        });
      const quality =
        arms.jev.truePositives > arms.host.truePositives &&
        arms.jev.effort <= arms.host.effort * 1.25;
      const economy =
        preserves &&
        arms.host.modelCostUsd > 0 &&
        arms.jev.modelCostUsd !== null &&
        arms.jev.modelCostUsd <= arms.host.modelCostUsd * 0.75;
      const noExtraFalse = arms.jev.falsePositives <= arms.host.falsePositives;
      return {
        split,
        arms,
        decision: !complete
          ? "inconclusive"
          : arms.host.modelCostUsd === null || arms.jev.modelCostUsd === null
            ? "inconclusive-cost"
            : noExtraFalse && (quality || economy)
              ? "advance-candidate"
              : "no-demonstrated-benefit",
        effortMetric:
          "number of deeply investigated candidates (predeclared); wall time and tokens also reported per capture",
      };
    });
    return {
      schemaVersion: 1,
      requestBudget,
      fixtureDigest: digest(cases),
      expectedDigest: digest(expected),
      rows,
      summaries,
      limitation:
        "Small synthetic pilot. Mechanical matching alone does not establish valid reasoning, host parity or general reliability.",
    };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args[0] === "--") args.shift();
  const [command, ...rest] = args;
  if (!command || command === "--help") {
    console.log(
      "eval:change-impact prepare --case ID --output NEW_DIRECTORY [--suite operational]\neval:change-impact rank --input PACKET --output NEW_FILE --live [--max-requests N]\neval:change-impact compare --runs DIRECTORY\nprepare writes only a new disposable fixture with Git objects, no staging. rank sends authorized excerpts to TypeSafe. compare reads capture files and emits JSON.",
    );
    return;
  }
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    requireValue(rest[i].startsWith("--"), "Invalid option");
    const key = rest[i].slice(2);
    requireValue(!Object.hasOwn(flags, key), "Duplicate option");
    flags[key] = key === "live" ? true : rest[++i];
  }
  let result;
  if (command === "prepare") {
    requireValue(flags.output && flags.case, "prepare needs --case and --output");
    requireValue(
      flags.suite === undefined || flags.suite === "operational",
      "Unknown fixture suite",
    );
    const testCase = (
      flags.suite === "operational" ? loadOperationalCases() : loadCases()
    ).cases.find((c) => c.id === flags.case);
    requireValue(testCase, "Unknown case");
    const { packet } = createFixture(testCase, path.resolve(flags.output));
    result = {
      caseId: testCase.id,
      snapshotDigest: packet.snapshot.digest,
      candidates: packet.candidates.length,
    };
  } else if (command === "rank") {
    requireValue(
      flags.live && flags.input && flags.output && !fs.existsSync(flags.output),
      "rank requires --live, --input and a new --output file",
    );
    result = await rank(JSON.parse(fs.readFileSync(flags.input, "utf8")), {
      maxRequests: Number(flags["max-requests"] ?? 16),
    });
    fs.writeFileSync(flags.output, JSON.stringify(result, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
    if (result.status !== "ranked") process.exitCode = 2;
  } else if (command === "compare") {
    requireValue(flags.runs, "compare needs --runs");
    const captures = fs
      .readdirSync(flags.runs)
      .filter((f) => f.endsWith(".capture.json"))
      .sort()
      .map((f) => JSON.parse(fs.readFileSync(path.join(flags.runs, f), "utf8")));
    requireValue(captures.length > 0, "No capture files found");
    const ledgerPath = path.join(flags.runs, "provider-ledger.json");
    const ledger = fs.existsSync(ledgerPath)
      ? JSON.parse(fs.readFileSync(ledgerPath, "utf8"))
      : undefined;
    result = compareCaptures(captures, loadCases(), loadExpected(), ledger);
  } else throw new Error("Unknown command");
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 2;
  });
