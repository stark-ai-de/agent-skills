#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const scriptPath = fileURLToPath(import.meta.url);
const skillRoot = path.resolve(path.dirname(scriptPath), "..");
const allowedModes = new Set(["native-provider", "hybrid-codex-target", "codex-cli-all"]);
const runProfiles = new Set(["official-parity", "exploratory"]);
const pythonManagers = new Set(["auto", "uv", "local"]);
const EXPLORATORY_MIN = { positive: 10, val: 3, test: 3 };
const OFFICIAL_RECOMMENDED = { positive: 20, val: 5, test: 5 };

function defaultRunProfile(mode) {
  return mode === "codex-cli-all" ? "exploratory" : "official-parity";
}

function parseArgs(argv) {
  const args = {
    mode: "hybrid-codex-target",
    json: false,
    setupOnly: false,
    codexProbe: false,
    python: "python3",
    pythonManager: "auto",
    runProfile: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--json") args.json = true;
    else if (arg === "--setup-only") args.setupOnly = true;
    else if (arg === "--codex-probe") args.codexProbe = true;
    else if (arg === "--no-codex-probe") args.codexProbe = false;
    else if (arg === "--skill") args.skill = argv[++i];
    else if (arg === "--mode") args.mode = argv[++i];
    else if (arg === "--python") args.python = argv[++i];
    else if (arg === "--python-manager") args.pythonManager = argv[++i];
    else if (arg === "--run-profile") args.runProfile = argv[++i];
    else fail(`Unknown argument: ${arg}`);
  }
  if (!allowedModes.has(args.mode)) fail(`Unsupported mode: ${args.mode}`);
  if (!pythonManagers.has(args.pythonManager))
    fail(`Unsupported python manager: ${args.pythonManager}`);
  args.runProfile ||= defaultRunProfile(args.mode);
  if (!runProfiles.has(args.runProfile)) fail(`Unsupported run profile: ${args.runProfile}`);
  return args;
}

function printHelp() {
  console.log(`Usage: node check-skillopt-readiness.mjs --skill <skill> [options]

Options:
  --mode <native-provider|hybrid-codex-target|codex-cli-all>
  --run-profile <official-parity|exploratory>
  --python-manager <auto|uv|local>
  --python <command>
  --setup-only
  --codex-probe
  --no-codex-probe
  --json
  --help`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function commandResult(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    timeout: options.timeout || 30000,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: redact((result.stderr || "").trim()),
  };
}

function commandExists(command) {
  if (process.platform === "win32") {
    return commandResult("where", [command]).ok;
  }
  return commandResult("sh", ["-lc", `command -v ${command}`]).ok;
}

function resolveUvCommand() {
  if (commandExists("uv")) return "uv";
  const home = process.env.HOME || process.env.USERPROFILE;
  const candidates = home
    ? [
        path.join(home, ".local", "bin", process.platform === "win32" ? "uv.exe" : "uv"),
        path.join(home, ".cargo", "bin", process.platform === "win32" ? "uv.exe" : "uv"),
      ]
    : [];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function redact(text) {
  return String(text)
    .replaceAll(path.resolve(process.env.HOME || root), "~")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[redacted-token]")
    .replace(
      /[A-Za-z0-9_./-]*(auth|token|credential)[A-Za-z0-9_./-]*/gi,
      "[redacted-auth-reference]",
    );
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    fields[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return fields;
}

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full, predicate));
    else if (predicate(full)) found.push(full);
  }
  return found;
}

function resolveSkill(skill) {
  if (!skill) return null;
  const direct = path.resolve(root, skill);
  if (fs.existsSync(direct) && path.basename(direct) === "SKILL.md") return direct;
  if (fs.existsSync(path.join(direct, "SKILL.md"))) return path.join(direct, "SKILL.md");

  const matches = walk(root, (file) => path.basename(file) === "SKILL.md").filter((file) => {
    const rel = path.relative(root, file).replaceAll("\\", "/");
    if (!rel.startsWith("skills/") && !rel.startsWith("incubator/skills/")) return false;
    return path.basename(path.dirname(file)) === skill;
  });
  return matches[0] || null;
}

function providerPresence() {
  const names = [
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_AUTH_MODE",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "QWEN_CHAT_BASE_URL",
    "QWEN_CHAT_MODEL",
    "SKILLOPT_OPTIMIZER_MODEL",
    "SKILLOPT_TARGET_MODEL",
    "SKILLOPT_JUDGE_MODEL",
  ];
  return Object.fromEntries(names.map((name) => [name, Boolean(process.env[name])]));
}

function countJsonArray(file) {
  if (!fs.existsSync(file)) return 0;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
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

function hasBullets(text, heading) {
  return bullets(section(text, heading)).length > 0;
}

function evalCaseCounts(evalDir) {
  const counts = {
    positive: 0,
    negative: 0,
    total: 0,
    positive_with_deterministic_assertions: 0,
    positive_with_fixtures: 0,
    positive_with_expected_artifacts: 0,
  };
  if (!evalDir || !fs.existsSync(evalDir)) return counts;
  for (const file of walk(path.join(evalDir, "cases"), (caseFile) => caseFile.endsWith(".md"))) {
    const text = fs.readFileSync(file, "utf8");
    counts.total += 1;
    if (/##\s+Should Trigger\s*\n\s*No\b/i.test(text)) {
      counts.negative += 1;
    } else {
      counts.positive += 1;
      if (hasBullets(text, "Deterministic Assertions")) {
        counts.positive_with_deterministic_assertions += 1;
      }
      if (hasBullets(text, "Fixture") || hasBullets(text, "Fixtures")) {
        counts.positive_with_fixtures += 1;
      }
      if (hasBullets(text, "Expected Artifact") || hasBullets(text, "Expected Artifacts")) {
        counts.positive_with_expected_artifacts += 1;
      }
    }
  }
  return counts;
}

function generatedSplitCounts(skillName) {
  if (!skillName) return { train: 0, val: 0, test: 0, activation_negative: 0 };
  const workDir = path.join(root, ".agents/skillopt-work", skillName);
  return {
    train: countJsonArray(path.join(workDir, "data/train/items.json")),
    val: countJsonArray(path.join(workDir, "data/val/items.json")),
    test: countJsonArray(path.join(workDir, "data/test/items.json")),
    activation_negative: countJsonArray(path.join(workDir, "activation/negative-cases.json")),
  };
}

function estimateSplitCounts(positive) {
  if (positive <= 0) return { train: 0, val: 0, test: 0 };
  if (positive === 1) return { train: 1, val: 0, test: 0 };
  if (positive === 2) return { train: 1, val: 1, test: 0 };
  let train = Math.round(positive * 0.6);
  let val = Math.round(positive * 0.2);
  let test = positive - train - val;
  const heldoutFloor =
    positive >= OFFICIAL_RECOMMENDED.positive
      ? OFFICIAL_RECOMMENDED.val
      : positive >= EXPLORATORY_MIN.positive
        ? EXPLORATORY_MIN.val
        : 1;
  val = Math.max(heldoutFloor, val);
  test = Math.max(heldoutFloor, test);
  if (val + test > positive - 1) {
    const availableHeldout = positive - 1;
    val = Math.floor(availableHeldout / 2);
    test = availableHeldout - val;
  }
  train = positive - val - test;
  return { train, val, test };
}

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function extractYamlValue(text, key) {
  const match = text.match(new RegExp(`^[ \\t]*${key}:[ \\t]*(.*?)[ \\t]*$`, "m"));
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") || "";
}

function extractYamlLeafValue(text, key) {
  const matches = [...text.matchAll(new RegExp(`^[ \\t]+${key}:[ \\t]*(.*?)[ \\t]*$`, "gm"))];
  const value = matches.at(-1)?.[1]?.trim().replace(/^["']|["']$/g, "");
  return value || "";
}

function configPathForMode(skillName, mode) {
  const workConfig = skillName
    ? path.join(root, ".agents/skillopt-work", skillName, "configs", `agent-skills.${mode}.yaml`)
    : null;
  if (workConfig && fs.existsSync(workConfig)) return workConfig;
  return path.join(skillRoot, "assets/agent-skills-benchmark", `config.${mode}.yaml`);
}

function pinState(value) {
  const clean = String(value || "").trim();
  const envMatch = clean.match(/^\$\{([A-Z0-9_]+)\}$/);
  if (!clean) return { value: "", status: "inherited_default" };
  if (envMatch) {
    return {
      value: clean,
      status: process.env[envMatch[1]] ? "env_present" : "env_missing",
      env: envMatch[1],
    };
  }
  return { value: clean, status: "pinned" };
}

function configProfile(skillName, mode) {
  const configPath = configPathForMode(skillName, mode);
  const text = readText(configPath);
  const values = {
    run_profile: extractYamlValue(text, "run_profile") || defaultRunProfile(mode),
    env_out_root: extractYamlValue(text, "out_root"),
    train_num_epochs: extractYamlValue(text, "num_epochs"),
    train_batch_size: extractYamlValue(text, "batch_size"),
    workers: extractYamlValue(text, "workers"),
    gradient_minibatch_size: extractYamlValue(text, "minibatch_size"),
    gradient_analyst_workers: extractYamlValue(text, "analyst_workers"),
    optimizer_learning_rate: extractYamlValue(text, "learning_rate"),
    optimizer_min_learning_rate: extractYamlValue(text, "min_learning_rate"),
    optimizer_lr_scheduler: extractYamlValue(text, "lr_scheduler"),
    optimizer_use_slow_update: extractYamlValue(text, "use_slow_update"),
    optimizer_use_meta_skill: extractYamlValue(text, "use_meta_skill"),
    evaluation_use_gate: extractYamlValue(text, "use_gate"),
    evaluation_eval_test: extractYamlValue(text, "eval_test"),
    target_backend: extractYamlValue(text, "target_backend"),
    optimizer_backend: extractYamlValue(text, "optimizer_backend"),
    judge_backend: extractYamlValue(text, "judge_backend"),
    scale_down_reason:
      mode === "hybrid-codex-target"
        ? "Hybrid Codex CLI target rollouts use smaller batch/workers than the upstream provider-backed default."
        : "",
  };
  if (values.run_profile === "<run-profile>") values.run_profile = defaultRunProfile(mode);
  const modelPins = {
    optimizer: pinState(extractYamlLeafValue(text, "optimizer")),
    target: pinState(extractYamlLeafValue(text, "target")),
    codex_cli_judge_model: pinState(extractYamlLeafValue(text, "codex_cli_judge_model")),
    codex_cli_reflection_model: pinState(extractYamlLeafValue(text, "codex_cli_reflection_model")),
  };
  return {
    path: path.relative(root, configPath).replaceAll("\\", "/"),
    values,
    modelPins,
  };
}

function parseYamlKeys(text) {
  const keys = [];
  const stack = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(\s*)([A-Za-z0-9_<>-]+):/);
    if (!match) continue;
    const indent = match[1].length;
    const key = match[2];
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();
    const parent = stack.at(-1)?.path;
    const current = parent ? `${parent}.${key}` : key;
    keys.push({ key, path: current, indent });
    stack.push({ indent, path: current });
  }
  return keys;
}

function parseCliOptions(helpText) {
  return new Set([...String(helpText || "").matchAll(/--([a-z0-9_]+)/g)].map((match) => match[1]));
}

function localPythonCommand(skillOptPath) {
  const venv = process.platform === "win32"
    ? path.join(skillOptPath, ".venv", "Scripts", "python.exe")
    : path.join(skillOptPath, ".venv", "bin", "python");
  if (fs.existsSync(venv)) return { command: venv, argsPrefix: [] };
  const uv = resolveUvCommand();
  if (uv) return { command: uv, argsPrefix: ["run", "python"] };
  return null;
}

function localHelpOptions(skillOptPath, script) {
  const python = localPythonCommand(skillOptPath);
  if (!python) return { ok: false, options: new Set(), error: "uv or SkillOpt virtualenv unavailable" };
  const result = commandResult(python.command, [...python.argsPrefix, script, "--help"], {
    cwd: skillOptPath,
    timeout: 60000,
  });
  if (!result.ok) {
    return { ok: false, options: new Set(), error: result.stderr || result.stdout || "help failed" };
  }
  return { ok: true, options: parseCliOptions(result.stdout || result.stderr), error: null };
}

function adapterConfigKeys(skillOptPath) {
  const candidates = [
    path.join(skillOptPath, "skillopt/envs/agent_skills/adapter.py"),
    path.join(skillRoot, "assets/agent-skills-benchmark/adapter.py.template"),
  ];
  const keys = new Set([
    "_base_",
    "env",
    "train",
    "gradient",
    "optimizer",
    "evaluation",
    "model",
    "name",
    "run_profile",
  ]);
  for (const file of candidates) {
    const text = readText(file);
    if (!text) continue;
    for (const match of text.matchAll(/^\s{8}([a-zA-Z_][a-zA-Z0-9_]*)[=,]/gm)) {
      keys.add(match[1]);
    }
    for (const match of text.matchAll(/"([a-zA-Z_][a-zA-Z0-9_]*)"/g)) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function structuredConfigPaths(skillOptPath) {
  const configPy = path.join(skillOptPath, "skillopt/config.py");
  const text = readText(configPy);
  return new Set([...text.matchAll(/"([a-z]+\.[a-zA-Z0-9_]+)"\s*:/g)].map((match) => match[1]));
}

function configSchemaCheck(skillName, mode) {
  const skillOptPath = path.join(root, ".agents/tools/SkillOpt");
  const configPath = configPathForMode(skillName, mode);
  const text = readText(configPath);
  if (!text) {
    return {
      status: "missing_config",
      configPath: path.relative(root, configPath).replaceAll("\\", "/"),
      unsupportedKeys: [],
      checkedAgainst: [],
    };
  }
  if (!fs.existsSync(skillOptPath)) {
    return {
      status: "unavailable",
      configPath: path.relative(root, configPath).replaceAll("\\", "/"),
      unsupportedKeys: [],
      checkedAgainst: ["tracked adapter template"],
      reason: "local SkillOpt clone is missing",
    };
  }

  const trainHelp = localHelpOptions(skillOptPath, "scripts/train.py");
  const evalHelp = localHelpOptions(skillOptPath, "scripts/eval_only.py");
  const supported = adapterConfigKeys(skillOptPath);
  const supportedPaths = structuredConfigPaths(skillOptPath);
  for (const option of trainHelp.options) supported.add(option);
  for (const option of evalHelp.options) supported.add(option);

  const leafKeys = parseYamlKeys(text).filter((entry) => {
    const prefix = `${entry.path}.`;
    return !parseYamlKeys(text).some((other) => other.path.startsWith(prefix));
  });
  const unsupportedKeys = leafKeys
    .map((entry) => ({ key: entry.key, path: entry.path }))
    .filter((entry) => !supported.has(entry.key) && !supportedPaths.has(entry.path));
  return {
    status: unsupportedKeys.length ? "review_required" : "passed",
    configPath: path.relative(root, configPath).replaceAll("\\", "/"),
    unsupportedKeys,
    checkedAgainst: [
      trainHelp.ok ? "local scripts/train.py --help" : `train help unavailable: ${trainHelp.error}`,
      evalHelp.ok ? "local scripts/eval_only.py --help" : `eval help unavailable: ${evalHelp.error}`,
      "agent_skills adapter constructor/template keys",
    ],
  };
}

function splitCountsFor(datasetCounts) {
  const generated = datasetCounts.generated;
  return generated.train + generated.val + generated.test ? generated : datasetCounts.estimated_split;
}

function benchmarkQuality(datasetCounts) {
  const split = splitCountsFor(datasetCounts);
  const officialFloorMet =
    datasetCounts.eval_positive >= OFFICIAL_RECOMMENDED.positive &&
    split.val >= OFFICIAL_RECOMMENDED.val &&
    split.test >= OFFICIAL_RECOMMENDED.test;
  const exploratoryFloorMet =
    datasetCounts.eval_positive >= EXPLORATORY_MIN.positive &&
    split.val >= EXPLORATORY_MIN.val &&
    split.test >= EXPLORATORY_MIN.test;
  const blockers = [];
  if (datasetCounts.eval_positive < OFFICIAL_RECOMMENDED.positive) {
    blockers.push(
      `needs ${OFFICIAL_RECOMMENDED.positive}+ positive cases; found ${datasetCounts.eval_positive}`,
    );
  }
  if (split.val < OFFICIAL_RECOMMENDED.val) {
    blockers.push(`needs ${OFFICIAL_RECOMMENDED.val}+ validation cases; found ${split.val}`);
  }
  if (split.test < OFFICIAL_RECOMMENDED.test) {
    blockers.push(`needs ${OFFICIAL_RECOMMENDED.test}+ test cases; found ${split.test}`);
  }
  return {
    classification: officialFloorMet
      ? "official-parity-candidate"
      : exploratoryFloorMet
        ? "exploratory-candidate"
        : "insufficient",
    officialFloorMet,
    exploratoryFloorMet,
    splitCounts: split,
    thresholds: {
      exploratoryMinimum: EXPLORATORY_MIN,
      officialRecommended: OFFICIAL_RECOMMENDED,
    },
    positiveWithDeterministicAssertions:
      datasetCounts.positive_with_deterministic_assertions || 0,
    positiveWithFixtures: datasetCounts.positive_with_fixtures || 0,
    positiveWithExpectedArtifacts: datasetCounts.positive_with_expected_artifacts || 0,
    blockers,
  };
}

function artifactExpectations(skillName, configInfo) {
  const outRoot =
    configInfo.values.env_out_root ||
    (skillName ? `.agents/skillopt-work/${skillName}/outputs/run-unknown` : "");
  return [
    "config.json",
    "history.json",
    "runtime_state.json",
    "best_skill.md",
    "steps/",
    "skills/",
    "training.log",
  ].map((name) => `${outRoot.replace(/\/$/, "")}/${name}`);
}

function skillOptCommit(skillOptPath, commitPath) {
  if (fs.existsSync(commitPath)) {
    const recorded = fs.readFileSync(commitPath, "utf8").trim();
    if (/^[a-f0-9]{40}$/i.test(recorded)) return recorded;
  }
  const head = path.join(skillOptPath, ".git/HEAD");
  if (!fs.existsSync(head)) return null;
  const value = fs.readFileSync(head, "utf8").trim();
  if (!value.startsWith("ref: ")) return value;
  const refFile = path.join(skillOptPath, ".git", value.slice(5));
  return fs.existsSync(refFile) ? fs.readFileSync(refFile, "utf8").trim() : value;
}

function upstreamBehaviorBypassed(mode) {
  if (mode !== "codex-cli-all") return [];
  return [
    "provider-backed target rollout",
    "provider-backed semantic judging",
    "provider-backed reflection",
    "provider-backed patch aggregation",
    "provider-backed patch ranking",
    "provider-backed slow update",
    "provider-backed meta skill",
  ];
}

function readAdapterManifest(skillName) {
  const targetPath = skillName
    ? path.join(root, ".agents/skillopt-work", skillName, "adapter-manifest.json")
    : null;
  const legacyPath = path.join(root, ".agents/skillopt-work/adapter-manifest.json");
  const manifestPath = targetPath && fs.existsSync(targetPath) ? targetPath : legacyPath;
  if (!fs.existsSync(manifestPath)) return { path: null, data: null, target_specific: false };
  try {
    return {
      path: path.relative(root, manifestPath).replaceAll("\\", "/"),
      data: JSON.parse(fs.readFileSync(manifestPath, "utf8")),
      target_specific: targetPath === manifestPath,
    };
  } catch {
    return {
      path: path.relative(root, manifestPath).replaceAll("\\", "/"),
      data: null,
      target_specific: targetPath === manifestPath,
    };
  }
}

function requiredModelPinNames(mode, configInfo) {
  if (mode === "native-provider") return ["optimizer", "target"];
  if (mode === "hybrid-codex-target") return ["optimizer", "target", "codex_cli_judge_model"];
  if (configInfo.values.judge_backend === "codex_cli") {
    return ["target", "codex_cli_judge_model", "codex_cli_reflection_model"];
  }
  return [];
}

function officialParityReport(args, providerOk, datasetCounts, configInfo, quality, schemaCheck) {
  const gaps = [];
  const proofBlockers = [];
  const bypassed = upstreamBehaviorBypassed(args.mode);
  const effectiveProfile = args.mode === "codex-cli-all" ? "exploratory" : args.runProfile;
  const split = quality.splitCounts;

  if (args.mode === "codex-cli-all") {
    gaps.push("codex-cli-all is provider-free exploratory mode, not upstream-native optimizer parity");
  }
  if (effectiveProfile !== "official-parity") gaps.push("run profile is exploratory");
  if (effectiveProfile === "official-parity" && !providerOk) {
    proofBlockers.push("provider-backed optimizer credentials are missing");
  }
  if (datasetCounts.eval_positive < EXPLORATORY_MIN.positive) {
    gaps.push(`only ${datasetCounts.eval_positive} positive eval case(s); ${EXPLORATORY_MIN.positive}+ recommended before non-exploratory use`);
  }
  if (split.val < EXPLORATORY_MIN.val || split.test < EXPLORATORY_MIN.test) {
    gaps.push(`split has val=${split.val}, test=${split.test}; ${EXPLORATORY_MIN.val}+ val and ${EXPLORATORY_MIN.test}+ test cases recommended before non-exploratory use`);
  }
  if (datasetCounts.eval_positive < OFFICIAL_RECOMMENDED.positive) {
    gaps.push(`below official-parity recommendation of ${OFFICIAL_RECOMMENDED.positive}+ positive cases`);
  }
  if (split.val < OFFICIAL_RECOMMENDED.val || split.test < OFFICIAL_RECOMMENDED.test) {
    gaps.push(`below official-parity split recommendation of ${OFFICIAL_RECOMMENDED.val}+ validation and ${OFFICIAL_RECOMMENDED.test}+ test cases`);
  }
  if (effectiveProfile === "official-parity" && !quality.officialFloorMet) {
    proofBlockers.push(...quality.blockers.map((blocker) => `dataset floor: ${blocker}`));
  }
  const requiredPins =
    effectiveProfile === "official-parity" ? requiredModelPinNames(args.mode, configInfo) : [];
  const gapPins = new Set([
    ...requiredPins,
    ...(args.mode === "codex-cli-all"
      ? ["target", "codex_cli_judge_model", "codex_cli_reflection_model"]
      : []),
  ]);
  for (const [key, state] of Object.entries(configInfo.modelPins)) {
    if (!gapPins.has(key) && !state.value) continue;
    if (state.status === "inherited_default") {
      gaps.push(`${key} model is blank and will inherit runtime defaults`);
      if (requiredPins.includes(key)) proofBlockers.push(`${key} model pin is required`);
    } else if (state.status === "env_missing") {
      gaps.push(`${key} model uses ${state.value}, but ${state.env} is not present`);
      if (requiredPins.includes(key)) proofBlockers.push(`${key} model env ${state.env} is missing`);
    }
  }
  if (schemaCheck.status === "review_required") {
    proofBlockers.push(
      `generated config has unsupported keys: ${schemaCheck.unsupportedKeys.map((item) => item.path).join(", ")}`,
    );
  }
  if (schemaCheck.status === "missing_config") {
    proofBlockers.push("generated config is missing");
  }
  if (configInfo.values.optimizer_lr_scheduler && configInfo.values.optimizer_lr_scheduler !== "cosine") {
    gaps.push(`optimizer.lr_scheduler is ${configInfo.values.optimizer_lr_scheduler}, not cosine`);
  }
  if (configInfo.values.optimizer_use_slow_update === "false") {
    gaps.push("optimizer.use_slow_update is disabled");
  }
  if (configInfo.values.optimizer_use_meta_skill === "false") {
    gaps.push("optimizer.use_meta_skill is disabled");
  }

  let status = "ready";
  if (args.mode === "codex-cli-all" || effectiveProfile === "exploratory") status = "exploratory";
  else if (proofBlockers.length) {
    status = "blocked";
  } else if (gaps.length) {
    status = "ready_with_gaps";
  }

  return {
    requestedRunProfile: args.runProfile,
    runProfile: effectiveProfile,
    officialParityStatus: status,
    proofStatus: status,
    officialParityGaps: gaps,
    proofBlockers: [...new Set(proofBlockers)],
    upstreamBehaviorBypassed: bypassed,
  };
}

function hasProviderCredentials(presence) {
  const azureKey = presence.AZURE_OPENAI_ENDPOINT && presence.AZURE_OPENAI_API_KEY;
  const azureCli =
    presence.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_AUTH_MODE === "azure_cli";
  const openai = presence.OPENAI_API_KEY;
  const anthropic = presence.ANTHROPIC_API_KEY;
  const qwen = presence.QWEN_CHAT_BASE_URL && presence.QWEN_CHAT_MODEL;
  return Boolean(azureKey || azureCli || openai || anthropic || qwen);
}

function adapterManifestCompatibility(adapterManifest, skillName, args, effectiveRunProfile) {
  if (!adapterManifest.data) {
    return {
      status: "missing",
      targetMatches: false,
      modeMatches: false,
      runProfileMatches: false,
      warnings: ["Adapter manifest is missing; production setup must create target-specific config before training."],
    };
  }

  const manifest = adapterManifest.data;
  const manifestTarget = manifest.target_skill || manifest.proof_target || manifest.proofTarget || null;
  const manifestMode = manifest.mode || manifest.selected_mode || null;
  const manifestRunProfile = manifest.runProfile || manifest.run_profile || null;
  const warnings = [];

  if (manifestTarget && manifestTarget !== skillName) {
    warnings.push(
      `Adapter manifest target ${manifestTarget} does not match requested target ${skillName}; production setup must refresh it before training.`,
    );
  }
  if (manifestMode && manifestMode !== args.mode) {
    warnings.push(
      `Adapter manifest mode ${manifestMode} does not match requested mode ${args.mode}; production setup must refresh it before training.`,
    );
  }
  if (manifestRunProfile && manifestRunProfile !== effectiveRunProfile) {
    warnings.push(
      `Adapter manifest run profile ${manifestRunProfile} does not match requested run profile ${effectiveRunProfile}; production setup must refresh it before training.`,
    );
  }

  return {
    status: warnings.length ? "refresh_required" : "matched",
    target: manifestTarget,
    mode: manifestMode,
    runProfile: manifestRunProfile,
    targetMatches: manifestTarget === skillName,
    modeMatches: manifestMode === args.mode,
    runProfileMatches: manifestRunProfile === effectiveRunProfile,
    warnings,
  };
}

function pythonStatus(args) {
  const uvCommand = resolveUvCommand();
  const uvVersion = uvCommand ? commandResult(uvCommand, ["--version"]).stdout : null;
  const local = commandResult(args.python, ["--version"]);
  const localVersion = (local.stdout || local.stderr || "").trim();
  const version = localVersion.match(/Python\s+(\d+)\.(\d+)(?:\.(\d+))?/);
  const localCompatible =
    Boolean(version) &&
    (Number(version[1]) > 3 || (Number(version[1]) === 3 && Number(version[2]) >= 10));

  let preference_required = false;
  if (args.pythonManager === "auto" && !uvCommand && localCompatible) preference_required = true;

  return {
    preference: args.pythonManager,
    uv: {
      installed: Boolean(uvCommand),
      command: uvCommand,
      version: uvVersion?.trim() || null,
    },
    local: {
      command: args.python,
      available: local.ok,
      version: localVersion || null,
      compatible: localCompatible,
    },
    preference_required,
  };
}

function runCodexProbe() {
  const script = path.join(skillRoot, "scripts/probe-codex-cli.mjs");
  const result = spawnSync(process.execPath, [script, "--json"], {
    cwd: root,
    encoding: "utf8",
    timeout: 300000,
  });
  if (result.status !== 0) {
    return { ok: false, error: redact(result.stderr || result.stdout || "Codex probe failed") };
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { ok: false, error: "Codex probe returned non-JSON output" };
  }
}

const args = parseArgs(process.argv.slice(2));
const missing = [];
const warnings = [];
const repoRootOk =
  fs.existsSync(path.join(root, "package.json")) && fs.existsSync(path.join(root, "AGENTS.md"));
if (!repoRootOk) missing.push("repo root");

const gitignore = fs.existsSync(path.join(root, ".gitignore"))
  ? fs.readFileSync(path.join(root, ".gitignore"), "utf8")
  : "";
if (!gitignore.split(/\r?\n/).some((line) => line.trim() === ".agents/")) {
  missing.push(".agents ignore rule");
}

const skillPath = resolveSkill(args.skill);
let skillName = args.skill || null;
let skillMaturity = "unspecified";
let frontmatterOk = false;
if (!skillPath) {
  missing.push("target skill");
} else {
  const rel = path.relative(root, skillPath).replaceAll("\\", "/");
  skillMaturity = rel.startsWith("skills/") ? "promoted" : "incubator";
  skillName = path.basename(path.dirname(skillPath));
  const text = fs.readFileSync(skillPath, "utf8");
  frontmatterOk = Boolean(parseFrontmatter(text)?.name);
  if (!frontmatterOk) missing.push("parseable skill frontmatter");
}

const evalDir = skillName ? path.join(root, "skill-evals", skillName) : null;
let datasetCounts = {
  eval_positive: 0,
  eval_negative: 0,
  eval_total: 0,
  estimated_split: { train: 0, val: 0, test: 0 },
  generated: { train: 0, val: 0, test: 0, activation_negative: 0 },
};
if (!evalDir || !fs.existsSync(evalDir)) missing.push("skill eval proof");
else {
  const evalCounts = evalCaseCounts(evalDir);
  datasetCounts = {
    eval_positive: evalCounts.positive,
    eval_negative: evalCounts.negative,
    eval_total: evalCounts.total,
    positive_with_deterministic_assertions: evalCounts.positive_with_deterministic_assertions,
    positive_with_fixtures: evalCounts.positive_with_fixtures,
    positive_with_expected_artifacts: evalCounts.positive_with_expected_artifacts,
    estimated_split: estimateSplitCounts(evalCounts.positive),
    generated: generatedSplitCounts(skillName),
  };
  if (evalCounts.positive < EXPLORATORY_MIN.positive) {
    warnings.push(
      `Only ${evalCounts.positive} positive eval case(s) found; treat optimization as exploratory.`,
    );
  }
  const split = datasetCounts.generated.train + datasetCounts.generated.val + datasetCounts.generated.test
    ? datasetCounts.generated
    : datasetCounts.estimated_split;
  if (split.val < EXPLORATORY_MIN.val || split.test < EXPLORATORY_MIN.test) {
    warnings.push(
      `Small validation/test split; val=${split.val}, test=${split.test}. Treat optimization as exploratory.`,
    );
  }
}

const python = pythonStatus(args);
if (args.pythonManager === "uv" && !python.uv.installed) {
  missing.push("uv");
} else if (args.pythonManager === "local" && !python.local.compatible) {
  missing.push("Python 3.10+");
} else if (!python.uv.installed && !python.local.compatible) {
  missing.push("uv or Python 3.10+");
}
if (python.preference_required) {
  warnings.push("uv is not installed; ask whether to install uv or explicitly use local Python.");
}

if (!commandResult("git", ["--version"]).ok) missing.push("Git");
if (!commandResult("node", ["--version"]).ok) missing.push("Node.js");
if (!commandResult("pnpm", ["--version"]).ok && !commandResult("npm", ["--version"]).ok) {
  missing.push("npm or pnpm");
}

const skillOptPath = path.join(root, ".agents/tools/SkillOpt");
const skillOptClone = fs.existsSync(skillOptPath);
const skillOptVenv = fs.existsSync(path.join(skillOptPath, ".venv"));
const commitPath = path.join(root, ".agents/tools/SkillOpt.commit");
if (!skillOptClone) missing.push("SkillOpt clone");
if (skillOptClone && !skillOptVenv) missing.push("SkillOpt virtualenv");

const credentials = providerPresence();
const providerOk = hasProviderCredentials(credentials);
if (args.mode === "native-provider" && !providerOk) missing.push("provider credentials");
if (args.mode === "hybrid-codex-target" && !providerOk && !args.setupOnly) {
  missing.push("optimizer credentials");
}

const configInfo = configProfile(skillName, args.mode);
const configSchema = configSchemaCheck(skillName, args.mode);
const quality = benchmarkQuality(datasetCounts);
const officialParity = officialParityReport(
  args,
  providerOk,
  datasetCounts,
  configInfo,
  quality,
  configSchema,
);
if (officialParity.officialParityStatus === "exploratory") {
  warnings.push("Run is classified as exploratory; detailed parity differences are listed in JSON output.");
}

let codex = { required: args.mode.includes("codex"), installed: false, probe: null };
if (codex.required) {
  codex.installed = commandExists("codex");
  if (!codex.installed) {
    missing.push("Codex CLI");
} else if (args.codexProbe) {
    codex.probe = runCodexProbe();
    if (!codex.probe.ok) missing.push("Codex CLI login probe");
  } else {
    warnings.push(
      "Codex CLI login probe was not run; ask before running it because the probe writes ignored diagnostics under .agents/skillopt-work/_readiness.",
    );
  }
}

const adapterManifest = readAdapterManifest(skillName);
const adapterManifestCheck = adapterManifestCompatibility(
  adapterManifest,
  skillName,
  args,
  officialParity.runProfile,
);
warnings.push(...adapterManifestCheck.warnings);
if (args.mode === "codex-cli-all") {
  if (!adapterManifest.data) {
    missing.push("adapter manifest for codex-cli-all");
  } else {
    const manifest = adapterManifest.data;
    if (!manifest.installed_files?.some((file) => file.endsWith("codex_cli_reflector.py"))) {
      missing.push("codex_cli reflection adapter");
    }
    if (!manifest.installed_files?.some((file) => file.endsWith("evaluator.py"))) {
      missing.push("Agent Skills evaluator adapter");
    }
  }
  const reflectorPath = path.join(
    root,
    ".agents/tools/SkillOpt/skillopt/envs/agent_skills/codex_cli_reflector.py",
  );
  if (fs.existsSync(reflectorPath)) {
    const reflectorText = fs.readFileSync(reflectorPath, "utf8");
    if (!reflectorText.includes("codex-cli local truncation")) {
      missing.push("provider-free codex_cli reflection adapter");
    }
  }
  const codexAllConfig = skillName
    ? path.join(root, ".agents/skillopt-work", skillName, "configs/agent-skills.codex-cli-all.yaml")
    : null;
  if (!codexAllConfig || !fs.existsSync(codexAllConfig)) {
    missing.push("codex-cli-all work config");
  } else {
    const configText = fs.readFileSync(codexAllConfig, "utf8");
    if (!/^\s*judge_backend:\s*codex_cli\s*$/m.test(configText)) {
      missing.push("codex_cli LLM judge config");
    }
  }
}

const safeToSetup =
  repoRootOk &&
  Boolean(skillPath) &&
  Boolean(evalDir && fs.existsSync(evalDir)) &&
  !missing.includes(".agents ignore rule");
const setupBlockers = [
  ...(!repoRootOk ? ["repo root"] : []),
  ...(!skillPath ? ["target skill"] : []),
  ...(!evalDir || !fs.existsSync(evalDir) ? ["skill eval proof"] : []),
  ...(missing.includes(".agents ignore rule") ? [".agents ignore rule"] : []),
];
const trainingBlockers = [
  ...missing,
  ...(adapterManifestCheck.status === "refresh_required"
    ? ["adapter manifest/config refresh required"]
    : []),
];

const result = {
  ok: trainingBlockers.length === 0,
  target_skill: skillName,
  mode: args.mode,
  requested_run_profile: officialParity.requestedRunProfile,
  run_profile: officialParity.runProfile,
  requestedRunProfile: officialParity.requestedRunProfile,
  runProfile: officialParity.runProfile,
  proofStatus: officialParity.proofStatus,
  proofBlockers: officialParity.proofBlockers,
  officialParityStatus: officialParity.officialParityStatus,
  officialParityGaps: officialParity.officialParityGaps,
  upstreamBehaviorBypassed: officialParity.upstreamBehaviorBypassed,
  maturity: skillMaturity,
  skill_path: skillPath ? path.relative(root, skillPath).replaceAll("\\", "/") : null,
  frontmatter_ok: frontmatterOk,
  skillopt: {
    clone: skillOptClone,
    virtualenv: skillOptVenv,
    commit: skillOptCommit(skillOptPath, commitPath),
  },
  python,
  datasetCounts,
  benchmarkQuality: quality,
  modelPins: configInfo.modelPins,
  configDefaults: configInfo.values,
  configSchemaCheck: configSchema,
  artifactExpectations: artifactExpectations(skillName, configInfo),
  officialParityChecklist: {
    providerCredentials: providerOk,
    datasetFloor: quality.officialFloorMet,
    configSchema: configSchema.status,
    validationGate: configInfo.values.evaluation_use_gate !== "false",
    testEvaluation: configInfo.values.evaluation_eval_test !== "false",
    slowUpdate: configInfo.values.optimizer_use_slow_update === "true",
    metaSkill: configInfo.values.optimizer_use_meta_skill === "true",
    cosineScheduler: configInfo.values.optimizer_lr_scheduler === "cosine",
    requiredModelPins: requiredModelPinNames(args.mode, configInfo).map((name) => ({
      name,
      status: configInfo.modelPins[name]?.status || "not_applicable",
    })),
  },
  configPath: configInfo.path,
  adapterManifest,
  adapterManifestCheck,
  credential_presence: credentials,
  codex,
  missing,
  warnings,
  setupReadiness: safeToSetup ? "ready" : "blocked",
  setupBlockers,
  trainingReadiness: trainingBlockers.length === 0 ? "ready" : "blocked",
  trainingBlockers,
  safe_to_setup: safeToSetup,
};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`SkillOpt readiness for ${result.target_skill || "<missing skill>"}`);
  console.log(`Mode: ${result.mode}`);
  console.log(`Run profile: ${result.run_profile}`);
  console.log(`Setup readiness: ${result.setupReadiness}`);
  console.log(`Training readiness: ${result.trainingReadiness}`);
  console.log(`Proof status: ${result.proofStatus}`);
  console.log(`Official-parity status: ${result.officialParityStatus}`);
  if (result.proofBlockers.length) console.log(`Proof blockers: ${result.proofBlockers.join("; ")}`);
  if (result.officialParityGaps.length) {
    if (result.mode === "codex-cli-all" || result.run_profile === "exploratory") {
      const bypassed = result.upstreamBehaviorBypassed.length
        ? ` Bypassed upstream provider-backed behavior: ${result.upstreamBehaviorBypassed.join(", ")}.`
        : "";
      console.log(
        `Expected exploratory differences: provider-free exploratory mode, not upstream-native official optimizer parity.${bypassed}`,
      );
    } else {
      console.log(`Official-parity gaps: ${result.officialParityGaps.join("; ")}`);
    }
  }
  console.log(`Config schema: ${result.configSchemaCheck.status}`);
  console.log(
    `Data floor: ${result.benchmarkQuality.officialFloorMet ? "official floor met" : "official floor not met"}; classification ${result.benchmarkQuality.classification}`,
  );
  const modelPinBlockers = Object.values(result.modelPins)
    .filter((pin) => pin.status === "env_missing")
    .map((pin) => pin.env)
    .filter(Boolean);
  if (modelPinBlockers.length) console.log(`Missing model pin env: ${modelPinBlockers.join(", ")}`);
  console.log(
    `Dataset: positive ${result.datasetCounts.eval_positive}, negative ${result.datasetCounts.eval_negative}, generated train ${result.datasetCounts.generated.train}, val ${result.datasetCounts.generated.val}, test ${result.datasetCounts.generated.test}`,
  );
  if (result.adapterManifestCheck.status !== "matched")
    console.log(`Adapter manifest: ${result.adapterManifestCheck.status}`);
  if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
  if (warnings.length) console.log(`Warnings: ${warnings.join("; ")}`);
  if (
    result.mode !== "codex-cli-all" &&
    result.proofBlockers.some((blocker) => blocker.includes("provider-backed optimizer credentials"))
  ) {
    console.log("Provider-free alternative: choose codex-cli-all for exploratory setup through Codex CLI login.");
  }
  console.log(`Safe to setup: ${result.safe_to_setup ? "yes" : "no"}`);
}

process.exit(result.safe_to_setup ? 0 : 1);
