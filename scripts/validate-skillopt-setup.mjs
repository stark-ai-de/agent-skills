import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillRoot = path.join(root, "incubator/skills/skill-maintenance/skillopt-setup");
const assetRoot = path.join(skillRoot, "assets/agent-skills-benchmark");

const helperScripts = [
  "apply-skillopt-best.mjs",
  "check-skillopt-readiness.mjs",
  "prepare-local-skillopt-adapter.mjs",
  "prepare-skillopt-split.mjs",
  "probe-codex-cli.mjs",
  "setup-skillopt-local.mjs",
  "summarize-skillopt-run.mjs",
  "verify-skillopt-run-artifacts.mjs",
];

const pythonTemplates = [
  "adapter.py.template",
  "codex_cli_reflector.py.template",
  "dataloader.py.template",
  "evaluator.py.template",
  "rollout.py.template",
];
const minDeterministicCases = 20;

function fail(message) {
  throw new Error(message);
}

function assertFile(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail(`Missing file: ${path.relative(root, file)}`);
  }
}

function run(name, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
    ...options,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) {
    fail(`${name}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${name}: expected exit 0, got ${result.status}\n${output}`);
  }
  return output;
}

function assertIncludes(name, text, needle) {
  if (!text.includes(needle)) {
    fail(`${name}: expected output/content to include ${JSON.stringify(needle)}`);
  }
}

function assertNotIncludes(name, text, needle) {
  if (text.includes(needle)) {
    fail(`${name}: unexpected content ${JSON.stringify(needle)}`);
  }
}

function validateHelp() {
  for (const scriptName of helperScripts) {
    const script = path.join(skillRoot, "scripts", scriptName);
    assertFile(script);
    const output = run(`${scriptName} --help`, "node", [script, "--help"]);
    assertIncludes(`${scriptName} --help`, output, "Usage:");
    assertIncludes(`${scriptName} --help`, output, scriptName);
  }
}

function validatePythonTemplates() {
  const files = pythonTemplates.map((name) => path.join(assetRoot, name));
  for (const file of files) assertFile(file);
  const probe = spawnSync("python3", ["--version"], {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
  });
  if (probe.error || probe.status !== 0) {
    console.warn("python3 unavailable; skipping SkillOpt Python template parse check");
    return;
  }

  run("SkillOpt Python template parse", "python3", [
    "-c",
    "import ast, pathlib, sys\nfor p in sys.argv[1:]:\n    ast.parse(pathlib.Path(p).read_text(encoding='utf-8'), filename=p)\n",
    ...files,
  ]);
}

function validateConfigContracts() {
  const codexAll = fs.readFileSync(path.join(assetRoot, "config.codex-cli-all.yaml"), "utf8");
  const hybrid = fs.readFileSync(path.join(assetRoot, "config.hybrid-codex-target.yaml"), "utf8");
  const nativeProvider = fs.readFileSync(
    path.join(assetRoot, "config.native-provider.yaml"),
    "utf8",
  );

  assertIncludes("codex-cli-all config", codexAll, "run_profile: exploratory");
  assertIncludes("codex-cli-all config", codexAll, "reflection_backend: codex_cli");
  assertIncludes("codex-cli-all config", codexAll, "judge_backend: codex_cli");
  assertIncludes("codex-cli-all config", codexAll, "target_backend: codex_exec");
  assertIncludes("codex-cli-all config", codexAll, "use_slow_update: false");
  assertIncludes("codex-cli-all config", codexAll, "use_meta_skill: false");
  assertIncludes("codex-cli-all config", codexAll, "codex_exec_approval_policy: never");

  assertIncludes("hybrid config", hybrid, "run_profile: <run-profile>");
  assertIncludes("hybrid config", hybrid, "optimizer_backend: openai_chat");
  assertIncludes("hybrid config", hybrid, "target_backend: codex_exec");
  assertIncludes("hybrid config", hybrid, "use_slow_update: true");
  assertIncludes("hybrid config", hybrid, "use_meta_skill: true");
  assertIncludes("hybrid config", hybrid, "codex_exec_approval_policy: never");

  assertIncludes("native-provider config", nativeProvider, "optimizer_backend: openai_chat");
  assertIncludes("native-provider config", nativeProvider, "target_backend: openai_chat");
  assertIncludes("native-provider config", nativeProvider, "use_slow_update: true");
  assertIncludes("native-provider config", nativeProvider, "use_meta_skill: true");
}

function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase(),
  );
  if (start === -1) return "";
  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line)) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function bullets(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

function shouldTrigger(text) {
  const value = section(text, "Should Trigger")
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[.]/g, "")
    .toLowerCase();
  return value !== "no" && value !== "false";
}

function validateBenchmarkAssertions() {
  const casesDir = path.join(root, "skill-evals/skillopt-setup/cases");
  assertFile(path.join(root, "skill-evals/skillopt-setup/rubric.md"));
  const cases = walk(casesDir).filter((file) => file.endsWith(".md"));
  let positiveCases = 0;
  let deterministicCases = 0;
  for (const file of cases) {
    const text = fs.readFileSync(file, "utf8");
    if (!shouldTrigger(text)) continue;
    positiveCases += 1;
    if (bullets(section(text, "Deterministic Assertions")).length > 0) {
      deterministicCases += 1;
    }
  }
  if (positiveCases < 20) {
    fail(`skillopt-setup benchmark has only ${positiveCases} positive cases; expected at least 20`);
  }
  if (deterministicCases < minDeterministicCases) {
    fail(
      `skillopt-setup benchmark has only ${deterministicCases} positive cases with deterministic assertions; expected at least ${minDeterministicCases}`,
    );
  }
}

function validateNoPrivatePayload() {
  const forbidden = ["sk-tek", "codex-oauth", "agent-system.svc", "/home/servrox", "refresh_token"];
  const roots = [skillRoot, path.join(root, "skill-evals/skillopt-setup")];
  const files = [];
  for (const dir of roots) {
    files.push(...walk(dir));
  }
  for (const file of files) {
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, "utf8");
    for (const needle of forbidden) {
      assertNotIncludes(rel, text, needle);
    }
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

validateHelp();
validatePythonTemplates();
validateConfigContracts();
validateBenchmarkAssertions();
validateNoPrivatePayload();

console.log("SkillOpt setup payload validated.");
