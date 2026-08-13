import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { parseNameStatus, resolveValidationPlan } from "./resolve-validation-plan.mjs";
import {
  digestJson,
  planDigest,
  readJson,
  validateManifest,
  validatePlan,
} from "./validation-contract.mjs";
import { _internal as taskGraphInternal } from "./validation-task-graph.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const planner = path.join(directory, "plan-validation.mjs");
const manifestPath = path.join(directory, "validation-manifest.json");
const manifest = validateManifest(readJson(manifestPath));
const repository = path.resolve(directory, "../..");
const stableGateOrder = [
  "skills",
  "memory-curators",
  "adrs",
  "architecture-compass",
  "actions",
  "scripts",
  "codegraph",
  "drawio",
  "animated-logo",
  "skillopt",
  "site",
  "format",
  "script-lint",
  "release-metadata",
  "smoke-install",
];

function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "validation-planner-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function runPlanner(t, entries, event = "pull_request") {
  const root = temporaryRoot(t);
  const changes = path.join(root, "changes.json");
  const output = path.join(root, "plan.json");
  fs.writeFileSync(changes, JSON.stringify({ schemaVersion: 1, entries }));
  execute(process.execPath, [
    planner,
    "--manifest",
    manifestPath,
    "--changes",
    changes,
    "--base-sha",
    "base",
    "--candidate-sha",
    "candidate",
    "--event",
    event,
    "--output",
    output,
  ]);
  return validatePlan(readJson(output), manifest);
}

function execute(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    ...options,
    encoding: options.encoding ?? "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `${command} ${arguments_.join(" ")} failed.`);
  }
  return result.stdout;
}

function initializeGitRepository(root) {
  execute("git", ["init", "--quiet"], { cwd: root });
  execute("git", ["config", "user.email", "validation@example.invalid"], { cwd: root });
  execute("git", ["config", "user.name", "Validation Test"], { cwd: root });
}

function commit(root, message) {
  execute("git", ["add", "."], { cwd: root });
  execute("git", ["commit", "--quiet", "-m", message], { cwd: root });
  return execute("git", ["rev-parse", "HEAD"], { cwd: root }).trim();
}

test("name-status parsing retains both rename paths and deletion paths", () => {
  const entries = parseNameStatus(
    Buffer.from("R100\0docs/old.md\0docs/new.md\0D\0skills/x/y/SKILL.md\0"),
  );
  assert.deepEqual(entries, [
    { status: "R100", paths: ["docs/old.md", "docs/new.md"] },
    { status: "D", paths: ["skills/x/y/SKILL.md"] },
  ]);
  assert.throws(() => parseNameStatus(Buffer.from([0x4d, 0, 0xff, 0])), /invalid UTF-8/);
});

test("manifest preserves the approved stable full gate order", () => {
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.taskKeySchemaVersion, 1);
  assert.deepEqual(
    manifest.gates.map(({ id }) => id),
    stableGateOrder,
  );
  assert.ok(
    manifest.gates
      .find(({ id }) => id === "format")
      .command.includes("--no-error-on-unmatched-pattern"),
    "ignored-only affected format targets must be a deterministic no-op",
  );
});

test("manifest v2 declares a complete cache contract for every gate", () => {
  assert.equal(manifest.gates.length, 15);
  for (const gate of manifest.gates) {
    assert.ok(gate.selection.paths.length > 0, `${gate.id}: selection paths`);
    assert.equal(
      gate.selection.deriveFromExecutionInputs,
      true,
      `${gate.id}: selection derives from execution inputs`,
    );
    assert.ok(gate.execution.entrypoints.length > 0, `${gate.id}: entrypoints`);
    assert.ok(Array.isArray(gate.execution.helpers), `${gate.id}: helpers`);
    assert.ok(gate.execution.workspaceInputs.length > 0, `${gate.id}: workspace inputs`);
    assert.ok(Array.isArray(gate.execution.packageProfiles), `${gate.id}: package profiles`);
    assert.ok(gate.execution.tools.length > 0, `${gate.id}: tools`);
    assert.ok(Array.isArray(gate.execution.environment), `${gate.id}: environment`);
    assert.ok(Array.isArray(gate.execution.gitInputs), `${gate.id}: Git inputs`);
    assert.equal(typeof gate.evidence.kind, "string", `${gate.id}: evidence`);
    assert.ok(Array.isArray(gate.restoreOutputs), `${gate.id}: outputs`);
    assert.ok(Number.isSafeInteger(gate.epoch) && gate.epoch > 0, `${gate.id}: epoch`);
    assert.equal(gate.paths, undefined, `${gate.id}: legacy paths alias is forbidden`);
    assert.equal(gate.installProfiles, undefined, `${gate.id}: legacy profiles alias is forbidden`);
  }
  assert.deepEqual(manifest.packageProfiles.site.inputs, [
    "site/package.json",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
  ]);
  assert.equal(manifest.globalInvalidators.includes("site/pnpm-lock.yaml"), false);
  assert.deepEqual(manifest.gates.find(({ id }) => id === "site").restoreOutputs, [
    { id: "site-dist", path: "site/dist", kind: "directory" },
  ]);
});

function contractPath(input) {
  return typeof input === "string" ? input : input.path;
}

function gateInputPatterns(gate) {
  return [
    ...manifest.globalInvalidators,
    ...gate.execution.entrypoints,
    ...gate.execution.helpers,
    ...gate.execution.workspaceInputs,
    ...gate.execution.packageProfiles.flatMap(
      (profile) => manifest.packageProfiles[profile].inputs,
    ),
  ].map(contractPath);
}

function staticRelativeImports(file) {
  const source = fs.readFileSync(path.join(repository, file), "utf8");
  const imports = [];
  const patterns = [
    /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1].startsWith(".")) imports.push(match[1]);
    }
  }
  return [...new Set(imports)].map((specifier) => {
    const resolved = path.resolve(repository, path.dirname(file), specifier);
    const relative = path.relative(repository, resolved).split(path.sep).join("/");
    if (relative.startsWith("../") || path.isAbsolute(relative)) {
      throw new Error(`${file} imports outside the repository: ${specifier}`);
    }
    for (const candidate of [relative, `${relative}.mjs`, `${relative}.js`]) {
      if (fs.existsSync(path.join(repository, candidate))) return candidate;
    }
    throw new Error(`${file} imports an absent repository module: ${specifier}`);
  });
}

test("all 15 task closures cover every reachable static repository import", () => {
  const trackedFiles = execute(
    "git",
    ["-c", "core.quotePath=false", "ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: repository },
  )
    .split("\n")
    .filter(Boolean);
  for (const gate of manifest.gates) {
    const patterns = gateInputPatterns(gate);
    const queue = trackedFiles.filter(
      (file) =>
        /\.(?:mjs|js)$/.test(file) &&
        [...gate.execution.entrypoints, ...gate.execution.helpers]
          .map(contractPath)
          .some((pattern) => taskGraphInternal.matches(file, pattern)),
    );
    const visited = new Set();
    const uncovered = [];
    while (queue.length > 0) {
      const importer = queue.shift();
      if (visited.has(importer)) continue;
      visited.add(importer);
      for (const imported of staticRelativeImports(importer)) {
        if (!patterns.some((pattern) => taskGraphInternal.matches(imported, pattern))) {
          uncovered.push(`${importer} -> ${imported}`);
        }
        if (/\.(?:mjs|js)$/.test(imported)) queue.push(imported);
      }
    }
    assert.deepEqual(uncovered, [], `${gate.id}: uncovered static imports`);
  }
});

test("dynamic and conditional validation inputs are explicitly bound", () => {
  const expected = {
    scripts: ["site/astro.config.mjs", "site/scripts/validate-seo.mjs"],
    "architecture-compass": ["scripts/validation/smoke-install-contract.mjs"],
    codegraph: ["scripts/validation/smoke-install-contract.mjs"],
    skillopt: ["scripts/validation/drawio-diagrams/validate-fixtures.mjs"],
    drawio: [
      "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
      "skills/engineering-workflows/drawio-diagrams/references/examples/architecture-icons.drawio",
      "skills/engineering-workflows/drawio-diagrams/references/examples/animation-static-dependency.drawio",
    ],
    "animated-logo": [
      "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
      "skills/engineering-workflows/drawio-diagrams/references/examples/architecture-icons.drawio",
      "skills/engineering-workflows/drawio-diagrams/references/examples/animation-static-dependency.drawio",
    ],
    format: [".editorconfig", ".vscode/settings.json", "skills.sh.json"],
  };
  for (const [gateId, requiredPaths] of Object.entries(expected)) {
    const gate = manifest.gates.find(({ id }) => id === gateId);
    const patterns = gateInputPatterns(gate);
    for (const requiredPath of requiredPaths) {
      assert.ok(
        patterns.some((pattern) => taskGraphInternal.matches(requiredPath, pattern)),
        `${gateId}: ${requiredPath} must contribute to the task key`,
      );
    }
  }
});

test("fixture-heavy gates bind generated interpreter launchers", () => {
  assert.deepEqual(manifest.gates.find(({ id }) => id === "drawio").execution.tools, [
    "env",
    "node",
    "npm",
    "python3",
    "sh",
  ]);
  assert.deepEqual(manifest.gates.find(({ id }) => id === "skillopt").execution.tools, [
    "env",
    "git",
    "node",
    "npm",
    "python3",
    "sh",
  ]);
});

test("affected planning derives ownership from execution helpers and workspace inputs", (t) => {
  const architecturePlan = runPlanner(t, [
    { status: "M", paths: ["scripts/validation/lib/process-group.mjs"] },
  ]);
  assert.ok(architecturePlan.selectedGates.includes("architecture-compass"));

  const logoPlan = runPlanner(t, [
    {
      status: "M",
      paths: [
        "skills/engineering-workflows/drawio-diagrams/references/examples/animation-static-dependency.drawio",
      ],
    },
  ]);
  assert.ok(logoPlan.selectedGates.includes("animated-logo"));
});

test("Markdown documentation changes select ADR link validation and formatting", (t) => {
  const plan = runPlanner(t, [{ status: "M", paths: ["docs/operator-guide.md"] }]);
  assert.equal(plan.scope, "affected");
  assert.deepEqual(plan.selectedGates, ["skills", "adrs", "format", "smoke-install"]);
});

test("ADR changes select ADR, Architecture Compass, and formatting owners", (t) => {
  const plan = runPlanner(t, [{ status: "M", paths: ["docs/adrs/0040-example.long.md"] }]);
  assert.equal(plan.scope, "affected");
  assert.deepEqual(plan.selectedGates, [
    "skills",
    "adrs",
    "architecture-compass",
    "format",
    "smoke-install",
  ]);
});

test("every stable gate has an owning path class", (t) => {
  const cases = [
    ["skills/repo-maintenance/example/SKILL.md", ["skills", "smoke-install"]],
    ["skill-evals/codex-memory-curator/example.md", ["memory-curators"]],
    ["docs/adrs/0040-example.long.md", ["adrs", "architecture-compass"]],
    ["scripts/lint-actions.mjs", ["actions"]],
    ["scripts/example.mjs", ["scripts", "script-lint"]],
    ["skill-evals/codegraph-ast-grep/example.md", ["codegraph"]],
    ["skill-evals/drawio-diagrams/example.md", ["drawio"]],
    ["skill-evals/animated-readme-logo/example.md", ["animated-logo"]],
    ["skill-evals/skillopt-setup/example.md", ["skillopt"]],
    ["docs/operator-guide.md", ["format"]],
    ["CHANGELOG.md", ["release-metadata"]],
    ["site/src/pages/index.astro", ["site"]],
  ];
  const covered = new Set();
  for (const [changedPath, expectedGates] of cases) {
    const plan = runPlanner(t, [{ status: "M", paths: [changedPath] }]);
    for (const gate of expectedGates) {
      assert.ok(plan.selectedGates.includes(gate), `${changedPath} must select ${gate}`);
      covered.add(gate);
    }
  }
  assert.deepEqual(
    [...covered].sort(),
    manifest.gates
      .map(({ id }) => id)
      .filter((id) => id !== "smoke-install" || covered.has(id))
      .sort(),
  );
});

test("renamed public skill changes retain all owning gates and prerequisites", (t) => {
  const plan = runPlanner(t, [
    {
      status: "R100",
      paths: ["skills/repo-maintenance/old/SKILL.md", "skills/repo-maintenance/new/SKILL.md"],
    },
  ]);
  assert.equal(plan.scope, "affected");
  for (const id of ["skills", "scripts", "site", "format", "release-metadata", "smoke-install"]) {
    assert.ok(plan.selectedGates.includes(id), `expected ${id}`);
  }
});

test("Draw.io skill changes select the transitive SkillOpt setup validator", (t) => {
  const plan = runPlanner(t, [
    { status: "M", paths: ["skills/engineering-workflows/drawio-diagrams/SKILL.md"] },
  ]);
  for (const id of ["skills", "drawio", "skillopt", "smoke-install"]) {
    assert.ok(plan.selectedGates.includes(id), `expected ${id}`);
  }
});

test("Architecture repo-only leakage evidence selects smoke install", (t) => {
  for (const changedPath of [
    "scripts/validation/architecture-compass/legacy-reference-source-lock.json",
    "scripts/validation/architecture-compass/legacy-reference-coverage.json",
    "scripts/validation/architecture-compass/decision-lineage.json",
    "skill-evals/architecture-compass/reference-baseline/example/evidence.json",
  ]) {
    const plan = runPlanner(t, [{ status: "M", paths: [changedPath] }]);
    assert.ok(plan.selectedGates.includes("smoke-install"), `${changedPath} must select smoke`);
    assert.ok(plan.selectedGates.includes("skills"), "smoke prerequisite must be selected");
  }
});

test("global and unclassified changes fail to full validation", (t) => {
  const globalPlan = runPlanner(t, [{ status: "M", paths: ["package.json"] }]);
  assert.equal(globalPlan.scope, "full");
  assert.equal(globalPlan.selectedGates.length, manifest.gates.length);

  const unknownPlan = runPlanner(t, [{ status: "A", paths: ["unknown.contract"] }]);
  assert.equal(unknownPlan.scope, "full");
  assert.match(unknownPlan.reason, /unclassified path/);
});

test("push and manual events always select full validation", (t) => {
  for (const event of ["push", "workflow_dispatch"]) {
    const plan = runPlanner(t, [{ status: "M", paths: ["docs/operator-guide.md"] }], event);
    assert.equal(plan.scope, "full");
    assert.equal(plan.selectedGates.length, manifest.gates.length);
  }
});

test("resolver forces full push and manual validation despite an affected candidate plan", (t) => {
  const root = temporaryRoot(t);
  initializeGitRepository(root);
  fs.writeFileSync(path.join(root, "README.md"), "candidate\n");
  const candidateSha = commit(root, "candidate");
  const maliciousPlanner = path.join(temporaryRoot(t), "affected-planner.cjs");
  fs.writeFileSync(
    maliciousPlanner,
    `const fs = require("node:fs");
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => index % 2 === 0 ? [...pairs, [value, values[index + 1]]] : pairs, []));
fs.writeFileSync(args["--output"], JSON.stringify({
  schemaVersion: 1,
  scope: "affected",
  reason: "attempt partial trusted validation",
  baseSha: args["--base-sha"],
  candidateSha: args["--candidate-sha"],
  changedPaths: [],
  selectedGates: ["adrs"],
  installProfiles: [],
  manifestDigest: ${JSON.stringify(digestJson(manifest))},
  basePlanDigest: null,
  candidatePlanDigest: null
}));\n`,
  );

  for (const event of ["push", "workflow_dispatch"]) {
    const plan = resolveValidationPlan({
      repository: root,
      manifest: manifestPath,
      planner: maliciousPlanner,
      event,
      baseSha: "",
      candidateSha,
      output: path.join(temporaryRoot(t), `${event}.json`),
    });
    assert.equal(plan.scope, "full");
    assert.deepEqual(
      plan.selectedGates,
      manifest.gates.map(({ id }) => id),
    );
    assert.match(plan.reason, new RegExp(`^${event} requires full validation$`));
    assert.match(plan.candidatePlanDigest, /^sha256:[a-f0-9]{64}$/);
  }
});

test("resolver executes and unions compatible base and candidate plans", (t) => {
  const root = temporaryRoot(t);
  initializeGitRepository(root);
  fs.mkdirSync(path.join(root, "scripts", "ci"), { recursive: true });
  fs.copyFileSync(planner, path.join(root, "scripts", "ci", "plan-validation.mjs"));
  fs.copyFileSync(manifestPath, path.join(root, "scripts", "ci", "validation-manifest.json"));
  fs.writeFileSync(path.join(root, "README.md"), "base\n");
  const baseSha = commit(root, "base planner");
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "operator-guide.md"), "candidate\n");
  const candidateSha = commit(root, "docs change");
  const output = path.join(temporaryRoot(t), "effective.json");

  const previousGitDir = process.env.GIT_DIR;
  process.env.GIT_DIR = path.join(root, "ambient-steering-must-not-apply");
  let plan;
  try {
    plan = resolveValidationPlan({
      repository: root,
      manifest: path.join(root, "scripts", "ci", "validation-manifest.json"),
      planner: path.join(root, "scripts", "ci", "plan-validation.mjs"),
      event: "pull_request",
      baseSha,
      candidateSha,
      output,
    });
  } finally {
    if (previousGitDir === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previousGitDir;
  }
  assert.equal(plan.scope, "affected");
  assert.deepEqual(plan.selectedGates, ["skills", "adrs", "format", "smoke-install"]);
  assert.match(plan.reason, /base\/candidate union/);
  assert.match(plan.basePlanDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(plan.candidatePlanDigest, /^sha256:[a-f0-9]{64}$/);
});

test("resolver unions distinct compatible base and candidate gate selections", (t) => {
  const root = temporaryRoot(t);
  initializeGitRepository(root);
  fs.mkdirSync(path.join(root, "scripts", "ci"), { recursive: true });
  fs.copyFileSync(manifestPath, path.join(root, "scripts", "ci", "validation-manifest.json"));
  const plannerRoot = temporaryRoot(t);
  const selectivePlanner = (gate, name) => {
    const file = path.join(plannerRoot, name);
    fs.writeFileSync(
      file,
      `import { spawnSync } from "node:child_process";
import fs from "node:fs";
const result = spawnSync(process.execPath, [${JSON.stringify(planner)}, ...process.argv.slice(2)], { encoding: "utf8" });
if (result.status !== 0) process.exit(result.status ?? 1);
const output = process.argv[process.argv.indexOf("--output") + 1];
const plan = JSON.parse(fs.readFileSync(output, "utf8"));
plan.scope = "affected";
plan.reason = ${JSON.stringify(`${gate} mapping`)};
plan.selectedGates = [${JSON.stringify(gate)}];
plan.installProfiles = ${JSON.stringify(gate === "format" ? ["root"] : [])};
fs.writeFileSync(output, JSON.stringify(plan));\n`,
    );
    return file;
  };
  fs.copyFileSync(
    selectivePlanner("adrs", "base-planner.mjs"),
    path.join(root, "scripts", "ci", "plan-validation.mjs"),
  );
  fs.writeFileSync(path.join(root, "README.md"), "base\n");
  const baseSha = commit(root, "base planner");
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "operator-guide.md"), "candidate\n");
  const candidateSha = commit(root, "docs change");

  const planResult = resolveValidationPlan({
    repository: root,
    manifest: path.join(root, "scripts", "ci", "validation-manifest.json"),
    planner: selectivePlanner("format", "candidate-planner.mjs"),
    event: "pull_request",
    baseSha,
    candidateSha,
    output: path.join(temporaryRoot(t), "effective.json"),
  });
  assert.equal(planResult.scope, "affected");
  assert.deepEqual(planResult.selectedGates, ["adrs", "format"]);
  assert.match(planResult.reason, /adrs mapping; format mapping/);
});

test("resolver rejects incompatible base and candidate manifests", (t) => {
  const root = temporaryRoot(t);
  initializeGitRepository(root);
  fs.mkdirSync(path.join(root, "scripts", "ci"), { recursive: true });
  fs.copyFileSync(planner, path.join(root, "scripts", "ci", "plan-validation.mjs"));
  fs.copyFileSync(manifestPath, path.join(root, "scripts", "ci", "validation-manifest.json"));
  fs.writeFileSync(path.join(root, "README.md"), "base\n");
  const baseSha = commit(root, "base planner");
  const candidateManifestPath = path.join(root, "scripts", "ci", "validation-manifest.json");
  const candidateManifest = JSON.parse(fs.readFileSync(candidateManifestPath, "utf8"));
  candidateManifest.gates[0].timeoutMs += 1;
  fs.writeFileSync(candidateManifestPath, `${JSON.stringify(candidateManifest)}\n`);
  const candidateSha = commit(root, "candidate manifest drift");

  const planResult = resolveValidationPlan({
    repository: root,
    manifest: candidateManifestPath,
    planner,
    event: "pull_request",
    baseSha,
    candidateSha,
    output: path.join(temporaryRoot(t), "effective.json"),
  });
  assert.equal(planResult.scope, "full");
  assert.match(planResult.reason, /base and candidate validation manifests are incompatible/);
});

test("resolver rejects planner changed paths that differ from the Git diff", (t) => {
  const root = temporaryRoot(t);
  initializeGitRepository(root);
  fs.mkdirSync(path.join(root, "scripts", "ci"), { recursive: true });
  fs.copyFileSync(planner, path.join(root, "scripts", "ci", "plan-validation.mjs"));
  fs.copyFileSync(manifestPath, path.join(root, "scripts", "ci", "validation-manifest.json"));
  fs.writeFileSync(path.join(root, "README.md"), "base\n");
  const baseSha = commit(root, "base planner");
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "operator-guide.md"), "candidate\n");
  const candidateSha = commit(root, "docs change");
  const mismatchedPlanner = path.join(temporaryRoot(t), "mismatched-planner.cjs");
  fs.writeFileSync(
    mismatchedPlanner,
    `const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const result = spawnSync(process.execPath, [${JSON.stringify(planner)}, ...process.argv.slice(2)], { encoding: "utf8" });
if (result.status !== 0) process.exit(result.status ?? 1);
const output = process.argv[process.argv.indexOf("--output") + 1];
const plan = JSON.parse(fs.readFileSync(output, "utf8"));
plan.changedPaths = ["README.md"];
fs.writeFileSync(output, JSON.stringify(plan));\n`,
  );

  const planResult = resolveValidationPlan({
    repository: root,
    manifest: manifestPath,
    planner: mismatchedPlanner,
    event: "pull_request",
    baseSha,
    candidateSha,
    output: path.join(temporaryRoot(t), "effective.json"),
  });
  assert.equal(planResult.scope, "full");
  assert.match(planResult.reason, /candidate planner reported changed paths/);
});

test("missing or malformed base and candidate planners force full validation", (t) => {
  const root = temporaryRoot(t);
  initializeGitRepository(root);
  fs.writeFileSync(path.join(root, "README.md"), "base\n");
  const baseSha = commit(root, "base without planner");
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "operator-guide.md"), "candidate\n");
  const candidateSha = commit(root, "docs change");
  const output = path.join(temporaryRoot(t), "effective.json");
  const plan = resolveValidationPlan({
    repository: root,
    manifest: manifestPath,
    planner,
    event: "pull_request",
    baseSha,
    candidateSha,
    output,
  });
  assert.equal(plan.scope, "full");
  assert.match(plan.reason, /base planner or manifest is absent/);

  const malformedPlanner = path.join(temporaryRoot(t), "malformed.mjs");
  fs.writeFileSync(malformedPlanner, "process.exit(2);\n");
  const malformedPlan = resolveValidationPlan({
    repository: root,
    manifest: manifestPath,
    planner: malformedPlanner,
    event: "pull_request",
    baseSha,
    candidateSha,
    output: path.join(temporaryRoot(t), "malformed-effective.json"),
  });
  assert.equal(malformedPlan.scope, "full");
  assert.match(malformedPlan.reason, /candidate planner failed/);
});

test("hanging candidate planner times out into a deterministic full fallback", (t) => {
  const root = temporaryRoot(t);
  initializeGitRepository(root);
  fs.writeFileSync(path.join(root, "README.md"), "base\n");
  const baseSha = commit(root, "base without planner");
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "operator-guide.md"), "candidate\n");
  const candidateSha = commit(root, "candidate");
  const hangingPlanner = path.join(temporaryRoot(t), "hanging-planner.cjs");
  fs.writeFileSync(hangingPlanner, "setInterval(() => {}, 1000);\n");

  const plan = resolveValidationPlan({
    repository: root,
    manifest: manifestPath,
    planner: hangingPlanner,
    plannerTimeoutMs: 75,
    event: "pull_request",
    baseSha,
    candidateSha,
    output: path.join(temporaryRoot(t), "effective.json"),
  });
  assert.equal(plan.scope, "full");
  assert.match(plan.reason, /candidate planner failed: planner timed out after 75ms/);
  assert.match(plan.candidatePlanDigest, /^sha256:[a-f0-9]{64}$/);
});

test("missing planner output produces stable fallback bytes and digest", (t) => {
  const root = temporaryRoot(t);
  initializeGitRepository(root);
  fs.writeFileSync(path.join(root, "README.md"), "base\n");
  const baseSha = commit(root, "base without planner");
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "operator-guide.md"), "candidate\n");
  const candidateSha = commit(root, "candidate");
  const noOutputPlanner = path.join(temporaryRoot(t), "no-output.cjs");
  fs.writeFileSync(noOutputPlanner, "process.exit(0);\n");
  const outputs = [
    path.join(temporaryRoot(t), "first.json"),
    path.join(temporaryRoot(t), "second.json"),
  ];
  const plans = outputs.map((output) =>
    resolveValidationPlan({
      repository: root,
      manifest: manifestPath,
      planner: noOutputPlanner,
      event: "pull_request",
      baseSha,
      candidateSha,
      output,
    }),
  );
  assert.deepEqual(plans[0], plans[1]);
  assert.equal(fs.readFileSync(outputs[0], "utf8"), fs.readFileSync(outputs[1], "utf8"));
  assert.equal(planDigest(plans[0]), planDigest(plans[1]));
  assert.match(plans[0].reason, /planner did not write output/);
  assert.doesNotMatch(plans[0].reason, /affected-validation-plan-/);
});

test("malformed JSON, unknown gates, and planner schema mismatch all force full", (t) => {
  const root = temporaryRoot(t);
  initializeGitRepository(root);
  fs.writeFileSync(path.join(root, "README.md"), "base\n");
  const baseSha = commit(root, "base without planner");
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "operator-guide.md"), "candidate\n");
  const candidateSha = commit(root, "candidate");
  const plannerRoot = temporaryRoot(t);
  const planners = [
    {
      name: "malformed-json",
      source:
        "const fs=require('node:fs'); const out=process.argv[process.argv.indexOf('--output')+1]; fs.writeFileSync(out, '{broken');\n",
      expected: /candidate planner failed/,
    },
    {
      name: "unknown-gate",
      source:
        "const fs=require('node:fs'); const a=Object.fromEntries(process.argv.slice(2).reduce((x,v,i,s)=>i%2===0?[...x,[v,s[i+1]]]:x,[])); fs.writeFileSync(a['--output'], JSON.stringify({schemaVersion:1,scope:'affected',reason:'bad gate',baseSha:a['--base-sha'],candidateSha:a['--candidate-sha'],changedPaths:['docs/operator-guide.md'],selectedGates:['unknown'],installProfiles:[],manifestDigest:'sha256:bad',basePlanDigest:null,candidatePlanDigest:null}));\n",
      expected: /unknown gate/,
    },
    {
      name: "schema-mismatch",
      source:
        "const fs=require('node:fs'); const out=process.argv[process.argv.indexOf('--output')+1]; fs.writeFileSync(out, JSON.stringify({schemaVersion:2}));\n",
      expected: /unsupported schema 2/,
    },
  ];
  for (const plannerCase of planners) {
    const customPlanner = path.join(plannerRoot, `${plannerCase.name}.cjs`);
    fs.writeFileSync(customPlanner, plannerCase.source);
    const plan = resolveValidationPlan({
      repository: root,
      manifest: manifestPath,
      planner: customPlanner,
      event: "pull_request",
      baseSha,
      candidateSha,
      output: path.join(plannerRoot, `${plannerCase.name}.json`),
    });
    assert.equal(plan.scope, "full");
    assert.match(plan.reason, plannerCase.expected);
  }
});

test("plan validation rejects unknown gates and schema drift", () => {
  const base = {
    schemaVersion: 1,
    scope: "affected",
    reason: "test",
    baseSha: "base",
    candidateSha: "candidate",
    changedPaths: ["docs/a.md"],
    selectedGates: ["unknown"],
    installProfiles: [],
    manifestDigest: "sha256:test",
    basePlanDigest: null,
    candidatePlanDigest: null,
  };
  assert.throws(() => validatePlan(base, manifest), /unknown gate/);
  assert.throws(() => validatePlan({ ...base, schemaVersion: 2 }, manifest), /unsupported schema/);

  const smokeOnly = {
    ...base,
    manifestDigest: digestJson(manifest),
    selectedGates: ["smoke-install"],
    installProfiles: ["root"],
  };
  assert.throws(() => validatePlan(smokeOnly, manifest), /missing prerequisite skills/);
});

test("canonical digest is stable across object key insertion order", () => {
  assert.equal(
    digestJson({ second: 2, first: { beta: true, alpha: false } }),
    digestJson({ first: { alpha: false, beta: true }, second: 2 }),
  );
});
