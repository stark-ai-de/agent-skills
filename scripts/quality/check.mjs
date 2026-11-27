import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";

import { createBaseline, findRegressions } from "@servrox/code-quality/baseline";

import { baselinePath, readBaseline } from "./baseline.mjs";
import { assertConsumerContract, readConsumerContract } from "./contract.mjs";
import { locateFindings } from "./diagnostics.mjs";
import { collectReport } from "./report.mjs";
import { reductionHint, summarizeReport, writeStepSummary } from "./summary.mjs";

const checkQuality = () => {
  const [mode = "--check", ...extra] = process.argv.slice(2);
  assert.ok(
    ["--check", "--prune-baseline"].includes(mode) && extra.length === 0,
    "Use --check or --prune-baseline",
  );
  assertConsumerContract(readConsumerContract());

  const baseline = readBaseline();
  const report = collectReport();
  const regressions = findRegressions(report.findings, baseline);
  const locations = locateFindings(regressions, report);
  const summary = summarizeReport(report, baseline, regressions);

  for (const [index, finding] of regressions.entries()) {
    console.error(`${locations[index]} (current ${finding.value}, allowed ${finding.allowed})`);
  }

  writeStepSummary(summary);

  if (regressions.length > 0) {
    process.exitCode = 1;
  } else if (mode === "--prune-baseline") {
    writeFileSync(baselinePath, `${JSON.stringify(createBaseline(report.findings), null, 2)}\n`);
    console.log("Shared quality baseline pruned; review and commit the reduced allowances.");
  } else {
    console.log(`Shared quality: ${report.findings.length} existing findings; no regressions.`);

    for (const line of reductionHint(summary.reductions)) {
      console.log(line);
    }
  }
};

try {
  checkQuality();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
