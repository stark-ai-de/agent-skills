// Consumer paths belong here; reusable rules and thresholds belong upstream.
export const sourceRoots = [
  ".github",
  "docs/listing/openai/review-video",
  "scripts",
  "packages",
  "site",
  "skills",
  "incubator",
  "skill-evals",
  "oxlint.config.mjs",
  "oxfmt.config.mjs",
];

export const sourceIgnores = [
  "site/public/**",
  "scripts/vendor/**",
  "skills/engineering-workflows/visual-reports/assets/vendor/**",
  // Isolated fixtures own intentionally invalid/third-party sample projects.
  "skill-evals/architecture-compass/fixtures/**",
  "skill-evals/codex-memory-curator/fixtures/**",
  "skill-evals/codegraph-ast-grep/fixtures/**",
  "skill-evals/codegraph-ast-grep/behavioral-baseline/**",
  "skill-evals/skillopt-setup/fixtures/**",
];
