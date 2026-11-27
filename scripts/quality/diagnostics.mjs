import { normalizeLint } from "@servrox/code-quality/baseline";

const findingKey = ({ file, rule, message, value }) => JSON.stringify([file, rule, message, value]);

const isClassified = (diagnostic) => {
  try {
    normalizeLint({ diagnostics: [diagnostic], number_of_files: 1 });

    return true;
  } catch {
    return false;
  }
};

export const diagnosticLocation = (diagnostic) => {
  const span = diagnostic.labels?.find(({ span: location }) => location?.line)?.span;
  const file = diagnostic.filename ?? "Oxlint";

  return span ? `${file}:${span.line}:${span.column ?? 1}` : file;
};

export const describeDiagnostic = (diagnostic) =>
  `${diagnosticLocation(diagnostic)}: ${diagnostic.code ?? "parse/configuration error"}: ${diagnostic.message}`;

export const describeReportFailure = (report) => {
  const diagnostics = Array.isArray(report?.diagnostics) ? report.diagnostics : [];
  const unclassified = diagnostics.filter((diagnostic) => !isClassified(diagnostic));
  const relevant = unclassified.length > 0 ? unclassified : diagnostics;

  return relevant.slice(0, 20).map(describeDiagnostic).join("\n");
};

export const locateFindings = (findings, report) => {
  const queues = new Map();

  for (const [index, finding] of report.findings.entries()) {
    const key = findingKey(finding);
    const queue = queues.get(key) ?? [];
    queue.push(report.diagnostics[index]);
    queues.set(key, queue);
  }

  return findings.map((finding) => {
    const diagnostic = queues.get(findingKey(finding))?.shift();

    return diagnostic
      ? describeDiagnostic(diagnostic)
      : `${finding.file}: ${finding.rule}: ${finding.message}`;
  });
};
