import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createBaseline } from "@servrox/code-quality/baseline";

import { baselinePath } from "./baseline.mjs";
import { sourceRoots } from "./scope.mjs";

export const writeFixture = (directory, name, source) => {
  const target = path.join(directory, name);

  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, source);
};

export const readFixture = (directory, name) => readFileSync(path.join(directory, name), "utf-8");

export const createFixture = (context, sources) => {
  const directory = mkdtempSync(path.join(tmpdir(), "agent-skills-quality-ux-"));

  context.after(() => rmSync(directory, { recursive: true, force: true }));

  for (const root of sourceRoots.filter((name) => !name.endsWith(".mjs"))) {
    mkdirSync(path.join(directory, root), { recursive: true });
  }

  for (const name of [
    "package.json",
    "pnpm-lock.yaml",
    "oxlint.json",
    ".github/workflows/validate.yml",
  ]) {
    mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
    copyFileSync(new URL(`../../${name}`, import.meta.url), path.join(directory, name));
  }

  for (const name of ["oxlint", "oxfmt"]) {
    const target = new URL(`../../${name}.config.mjs`, import.meta.url).href;

    writeFixture(
      directory,
      `${name}.config.mjs`,
      `export { default } from ${JSON.stringify(target)};\n`,
    );
  }

  for (const [name, source] of Object.entries(sources)) {
    writeFixture(directory, name, source);
  }

  writeFixture(directory, baselinePath, `${JSON.stringify(createBaseline([]), null, 2)}\n`);

  return directory;
};

export const runQuality = (directory, command, args = []) =>
  spawnSync("node", [fileURLToPath(new URL(`${command}.mjs`, import.meta.url)), ...args], {
    cwd: directory,
    env: { ...process.env, QUALITY_BASE_SHA: "", GITHUB_STEP_SUMMARY: "" },
    encoding: "utf-8",
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
  });

export const captureBaseline = (directory) => {
  const result = runQuality(directory, "inspect", ["report", "--json"]);

  assert.equal(result.status, 0, result.stderr);

  const baseline = createBaseline(JSON.parse(result.stdout).findings);

  writeFixture(directory, baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

  return baseline;
};
