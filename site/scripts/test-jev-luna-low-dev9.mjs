import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { summarizeNativeDev9 } from "../src/lib/jev-luna-low-dev9.mjs";

const evidence = JSON.parse(
  readFileSync(
    new URL(
      "../../skill-evals/jev-capability-advisor/benchmarks/native-luna-low-dev9-2026-09-25.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const summary = summarizeNativeDev9(evidence);
assert.deepEqual(
  [
    summary.all.n,
    summary.all.correct,
    summary.skill.n,
    summary.skill.correct,
    summary.none.n,
    summary.none.correct,
  ],
  [9, 8, 8, 7, 1, 1],
);
assert.deepEqual(
  [summary.errors, summary.all_input_tokens.total, summary.all_input_tokens.median],
  [0, 149279, 16582],
);
assert.deepEqual(
  [summary.model_turn_ms.median, summary.model_turn_ms.p95_nearest_rank],
  [2720.3591950019472, 4480.07122999843],
);

const incorrectlyPerfect = structuredClone(evidence);
incorrectlyPerfect.observations[8].correct = true;
assert.throws(() => summarizeNativeDev9(incorrectlyPerfect), /differs from observations/);

console.log("GPT-6 Luna Low Dev9: nine audited live observations and failed gate verified.");
