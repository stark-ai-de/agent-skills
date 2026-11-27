import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

import { createBaseline, findRegressions } from "@servrox/code-quality/baseline";

import { baselinePath, checkBaselineHistory } from "./baseline.mjs";
import { assertConsumerContract, readConsumerContract } from "./contract.mjs";
import { collectFindings } from "./report.mjs";

const [mode = "--check", ...extra] = process.argv.slice(2);

assert.ok(
  ["--check", "--prune-baseline"].includes(mode) && extra.length === 0,
  "Use --check or --prune-baseline",
);

assertConsumerContract(readConsumerContract());

const baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));

const infrastructureBudget = Object.keys(baseline.entries).filter((identity) => {
  const [file] = JSON.parse(identity);

  return (
    file.startsWith("scripts/quality/") || ["oxlint.config.mjs", "oxfmt.config.mjs"].includes(file)
  );
});

assert.equal(
  infrastructureBudget.length,
  0,
  "New quality infrastructure receives no legacy allowance",
);

checkBaselineHistory(baseline);

const findings = collectFindings();
const regressions = findRegressions(findings, baseline);

for (const finding of regressions) {
  console.error(
    `${finding.file}: ${finding.rule}: ${finding.message} (current ${finding.value}, allowed ${finding.allowed})`,
  );
}

if (regressions.length > 0) {
  process.exitCode = 1;
} else if (mode === "--prune-baseline") {
  writeFileSync(baselinePath, `${JSON.stringify(createBaseline(findings), null, 2)}\n`);
  console.log("Shared quality baseline pruned; review and commit the reduced allowances.");
} else {
  console.log(`Shared quality: ${findings.length} existing findings; no regressions.`);
}
