import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateArchitecture } from "./validate.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..", "..", "..");
const directAdapter = path.join(repositoryRoot, "scripts", "validate-architecture-compass.mjs");
const copiedDirectories = [
  "skills/engineering-workflows/architecture-compass",
  "skill-evals/architecture-compass",
  "docs/adrs",
];
const copiedFiles = [
  "scripts/validation/architecture-compass/decision-lock.tsv",
  "scripts/validation/architecture-compass/decision-lineage.json",
  "scripts/validation/architecture-compass/legacy-reference-source-lock.json",
  "scripts/validation/architecture-compass/legacy-reference-coverage.json",
];

function copyValidationFixture(targetRoot) {
  for (const relative of copiedDirectories) {
    fs.mkdirSync(path.dirname(path.join(targetRoot, relative)), { recursive: true });
    fs.cpSync(path.join(repositoryRoot, relative), path.join(targetRoot, relative), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
  }
  for (const relative of copiedFiles) {
    fs.mkdirSync(path.dirname(path.join(targetRoot, relative)), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, relative), path.join(targetRoot, relative));
  }
}

test("validateArchitecture validates the explicit root instead of the import-time cwd", (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-explicit-root-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  copyValidationFixture(fixture);
  fs.appendFileSync(
    path.join(fixture, "skills/engineering-workflows/architecture-compass/SKILL.md"),
    Buffer.from([0xff]),
  );

  const result = validateArchitecture(fixture);

  assert.ok(
    result.validationErrors.includes(
      "skills/engineering-workflows/architecture-compass/SKILL.md: must be valid UTF-8",
    ),
  );
});

test("validator module import is side-effect-free and exposes only the explicit-root API", async () => {
  const validatorModule = await import(`./validate.mjs?side-effect-free=${Date.now()}`);

  assert.deepEqual(Object.keys(validatorModule), ["validateArchitecture"]);
});

test("direct validator adapter delegates to the explicit validator root", async (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-adapter-root-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  copyValidationFixture(fixture);
  fs.appendFileSync(
    path.join(fixture, "skills/engineering-workflows/architecture-compass/SKILL.md"),
    Buffer.from([0xff]),
  );

  const { runArchitectureValidation } = await import(directAdapter);
  const result = runArchitectureValidation(fixture);

  assert.ok(
    result.validationErrors.includes(
      "skills/engineering-workflows/architecture-compass/SKILL.md: must be valid UTF-8",
    ),
  );
});
