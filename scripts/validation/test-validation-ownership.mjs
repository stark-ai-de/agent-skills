import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const planPath = path.join(repositoryRoot, "docs/validation-ownership.json");
const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));

assert.equal(plan.schemaVersion, 1);
assert.ok(Array.isArray(plan.gates) && plan.gates.length > 0);

const ids = plan.gates.map((gate) => gate.id);
assert.equal(new Set(ids).size, ids.length, "validation gate ids must be unique");
const requiredIds = new Set([
  "repository-aggregate",
  "adrs",
  "runtime-matrix",
  "listing-identity",
  "site-seo",
  "historical-release-context",
  "release-subject-schema",
  "release-reproducibility",
  "archives",
  "projections",
  "openai-plugin",
  "actions",
  "scripts",
  "hosted-directory",
]);
assert.deepEqual(
  new Set(ids),
  requiredIds,
  "validation gate ids must equal the mandatory ownership set",
);
for (const gate of plan.gates) {
  assert.match(gate.id, /^[a-z0-9-]+$/);
  assert.equal(typeof gate.owner, "string");
  assert.ok(gate.owner.trim(), `${gate.id} must have exactly one owner`);
  assert.equal(typeof gate.proof, "string");
  assert.ok(gate.proof.trim(), `${gate.id} must describe its proof`);
  assert.equal(typeof gate.cadence, "string");
  assert.ok(gate.cadence.trim(), `${gate.id} must describe cadence`);

  const commandMatch = /^pnpm run ([a-z0-9:-]+)$/.exec(gate.command);
  assert.ok(commandMatch, `${gate.id} must reference one readable pnpm command`);
  assert.equal(
    typeof packageJson.scripts?.[commandMatch[1]],
    "string",
    `${gate.id} references missing pnpm script ${commandMatch[1]}`,
  );

  const ownerPath = gate.owner.split("#", 1)[0];
  assert.equal(
    fs.existsSync(path.join(repositoryRoot, ownerPath)),
    true,
    `${gate.id} owner is missing`,
  );
}

const validateWorkflow = fs.readFileSync(
  path.join(repositoryRoot, ".github/workflows/validate.yml"),
  "utf8",
);
const directoryWorkflow = fs.readFileSync(
  path.join(repositoryRoot, ".github/workflows/openai-directory.yml"),
  "utf8",
);
assert.doesNotMatch(
  validateWorkflow,
  /\.\/\.github\/actions\/verify-openai-directory/,
  "deterministic Validate must not own live directory observation",
);
assert.match(directoryWorkflow, /workflow_dispatch:/);
assert.match(directoryWorkflow, /schedule:/);
assert.equal(
  directoryWorkflow.match(/\.\/\.github\/actions\/verify-openai-directory/g)?.length,
  1,
  "scheduled/manual directory workflow must contain exactly one strict live check",
);
assert.doesNotMatch(
  directoryWorkflow,
  /continue-on-error/,
  "scheduled/manual directory verification must remain strict",
);

console.log("Validation ownership plan passed.");
