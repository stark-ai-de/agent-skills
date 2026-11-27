import antiSlop from "@servrox/code-quality/oxlint/anti-slop";
import core from "@servrox/code-quality/oxlint/core";
import modularity, {
  exportRestrictions,
  functionRestrictions,
} from "@servrox/code-quality/oxlint/modularity";
import react from "@servrox/code-quality/oxlint/react";
import strict from "@servrox/code-quality/oxlint/strict";

import { sourceIgnores } from "./scripts/quality/scope.mjs";

export default {
  extends: [core, strict, modularity, antiSlop],
  env: { node: true, browser: false },
  options: { denyWarnings: true, reportUnusedDisableDirectives: "error" },
  ignorePatterns: [...(core.ignorePatterns ?? []), ...sourceIgnores],
  overrides: [
    {
      files: ["site/src/**/*.{js,jsx,ts,tsx}"],
      env: { browser: true },
    },
    {
      ...react,
      files: ["docs/listing/openai/review-video/src/**/*.{js,jsx,ts,tsx}"],
      plugins: [...core.plugins, ...react.plugins],
      env: { browser: true },
    },
    {
      // Existing compatibility facades; all file/function budgets still apply.
      files: ["scripts/lib/animated-image.mjs", "scripts/lib/visual-assertions.mjs"],
      rules: {
        "eslint-js/no-restricted-syntax": [
          "error",
          ...functionRestrictions,
          ...exportRestrictions.filter(
            ({ message }) =>
              message !== "Wildcard exports are restricted to explicit package entrypoints.",
          ),
        ],
      },
    },
  ],
};
