import { inspectRuntimeSources } from "./jev-runtime-evidence.mjs";
import { selectorComparison } from "./jev-selector-comparison.mjs";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import nextSkillEvidence from "../../../skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-25.json" with { type: "json" };

export const jevBenchmarks = {
  nextSkillEvidence,
  readmePath: "docs/skills/jev-capability-advisor/benchmarks/README.md",
  methodsPath: "skill-evals/jev-capability-advisor/README.md",
};

export function getJevPromoComparison() {
  const cwd = process.cwd();
  const root = existsSync(join(cwd, "skill-evals")) ? cwd : resolve(cwd, "..");
  // No fallback to a partial campaign, historical timing series, or synthetic fixture.
  const report = JSON.parse(
    readFileSync(
      join(
        root,
        "skill-evals/jev-capability-advisor/benchmarks/selector-comparison-2026-09-26.json",
      ),
      "utf8",
    ),
  );
  const comparison = selectorComparison(report);
  const measured = report.provenance.jev_runtime_sha256;
  const revision = report.selectors.find((row) => row.arm === "jev").revision;
  return {
    ...comparison,
    runtime: inspectRuntimeSources(measured, undefined, revision),
  };
}
