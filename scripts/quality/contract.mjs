import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import provider from "@servrox/code-quality/package.json" with { type: "json" };
import sharedFormat from "@servrox/code-quality/oxfmt";
import antiSlop from "@servrox/code-quality/oxlint/anti-slop";
import core from "@servrox/code-quality/oxlint/core";
import modularity, {
  exportRestrictions,
  functionRestrictions,
} from "@servrox/code-quality/oxlint/modularity";
import react from "@servrox/code-quality/oxlint/react";
import strict from "@servrox/code-quality/oxlint/strict";
import { load } from "js-yaml";

import format from "../../oxfmt.config.mjs";
import lint from "../../oxlint.config.mjs";
import { sourceIgnores, sourceRoots } from "./scope.mjs";

const assertDependency = (manifest, lock) => {
  const source = manifest.devDependencies?.["@servrox/code-quality"];

  const match =
    /^git\+https:\/\/github\.com\/servrox\/code-quality\.git#(?<sha>[a-f\d]{40})$/u.exec(source);

  assert.ok(match, "Use a full reviewed Git SHA from servrox/code-quality");

  const archive = `https://codeload.github.com/servrox/code-quality/tar.gz/${match.groups.sha}`;
  const entry = lock.importers["."].devDependencies["@servrox/code-quality"];
  const resolved = lock.packages[`@servrox/code-quality@${archive}`];
  assert.equal(entry.specifier, source, "Manifest and lockfile must share the pin");
  assert.ok(entry.version.startsWith(archive), "Lockfile must install the approved archive");
  assert.equal(resolved.resolution.tarball, archive);
  assert.match(resolved.resolution.integrity, /^sha512-/u);

  for (const [name, version] of Object.entries(provider.peerDependencies)) {
    if (!provider.peerDependenciesMeta?.[name]?.optional) {
      assert.equal(manifest.devDependencies[name], version, `Use the provider's qualified ${name}`);
    }
  }
};

const assertPresets = (config) => {
  const required = [core, strict, modularity, antiSlop];
  assert.equal(config.extends?.length, required.length, "Consume all four shared presets");

  for (const [index, preset] of required.entries()) {
    assert.equal(config.extends[index], preset, "Import shared presets; do not copy their rules");
  }

  assert.equal(config.rules, undefined, "Shared rule changes belong upstream");
  assert.equal(config.categories, undefined, "Do not disable shared categories");
  assert.deepEqual(config.ignorePatterns, [...core.ignorePatterns, ...sourceIgnores]);
  assert.deepEqual(config.options, { denyWarnings: true, reportUnusedDisableDirectives: "error" });
  assert.deepEqual(Object.keys(config).toSorted(), [
    "env",
    "extends",
    "ignorePatterns",
    "options",
    "overrides",
  ]);
  assert.deepEqual(config.env, { node: true, browser: false });
};

const assertOverrides = (config) => {
  const countedExports = exportRestrictions.filter(
    ({ message }) => message !== "Wildcard exports are restricted to explicit package entrypoints.",
  );

  assert.equal(
    countedExports.length,
    exportRestrictions.length - 1,
    "Requalify the facade adaptation after an upstream change",
  );
  assert.deepEqual(config.overrides, [
    { files: ["site/src/**/*.{js,jsx,ts,tsx}"], env: { browser: true } },
    {
      ...react,
      files: ["docs/listing/openai/review-video/src/**/*.{js,jsx,ts,tsx}"],
      plugins: [...core.plugins, ...react.plugins],
      env: { browser: true },
    },
    {
      files: ["scripts/lib/animated-image.mjs", "scripts/lib/visual-assertions.mjs"],
      rules: {
        "eslint-js/no-restricted-syntax": ["error", ...functionRestrictions, ...countedExports],
      },
    },
  ]);
};

const assertCommands = (manifest, workflow) => {
  assert.equal(manifest.scripts.lint, "oxlint --config oxlint.json scripts");
  assert.equal(manifest.scripts["quality:check"], "bun --bun scripts/quality/check.mjs");
  assert.equal(
    manifest.scripts["quality:baseline:prune"],
    "bun --bun scripts/quality/check.mjs --prune-baseline",
  );
  assert.equal(
    manifest.scripts["validate:quality"],
    'bun exec "bun --bun test scripts/quality/contract.test.mjs && pnpm run quality:check"',
  );
  assert.ok(manifest.scripts.validate.startsWith('bun exec "pnpm run validate:quality && '));

  const gate = workflow.jobs.validate.steps.find(({ run }) => run === "pnpm run validate");
  assert.ok(gate, "Hosted CI must run the mandatory aggregate");
  assert.equal(gate.if, undefined, "Quality validation must not be conditional");
  assert.notEqual(gate["continue-on-error"], true);
  assert.equal(gate.env?.QUALITY_BASE_SHA, `\${{ github.event.pull_request.base.sha }}`);
};

export const readConsumerContract = () => ({
  manifest: JSON.parse(readFileSync("package.json", "utf-8")),
  lock: load(readFileSync("pnpm-lock.yaml", "utf-8")),
  workflow: load(readFileSync(".github/workflows/validate.yml", "utf-8")),
  legacy: JSON.parse(readFileSync("oxlint.json", "utf-8")),
  lint,
  format,
  roots: sourceRoots,
});

export const assertConsumerContract = (subject) => {
  assertDependency(subject.manifest, subject.lock);
  assertPresets(subject.lint);
  assertOverrides(subject.lint);
  assertCommands(subject.manifest, subject.workflow);
  assert.deepEqual(subject.format, {
    ...sharedFormat,
    trailingComma: "all",
    sortImports: false,
    proseWrap: "preserve",
  });
  assert.equal(subject.legacy.categories.correctness, "error");
  assert.deepEqual(subject.legacy.rules, {});
  assert.deepEqual(subject.roots, [
    ".github",
    "docs/listing/openai/review-video",
    "scripts",
    "packages",
    "site",
    "skills",
    "incubator",
    "skill-evals",
    "oxlint.config.mjs",
    "oxfmt.config.mjs",
  ]);
};
