import assert from "node:assert/strict";

import { findRegressions } from "@servrox/code-quality/baseline";

import { readBaseline } from "./baseline.mjs";
import { assertConsumerContract, readConsumerContract } from "./contract.mjs";
import { describeDiagnostic } from "./diagnostics.mjs";
import { collectReport } from "./report.mjs";
import { sourceRoots } from "./scope.mjs";
import { selectSourceFiles } from "./selection.mjs";
import { formatSummary, summarizeReport } from "./summary.mjs";

const parseArguments = () => {
  const [mode, ...args] = process.argv.slice(2);
  assert.ok(["report", "fix"].includes(mode), "Use report [--json] [-- files] or fix -- files");

  if (args[0] === "--") {
    args.shift();
  }

  const json = mode === "report" && args[0] === "--json";

  if (json) {
    args.shift();
  }

  if (args[0] === "--") {
    args.shift();
  }

  assert.ok(
    args.every((value) => !value.startsWith("-")),
    "Unsupported option; use report [--json] [-- files] or fix -- files",
  );

  return { mode, json, paths: args };
};

const collectSelected = (files, mode) => {
  const report = collectReport(files);

  if (mode === "fix") {
    // Validate the entire selection, including parser errors, before the first write.
    collectReport(files, { fix: true });

    return collectReport(files);
  }

  return report;
};

const printReport = (result, json) => {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatSummary(result.summary));

    if (result.selectedFiles) {
      for (const diagnostic of result.diagnostics) {
        console.log(describeDiagnostic(diagnostic));
      }
    }

    console.log(
      "Inspect locations: pnpm run quality:report -- <files>. Run pnpm run quality:check for the full gate.",
    );
  }
};

const inspectSources = () => {
  const { mode, json, paths } = parseArguments();
  assertConsumerContract(readConsumerContract());

  const baseline = readBaseline();
  const selected = mode === "fix" || paths.length > 0;
  const files = selected ? selectSourceFiles(paths) : sourceRoots;
  const report = collectSelected(files, mode);
  const regressions = findRegressions(report.findings, baseline);
  const summary = summarizeReport(report, baseline, regressions);

  // A selected report cannot establish that allowances in other files disappeared.
  summary.reductions = selected ? null : summary.reductions;
  printReport({ ...report, regressions, summary, selectedFiles: selected ? files : null }, json);

  if (mode === "fix" && regressions.length > 0) {
    process.exitCode = 1;
  }
};

try {
  inspectSources();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
