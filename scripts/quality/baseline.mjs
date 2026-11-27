import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";

import { findRegressions } from "@servrox/code-quality/baseline";

export const baselinePath = "tools/quality/lint-baseline.json";

// Decode stored identities for the shared comparator; do not duplicate its budget logic.
export const assertBaselineDoesNotGrow = (candidate, previous) => {
  findRegressions([], candidate);

  const allowances = Object.entries(candidate.entries).flatMap(([identity, values]) => {
    const [file, rule, message] = JSON.parse(identity);

    return values.map((value) => ({ file, rule, message, value }));
  });

  assert.equal(
    findRegressions(allowances, previous).length,
    0,
    "Migration allowances must not grow",
  );
};

export const checkBaselineHistory = (candidate, baseSha = process.env.QUALITY_BASE_SHA) => {
  if (!baseSha) {
    return;
  }

  assert.match(baseSha, /^[a-f\d]{40}$/u, "QUALITY_BASE_SHA must be a full commit SHA");

  const previousManifest = JSON.parse(
    execFileSync("git", ["show", `${baseSha}:package.json`], { encoding: "utf-8" }),
  );

  const result = spawnSync("git", ["show", `${baseSha}:${baselinePath}`], {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error || result.signal) {
    throw result.error ?? new Error("Could not inspect the PR base baseline");
  }

  if (result.status !== 0) {
    assert.equal(result.status, 128, result.stderr);
    assert.equal(
      previousManifest.devDependencies?.["@servrox/code-quality"],
      undefined,
      "An adopted repository must retain its baseline history",
    );

    return;
  }

  assertBaselineDoesNotGrow(candidate, JSON.parse(result.stdout));
};
