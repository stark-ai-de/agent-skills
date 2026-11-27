import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { normalizeLint } from "@servrox/code-quality/baseline";

import { sourceRoots } from "./scope.mjs";

export const collectFindings = () => {
  const binary = fileURLToPath(new URL("../bin/oxlint", import.meta.resolve("oxlint")));

  // JS configs/plugins require Oxlint's Node wrapper, even when Bun owns this parent.
  const result = spawnSync(
    "node",
    [
      binary,
      "--config",
      "oxlint.config.mjs",
      "--disable-nested-config",
      "--format=json",
      ...sourceRoots,
    ],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, timeout: 120_000 },
  );

  if (result.error || result.signal || ![0, 1].includes(result.status)) {
    throw result.error ?? new Error(`Oxlint failed (${result.status}): ${result.stderr}`);
  }

  const findings = normalizeLint(JSON.parse(result.stdout));

  if (result.status === 1 && findings.length === 0) {
    throw new Error(`Oxlint failed without classified findings: ${result.stderr}`);
  }

  return findings;
};
