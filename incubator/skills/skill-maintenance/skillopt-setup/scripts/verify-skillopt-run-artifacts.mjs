#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_REQUIRED = ["config.json", "history.json", "runtime_state.json", "best_skill.md"];

function parseArgs(argv) {
  const args = { json: false, terminal: false, webuiCheck: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg === "--json") args.json = true;
    else if (arg === "--terminal" || arg === "--compact") args.terminal = true;
    else if (arg === "--webui-check") args.webuiCheck = true;
    else if (arg === "--skill") args.skill = argv[++i];
    else if (arg === "--run") args.run = argv[++i];
    else fail(`Unknown argument: ${arg}`);
  }
  if (!args.skill) fail("--skill is required");
  if (!args.run) fail("--run is required");
  return args;
}

function printUsage() {
  console.log(`Usage: node verify-skillopt-run-artifacts.mjs --skill <skill> --run <run-dir> [options]

Options:
  --terminal
  --compact
  --webui-check
  --json
  --help`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readText(file, fallback = "") {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : fallback;
}

function relative(root, file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function extractConfigValue(text, key) {
  const matches = [...String(text || "").matchAll(new RegExp(`^[ \\t]*${key}:[ \\t]*(.*?)[ \\t]*$`, "gm"))];
  return matches.at(-1)?.[1]?.trim().replace(/^["']|["']$/g, "") || "";
}

function boolConfig(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function configYamlPath(root, skill, configJson) {
  if (configJson?.config_path) {
    const direct = path.resolve(root, configJson.config_path);
    if (fs.existsSync(direct)) return direct;
  }
  const workDir = path.join(root, ".agents/skillopt-work", skill, "configs");
  return [
    "agent-skills.hybrid-codex-target.yaml",
    "agent-skills.native-provider.yaml",
    "agent-skills.codex-cli-all.yaml",
  ]
    .map((file) => path.join(workDir, file))
    .find((file) => fs.existsSync(file));
}

function artifact(root, runDir, name, required = true, note = "") {
  const file = path.join(runDir, name);
  return {
    name,
    path: relative(root, file),
    exists: fs.existsSync(file),
    required,
    note,
  };
}

function directoryArtifact(root, runDir, name, required, note) {
  const file = path.join(runDir, name);
  return {
    name: `${name}/`,
    path: relative(root, file),
    exists: fs.existsSync(file) && fs.statSync(file).isDirectory(),
    required,
    note,
  };
}

function webuiStatus(root, shouldCheck) {
  if (!shouldCheck) return { status: "not_checked", detail: "run with --webui-check to verify importability" };
  const skillOptPath = path.join(root, ".agents/tools/SkillOpt");
  const python = process.platform === "win32"
    ? path.join(skillOptPath, ".venv", "Scripts", "python.exe")
    : path.join(skillOptPath, ".venv", "bin", "python");
  if (!fs.existsSync(python)) return { status: "blocked", detail: "SkillOpt virtualenv is missing" };
  const result = spawnSync(
    python,
    [
      "-c",
      "import importlib.util; raise SystemExit(0 if importlib.util.find_spec('skillopt_webui') else 1)",
    ],
    { cwd: skillOptPath, encoding: "utf8", timeout: 30000 },
  );
  return result.status === 0
    ? { status: "available", detail: "skillopt_webui importable" }
    : { status: "not_installed", detail: "optional webui extra is not importable" };
}

export function verifyRunArtifacts({ root = process.cwd(), skill, run, webuiCheck = false }) {
  const runDir = path.resolve(root, run);
  const configJson = readJson(path.join(runDir, "config.json"), null);
  const configPath = configYamlPath(root, skill, configJson);
  const configYaml = configPath ? readText(configPath) : "";
  const useSlowUpdate = boolConfig(
    configJson?.use_slow_update ?? extractConfigValue(configYaml, "use_slow_update"),
  );
  const useMetaSkill = boolConfig(
    configJson?.use_meta_skill ?? extractConfigValue(configYaml, "use_meta_skill"),
  );

  const artifacts = DEFAULT_REQUIRED.map((name) => artifact(root, runDir, name, true));
  artifacts.push(directoryArtifact(root, runDir, "steps", true, "per-step SkillOpt artifacts"));
  artifacts.push(directoryArtifact(root, runDir, "skills", true, "skill snapshots"));
  artifacts.push(artifact(root, runDir, "training.log", false, "terminal tee log"));
  artifacts.push(artifact(root, runDir, "eval-only.log", false, "eval-only proof log"));
  artifacts.push(
    directoryArtifact(
      root,
      runDir,
      "slow_update",
      useSlowUpdate,
      useSlowUpdate ? "required because use_slow_update is enabled" : "not enabled",
    ),
  );
  artifacts.push(
    directoryArtifact(
      root,
      runDir,
      "meta_skill",
      useMetaSkill,
      useMetaSkill ? "required because use_meta_skill is enabled" : "not enabled",
    ),
  );

  const blockers = [];
  const warnings = [];
  if (!fs.existsSync(runDir)) blockers.push(`run directory missing: ${relative(root, runDir)}`);
  for (const item of artifacts) {
    if (item.required && !item.exists) blockers.push(`missing ${item.name}`);
    else if (!item.required && !item.exists) warnings.push(`optional ${item.name} not present`);
  }
  if (!configPath) warnings.push("config YAML path could not be resolved");

  const evalOnlyStatus = fs.existsSync(path.join(runDir, "eval-only.log")) ? "present" : "not_run";
  const proofStatus = blockers.length ? "blocked" : warnings.length ? "partial" : "passed";
  const webui = webuiStatus(root, webuiCheck);
  return {
    ok: blockers.length === 0,
    proofStatus,
    proof_status: proofStatus,
    proofBlockers: blockers,
    proof_blockers: blockers,
    warnings,
    skill,
    run: relative(root, runDir),
    config: configPath ? relative(root, configPath) : null,
    artifactChecklist: artifacts,
    artifact_checklist: artifacts,
    evalOnlyStatus,
    eval_only_status: evalOnlyStatus,
    webuiStatus: webui,
    webui_status: webui,
  };
}

export function formatTerminalReport(result) {
  const lines = [
    `SkillOpt artifact verification: ${result.skill}`,
    `Run: ${result.run}`,
    `Proof status: ${result.proofStatus}`,
  ];
  if (result.proofBlockers.length) lines.push(`Proof blockers: ${result.proofBlockers.join("; ")}`);
  if (result.warnings.length) lines.push(`Warnings: ${result.warnings.join("; ")}`);
  lines.push(
    `Artifacts: ${result.artifactChecklist
      .map((item) => `${item.name}=${item.exists ? "present" : "missing"}`)
      .join(", ")}`,
  );
  lines.push(`Eval-only status: ${result.evalOnlyStatus}`);
  lines.push(`WebUI status: ${result.webuiStatus.status} (${result.webuiStatus.detail})`);
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = verifyRunArtifacts({
    skill: args.skill,
    run: args.run,
    webuiCheck: args.webuiCheck,
  });
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else console.log(formatTerminalReport(result));
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
