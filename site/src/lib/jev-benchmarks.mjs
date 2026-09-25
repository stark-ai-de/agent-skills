import { inspectRuntimeSources } from "./jev-runtime-evidence.mjs";
import { promoComparison } from "./jev-promo-comparison.mjs";
import nativeNextSkill from "../../../skill-evals/jev-capability-advisor/benchmarks/native-next-skill-2026-09-24.json" with { type: "json" };
import nextSkillEvidence from "../../../skill-evals/jev-capability-advisor/benchmarks/next-skill-2026-09-24.json" with { type: "json" };

export const jevBenchmarks = {
  nextSkillEvidence,
  readmePath: "docs/skills/jev-capability-advisor/benchmarks/README.md",
  methodsPath: "skill-evals/jev-capability-advisor/README.md",
};

export function getJevPromoComparison() {
  const comparison = promoComparison(nextSkillEvidence, nativeNextSkill);
  const measured = nextSkillEvidence.studies.find(
    (study) => study.study_id === "next-skill-hidden32",
  ).provenance.source_sha256.next_skill;
  return { ...comparison, runtime: inspectRuntimeSources(measured) };
}
