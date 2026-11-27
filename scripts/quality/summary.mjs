import { appendFileSync } from "node:fs";

import { createBaseline } from "@servrox/code-quality/baseline";

const countBy = (findings, field) => {
  const counts = new Map();

  for (const finding of findings) {
    const name = finding[field];
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .toSorted(
      (left, right) => right.count - left.count || left.name.localeCompare(right.name, "en"),
    );
};

const measureReductions = (findings, baseline) => {
  const current = createBaseline(findings);
  let removedOccurrences = 0;
  let loweredAllowances = 0;
  let affectedGroups = 0;

  for (const [identity, values] of Object.entries(baseline.entries)) {
    const actual = current.entries[identity] ?? [];
    const previous = values.toSorted((left, right) => right - left);
    const removed = Math.max(0, previous.length - actual.length);
    const lowered = actual.filter((value, index) => value < previous[index]).length;
    removedOccurrences += removed;
    loweredAllowances += lowered;
    affectedGroups += Number(removed + lowered > 0);
  }

  return { removedOccurrences, loweredAllowances, affectedGroups };
};

export const summarizeReport = (report, baseline, regressions) => ({
  findings: report.findings.length,
  filesWithFindings: new Set(report.findings.map(({ file }) => file)).size,
  inspectedFiles: report.numberOfFiles,
  regressions: regressions.length,
  byRule: countBy(report.findings, "rule"),
  byFile: countBy(report.findings, "file"),
  reductions: regressions.length === 0 ? measureReductions(report.findings, baseline) : null,
});

export const reductionHint = (reductions) => {
  if (!reductions || reductions.affectedGroups === 0) {
    return [];
  }

  return [
    `Available baseline reductions: ${reductions.removedOccurrences} removed occurrences, ${reductions.loweredAllowances} lowered numeric allowances in ${reductions.affectedGroups} groups.`,
    "Run pnpm run quality:baseline:prune, review the diff and commit it with the source fixes.",
  ];
};

export const formatSummary = (summary) =>
  [
    `Shared quality: ${summary.findings} findings in ${summary.filesWithFindings} files; ${summary.regressions} regressions.`,
    "Counts describe lint findings, not bugs or a combined quality score.",
    "Top rules (up to 10):",
    ...summary.byRule.slice(0, 10).map(({ name, count }) => `  ${count} ${name}`),
    "Top files (up to 10):",
    ...summary.byFile.slice(0, 10).map(({ name, count }) => `  ${count} ${name}`),
    ...reductionHint(summary.reductions),
  ].join("\n");

export const writeStepSummary = (summary) => {
  if (process.env.GITHUB_STEP_SUMMARY) {
    const body = formatSummary(summary)
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n");

    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n## Shared quality\n\n${body}\n`);
  }
};
