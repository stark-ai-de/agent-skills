import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { load } from "js-yaml";

import { observeSystemToolIdentity, systemToolPolicyIdentity } from "./run-validation-task.mjs";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const validate = fs.readFileSync(path.join(repository, ".github/workflows/validate.yml"), "utf8");
const publish = fs.readFileSync(
  path.join(repository, ".github/workflows/publish-release.yml"),
  "utf8",
);
const gateAction = fs.readFileSync(
  path.join(repository, "scripts/ci/actions/run-validation-gate/action.yml"),
  "utf8",
);
const gateActionDocument = load(gateAction);
const assembler = fs.readFileSync(
  path.join(repository, "scripts/ci/assemble-validation-tasks.mjs"),
  "utf8",
);
const resolver = fs.readFileSync(
  path.join(repository, "scripts/ci/resolve-validation-tasks.mjs"),
  "utf8",
);
const actionlintWrapper = fs.readFileSync(
  path.join(repository, "scripts/lint-actions.mjs"),
  "utf8",
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(repository, "scripts/ci/validation-manifest.json"), "utf8"),
);

const pins = new Map([
  ["actions/cache", "55cc8345863c7cc4c66a329aec7e433d2d1c52a9"],
  ["actions/upload-artifact", "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a"],
  ["actions/download-artifact", "3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c"],
  ["actions/checkout", "d23441a48e516b6c34aea4fa41551a30e30af803"],
  ["actions/setup-node", "249970729cb0ef3589644e2896645e5dc5ba9c38"],
  ["pnpm/setup", "84cb39b217b10273981911c288cd62326dc7c6d2"],
  ["actions/configure-pages", "45bfe0192ca1faeb007ade9deae92b16b8254a0d"],
  ["actions/upload-pages-artifact", "fc324d3547104276b827a68afc52ff2a11cc49c9"],
  ["actions/deploy-pages", "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128"],
]);

function actionReferences(...documents) {
  return [...documents.join("\n").matchAll(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)].map(
    (match) => match[1],
  );
}

function jobBody(jobId, nextJobId) {
  const expression = new RegExp(
    `^  ${jobId}:\\n([\\s\\S]*?)(?=^  ${nextJobId}:)`,
    "m",
  );
  return expression.exec(validate)?.[1] ?? "";
}

test("every first-party action reference is pinned to the approved immutable commit", () => {
  const references = actionReferences(validate, publish, gateAction);
  assert.ok(references.length > 0);
  for (const reference of references) {
    const [action, revision] = reference.split("@");
    const approvedAction = action.startsWith("actions/cache/") ? "actions/cache" : action;
    if (!pins.has(approvedAction)) continue;
    assert.equal(revision, pins.get(approvedAction), reference);
  }
  for (const action of pins.keys()) {
    assert.ok(
      references.some((reference) => {
        const [referencedAction] = reference.split("@");
        return referencedAction === action || referencedAction.startsWith(`${action}/`);
      }),
      action,
    );
  }
});

test("validation uses a miss-only graph and one stable required aggregator", () => {
  for (const job of [
    "resolve:",
    "skills-miss:",
    "root-misses:",
    "architecture-plan:",
    "architecture-shards:",
    "architecture-aggregate:",
    "smoke-miss:",
    "validate:",
  ]) {
    assert.match(validate, new RegExp(`^  ${job.replace(":", "\\:")}`, "m"));
  }
  assert.match(validate, /^  validate:\n[\s\S]*?^    name: Validate$/m);
  assert.match(validate, /if: \$\{\{ needs\.resolve\.outputs\.has_root_misses == 'true' \}\}/);
  assert.match(validate, /matrix: \$\{\{ fromJSON\(needs\.resolve\.outputs\.root_matrix\) \}\}/);
  assert.match(validate, /^      fail-fast: false$/m);
  assert.match(validate, /if: \$\{\{ always\(\) \}\}/);
  assert.doesNotMatch(validate, /^\s*pull_request_target:/m);
});

test("standard gate jobs share one repository-owned composite action", () => {
  assert.equal(gateActionDocument.runs.using, "composite");
  assert.deepEqual(
    Object.keys(gateActionDocument.inputs).sort(),
    [
      "failure-reason",
      "gate-id",
      "install-dependencies",
      "job-id",
      "job-name",
      "outcome-artifact-name",
      "prerequisite-outcome-artifact-name",
      "resolution-artifact-name",
    ].sort(),
  );
  assert.equal(
    (validate.match(/uses: \.\/scripts\/ci\/actions\/run-validation-gate/g) ?? []).length,
    3,
  );
  for (const marker of [
    "Set up exact Node runtime",
    "Download immutable resolution",
    "Install this task's dependencies",
    "Create exact execution runtime",
    "Execute task",
    "Stage canonical task publication",
    "Upload provisional task artifact",
    "Propagate task failure",
  ]) {
    assert.equal((gateAction.match(new RegExp(marker, "g")) ?? []).length, 1, marker);
  }
  for (const body of [
    jobBody("skills-miss", "root-misses"),
    jobBody("root-misses", "architecture-plan"),
    jobBody("smoke-miss", "validate"),
  ]) {
    assert.doesNotMatch(body, /run-validation-task\.mjs/);
    assert.doesNotMatch(body, /record-validation-task\.mjs/);
    assert.doesNotMatch(body, /actions\/setup-node@/);
    assert.doesNotMatch(body, /pnpm\/setup@/);
  }
  assert.match(gateAction, /VALIDATION_GATE_ID: \$\{\{ inputs\.gate-id \}\}/);
  assert.match(gateAction, /--gate-id "\$VALIDATION_GATE_ID"/);
  assert.match(gateAction, /--job-name "\$VALIDATION_JOB_NAME"/);
  assert.match(gateAction, /--job-id "\$VALIDATION_JOB_ID"/);
  assert.match(gateAction, /--prerequisite-outcome/);
});

test("full-hit topology does not install dependencies or start gate jobs", () => {
  assert.match(validate, /has_root_misses:/);
  assert.match(validate, /has_skills_miss:/);
  assert.match(validate, /has_architecture_miss:/);
  assert.match(validate, /has_smoke_miss:/);
  assert.match(validate, /gate-id: \$\{\{ matrix\.gateId \}\}/);
  assert.match(
    gateAction,
    /--resolution "\$RUNNER_TEMP\/validation-resolution\/resolution\.json"/,
  );
  assert.doesNotMatch(validate, /Install selected validation dependencies[\s\S]*jobs:\s*validate/);
  const resolverJob = /^  resolve:\n([\s\S]*?)(?=^  skills-miss:)/m.exec(validate)?.[1] ?? "";
  assert.doesNotMatch(resolverJob, /pnpm\/setup@/);
  assert.doesNotMatch(resolverJob, /install-validation-dependencies/);
  assert.match(validate, /Validate resolved topology results/);
  assert.match(validate, /steps\.topology\.outcome != 'success'/);
  assert.match(assembler, /Unexpected current-run task artifact/);
  assert.doesNotMatch(resolver, /run\("pnpm", \["--version"\]\)/);
  assert.match(resolver, /pnpm: `pnpm@\$\{packages\.packageManager\}`/);
});

test("the actions miss installs and binds the checksum-pinned actionlint binary", () => {
  assert.match(gateAction, /Install verified actionlint binary/);
  assert.match(gateAction, /inputs\.gate-id == 'actions'/);
  assert.match(gateAction, /actionlint-contract\.mjs/);
  assert.match(gateAction, /ACTIONLINT: \$\{\{ steps\.actionlint\.outputs\.actionlint_path \}\}/);
  assert.doesNotMatch(`${validate}\n${gateAction}`, /ACTIONLINT_RELEASE/);
  assert.match(actionlintWrapper, /configuredActionlint\s*\?\s*\[configuredActionlint\]/);
  assert.match(actionlintWrapper, /Configured ACTIONLINT executable is unavailable/);
});

test("the scripts task key binds stable hosted policies and producers observe exact bytes", () => {
  const scriptsGate = manifest.gates.find(({ id }) => id === "scripts");
  assert.deepEqual(scriptsGate.execution.packageProfiles, ["root"]);
  assert.deepEqual(scriptsGate.execution.tools, [
    "bash",
    "env",
    "git",
    "mkfifo",
    "node",
    "npm",
    "oxfmt",
    "pnpm",
    "sh",
    "sleep",
    "tar",
  ]);
  for (const tool of ["bash", "env", "mkfifo", "sh", "sleep", "tar"]) {
    assert.match(
      observeSystemToolIdentity(tool, repository),
      new RegExp(`^${tool}:.+@sha256:[a-f0-9]{64}`),
    );
    assert.equal(systemToolPolicyIdentity(tool), `${tool}@ubuntu-24.04`);
    assert.match(resolver, new RegExp(`${tool}: systemToolPolicyIdentity\\("${tool}"\\)`));
  }
});

test("every Architecture miss runner reattests keyed identity and worker mode", () => {
  assert.match(validate, /--architecture-workers "\$ARCHITECTURE_WORKERS"/);
  assert.equal(
    (validate.match(/--gate-id architecture-compass[^\n]*--write-runtime/g) ?? []).length,
    3,
  );
  assert.match(
    validate,
    /WORKERS: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.architecture_workers \|\| 'auto' \}\}/,
  );
  assert.match(
    validate,
    /Assemble and verify complete task proof[\s\S]*--architecture-workers "\$ARCHITECTURE_WORKERS"/,
  );
  assert.match(
    validate,
    /Assemble and verify complete task proof[\s\S]*--event "\$GITHUB_EVENT_NAME" --ref "\$GITHUB_REF" --sha "\$GITHUB_SHA" --base-sha "\$\{BASE_SHA:-none\}"/,
  );
  assert.match(
    validate,
    /Assemble and verify complete task proof[\s\S]*--plan "\$RUNNER_TEMP\/validation-resolution\/validation-plan\.json"/,
  );
});

test("task artifacts are attempt-safe, immutable, complete, and retained for thirty days", () => {
  const taskLifecycle = `${validate}\n${gateAction}`;
  assert.match(taskLifecycle, /validation-task-v1-/);
  assert.match(gateAction, /overwrite: false/);
  assert.match(gateAction, /include-hidden-files: true/);
  assert.match(gateAction, /retention-days: 30/);
  assert.match(
    validate,
    /validation-task-index-v1-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/,
  );
  assert.match(
    validate,
    /pattern: "validation-task-v1-\*-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}"/,
  );
  assert.equal((gateAction.match(/--failure-reason/g) ?? []).length, 1);
  assert.equal((validate.match(/--failure-reason/g) ?? []).length, 1);
  assert.match(gateAction, /--run-id "\$GITHUB_RUN_ID"/);
  assert.match(gateAction, /--run-attempt "\$GITHUB_RUN_ATTEMPT"/);
});

test("failed miss setup publishes tombstones and smoke requires verified skills", () => {
  assert.match(gateAction, /id: record\n      if: \$\{\{ always\(\) \}\}/);
  assert.match(gateAction, /inputs\.failure-reason/);
  assert.match(
    validate,
    /outcome-artifact-name: validation-outcome-v1-skills-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/,
  );
  assert.match(validate, /prerequisite-outcome-artifact-name:/);
  assert.match(validate, /needs\.resolve\.outputs\.skills_status == 'reused'/);
  assert.match(validate, /needs\.skills-miss\.result == 'success'/);
  assert.match(validate, /needs\.resolve\.outputs\.has_skills_miss == 'false'/);
});

test("only protected main can authorize Pages and release publication", () => {
  assert.match(validate, /trusted_main/);
  assert.match(validate, /github\.event_name == 'push'/);
  assert.match(validate, /github\.event_name == 'workflow_dispatch'/);
  assert.match(validate, /github\.ref == 'refs\/heads\/main'/);
  assert.match(validate, /actions\/upload-pages-artifact@/);
  assert.match(validate, /actions\/deploy-pages@/);
  assert.match(publish, /--boundary release-readiness/);
  assert.match(publish, /--boundary publication/);
  assert.match(publish, /--expected-control-plane-digest/);
  assert.match(publish, /--paginate --slurp/);
  assert.equal((publish.match(/artifact-ids:/g) ?? []).length, 4);
  assert.equal((publish.match(/--validation-artifact-id/g) ?? []).length, 2);
  assert.doesNotMatch(publish, /^\s+name: \$\{\{ .*artifact_name \}\}$/m);
});

test("all hosted jobs pin the runner and exact Node floor", () => {
  const runnerReferences = [...validate.matchAll(/runs-on:\s*([^\s]+)/g)].map(
    (match) => match[1],
  );
  assert.ok(runnerReferences.length >= 8);
  assert.deepEqual(new Set(runnerReferences), new Set(["ubuntu-24.04"]));
  assert.doesNotMatch(validate, /ubuntu-latest/);
  assert.doesNotMatch(publish, /ubuntu-latest/);
  assert.match(`${validate}\n${publish}\n${gateAction}`, /node-version: 22\.20\.0/);
});

test("the aggregator finalizes report v2 before every diagnostic upload", () => {
  const assembly = validate.indexOf("- name: Assemble and verify complete task proof");
  const finalizer = validate.indexOf("- name: Finalize validation diagnostic report");
  const upload = validate.indexOf("- name: Upload diagnostic validation report");
  assert.ok(assembly >= 0 && assembly < finalizer && finalizer < upload);

  const finalizerStep = validate.slice(finalizer, upload);
  assert.match(finalizerStep, /if: \$\{\{ always\(\) \}\}/);
  assert.match(finalizerStep, /continue-on-error: true/);
  assert.match(finalizerStep, /finalize-validation-diagnostic\.mjs/);
  assert.match(
    finalizerStep,
    /--boundary "\$RUNNER_TEMP\/validation-resolution\/validation-boundary\.json"/,
  );
  assert.match(
    finalizerStep,
    /--plan "\$RUNNER_TEMP\/validation-resolution\/validation-plan\.json"/,
  );
  assert.match(finalizerStep, /--report "\$RUNNER_TEMP\/validation-report\.json"/);
});
