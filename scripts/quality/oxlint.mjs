import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const assertResult = (result) => {
  if (result.error || result.signal || ![0, 1].includes(result.status)) {
    throw (
      result.error ??
      new Error(
        `Oxlint failed (${result.signal ?? result.status}): ${result.stderr.slice(0, 4000)}`,
      )
    );
  }
};

export const runOxlint = (files, options = {}) => {
  const binary = fileURLToPath(new URL("../bin/oxlint", import.meta.resolve("oxlint")));
  const flags = options.fix ? ["--fix"] : [];

  if (options.debug) {
    flags.push("--debug=files");
  }

  // The installed JS configuration/plugin boundary is Node-owned, including from Bun.
  const result = spawnSync(
    "node",
    [
      binary,
      "--config",
      "oxlint.config.mjs",
      "--disable-nested-config",
      "--format=json",
      ...flags,
      "--",
      ...files,
    ],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, timeout: 120_000 },
  );

  assertResult(result);

  return result;
};
