#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const scriptPath = fileURLToPath(import.meta.url);
const skillRoot = path.resolve(path.dirname(scriptPath), "..");
const assetRoot = path.join(skillRoot, "assets/agent-skills-benchmark");
const allowedModes = new Set(["native-provider", "hybrid-codex-target", "codex-cli-all"]);
const runProfiles = new Set(["official-parity", "exploratory"]);

function defaultRunProfile(mode) {
  return mode === "codex-cli-all" ? "exploratory" : "official-parity";
}

function defaultRunName() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  return `run-${stamp}`;
}

function parseArgs(argv) {
  const args = {
    skillopt: ".agents/tools/SkillOpt",
    mode: "hybrid-codex-target",
    runName: defaultRunName(),
    runProfile: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg === "--json") args.json = true;
    else if (arg === "--skillopt") args.skillopt = argv[++i];
    else if (arg === "--skill") args.skill = argv[++i];
    else if (arg === "--mode") args.mode = argv[++i];
    else if (arg === "--run-name") args.runName = argv[++i];
    else if (arg === "--run-profile") args.runProfile = argv[++i];
    else fail(`Unknown argument: ${arg}`);
  }
  if (!allowedModes.has(args.mode)) fail(`Unsupported mode: ${args.mode}`);
  args.runProfile ||= defaultRunProfile(args.mode);
  if (!runProfiles.has(args.runProfile)) fail(`Unsupported run profile: ${args.runProfile}`);
  if (args.mode === "codex-cli-all" && args.runProfile === "official-parity") {
    fail("codex-cli-all is exploratory only; choose --run-profile exploratory");
  }
  return args;
}

function printUsage() {
  console.log(`Usage: node prepare-local-skillopt-adapter.mjs --skill <skill> [options]

Options:
  --skillopt <path>
  --mode <native-provider|hybrid-codex-target|codex-cli-all>
  --run-profile <official-parity|exploratory>
  --run-name <name>
  --json
  --help`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", ".venv", "node_modules", "__pycache__"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, predicate));
    else if (predicate(full)) files.push(full);
  }
  return files;
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyText(src, dest, replacements = {}) {
  let text = fs.readFileSync(src, "utf8");
  for (const [from, to] of Object.entries(replacements)) {
    text = text.replaceAll(from, to);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text, "utf8");
}

function detectCodexExec(skillOptPath) {
  const files = walk(skillOptPath, (file) => /\.(py|ya?ml|md|toml|json)$/.test(file)).slice(
    0,
    3000,
  );
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    if (text.includes("codex_exec")) return path.relative(skillOptPath, file).replaceAll("\\", "/");
  }
  return null;
}

function writeWorkBaseConfig(skillOptPath, skill, installedFiles) {
  const dest = path.join(root, ".agents/skillopt-work", skill, "_base_/default.yaml");
  const source = path.join(skillOptPath, "configs/_base_/default.yaml");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
  } else {
    fs.writeFileSync(dest, "{}\n", "utf8");
  }
  installedFiles.push(path.relative(root, dest).replaceAll("\\", "/"));
  return {
    file: path.relative(root, dest).replaceAll("\\", "/"),
    source: fs.existsSync(source)
      ? path.relative(root, source).replaceAll("\\", "/")
      : "generated-empty-base",
  };
}

function patchRegistryFile(skillOptPath, relativeFile) {
  const file = path.join(skillOptPath, relativeFile);
  const display = relativeFile.replaceAll("\\", "/");
  if (!fs.existsSync(file)) return { file: display, status: "not_found" };

  const text = fs.readFileSync(file, "utf8");
  if (/_ENV_REGISTRY\[['"]agent_skills['"]\]/.test(text)) {
    return { file: display, status: "already_patched" };
  }

  const patch = [
    "    try:",
    "        from skillopt.envs.agent_skills.adapter import AgentSkillsAdapter",
    '        _ENV_REGISTRY["agent_skills"] = AgentSkillsAdapter',
    "    except ImportError:",
    "        pass",
    "",
  ].join("\n");

  const anchor = /\n\n(def get_adapter\(cfg(?:: dict)?\):)/;
  if (!text.includes("def _register_builtins()") || !anchor.test(text)) {
    return { file: display, status: "unknown_shape", action: "manual_registry_review_required" };
  }

  const updated = text.replace(anchor, `\n${patch}\n$1`);
  fs.writeFileSync(file, updated, "utf8");
  return { file: display, status: "patched", action: "inserted_agent_skills_registry" };
}

function patchConfigEnvExpansion(skillOptPath) {
  const relativeFile = "skillopt/config.py";
  const file = path.join(skillOptPath, relativeFile);
  const display = relativeFile.replaceAll("\\", "/");
  if (!fs.existsSync(file)) return { file: display, status: "not_found" };

  const text = fs.readFileSync(file, "utf8");
  if (text.includes("_ENV_PLACEHOLDER_ALLOWLIST")) {
    return { file: display, status: "already_patched" };
  }
  if (!text.includes("_STRUCTURED_SECTIONS = frozenset({") || !text.includes("cfg = yaml.safe_load(f) or {}")) {
    return { file: display, status: "unknown_shape", action: "manual_config_review_required" };
  }

  const withAllowlist = text.replace(
    /(_STRUCTURED_SECTIONS = frozenset\(\{\n[\s\S]*?\n\}\)\n)/,
    `$1
_ENV_PLACEHOLDER_ALLOWLIST = frozenset({
    "SKILLOPT_OPTIMIZER_MODEL",
    "SKILLOPT_TARGET_MODEL",
    "SKILLOPT_JUDGE_MODEL",
    "SKILLOPT_REFLECTION_MODEL",
})
`,
  );
  if (withAllowlist === text) {
    return { file: display, status: "unknown_shape", action: "manual_config_review_required" };
  }

  const helper = `
def _expand_safe_env_placeholders(value: Any) -> Any:
    """Expand allowlisted \${ENV} strings without materializing secrets."""
    if isinstance(value, dict):
        return {key: _expand_safe_env_placeholders(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_expand_safe_env_placeholders(item) for item in value]
    if isinstance(value, str) and value.startswith("\${") and value.endswith("}"):
        env_name = value[2:-1]
        if env_name in _ENV_PLACEHOLDER_ALLOWLIST and os.environ.get(env_name):
            return os.environ[env_name]
    return value

`;

  const withHelper = withAllowlist.replace(
    /\n\n# ── YAML loading with _base_ inheritance/,
    `\n\n${helper}# ── YAML loading with _base_ inheritance`,
  );
  const updated = withHelper.replace(
    "    with open(abs_path) as f:\n        cfg = yaml.safe_load(f) or {}\n",
    "    with open(abs_path) as f:\n        cfg = yaml.safe_load(f) or {}\n\n    cfg = _expand_safe_env_placeholders(cfg)\n",
  );

  fs.writeFileSync(file, updated, "utf8");
  return { file: display, status: "patched", action: "inserted_safe_model_env_expansion" };
}

function registryPatchStatus(skillOptPath) {
  const files = [
    ...["scripts/train.py", "scripts/eval_only.py"].map((file) =>
      patchRegistryFile(skillOptPath, file),
    ),
    patchConfigEnvExpansion(skillOptPath),
  ];
  const status = files.every((file) =>
    ["patched", "already_patched"].includes(file.status),
  )
    ? "ready"
    : "review_required";
  return { status, files };
}

function upstreamBehaviorBypassed(mode) {
  if (mode !== "codex-cli-all") return [];
  return [
    "provider-backed target rollout",
    "provider-backed semantic judging",
    "provider-backed reflection",
    "provider-backed patch aggregation",
    "provider-backed patch ranking",
    "provider-backed slow update (keep optimizer.use_slow_update disabled in codex-cli-all)",
    "provider-backed meta skill (keep optimizer.use_meta_skill disabled in codex-cli-all)",
  ];
}

function skillOptCommit(skillOptPath) {
  const commitFile = path.join(root, ".agents/tools/SkillOpt.commit");
  if (fs.existsSync(commitFile)) {
    const recorded = fs.readFileSync(commitFile, "utf8").trim();
    if (/^[a-f0-9]{40}$/i.test(recorded)) return recorded;
  }
  const head = path.join(skillOptPath, ".git/HEAD");
  if (!fs.existsSync(head)) return null;
  const value = fs.readFileSync(head, "utf8").trim();
  if (!value.startsWith("ref: ")) return value;
  const refFile = path.join(skillOptPath, ".git", value.slice(5));
  return fs.existsSync(refFile) ? fs.readFileSync(refFile, "utf8").trim() : value;
}

function extractYamlValue(text, key) {
  const matches = [...text.matchAll(new RegExp(`^[ \\t]+${key}:[ \\t]*(.*?)[ \\t]*$`, "gm"))];
  return matches.at(-1)?.[1]?.trim().replace(/^["']|["']$/g, "") || "";
}

function modelPins(mode) {
  const text = fs.readFileSync(path.join(assetRoot, `config.${mode}.yaml`), "utf8");
  return {
    optimizer: extractYamlValue(text, "optimizer"),
    target: extractYamlValue(text, "target"),
    judge: extractYamlValue(text, "codex_cli_judge_model"),
    reflection: extractYamlValue(text, "codex_cli_reflection_model"),
  };
}

function officialParityStatus(mode, runProfile) {
  if (mode === "codex-cli-all") return "exploratory";
  return runProfile === "official-parity" ? "setup_generated" : "exploratory";
}

function officialParityGaps(mode, runProfile) {
  const gaps = [];
  if (mode === "codex-cli-all") {
    gaps.push("codex-cli-all is provider-free exploratory mode, not upstream-native optimizer parity");
  }
  if (runProfile !== "official-parity") {
    gaps.push("run profile is exploratory");
  }
  if (mode === "hybrid-codex-target") {
    gaps.push("target rollouts use Codex CLI instead of provider-backed direct chat");
    gaps.push("hybrid profile scales batch size/workers down for local Codex execution");
  }
  return gaps;
}

const args = parseArgs(process.argv.slice(2));
const skillOptPath = path.resolve(root, args.skillopt);
if (!fs.existsSync(skillOptPath)) {
  fail(`SkillOpt path does not exist: ${path.relative(root, skillOptPath)}`);
}

const envDir = path.join(skillOptPath, "skillopt/envs/agent_skills");
const promptDir = path.join(envDir, "prompts");
const configDir = path.join(skillOptPath, "configs/agent_skills");
const installedFiles = [];

for (const template of [
  "adapter.py.template",
  "dataloader.py.template",
  "rollout.py.template",
  "evaluator.py.template",
  "codex_cli_reflector.py.template",
]) {
  const dest = path.join(envDir, template.replace(/\.template$/, ""));
  copyFile(path.join(assetRoot, template), dest);
  installedFiles.push(path.relative(root, dest).replaceAll("\\", "/"));
}

const initPath = path.join(envDir, "__init__.py");
fs.mkdirSync(path.dirname(initPath), { recursive: true });
fs.writeFileSync(initPath, "from .adapter import AgentSkillsAdapter\n", "utf8");
installedFiles.push(path.relative(root, initPath).replaceAll("\\", "/"));

for (const prompt of walk(path.join(assetRoot, "prompts"), (file) => file.endsWith(".md"))) {
  const dest = path.join(promptDir, path.basename(prompt));
  copyFile(prompt, dest);
  installedFiles.push(path.relative(root, dest).replaceAll("\\", "/"));
}

for (const config of ["native-provider", "hybrid-codex-target", "codex-cli-all"]) {
  const src = path.join(assetRoot, `config.${config}.yaml`);
  const dest = path.join(configDir, `${config}.yaml`);
  copyFile(src, dest);
  installedFiles.push(path.relative(root, dest).replaceAll("\\", "/"));
}

let workBaseConfig = null;
if (args.skill) {
  workBaseConfig = writeWorkBaseConfig(skillOptPath, args.skill, installedFiles);
  const workConfigDir = path.join(root, ".agents/skillopt-work", args.skill, "configs");
  for (const config of ["native-provider", "hybrid-codex-target", "codex-cli-all"]) {
    const src = path.join(assetRoot, `config.${config}.yaml`);
    const dest = path.join(workConfigDir, `agent-skills.${config}.yaml`);
    copyText(src, dest, {
      "<skill>": args.skill,
      "<run-name>": args.runName,
      "<run-profile>": config === "codex-cli-all" ? "exploratory" : args.runProfile,
    });
    installedFiles.push(path.relative(root, dest).replaceAll("\\", "/"));
  }
}

const targetManifestPath = args.skill
  ? path.join(root, ".agents/skillopt-work", args.skill, "adapter-manifest.json")
  : null;
const legacyManifestPath = path.join(root, ".agents/skillopt-work/adapter-manifest.json");
const codexExecSupport = detectCodexExec(skillOptPath);
const registryPatch = registryPatchStatus(skillOptPath);
const manifest = {
  created_at: new Date().toISOString(),
  skillopt_path: path.relative(root, skillOptPath).replaceAll("\\", "/"),
  skillopt_commit: skillOptCommit(skillOptPath),
  skilloptCommit: skillOptCommit(skillOptPath),
  selected_mode: args.mode,
  mode: args.mode,
  run_profile: args.runProfile,
  runProfile: args.runProfile,
  models: modelPins(args.mode),
  proof_target: args.skill || null,
  proofTarget: args.skill || null,
  dataset_thresholds: {
    exploratory_minimum: { positive: 10, val: 3, test: 3 },
    official_recommended: { positive: 20, val: 5, test: 5 },
  },
  datasetThresholds: {
    exploratoryMinimum: { positive: 10, val: 3, test: 3 },
    officialRecommended: { positive: 20, val: 5, test: 5 },
  },
  official_parity_status: officialParityStatus(args.mode, args.runProfile),
  officialParityStatus: officialParityStatus(args.mode, args.runProfile),
  official_parity_gaps: officialParityGaps(args.mode, args.runProfile),
  officialParityGaps: officialParityGaps(args.mode, args.runProfile),
  upstream_behavior_bypassed: upstreamBehaviorBypassed(args.mode),
  upstreamBehaviorBypassed: upstreamBehaviorBypassed(args.mode),
  target_skill: args.skill || null,
  codex_exec_support: codexExecSupport
    ? { detected: true, evidence_file: codexExecSupport }
    : { detected: false, evidence_file: null },
  registry_patch: registryPatch,
  local_patches: registryPatch.files.filter((file) => file.status === "patched"),
  localPatches: registryPatch.files.filter((file) => file.status === "patched"),
  registry_patch_scope: "ignored local SkillOpt clone only",
  work_base_config: args.skill ? workBaseConfig : null,
  installed_files: installedFiles,
  notes: [
    "Templates were copied into the ignored local SkillOpt clone.",
    "Generated work configs include a matching _base_/default.yaml under the target work directory.",
    "Codex CLI mode configs use judge_backend: codex_cli so semantic judging runs through local Codex login.",
    "codex-cli-all is exploratory because reflection, aggregation, and ranking are adapter-managed rather than upstream-native optimizer calls.",
    "codex-cli-all keeps slow update and meta skill disabled because those upstream epoch-boundary mechanisms call provider-backed chat_optimizer.",
    "If registry_patch reports manual review, inspect local SkillOpt entrypoints before training.",
  ],
};

if (targetManifestPath) {
  fs.mkdirSync(path.dirname(targetManifestPath), { recursive: true });
  fs.writeFileSync(targetManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  installedFiles.push(path.relative(root, targetManifestPath).replaceAll("\\", "/"));
}
fs.mkdirSync(path.dirname(legacyManifestPath), { recursive: true });
fs.writeFileSync(legacyManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
installedFiles.push(path.relative(root, legacyManifestPath).replaceAll("\\", "/"));

if (args.json) {
  console.log(JSON.stringify(manifest, null, 2));
} else {
  console.log(
    `Prepared local SkillOpt adapter at ${path.relative(root, envDir).replaceAll("\\", "/")}`,
  );
  console.log(
    `Manifest: ${path.relative(root, targetManifestPath || legacyManifestPath).replaceAll("\\", "/")}`,
  );
  console.log(`Run profile: ${args.runProfile}`);
  console.log(`Official-parity status: ${manifest.official_parity_status}`);
  console.log(`codex_exec support: ${codexExecSupport ? "detected" : "not detected"}`);
}
