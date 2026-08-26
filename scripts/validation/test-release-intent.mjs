import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { listChangedGitPaths } from "../lib/git-changed-paths.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const releaseIntentScript = path.join(repositoryRoot, "scripts/release/check-release-intent.mjs");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-release-intent-"));

function run(command, args) {
  return spawnSync(command, args, { cwd: fixture, encoding: "utf8" });
}

function git(...args) {
  const result = run("git", args);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function write(relative, text) {
  const target = path.join(fixture, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

function manifest(version) {
  return `${JSON.stringify(
    {
      name: "fixture",
      version,
      license: "MIT",
      author: { name: "Fixture" },
      repository: { type: "git", url: "https://example.com/fixture.git" },
    },
    null,
    2,
  )}\n`;
}

function pluginSource(version) {
  return `${JSON.stringify(
    {
      version,
      skills: [{ name: "fixture-skill", source: "skills/testing/fixture-skill" }],
    },
    null,
    2,
  )}\n`;
}

function skill(version) {
  return `---\nname: fixture-skill\ndescription: Fixture skill.\nmetadata:\n  version: "${version}"\n---\n\n# Fixture\n`;
}

function changelog(...versions) {
  return `# Changelog\n\n## Unreleased\n\n${versions
    .map((version) => `## v${version} - 2026-08-26\n\n- Fixture release.\n`)
    .join("\n")}`;
}

function check(baseRef) {
  return run(process.execPath, [releaseIntentScript, "--base-ref", baseRef]);
}

try {
  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Release Intent Fixture");
  git("config", "user.email", "fixture@example.com");
  write("package.json", manifest("1.0.0"));
  write("CHANGELOG.md", changelog("1.0.0"));
  write("LICENSE", "initial\n");
  write("plugins/stark-ai-developer.source.json", pluginSource("1.0.0"));
  write("skills/testing/fixture-skill/SKILL.md", skill("1.0.0"));
  write("skills/testing/fixture-skill/references/policy.md", "initial\n");
  write("skills/testing/fixture-skill/references/überblick.md", "initial\n");
  git("add", ".");
  git("commit", "--quiet", "-m", "fixture baseline");
  const base = git("rev-parse", "HEAD");

  write("package.json", manifest("1.0.1"));
  write("CHANGELOG.md", changelog("1.0.1", "1.0.0"));
  write("skills/testing/fixture-skill/SKILL.md", skill("1.0.1"));
  write("skills/testing/fixture-skill/references/policy.md", "changed\n");

  const reusedVersion = check(base);
  assert.notEqual(reusedVersion.status, 0, "changed plugin inputs must reject version reuse");
  assert.match(
    `${reusedVersion.stderr}\n${reusedVersion.stdout}`,
    /Bundled plugin inputs changed without increasing/,
  );

  write("plugins/stark-ai-developer.source.json", pluginSource("1.1.0"));
  const bumpedVersion = check(base);
  assert.equal(bumpedVersion.status, 0, bumpedVersion.stderr || bumpedVersion.stdout);
  assert.match(
    bumpedVersion.stdout,
    /plugins\/stark-ai-developer\.source\.json version changed from 1\.0\.0 to 1\.1\.0/,
  );

  git("add", ".");
  git("commit", "--quiet", "-m", "fixture plugin update");
  const updatedBase = git("rev-parse", "HEAD");
  write("package.json", manifest("1.0.2"));
  write("CHANGELOG.md", changelog("1.0.2", "1.0.1", "1.0.0"));

  const packageOnly = check(updatedBase);
  assert.equal(packageOnly.status, 0, packageOnly.stderr || packageOnly.stdout);
  assert.doesNotMatch(packageOnly.stdout, /stark-ai-developer\.source\.json version changed/);

  git("add", ".");
  git("commit", "--quiet", "-m", "fixture package-only update");
  const packageBumpBase = git("rev-parse", "HEAD");
  write("LICENSE", "changed\n");
  write("plugins/stark-ai-developer.source.json", pluginSource("1.1.1"));

  const missingPackageBump = check(packageBumpBase);
  assert.notEqual(
    missingPackageBump.status,
    0,
    "non-skill plugin inputs must require a package version bump",
  );
  assert.match(
    `${missingPackageBump.stderr}\n${missingPackageBump.stdout}`,
    /Bundled plugin input changes require a package\.json version bump/,
  );

  write("package.json", manifest("1.0.3"));
  write("CHANGELOG.md", changelog("1.0.3", "1.0.2", "1.0.1", "1.0.0"));
  const bumpedPackage = check(packageBumpBase);
  assert.equal(bumpedPackage.status, 0, bumpedPackage.stderr || bumpedPackage.stdout);
  git("add", ".");
  git("commit", "--quiet", "-m", "fixture non-skill plugin update");

  const unicodeBase = git("rev-parse", "HEAD");
  write("package.json", manifest("1.0.4"));
  write("CHANGELOG.md", changelog("1.0.4", "1.0.3", "1.0.2", "1.0.1", "1.0.0"));
  write("skills/testing/fixture-skill/references/überblick.md", "changed\n");

  assert.equal(
    listChangedGitPaths({ root: fixture, baseRef: unicodeBase }).includes(
      "skills/testing/fixture-skill/references/überblick.md",
    ),
    true,
    "the shared Git path reader must preserve Unicode paths",
  );

  const unicodeResource = check(unicodeBase);
  assert.notEqual(unicodeResource.status, 0, "Unicode bundled-skill paths must be detected");
  assert.match(
    `${unicodeResource.stderr}\n${unicodeResource.stdout}`,
    /Bundled plugin inputs changed without increasing/,
  );

  write("skills/testing/fixture-skill/SKILL.md", skill("1.0.2"));
  write("plugins/stark-ai-developer.source.json", pluginSource("1.1.2"));
  const bumpedUnicodeResource = check(unicodeBase);
  assert.equal(
    bumpedUnicodeResource.status,
    0,
    bumpedUnicodeResource.stderr || bumpedUnicodeResource.stdout,
  );
  git("add", ".");
  git("commit", "--quiet", "-m", "fixture Unicode resource update");

  const renameBase = git("rev-parse", "HEAD");
  fs.mkdirSync(path.join(fixture, "archive"), { recursive: true });
  fs.renameSync(
    path.join(fixture, "skills/testing/fixture-skill/references/policy.md"),
    path.join(fixture, "archive/policy.md"),
  );
  write("package.json", manifest("1.0.5"));
  write("CHANGELOG.md", changelog("1.0.5", "1.0.4", "1.0.3", "1.0.2", "1.0.1", "1.0.0"));
  git("add", "-A");
  assert.match(
    git("diff", "--cached", "--name-status", renameBase),
    /R100\tskills\/testing\/fixture-skill\/references\/policy\.md\tarchive\/policy\.md/,
  );
  const renamedPaths = new Set(listChangedGitPaths({ root: fixture, baseRef: renameBase }));
  assert.equal(renamedPaths.has("archive/policy.md"), true);
  assert.equal(
    renamedPaths.has("skills/testing/fixture-skill/references/policy.md"),
    true,
    "the shared Git path reader must expose both sides of a rename",
  );

  const renamedOut = check(renameBase);
  assert.notEqual(renamedOut.status, 0, "renaming a file out of a bundled skill must be detected");
  assert.match(
    `${renamedOut.stderr}\n${renamedOut.stdout}`,
    /Bundled plugin inputs changed without increasing/,
  );
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

console.log("Release-intent plugin version fixtures passed.");
