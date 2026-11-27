import assert from "node:assert/strict";
import { symlinkSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { baselinePath } from "./baseline.mjs";
import {
  captureBaseline,
  createFixture,
  readFixture,
  runQuality,
  writeFixture,
} from "./usability-fixture.mjs";

const repairable = 'const candidate = "example";\nconsole.log(candidate);\n';

test("selected reports retain raw locations and numeric messages without rewriting files", (context) => {
  const file = "scripts/reported.mjs";
  const source = `export const candidate = 1;\n${"// fixture\n".repeat(310)}`;
  const directory = createFixture(context, { [file]: source });
  const previous = readFixture(directory, baselinePath);
  const result = runQuality(directory, "inspect", ["report", "--json", "--", file]);

  assert.equal(result.status, 0, result.stderr);

  const report = JSON.parse(result.stdout);
  const finding = report.findings.find(({ rule }) => rule === "eslint(max-lines)");
  const diagnostic = report.diagnostics.find(({ code }) => code === "eslint(max-lines)");

  assert.equal(finding.file, file);
  assert.ok(finding.value > 300);
  assert.match(finding.message, /<value>/u);
  assert.ok(diagnostic.message.includes(String(finding.value)));
  assert.equal(diagnostic.filename, file);
  assert.ok(diagnostic.labels[0].span.line > 0 && diagnostic.labels[0].span.column > 0);

  const text = runQuality(directory, "inspect", ["report", "--", file]);

  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /scripts\/reported\.mjs:\d+:\d+/u);
  assert.equal(readFixture(directory, file), source);
  assert.equal(readFixture(directory, baselinePath), previous);
});

test("a selected safe fix leaves other source files and the allowance unchanged", (context) => {
  const selected = "scripts/selected.mjs";
  const other = "scripts/unselected.mjs";
  const directory = createFixture(context, { [selected]: repairable, [other]: repairable });

  captureBaseline(directory);

  const previous = readFixture(directory, baselinePath);
  const result = runQuality(directory, "inspect", ["fix", "--", selected]);

  assert.equal(result.status, 0, result.stderr);
  assert.notEqual(readFixture(directory, selected), repairable);
  assert.equal(readFixture(directory, other), repairable);
  assert.equal(readFixture(directory, baselinePath), previous);
});

test("missing, broad, ignored and option-like fix selections fail before any mutation", (context) => {
  const selected = "scripts/selected.mjs";
  const ignored = "scripts/vendor/ignored.mjs";
  const directory = createFixture(context, { [selected]: repairable, [ignored]: repairable });

  for (const args of [
    [],
    ["--"],
    ["scripts"],
    [selected, ignored],
    [selected, "missing.mjs"],
    ["--fix-dangerously", selected],
  ]) {
    const result = runQuality(directory, "inspect", ["fix", ...args]);

    assert.notEqual(result.status, 0, JSON.stringify(args));
    assert.equal(readFixture(directory, selected), repairable, JSON.stringify(args));
    assert.equal(readFixture(directory, ignored), repairable, JSON.stringify(args));
  }

  const report = runQuality(directory, "inspect", ["report", "--", selected, ignored]);

  assert.notEqual(report.status, 0, report.stdout);
});

test("files outside the consumer and symlink escapes cannot be fixed", (context) => {
  const selected = "scripts/selected.mjs";
  const directory = createFixture(context, { [selected]: repairable });
  const external = createFixture(context, { "scripts/external.mjs": repairable });
  const target = path.join(external, "scripts/external.mjs");
  const outside = runQuality(directory, "inspect", ["fix", selected, target]);

  assert.notEqual(outside.status, 0, outside.stdout);
  assert.equal(readFixture(directory, selected), repairable);
  assert.equal(readFixture(external, "scripts/external.mjs"), repairable);

  try {
    symlinkSync(target, path.join(directory, "scripts/alias.mjs"));
  } catch (error) {
    if (process.platform === "win32" && error.code === "EPERM") {
      context.diagnostic("Symlink creation unavailable without Windows developer privileges.");

      return;
    }

    throw error;
  }

  const alias = runQuality(directory, "inspect", ["fix", selected, "scripts/alias.mjs"]);

  assert.notEqual(alias.status, 0, alias.stdout);
  assert.equal(readFixture(directory, selected), repairable);
  assert.equal(readFixture(external, "scripts/external.mjs"), repairable);
});

test("parser failures retain their actionable diagnostic alongside inherited findings", (context) => {
  const file = "scripts/broken.mjs";
  const source = "export const = ;\n";
  const legacyFile = "scripts/legacy.mjs";
  const legacySource = "debugger;\n".repeat(30);
  const directory = createFixture(context, { [legacyFile]: legacySource, [file]: source });
  const result = runQuality(directory, "inspect", ["report", "--", legacyFile, file]);

  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, /scripts\/broken\.mjs:1:\d+/u);
  assert.match(result.stderr, /expected|unexpected|parser|syntax/iu);
  assert.equal(readFixture(directory, file), source);
  assert.equal(readFixture(directory, legacyFile), legacySource);
});

test("fixing then pruning an allowance prevents the finding from returning", (context) => {
  const file = "scripts/legacy.mjs";
  const directory = createFixture(context, { [file]: repairable });
  const previous = captureBaseline(directory);
  const initial = runQuality(directory, "check");

  assert.equal(initial.status, 0, initial.stderr);

  const fixed = runQuality(directory, "inspect", ["fix", file]);

  assert.equal(fixed.status, 0, fixed.stderr);

  const checked = runQuality(directory, "check");

  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /quality:baseline:prune/u);

  const pruned = runQuality(directory, "check", ["--prune-baseline"]);

  assert.equal(pruned.status, 0, pruned.stderr);

  const reduced = JSON.parse(readFixture(directory, baselinePath));

  assert.ok(
    Object.values(reduced.entries).flat().length < Object.values(previous.entries).flat().length,
  );

  writeFixture(directory, file, repairable);

  const regressed = runQuality(directory, "check");

  assert.notEqual(regressed.status, 0, regressed.stdout);
  assert.match(regressed.stderr, /scripts\/legacy\.mjs:\d+:\d+/u);
});

test("numeric-only improvements can be pruned and cannot grow back", (context) => {
  const file = "scripts/long.mjs";
  const original = `export const candidate = 1;\n${"// fixture\n".repeat(350)}`;
  const directory = createFixture(context, { [file]: original });
  const previous = captureBaseline(directory);

  writeFixture(directory, file, `export const candidate = 1;\n${"// fixture\n".repeat(320)}`);

  const checked = runQuality(directory, "check");

  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /quality:baseline:prune/u);

  const pruned = runQuality(directory, "check", ["--prune-baseline"]);

  assert.equal(pruned.status, 0, pruned.stderr);

  const reduced = JSON.parse(readFixture(directory, baselinePath));

  const identity = Object.keys(previous.entries).find(
    (key) => JSON.parse(key)[1] === "eslint(max-lines)",
  );

  assert.ok(reduced.entries[identity][0] < previous.entries[identity][0]);
  assert.equal(reduced.entries[identity].length, previous.entries[identity].length);
  writeFixture(directory, file, original);

  const regressed = runQuality(directory, "check");

  assert.notEqual(regressed.status, 0, regressed.stdout);
  assert.match(regressed.stderr, /scripts\/long\.mjs:\d+:\d+/u);
});
