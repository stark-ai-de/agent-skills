import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  DEFAULT_BUNDLE_PATH,
  validateAllBundles,
  validateBundleFile,
} from "../lib/bundle-contract.mjs";
import { PLUGIN_SOURCE_PATH, PLUGIN_SOURCE_SCHEMA_PATH } from "../lib/release-descriptor.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const validatorPath = path.join(repositoryRoot, "scripts/validate-bundles.mjs");

function copyPluginSource(fixtureRoot) {
  fs.mkdirSync(path.join(fixtureRoot, "plugins"), { recursive: true, mode: 0o755 });
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_PATH),
    path.join(fixtureRoot, PLUGIN_SOURCE_PATH),
  );
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_SCHEMA_PATH),
    path.join(fixtureRoot, PLUGIN_SOURCE_SCHEMA_PATH),
  );
}

function createFixture() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-bundle-"));
  copyPluginSource(fixtureRoot);
  fs.cpSync(path.join(repositoryRoot, "skills"), path.join(fixtureRoot, "skills"), {
    recursive: true,
  });
  fs.copyFileSync(path.join(repositoryRoot, "README.md"), path.join(fixtureRoot, "README.md"));
  return fixtureRoot;
}

function readBundle(fixtureRoot) {
  return JSON.parse(fs.readFileSync(path.join(fixtureRoot, DEFAULT_BUNDLE_PATH), "utf8"));
}

function writeBundle(fixtureRoot, bundle) {
  fs.writeFileSync(
    path.join(fixtureRoot, DEFAULT_BUNDLE_PATH),
    `${JSON.stringify(bundle, null, 2)}\n`,
  );
}

function assertBundleFails(fixtureRoot, expectedPattern) {
  const result = validateBundleFile(fixtureRoot, DEFAULT_BUNDLE_PATH);
  assert.ok(
    result.errors.some((error) => expectedPattern.test(error)),
    result.errors.join("\n"),
  );
}

const validFixture = createFixture();
try {
  const valid = spawnSync(process.execPath, [validatorPath, "--root", validFixture], {
    encoding: "utf8",
  });
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);

  const symlinkFixture = createFixture();
  const symlinkOutside = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-bundle-outside-"));
  try {
    const skillFile = path.join(
      symlinkFixture,
      "skills",
      "codex-operations",
      "codex-memory-curator",
      "SKILL.md",
    );
    const originalSkillFile = `${skillFile}.original`;
    fs.renameSync(skillFile, originalSkillFile);
    fs.writeFileSync(path.join(symlinkOutside, "SKILL.md"), "outside content\n");
    fs.symlinkSync(path.join(symlinkOutside, "SKILL.md"), skillFile);
    assertBundleFails(symlinkFixture, /SKILL\.md must be a regular file/);
  } finally {
    fs.rmSync(symlinkOutside, { recursive: true, force: true });
    fs.rmSync(symlinkFixture, { recursive: true, force: true });
  }

  const nullFixture = createFixture();
  try {
    fs.writeFileSync(path.join(nullFixture, DEFAULT_BUNDLE_PATH), "null\n");
    assertBundleFails(nullFixture, /must be object/);
  } finally {
    fs.rmSync(nullFixture, { recursive: true, force: true });
  }

  const unsupportedFixture = createFixture();
  try {
    const bundle = readBundle(unsupportedFixture);
    bundle.unexpected = true;
    writeBundle(unsupportedFixture, bundle);
    assertBundleFails(unsupportedFixture, /must NOT have additional properties/);
  } finally {
    fs.rmSync(unsupportedFixture, { recursive: true, force: true });
  }

  const pathFixture = createFixture();
  try {
    const bundle = readBundle(pathFixture);
    bundle.skills[0].source = "skills/codex-operations/../codex-memory-curator";
    writeBundle(pathFixture, bundle);
    assertBundleFails(pathFixture, /must match pattern|normalized POSIX path/);
  } finally {
    fs.rmSync(pathFixture, { recursive: true, force: true });
  }

  const membershipFixture = createFixture();
  try {
    const bundle = readBundle(membershipFixture);
    bundle.skills.pop();
    writeBundle(membershipFixture, bundle);
    assertBundleFails(membershipFixture, /exactly 6 skills/);
  } finally {
    fs.rmSync(membershipFixture, { recursive: true, force: true });
  }

  const identityFixture = createFixture();
  try {
    const bundle = readBundle(identityFixture);
    bundle.distributions.openaiPlugin = "a".repeat(60);
    writeBundle(identityFixture, bundle);
    assertBundleFails(identityFixture, /combined OpenAI identity exceeds 64/);
  } finally {
    fs.rmSync(identityFixture, { recursive: true, force: true });
  }

  const readmeFixture = createFixture();
  try {
    const readmePath = path.join(readmeFixture, "README.md");
    const readme = fs.readFileSync(readmePath, "utf8");
    fs.writeFileSync(
      readmePath,
      readme.replace(
        "Bundles use explicit, version-controlled manifests.",
        "Each bundle contains every public skill inferred from its category.",
      ),
    );
    const result = validateAllBundles(readmeFixture);
    assert.ok(result.errors.some((error) => /category\/all-public/.test(error)));
  } finally {
    fs.rmSync(readmeFixture, { recursive: true, force: true });
  }
} finally {
  fs.rmSync(validFixture, { recursive: true, force: true });
}

console.log("Bundle contract fixtures passed.");
