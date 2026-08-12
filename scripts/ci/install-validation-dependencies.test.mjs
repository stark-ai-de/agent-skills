import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { digestJson, readJson, validateManifest, writeJsonAtomic } from "./validation-contract.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const helper = path.join(directory, "install-validation-dependencies.mjs");
const manifest = validateManifest(readJson(path.join(directory, "validation-manifest.json")));

function fixture(t, source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "validation-install-test-"));
  const binaryRoot = path.join(root, "bin");
  const planFile = path.join(root, "plan.json");
  fs.mkdirSync(binaryRoot);
  const pnpm = path.join(binaryRoot, process.platform === "win32" ? "pnpm.cmd" : "pnpm");
  fs.writeFileSync(pnpm, source, { mode: 0o700 });
  writeJsonAtomic(planFile, {
    schemaVersion: 1,
    scope: "affected",
    reason: "dependency install test",
    baseSha: "base",
    candidateSha: "candidate",
    changedPaths: ["README.md"],
    selectedGates: ["skills"],
    installProfiles: ["root"],
    manifestDigest: digestJson(manifest),
    basePlanDigest: null,
    candidatePlanDigest: digestJson({ source: "candidate planner" }),
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { binaryRoot, planFile, root };
}

test("selected dependency installation is bounded and fails on timeout", (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX executable fixture is not available on Windows");
    return;
  }
  const fixture_ = fixture(t, `#!${process.execPath}\nsetInterval(() => {}, 1000);\n`);
  const started = Date.now();
  const result = spawnSync(
    process.execPath,
    [helper, "--plan", fixture_.planFile, "--timeout-ms", "75"],
    {
      cwd: path.resolve(directory, "../.."),
      encoding: "utf8",
      env: { ...process.env, PATH: `${fixture_.binaryRoot}${path.delimiter}${process.env.PATH}` },
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.signal, null);
  assert.ok(Date.now() - started >= 70, "dependency timeout must be applied");
  assert.ok(Date.now() - started < 2000, "dependency timeout must be bounded");
});

test("pnpm filter failure flag precedes the install subcommand", (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX executable fixture is not available on Windows");
    return;
  }
  const fixture_ = fixture(
    t,
    `#!${process.execPath}\nrequire("node:fs").writeFileSync(${JSON.stringify("ARGS_FILE")}, JSON.stringify(process.argv.slice(2)));\n`,
  );
  const argumentsFile = path.join(fixture_.root, "arguments.json");
  fs.writeFileSync(
    path.join(fixture_.binaryRoot, "pnpm"),
    `#!${process.execPath}\nrequire("node:fs").writeFileSync(${JSON.stringify(argumentsFile)}, JSON.stringify(process.argv.slice(2)));\n`,
    { mode: 0o700 },
  );
  const result = spawnSync(process.execPath, [helper, "--plan", fixture_.planFile], {
    cwd: path.resolve(directory, "../.."),
    encoding: "utf8",
    env: { ...process.env, PATH: `${fixture_.binaryRoot}${path.delimiter}${process.env.PATH}` },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(argumentsFile, "utf8")), [
    "--filter",
    "agent-skills",
    "--fail-if-no-match",
    "install",
    "--frozen-lockfile",
    "--prefer-offline",
  ]);
});
