import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

const source = process.cwd();
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "shared-quality-governance-"));
const skill = "skills/engineering-workflows/architecture-compass";
const references = `${skill}/references`;

const predecessor =
  "ac-adr-013-own-language-package-build-lint-and-supply-chain-tooling-explicitly";

const successor = "ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership";
const guide = `${references}/${successor}.guide.md`;

const validate = () => {
  const result = spawnSync(
    process.execPath,
    [path.join(source, "scripts/validation/architecture-compass/validate.mjs")],
    { cwd: fixture, encoding: "utf-8", timeout: 30_000 },
  );

  assert.ifError(result.error);

  return result;
};

const rejects = (relative, change, diagnostic) => {
  const target = path.join(fixture, relative);
  const original = fs.readFileSync(target, "utf-8");
  const candidate = change(original);
  assert.notEqual(candidate, original);

  try {
    fs.writeFileSync(target, candidate);
    const result = validate();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, diagnostic);
  } finally {
    fs.writeFileSync(target, original);
  }
};

before(() => {
  for (const directory of [
    skill,
    "docs/adrs",
    "scripts/validation/architecture-compass",
    "skill-evals/architecture-compass",
  ]) {
    fs.cpSync(path.join(source, directory), path.join(fixture, directory), {
      recursive: true,
      filter: (file) => !file.split(path.sep).includes("node_modules"),
    });
  }

  const result = validate();
  assert.equal(result.status, 0, result.stderr);
});

after(() => fs.rmSync(fixture, { recursive: true, force: true }));

test("historical discretionary policy remains immutable after succession", () => {
  rejects(
    `${references}/${predecessor}.long.md`,
    (text) => text.replace("not an unconditional mandate", "an unconditional mandate"),
    /AC-ADR-013: Long Decision drifted from its accepted lock/u,
  );
});

test("active adoption cannot restore a superseded provider", () => {
  rejects(
    `${skill}/assets/setup-report-template.md`,
    (text) => text.replace(/\| AC-ADR-069\s*\|/u, "| AC-ADR-013 |"),
    /setup adoption matrix contains ineligible AC-ADR-013/u,
  );
});

test("historical reference coverage cannot target a superseded Long decision", () => {
  rejects(
    "scripts/validation/architecture-compass/legacy-reference-coverage.json",
    (text) => text.replace(`${successor}.long.md`, `${predecessor}.long.md`),
    /canonical Long target Status must be Accepted/u,
  );
});

for (const pin of ["latest", "^0.2.0", "0.2.0-rc.1", "github:servrox/code-quality#main"]) {
  test(`installation recipes reject the manifest pin ${pin}`, () => {
    rejects(
      guide,
      (text) => text.replace(/(?<prefix>"@servrox\/code-quality":\s*")[^"]+/u, `$<prefix>${pin}`),
      /shared-quality installation requires an exact stable npm version/u,
    );
  });
}

test("installation recipes cannot omit the modularity preset", () => {
  rejects(
    guide,
    (text) => text.replace('import modularity from "@servrox/code-quality/oxlint/modularity";', ""),
    /missing mandatory shared-quality import modularity/u,
  );
});

test("installation recipes cannot omit shared formatting", () => {
  rejects(
    guide,
    (text) => text.replace('import shared from "@servrox/code-quality/oxfmt";', ""),
    /missing mandatory shared-quality formatter import/u,
  );
});
