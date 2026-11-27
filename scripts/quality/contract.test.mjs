import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createBaseline } from "@servrox/code-quality/baseline";

import { assertBaselineDoesNotGrow } from "./baseline.mjs";
import { assertConsumerContract, readConsumerContract } from "./contract.mjs";

const actual = readConsumerContract();

const firstPartyRoots = [
  ".github",
  "docs/listing/openai/review-video",
  "scripts",
  "packages",
  "site",
  "skills",
  "incubator",
  "skill-evals",
];

const runFixture = (sources) => {
  const directory = mkdtempSync(path.join(tmpdir(), "agent-skills-quality-"));

  try {
    for (const root of firstPartyRoots) {
      mkdirSync(path.join(directory, root), { recursive: true });
    }

    for (const [name, source] of Object.entries(sources)) {
      mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
      writeFileSync(path.join(directory, name), source);
    }

    for (const name of ["oxlint", "oxfmt"]) {
      const target = new URL(`../../${name}.config.mjs`, import.meta.url).href;
      writeFileSync(
        path.join(directory, `${name}.config.mjs`),
        `export { default } from ${JSON.stringify(target)};\n`,
      );
    }

    const report = new URL("report.mjs", import.meta.url).href;

    return spawnSync(
      "node",
      [
        "--input-type=module",
        "--eval",
        `import { collectFindings } from ${JSON.stringify(report)}; console.log(JSON.stringify(collectFindings()));`,
      ],
      {
        cwd: directory,
        encoding: "utf-8",
        timeout: 30_000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

test("the real consumer imports the required shared policy and keeps its CI gate", () => {
  assertConsumerContract(actual);
});

test("mutable pins, missing presets, local weakening and skipped roots fail the consumer contract", () => {
  const manifest = structuredClone(actual.manifest);
  manifest.devDependencies["@servrox/code-quality"] = "github:servrox/code-quality#main";
  assert.throws(() => assertConsumerContract({ ...actual, manifest }));
  assert.throws(() =>
    assertConsumerContract({
      ...actual,
      lint: { ...actual.lint, extends: actual.lint.extends.slice(1) },
    }),
  );
  assert.throws(() =>
    assertConsumerContract({ ...actual, lint: { ...actual.lint, rules: { "max-lines": "off" } } }),
  );
  assert.throws(() =>
    assertConsumerContract({ ...actual, lint: { ...actual.lint, overrides: [] } }),
  );
  assert.throws(() => assertConsumerContract({ ...actual, roots: ["scripts"] }));
});

test("the aggregate, PR-base budget comparison and non-optional hosted gate cannot be removed", () => {
  const manifest = structuredClone(actual.manifest);
  manifest.scripts.validate = 'bun exec "pnpm run validate:skills"';
  assert.throws(() => assertConsumerContract({ ...actual, manifest }));

  const workflow = structuredClone(actual.workflow);
  const gate = workflow.jobs.validate.steps.find(({ run }) => run === "pnpm run validate");
  delete gate.env.QUALITY_BASE_SHA;
  assert.throws(() => assertConsumerContract({ ...actual, workflow }));

  gate.env.QUALITY_BASE_SHA = `\${{ github.event.pull_request.base.sha }}`;
  gate["continue-on-error"] = true;
  assert.throws(() => assertConsumerContract({ ...actual, workflow }));
});

test("the actual shared sweep finds excess functions in every maintained source root", () => {
  const source = Array.from(
    { length: 9 },
    (_, index) => `function candidate${index}() { return ${index}; }`,
  ).join("\n");

  const result = runFixture(
    Object.fromEntries(firstPartyRoots.map((root) => [`${root}/candidate.mjs`, source])),
  );

  assert.equal(result.status, 0, result.stderr);

  const findings = JSON.parse(result.stdout);

  for (const root of firstPartyRoots) {
    assert.ok(
      findings.some(
        (finding) =>
          finding.file === `${root}/candidate.mjs` &&
          finding.message === "Maximum 8 top-level functions per file.",
      ),
      root,
    );
  }

  const baseline = createBaseline(findings);
  assertBaselineDoesNotGrow(baseline, baseline);
  assertBaselineDoesNotGrow(createBaseline([]), baseline);
  assert.throws(() => assertBaselineDoesNotGrow(baseline, createBaseline([])));
});

test("review-video React policy is scoped and preserves the shared function budget", () => {
  const source = Array.from(
    { length: 9 },
    (_, index) => `export const Candidate${index} = () => <button>Example</button>;`,
  ).join("\n");

  const scoped = "docs/listing/openai/review-video/src/candidate.tsx";
  const outside = "site/src/candidate.tsx";
  const result = runFixture({ [scoped]: source, [outside]: source });
  assert.equal(result.status, 0, result.stderr);

  const findings = JSON.parse(result.stdout);
  assert.ok(
    findings.some(
      (finding) => finding.file === scoped && finding.rule === "react(button-has-type)",
    ),
  );
  assert.ok(
    findings.some(
      (finding) =>
        finding.file === scoped && finding.message === "Maximum 8 top-level functions per file.",
    ),
  );
  assert.ok(
    !findings.some(
      (finding) => finding.file === outside && finding.rule === "react(button-has-type)",
    ),
  );
});

test("a real parser failure cannot become an empty passing report", () => {
  const result = runFixture({ "scripts/broken.mjs": "export const = ;" });
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /ZodError/u);
});

test("facade exceptions preserve explicit export and physical file budgets", () => {
  const source = Array.from(
    { length: 6 },
    (_, index) => `export const candidate${index} = ${index};`,
  ).join("\n");

  const result = runFixture({
    "scripts/lib/animated-image.mjs": `${source}\n${"// fixture\n".repeat(301)}`,
  });

  assert.equal(result.status, 0, result.stderr);

  const findings = JSON.parse(result.stdout);
  assert.ok(
    findings.some((finding) => finding.message === "Maximum 5 explicit ESM exports per file."),
  );
  assert.ok(findings.some((finding) => finding.rule === "eslint(max-lines)"));
});
