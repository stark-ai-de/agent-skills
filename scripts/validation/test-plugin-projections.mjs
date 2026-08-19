import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertInside, comparePosixPaths, enumerateTree } from "../lib/plugin-projections.mjs";
import { loadValidatedBundle } from "../lib/bundle-contract.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bundle = loadValidatedBundle(repositoryRoot);

assert.ok(comparePosixPaths("SKILL.md", "agents/openai.yaml") < 0);

for (const entry of bundle.skills) {
  const sourceRoot = path.join(repositoryRoot, entry.source);
  const files = enumerateTree(sourceRoot, "", { excludeGeneratedCaches: true });
  assert.ok(
    files.every(
      (file) => !file.relative.includes("__pycache__") && !/\.py[cod]$/.test(file.relative),
    ),
    `${entry.name} source cache entries must be excluded`,
  );
}

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-projection-contract-"));
try {
  fs.mkdirSync(path.join(fixture, "__pycache__"), { recursive: true });
  fs.writeFileSync(path.join(fixture, "__pycache__", "fixture.pyc"), "cache");
  fs.writeFileSync(path.join(fixture, "payload.txt"), "payload");
  assert.ok(enumerateTree(fixture).some((file) => file.relative.endsWith("fixture.pyc")));
  assert.ok(
    enumerateTree(fixture, "", { excludeGeneratedCaches: true }).every(
      (file) => !file.relative.endsWith("fixture.pyc"),
    ),
  );

  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-projection-outside-"));
  try {
    fs.symlinkSync(outside, path.join(fixture, "linked"), "dir");
    assert.throws(
      () => assertInside(fixture, path.join(fixture, "linked", "payload.txt")),
      /symlinked component/,
    );
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
  }
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

const staleOutput = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-standalone-contract-"));
try {
  const syncScript = path.join(repositoryRoot, "scripts", "sync-standalone-skills.mjs");
  const initial = spawnSync(
    process.execPath,
    [syncScript, "--root", repositoryRoot, "--output", staleOutput],
    { encoding: "utf8" },
  );
  assert.equal(initial.status, 0, initial.stderr || initial.stdout);
  fs.writeFileSync(path.join(staleOutput, "stale.zip"), "stale");
  const check = spawnSync(
    process.execPath,
    [syncScript, "--check", "--root", repositoryRoot, "--output", staleOutput],
    { encoding: "utf8" },
  );
  assert.notEqual(check.status, 0, "stale standalone archives must fail check mode");
} finally {
  fs.rmSync(staleOutput, { recursive: true, force: true });
}

const openaiSyncScript = path.join(repositoryRoot, "scripts", "sync-openai-plugin.mjs");
const missingTarget = spawnSync(process.execPath, [openaiSyncScript], { encoding: "utf8" });
assert.notEqual(missingTarget.status, 0, "OpenAI adapter sync must require an explicit target");
assert.match(
  missingTarget.stderr,
  /not a committed tree/,
  "OpenAI adapter sync without --target must explain the retired path",
);

const retiredRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-openai-retired-"));
try {
  for (const target of [
    "adapters/openai/stark-ai-developer",
    "./adapters/openai/stark-ai-developer/",
    "adapters/openai",
  ]) {
    const retired = spawnSync(
      process.execPath,
      [openaiSyncScript, "--root", retiredRoot, "--target", target],
      { encoding: "utf8" },
    );
    assert.notEqual(retired.status, 0, `OpenAI adapter sync must refuse ${target}`);
    assert.match(retired.stderr, /refusing to materialize/);
  }
  assert.equal(
    fs.existsSync(path.join(retiredRoot, "adapters")),
    false,
    "refusing the retired OpenAI path must not create adapters/",
  );
} finally {
  fs.rmSync(retiredRoot, { recursive: true, force: true });
}

console.log("Projection safety and determinism fixtures passed.");
