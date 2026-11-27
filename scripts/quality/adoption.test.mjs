import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { commitConsumer, createConsumer, runConsumer } from "./adoption-fixture.mjs";

const limits = { timeout: 60_000 };
const clean = "export const enabled = true;\n";

const legacy =
  "export const legacy = (value) => {\n  if (value) return true;\n  return false;\n};\n";

const write = (fixture, file, content) =>
  writeFileSync(path.join(fixture.directory, file), content);

const baselineOf = (fixture) =>
  JSON.parse(readFileSync(path.join(fixture.directory, "quality-baseline.json"), "utf-8"));

const expectExit = (result, status, diagnostic) => {
  assert.equal(result.status, status, `${result.stdout}\n${result.stderr}`);

  if (diagnostic) {
    assert.match(`${result.stdout}\n${result.stderr}`, diagnostic);
  }
};

const captureDebt = (context) => {
  const fixture = createConsumer(context);

  write(fixture, "src/example.mjs", legacy);

  const base = commitConsumer(fixture);

  expectExit(runConsumer(fixture, ["tools/quality.mjs", "capture", base]), 0);

  const baseline = baselineOf(fixture);

  assert.ok(
    Object.keys(baseline.entries).length > 0,
    "The fixture must measure actual inherited findings",
  );

  return { fixture, base, baseline };
};

test(
  "documented configs and exact wrapper pass shared policy while forbidden source fails",
  limits,
  (context) => {
    const fixture = createConsumer(context);

    expectExit(runConsumer(fixture, [...fixture.lintArgs, "tools/quality.mjs"]), 0);
    write(fixture, "src/example.mjs", `${clean}eval("1");\n`);
    expectExit(runConsumer(fixture, fixture.lintArgs), 1, /no-eval/u);
  },
);

test(
  "documented history gate accepts retained allowances and rejects committed budget growth",
  limits,
  (context) => {
    const { fixture, baseline } = captureDebt(context);
    const adopted = commitConsumer(fixture, baseline);
    const environment = { QUALITY_BASE_SHA: adopted };

    expectExit(runConsumer(fixture, ["tools/quality.mjs", "check"], environment), 0);

    const expanded = structuredClone(baseline);

    Object.values(expanded.entries)[0].push(1);
    write(fixture, "quality-baseline.json", JSON.stringify(expanded));
    expectExit(
      runConsumer(fixture, ["tools/quality.mjs", "check"], environment),
      1,
      /Committed allowances must not grow/u,
    );
  },
);

test(
  "documented prune makes a source improvement durable against reintroduction",
  limits,
  (context) => {
    const { fixture, baseline } = captureDebt(context);
    const adopted = commitConsumer(fixture, baseline);
    const environment = { QUALITY_BASE_SHA: adopted };

    write(fixture, "src/example.mjs", clean);
    expectExit(runConsumer(fixture, ["tools/quality.mjs", "prune"], environment), 0);
    assert.deepEqual(baselineOf(fixture).entries, {});
    write(fixture, "src/example.mjs", legacy);
    expectExit(
      runConsumer(fixture, ["tools/quality.mjs", "check"], environment),
      1,
      /Shared quality regression/u,
    );
  },
);

test(
  "documented capture refuses overwrite and CI writes; PR checks require a base",
  limits,
  (context) => {
    const { fixture, base, baseline } = captureDebt(context);

    expectExit(
      runConsumer(fixture, ["tools/quality.mjs", "capture", base]),
      1,
      /Capture cannot replace/u,
    );
    expectExit(
      runConsumer(fixture, ["tools/quality.mjs", "capture", base], { CI: "true" }),
      1,
      /reviewed local migration/u,
    );
    expectExit(
      runConsumer(fixture, ["tools/quality.mjs", "check"], { GITHUB_EVENT_NAME: "pull_request" }),
      1,
      /PR CI requires QUALITY_BASE_SHA/u,
    );
    assert.deepEqual(baselineOf(fixture), baseline);
  },
);

test(
  "documented capture cannot assign old allowances to a new maintained path",
  limits,
  (context) => {
    const { fixture, base } = captureDebt(context);

    rmSync(path.join(fixture.directory, "quality-baseline.json"));
    write(fixture, "src/new.mjs", 'eval("1");\n');
    expectExit(
      runConsumer(fixture, ["tools/quality.mjs", "capture", base]),
      1,
      /New migration source receives no allowance/u,
    );
  },
);

test("documented wrapper rejects a parser failure with its original report", limits, (context) => {
  const { fixture } = captureDebt(context);

  write(fixture, "src/example.mjs", "export const = ;\n");
  expectExit(
    runConsumer(fixture, ["tools/quality.mjs", "check"]),
    1,
    /Invalid or unclassified Oxlint report/u,
  );
});

test(
  "a green config-only lint result does not prove the documented source inventory exists",
  limits,
  (context) => {
    const fixture = createConsumer(context);

    rmSync(path.join(fixture.directory, "src/example.mjs"));

    const empty = runConsumer(fixture, [...fixture.lintArgs, "--format=json"]);

    expectExit(empty, 0);
    assert.equal(JSON.parse(empty.stdout).number_of_files, 2);
    rmSync(path.join(fixture.directory, "src"), { recursive: true });

    const missing = runConsumer(fixture, [...fixture.lintArgs, "--format=json"]);

    expectExit(missing, 0);
    assert.equal(JSON.parse(missing.stdout).number_of_files, 2);
  },
);
