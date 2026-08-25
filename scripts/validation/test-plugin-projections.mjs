import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertInside,
  comparePosixPaths,
  enumerateTree,
  PORTABLE_TARGET,
  RETIRED_OPENAI_ADAPTER_TARGET,
} from "../lib/plugin-projections.mjs";
import { loadValidatedBundle } from "../lib/bundle-contract.mjs";
import { sourceTreeSha256 } from "../lib/release-input-digest.mjs";
import { listUntrackedAndIgnored } from "../lib/git-index.mjs";
import { PLUGIN_SOURCE_PATH, PLUGIN_SOURCE_SCHEMA_PATH } from "../lib/release-descriptor.mjs";
import { LISTING_PATH, withOpenAiStage } from "../lib/openai-projection.mjs";
import { readOpenAiListing } from "../lib/openai-listing.mjs";

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
  const syncScript = path.join(repositoryRoot, "scripts", "plugin", "sync-standalone-skills.mjs");
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

const openaiSyncScript = path.join(repositoryRoot, "scripts", "plugin", "sync-openai-plugin.mjs");
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
    RETIRED_OPENAI_ADAPTER_TARGET,
    `./${RETIRED_OPENAI_ADAPTER_TARGET}/`,
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

withOpenAiStage(repositoryRoot, (staged) => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(staged.stage, ".codex-plugin", "plugin.json"), "utf8"),
  );
  const listing = readOpenAiListing(repositoryRoot);
  assert.equal(manifest.interface.brandColor, listing.plugin.brandColors.light);
  assert.equal(manifest.interface.brandColorDark, listing.plugin.brandColors.dark);
});

const EXTRA_RELATIVES = [".env", ".codegraph/database", "coverage/result.json", "untracked.txt"];

function runNode(script, args, options = {}) {
  return spawnSync(process.execPath, [path.join(repositoryRoot, "scripts", script), ...args], {
    encoding: "utf8",
    ...options,
  });
}

function treeContains(root, relativePosix) {
  if (!fs.existsSync(root)) return false;
  const needle = relativePosix.split("/").join(path.sep);
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (full.endsWith(needle) || entry.name === path.basename(needle)) {
        return true;
      }
      if (entry.isDirectory()) stack.push(full);
    }
  }
  return false;
}

const mutationClone = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-ignored-inputs-"));
try {
  const clone = spawnSync(
    "git",
    ["clone", "--local", "--no-hardlinks", "--quiet", repositoryRoot, mutationClone],
    { encoding: "utf8" },
  );
  assert.equal(clone.status, 0, clone.stderr);
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_PATH),
    path.join(mutationClone, PLUGIN_SOURCE_PATH),
  );
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_SCHEMA_PATH),
    path.join(mutationClone, PLUGIN_SOURCE_SCHEMA_PATH),
  );
  fs.cpSync(
    path.join(repositoryRoot, "scripts/vendor/snapshots"),
    path.join(mutationClone, "scripts/vendor/snapshots"),
    { recursive: true },
  );
  const listingDir = path.posix.dirname(LISTING_PATH);
  fs.cpSync(path.join(repositoryRoot, listingDir), path.join(mutationClone, listingDir), {
    recursive: true,
  });
  fs.copyFileSync(
    path.join(repositoryRoot, "docs/assets/chatgpt-plugin-badge.svg"),
    path.join(mutationClone, "docs/assets/chatgpt-plugin-badge.svg"),
  );
  fs.copyFileSync(
    path.join(repositoryRoot, "package.json"),
    path.join(mutationClone, "package.json"),
  );
  const stagedContract = spawnSync(
    "git",
    ["add", "--", PLUGIN_SOURCE_PATH, PLUGIN_SOURCE_SCHEMA_PATH, "scripts/vendor/snapshots"],
    { cwd: mutationClone, encoding: "utf8" },
  );
  assert.equal(stagedContract.status, 0, stagedContract.stderr);

  const skillSource = bundle.skills[0].source;
  const skillRoot = path.join(mutationClone, skillSource);
  fs.writeFileSync(path.join(skillRoot, ".env"), "SECRET=1\n");
  fs.mkdirSync(path.join(skillRoot, ".codegraph"), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, ".codegraph", "database"), "graph-state");
  fs.mkdirSync(path.join(skillRoot, "coverage"), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, "coverage", "result.json"), "{}\n");
  fs.writeFileSync(path.join(skillRoot, "untracked.txt"), "scratch\n");

  const extras = listUntrackedAndIgnored(mutationClone, [skillSource]);
  assert.ok(
    extras.some((relative) => relative.endsWith(".env")),
    extras.join("\n"),
  );
  assert.ok(
    extras.some((relative) => relative.includes(".codegraph")),
    extras.join("\n"),
  );
  assert.ok(
    extras.some((relative) => relative.includes("coverage")),
    extras.join("\n"),
  );
  assert.ok(
    extras.some((relative) => relative.endsWith("untracked.txt")),
    extras.join("\n"),
  );

  const openaiZip = path.join(mutationClone, "openai-mutated.zip");
  const standaloneOut = path.join(mutationClone, "dist-standalone");
  const evidence = path.join(mutationClone, "release-evidence.json");
  const commands = [
    runNode("plugin/sync-agent-plugin.mjs", ["--root", mutationClone]),
    runNode("plugin/validate-openai-plugin.mjs", ["--root", mutationClone]),
    runNode("plugin/package-openai-plugin.mjs", ["--root", mutationClone, "--output", openaiZip]),
    runNode("plugin/sync-standalone-skills.mjs", [
      "--root",
      mutationClone,
      "--output",
      standaloneOut,
    ]),
    runNode("release/verify-release-reproducibility.mjs", ["--evidence", evidence], {
      cwd: mutationClone,
    }),
  ];
  assert.throws(() => sourceTreeSha256(mutationClone), /SEC-001/);

  for (const result of commands) {
    assert.notEqual(
      result.status,
      0,
      `ignored inputs must fail packaging:\n${result.stderr || result.stdout}`,
    );
    assert.match(
      `${result.stderr}\n${result.stdout}`,
      /\[SEC-001\]|untracked or ignored release inputs/,
    );
    for (const extra of extras) {
      assert.match(
        `${result.stderr}\n${result.stdout}`,
        new RegExp(extra.replaceAll(".", "\\.")),
        `rejection must name ${extra}`,
      );
    }
  }

  const leakRoots = [path.join(mutationClone, PORTABLE_TARGET), openaiZip, standaloneOut, evidence];
  for (const extra of EXTRA_RELATIVES) {
    for (const leakRoot of leakRoots) {
      assert.equal(
        treeContains(leakRoot, extra),
        false,
        `${extra} must not appear under ${leakRoot}`,
      );
    }
  }
} finally {
  fs.rmSync(mutationClone, { recursive: true, force: true });
}

console.log("Projection safety and determinism fixtures passed.");
