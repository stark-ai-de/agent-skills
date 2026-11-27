import { normalizeLint } from "@servrox/code-quality/baseline";

import { describeDiagnostic } from "./diagnostics.mjs";
import { runOxlint } from "./oxlint.mjs";
import { sourceRoots } from "./scope.mjs";

const readReport = (result) => {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Could not read Oxlint JSON report: ${result.stderr.slice(0, 2000)}\n${result.stdout.slice(0, 2000)}`,
      { cause: error },
    );
  }
};

const classifyReport = (report) => {
  try {
    return normalizeLint(report);
  } catch (error) {
    const diagnostics = Array.isArray(report?.diagnostics) ? report.diagnostics : [];
    const details = diagnostics.slice(0, 20).map(describeDiagnostic).join("\n");

    throw new Error(
      `Oxlint report contains unclassified diagnostics or no selected source files.\n${details}`,
      { cause: error },
    );
  }
};

export const collectReport = (files = sourceRoots, options = {}) => {
  const result = runOxlint(files, options);
  const report = readReport(result);
  const findings = classifyReport(report);

  if (result.status === 1 && findings.length === 0) {
    throw new Error(`Oxlint failed without classified findings: ${result.stderr}`);
  }

  return { findings, diagnostics: report.diagnostics, numberOfFiles: report.number_of_files };
};

export const collectFindings = () => collectReport().findings;
