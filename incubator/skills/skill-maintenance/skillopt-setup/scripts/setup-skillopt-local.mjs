#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const scriptPath = fileURLToPath(import.meta.url);
const skillRoot = path.resolve(path.dirname(scriptPath), "..");
const modes = new Set(["native-provider", "hybrid-codex-target", "codex-cli-all"]);
const runProfiles = new Set(["official-parity", "exploratory"]);
const pythonManagers = new Set(["auto", "uv", "local"]);
const existingSetupChoices = new Set(["reuse"]);

function defaultRunProfile(mode) {
  return mode === "codex-cli-all" ? "exploratory" : "official-parity";
}

function defaultRunName() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  return `run-${stamp}`;
}

function parseArgs(argv) {
  const args = {
    approved: false,
    json: false,
    mode: "hybrid-codex-target",
    runName: defaultRunName(),
    repo: "https://github.com/microsoft/SkillOpt.git",
    ref: null,
    skillopt: ".agents/tools/SkillOpt",
    python: "python3",
    pythonManager: "auto",
    pythonVersion: "3.10",
    installUv: false,
    skipInstall: false,
    probeCodex: false,
    resetExisting: false,
    cleanupOnly: false,
    existingSetupChoice: null,
    seed: "42",
    runProfile: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--approved") args.approved = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--skill") args.skill = argv[++i];
    else if (arg === "--mode") args.mode = argv[++i];
    else if (arg === "--run-name") args.runName = argv[++i];
    else if (arg === "--repo") args.repo = argv[++i];
    else if (arg === "--ref") args.ref = argv[++i];
    else if (arg === "--skillopt") args.skillopt = argv[++i];
    else if (arg === "--python") args.python = argv[++i];
    else if (arg === "--python-manager") args.pythonManager = argv[++i];
    else if (arg === "--python-version") args.pythonVersion = argv[++i];
    else if (arg === "--install-uv") args.installUv = true;
    else if (arg === "--skip-install") args.skipInstall = true;
    else if (arg === "--probe-codex") args.probeCodex = true;
    else if (arg === "--reset-existing") args.resetExisting = true;
    else if (arg === "--cleanup-only") args.cleanupOnly = true;
    else if (arg === "--existing-setup-choice") args.existingSetupChoice = argv[++i];
    else if (arg === "--run-profile") args.runProfile = argv[++i];
    else if (arg === "--seed") args.seed = argv[++i];
    else fail(`Unknown argument: ${arg}`);
  }

  if (!args.skill) fail("--skill is required");
  if (!modes.has(args.mode)) fail(`Unsupported mode: ${args.mode}`);
  if (!pythonManagers.has(args.pythonManager))
    fail(`Unsupported python manager: ${args.pythonManager}`);
  if (args.existingSetupChoice && !existingSetupChoices.has(args.existingSetupChoice)) {
    fail(`Unsupported existing setup choice: ${args.existingSetupChoice}`);
  }
  args.runProfile ||= defaultRunProfile(args.mode);
  if (!runProfiles.has(args.runProfile)) fail(`Unsupported run profile: ${args.runProfile}`);
  if (args.mode === "codex-cli-all" && args.runProfile === "official-parity") {
    fail("codex-cli-all is exploratory only; choose --run-profile exploratory");
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node setup-skillopt-local.mjs --skill <skill> [options]

Dry-run is the default. Add --approved for production-grade setup.

Options:
  --mode <native-provider|hybrid-codex-target|codex-cli-all>
  --python-manager <auto|uv|local>
  --python-version <version>
  --python <command>
  --install-uv
  --approved
  --cleanup-only
  --existing-setup-choice <reuse>
  --run-profile <official-parity|exploratory>
  --probe-codex
  --skip-install
  --run-name <name>
  --skillopt <path>
  --repo <url>
  --ref <git-ref>
  --seed <number>
  --json
  --help`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function redact(text) {
  const home = process.env.HOME ? path.resolve(process.env.HOME) : "";
  return String(text || "")
    .replaceAll(home, "~")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[redacted-token]")
    .replace(/[A-Za-z0-9+/=._-]{40,}/g, (token) =>
      /[\\/]/.test(token) || /^[a-f0-9]{40,64}$/i.test(token)
        ? token
        : "[redacted-long-token]",
    );
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function skillScriptCommand(script) {
  return relative(path.join(skillRoot, "scripts", script));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
    timeout: options.timeout || 600000,
  });
  if (result.status !== 0) {
    const output = redact([result.stdout, result.stderr].filter(Boolean).join("\n"));
    throw new Error(`${command} ${args.join(" ")} failed\n${output}`);
  }
  return redact(result.stdout || result.stderr || "");
}

function commandResult(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    timeout: options.timeout || 30000,
  });
  return {
    ok: result.status === 0,
    stdout: redact(result.stdout || ""),
    stderr: redact(result.stderr || ""),
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

function venvPython(skillOptPath) {
  return process.platform === "win32"
    ? path.join(skillOptPath, ".venv", "Scripts", "python.exe")
    : path.join(skillOptPath, ".venv", "bin", "python");
}

function detectPython(args) {
  const uvCommand = resolveUvCommand();
  const uvVersion = uvCommand ? commandResult(uvCommand, ["--version"]).stdout.trim() : null;
  const localVersionResult = commandResult(args.python, ["--version"]);
  const localVersionText = (localVersionResult.stdout || localVersionResult.stderr).trim();
  const match = localVersionText.match(/Python\s+(\d+)\.(\d+)(?:\.(\d+))?/);
  const compatible =
    Boolean(match) && (Number(match[1]) > 3 || (Number(match[1]) === 3 && Number(match[2]) >= 10));

  let selected = null;
  let actionRequired = null;
  if (args.pythonManager === "local") {
    selected = "local";
    if (!compatible) actionRequired = "local_python_incompatible";
  } else if (uvVersion) {
    selected = "uv";
  } else if (args.installUv) {
    selected = "uv";
    actionRequired = "install_uv";
  } else if (args.pythonManager === "uv") {
    actionRequired = "install_uv_or_install_manually";
  } else if (compatible) {
    actionRequired = "choose_install_uv_or_local_python";
  } else {
    actionRequired = "install_uv";
  }

  return {
    selected,
    action_required: actionRequired,
    uv: {
      installed: Boolean(uvVersion),
      command: uvCommand,
      version: uvVersion,
    },
    local: {
      command: args.python,
      available: localVersionResult.ok,
      version: localVersionText || null,
      compatible,
    },
  };
}

function installUv(steps) {
  if (resolveUvCommand()) return;
  const toolsDir = path.join(root, ".agents/tools");
  fs.mkdirSync(toolsDir, { recursive: true });
  if (process.platform === "win32") {
    run(
      "powershell",
      ["-ExecutionPolicy", "ByPass", "-c", "irm https://astral.sh/uv/install.ps1 | iex"],
      { inherit: true, timeout: 1200000 },
    );
  } else {
    const installer = path.join(toolsDir, "uv-install.sh");
    run("curl", ["-LsSf", "https://astral.sh/uv/install.sh", "-o", installer], {
      inherit: true,
      timeout: 1200000,
    });
    run("sh", [installer], { inherit: true, timeout: 1200000 });
  }
  if (!resolveUvCommand()) {
    throw new Error(
      "uv installer finished, but uv was not found on PATH or common install paths. Refresh PATH and rerun setup.",
    );
  }
  steps.push("installed uv with the official Astral installer");
}

function createVenvWithUv(skillOptPath, args, steps) {
  if (!resolveUvCommand()) installUv(steps);
  const uv = resolveUvCommand();
  run(uv, ["venv", "--python", args.pythonVersion, ".venv"], {
    cwd: skillOptPath,
    inherit: true,
    timeout: 1200000,
  });
  steps.push(`created virtualenv with uv using Python ${args.pythonVersion}`);
}

function createVenvWithLocalPython(skillOptPath, args, pythonStatus, steps) {
  if (!pythonStatus.local.compatible) {
    throw new Error(
      `${args.python} is not compatible with SkillOpt setup; choose --install-uv or provide --python pointing to Python 3.10+.`,
    );
  }
  run(args.python, ["-m", "venv", ".venv"], { cwd: skillOptPath, inherit: true });
  steps.push(`created virtualenv with local ${pythonStatus.local.version}`);
}

function ensurePythonReady(args, skillOptPath, steps) {
  const status = detectPython(args);
  const py = venvPython(skillOptPath);
  if (fs.existsSync(py)) {
    steps.push("reused existing virtualenv");
    return { ...status, selected: "existing-venv" };
  }

  if (status.action_required === "choose_install_uv_or_local_python") {
    throw new Error(
      "uv is not installed. Choose whether to install uv with --install-uv or explicitly use local Python with --python-manager local.",
    );
  }
  if (status.action_required === "install_uv_or_install_manually" && !args.installUv) {
    throw new Error(
      "uv is not installed. Install uv first or rerun with --install-uv after approval.",
    );
  }
  if (status.action_required === "install_uv" && !args.installUv && !status.uv.installed) {
    throw new Error(
      "No compatible Python setup was found. Install uv first or rerun with --install-uv so uv can provision Python.",
    );
  }

  if (status.selected === "local") {
    createVenvWithLocalPython(skillOptPath, args, status, steps);
    return status;
  }

  createVenvWithUv(skillOptPath, args, steps);
  return { ...status, selected: "uv" };
}

function commandPlan(args, skillOptPath) {
  const existingSetup = existingSetupState(args, skillOptPath);

  return {
    local_workspace: relative(path.dirname(skillOptPath)),
    existing_setup: existingSetup,
    run_profile: args.runProfile,
    python_alternatives: {
      install_uv: "ask for approval to install uv, then rerun production-grade setup with --install-uv",
      use_local_python:
        "ask for approval to use local Python, then rerun production-grade setup with --python-manager local",
    },
    recommended_training_location:
      "new_terminal_from_repo_root_for_full_logs_and_user_control",
    terminal_training_command: terminalTrainingCommand(args),
    continue_after_setup: continuationCommands(args),
    post_training_steps: postTrainingSteps(args),
    post_training_commands: postTrainingCommands(args),
    eval_only_command: evalOnlyCommand(args),
    webui_command: webuiCommand(),
    agent_execution_question: `Recommended: paste the SkillOpt training command for ${args.skill} into a new terminal from the repo root. Should I run SkillOpt training for ${args.skill} in this agent session anyway?`,
  };
}

function existingSetupPaths(args, skillOptPath) {
  return [
    { kind: "skillopt_clone", path: skillOptPath },
    { kind: "skillopt_commit", path: path.join(root, ".agents/tools/SkillOpt.commit") },
    { kind: "skillopt_workdir", path: path.join(root, ".agents/skillopt-work") },
  ];
}

function existingSetupState(args, skillOptPath) {
  const paths = existingSetupPaths(args, skillOptPath)
    .filter((entry) => fs.existsSync(entry.path))
    .map((entry) => ({
      kind: entry.kind,
      path: relative(entry.path),
    }));
  return {
    present: paths.length > 0,
    paths,
  };
}

function assertAgentsPath(file) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (rel.startsWith("../") || rel === ".." || path.isAbsolute(rel) || !rel.startsWith(".agents/")) {
    throw new Error(`Refusing to remove non-.agents path: ${rel}`);
  }
  return rel;
}

function removeExistingSetup(args, skillOptPath, steps) {
  const existing = existingSetupPaths(args, skillOptPath).filter((entry) => fs.existsSync(entry.path));
  if (!existing.length) {
    steps.push("no existing SkillOpt setup to remove");
    return;
  }

  for (const entry of existing) {
    const rel = assertAgentsPath(entry.path);
    fs.rmSync(entry.path, { recursive: true, force: true });
    steps.push(`removed existing ${entry.kind}: ${rel}`);
  }
}

function modeNote(mode, runProfile = defaultRunProfile(mode)) {
  if (mode === "codex-cli-all") {
    return "codex-cli-all avoids provider credentials by using Codex CLI for target rollouts, semantic LLM judging, and adapter-managed reflection through the user's Codex login. It is exploratory, not upstream-native official optimizer parity.";
  }
  if (mode === "hybrid-codex-target") {
    return `hybrid-codex-target uses Codex CLI for target rollouts and judging, but native SkillOpt optimizer/reflection still needs provider credentials. Run profile: ${runProfile}.`;
  }
  return `native-provider uses provider-backed target rollouts and optimizer/reflection, so provider credentials are required. Run profile: ${runProfile}.`;
}

function trainingDefaults(args) {
  if (args.runProfile === "official-parity" && args.mode === "native-provider") {
    return { epochs: "4", batch: "40", workers: "8" };
  }
  if (args.runProfile === "official-parity" && args.mode === "hybrid-codex-target") {
    return { epochs: "4", batch: "20", workers: "4" };
  }
  if (args.mode === "native-provider") return { epochs: "2", batch: "8", workers: "4" };
  if (args.mode === "hybrid-codex-target") return { epochs: "2", batch: "4", workers: "2" };
  return { epochs: "1", batch: "2", workers: "1" };
}

function trainingCommandParts(args) {
  const configFile = `agent-skills.${args.mode}.yaml`;
  const defaults = trainingDefaults(args);
  const workerArgs = [
    ["--num_epochs", defaults.epochs],
    ["--batch_size", defaults.batch],
    ["--workers", defaults.workers],
  ];
  const workRoot = `../../skillopt-work/${args.skill}`;
  const outputRoot = `${workRoot}/outputs/${args.runName}`;
  const repoRun = `.agents/skillopt-work/${args.skill}/outputs/${args.runName}`;
  const summarizeCommand = `node ${skillScriptCommand("summarize-skillopt-run.mjs")} --skill ${args.skill} --run ${repoRun} --terminal`;
  const verifyCommand = `node ${skillScriptCommand("verify-skillopt-run-artifacts.mjs")} --skill ${args.skill} --run ${repoRun} --terminal`;
  const previewCommand = `node ${skillScriptCommand("apply-skillopt-best.mjs")} --skill ${args.skill} --best ${repoRun}/best_skill.md --dry-run --summary`;
  const continueLine = (line) => `${line} \\`;

  return [
    "run_skillopt_training() {",
    "  skillopt_repo_root=$(pwd)",
    "  set -o pipefail",
    "  cd .agents/tools/SkillOpt || return",
    "  . .venv/bin/activate",
    `  mkdir -p ${outputRoot}`,
    `  echo "Starting SkillOpt training for ${args.skill} (${args.mode}, ${args.runProfile})"`,
    `  echo "Rerunning this command should resume from ${repoRun}/runtime_state.json when SkillOpt has written one."`,
    `  echo "Streaming output and writing log to ${repoRun}/training.log"`,
    `  echo "If output pauses, a rollout, judge, or reflection subprocess is probably running."`,
    continueLine("  python -u scripts/train.py"),
    continueLine(`    --config ${workRoot}/configs/${configFile}`),
    continueLine(`    --split_dir ${workRoot}/data`),
    continueLine(`    --skill_init ${workRoot}/initial/skill-body.md`),
    continueLine(`    --out_root ${outputRoot}`),
    ...workerArgs.map(([name, value]) => continueLine(`    ${name} ${value}`)),
    `    2>&1 | tee ${outputRoot}/training.log`,
    "  status=$?",
    '  if [ "$status" -eq 0 ]; then',
    `    echo "SkillOpt training finished successfully for ${args.skill}."`,
    `    echo "Log: ${repoRun}/training.log"`,
    '    cd "$skillopt_repo_root" || return',
    '    echo ""',
    `    echo "Artifact verification:"`,
    `    ${verifyCommand}`,
    "    verify_status=$?",
    '    if [ "$verify_status" -ne 0 ]; then',
    `      echo "Artifact verification reported proof blockers; continuing to summary for diagnostics."`,
    "    fi",
    '    echo ""',
    `    echo "Result summary:"`,
    `    ${summarizeCommand}`,
    '    echo ""',
    `    echo "Adoption preview:"`,
    `    ${previewCommand}`,
    "    preview_status=$?",
    '    if [ "$preview_status" -ne 0 ]; then',
    `      echo "Adoption preview reported review blockers; training still completed."`,
    "    fi",
    "  else",
    `    echo "SkillOpt training failed for ${args.skill} with exit code $status."`,
    `    echo "Log: ${repoRun}/training.log"`,
    '    cd "$skillopt_repo_root" || return',
    "  fi",
    '  return "$status"',
    "}",
    "run_skillopt_training",
  ];
}

function terminalTrainingCommand(args) {
  return trainingCommandParts(args).join("\n");
}

function evalOnlyCommand(args) {
  const configFile = `agent-skills.${args.mode}.yaml`;
  const workRoot = `../../skillopt-work/${args.skill}`;
  const outputRoot = `${workRoot}/outputs/${args.runName}`;
  const continueLine = (line) => `${line} \\`;
  return [
    "run_skillopt_eval_only() {",
    "  skillopt_repo_root=$(pwd)",
    "  set -o pipefail",
    "  cd .agents/tools/SkillOpt || return",
    "  . .venv/bin/activate",
    `  echo "Evaluating best_skill.md for ${args.skill} without training"`,
    continueLine("  python -u scripts/eval_only.py"),
    continueLine(`    --config ${workRoot}/configs/${configFile}`),
    continueLine(`    --skill ${outputRoot}/best_skill.md`),
    continueLine("    --split all"),
    `    --split_dir ${workRoot}/data 2>&1 | tee ${outputRoot}/eval-only.log`,
    "  status=$?",
    '  cd "$skillopt_repo_root" || return',
    '  return "$status"',
    "}",
    "run_skillopt_eval_only",
  ].join("\n");
}

function webuiCommand() {
  return [
    "cd .agents/tools/SkillOpt",
    ". .venv/bin/activate",
    "python -m skillopt_webui.app --host 127.0.0.1 --port 7860",
  ].join("\n");
}

function webuiCheckCommand() {
  return [
    "cd .agents/tools/SkillOpt",
    ". .venv/bin/activate",
    "python -c \"import importlib.util; raise SystemExit(0 if importlib.util.find_spec('skillopt_webui') else 1)\"",
  ].join("\n");
}

function postTrainingSteps(args) {
  return [
    {
      description: "Return to the repo root.",
      command: "cd ../../..",
    },
    {
      description: "Verify expected run artifacts and proof blockers without reading raw transcripts.",
      command: `node ${skillScriptCommand("verify-skillopt-run-artifacts.mjs")} --skill ${args.skill} --run .agents/skillopt-work/${args.skill}/outputs/${args.runName} --terminal`,
    },
    {
      description: "Summarize the SkillOpt run without raw transcripts.",
      command: `node ${skillScriptCommand("summarize-skillopt-run.mjs")} --skill ${args.skill} --run .agents/skillopt-work/${args.skill}/outputs/${args.runName} --terminal`,
    },
    {
      description: "Preview best_skill.md adoption; dry-run only, no tracked edits.",
      command: `node ${skillScriptCommand("apply-skillopt-best.mjs")} --skill ${args.skill} --best .agents/skillopt-work/${args.skill}/outputs/${args.runName}/best_skill.md --dry-run --summary`,
    },
    {
      description: "Evaluate best_skill.md on all splits without another training run.",
      command: evalOnlyCommand(args),
    },
    {
      description: "Check whether the optional SkillOpt WebUI package is importable.",
      command: webuiCheckCommand(),
    },
    {
      description: "Optionally open SkillOpt WebUI for local .agents outputs after installing the webui extra if needed.",
      command: webuiCommand(),
    },
  ];
}

function postTrainingCommands(args) {
  return postTrainingSteps(args).map((step) => step.command);
}

function continuationCommands(args) {
  return [
    `# Recommended: paste this into a new terminal from the repo root to run SkillOpt for ${args.skill}`,
    ...trainingCommandParts(args),
    "# After training finishes, return to the repo root and inspect the result",
    ...postTrainingSteps(args).flatMap((step) => [`# ${step.description}`, step.command]),
  ];
}

function ensureAgentsIgnored() {
  const gitignorePath = path.join(root, ".gitignore");
  if (!fs.existsSync(gitignorePath)) throw new Error(".gitignore is missing");
  const ignored = fs
    .readFileSync(gitignorePath, "utf8")
    .split(/\r?\n/)
    .some((line) => line.trim() === ".agents/");
  if (!ignored) throw new Error(".agents/ is not ignored; refusing local setup");
}

function writeCommit(skillOptPath) {
  const commit = run("git", ["rev-parse", "HEAD"], { cwd: skillOptPath }).trim();
  const commitPath = path.join(root, ".agents/tools/SkillOpt.commit");
  fs.mkdirSync(path.dirname(commitPath), { recursive: true });
  fs.writeFileSync(commitPath, `${commit}\n`, "utf8");
  return commit;
}

function setupSkillOpt(args, skillOptPath, steps) {
  fs.mkdirSync(path.dirname(skillOptPath), { recursive: true });
  if (!fs.existsSync(skillOptPath)) {
    run("git", ["clone", args.repo, skillOptPath], { inherit: true, timeout: 1200000 });
    steps.push("cloned SkillOpt");
  } else {
    steps.push("reused existing SkillOpt checkout");
  }

  if (args.ref) {
    run("git", ["fetch", "--tags", "--all"], {
      cwd: skillOptPath,
      inherit: true,
      timeout: 1200000,
    });
    run("git", ["checkout", args.ref], { cwd: skillOptPath, inherit: true });
    steps.push(`checked out ${args.ref}`);
  }

  const commit = writeCommit(skillOptPath);
  steps.push(`recorded SkillOpt commit ${commit}`);

  const pythonStatus = ensurePythonReady(args, skillOptPath, steps);

  if (!args.skipInstall) {
    const py = venvPython(skillOptPath);
    if (
      pythonStatus.selected === "uv" ||
      (pythonStatus.selected === "existing-venv" &&
        args.pythonManager !== "local" &&
        pythonStatus.uv.installed)
    ) {
      const uv = resolveUvCommand();
      if (!uv) throw new Error("uv is required for the selected Python setup but was not found.");
      run(uv, ["pip", "install", "--python", py, "-e", "."], {
        cwd: skillOptPath,
        inherit: true,
        timeout: 1200000,
      });
    } else {
      run(py, ["-m", "pip", "install", "-e", "."], {
        cwd: skillOptPath,
        inherit: true,
        timeout: 1200000,
      });
    }
    run(py, ["-c", "import skillopt; print('SkillOpt import ok')"], {
      cwd: skillOptPath,
      inherit: true,
    });
    steps.push("installed SkillOpt editable package");
  } else {
    steps.push("skipped pip install by request");
  }
}

function runBundledScript(script, args, options = {}) {
  return run(process.execPath, [path.join(skillRoot, "scripts", script), ...args], options);
}

function readinessSummary(args) {
  const result = commandResult(
    process.execPath,
    [
      path.join(skillRoot, "scripts/check-skillopt-readiness.mjs"),
      "--skill",
      args.skill,
      "--mode",
      args.mode,
      "--run-profile",
      args.runProfile,
      "--python-manager",
      args.pythonManager,
      "--python",
      args.python,
      "--no-codex-probe",
      "--json",
    ],
    { timeout: 300000 },
  );

  if (!result.stdout) {
    return {
      available: false,
      error: redact(result.stderr || "Readiness check produced no output"),
    };
  }

  try {
    const readiness = JSON.parse(result.stdout);
    const modelPinBlockers = Object.values(readiness.modelPins || {})
      .filter((pin) => pin.status === "env_missing")
      .map((pin) => pin.env)
      .filter(Boolean);
    return {
      available: true,
      setup_readiness: readiness.setupReadiness || (readiness.safe_to_setup ? "ready" : "blocked"),
      setup_blockers: readiness.setupBlockers || [],
      training_readiness:
        readiness.trainingReadiness || (readiness.ok ? "ready" : "blocked"),
      training_blockers: readiness.trainingBlockers || readiness.missing || [],
      proof_status: readiness.proofStatus,
      proof_blockers: readiness.proofBlockers || [],
      skillopt_commit: readiness.skillopt?.commit || null,
      target_maturity: readiness.maturity,
      target_path: readiness.skill_path,
      data_floor: readiness.benchmarkQuality?.officialFloorMet
        ? "official floor met"
        : "official floor not met",
      benchmark_classification: readiness.benchmarkQuality?.classification,
      dataset_counts: readiness.datasetCounts,
      model_pin_blockers: [...new Set(modelPinBlockers)],
      adapter_manifest: readiness.adapterManifestCheck || null,
      codex_probe: args.mode.includes("codex")
        ? "not run during dry-run; ask before running the login probe"
        : "not required",
      provider_free_alternative:
        args.mode !== "codex-cli-all" &&
        (readiness.proofBlockers || []).some((blocker) =>
          blocker.includes("provider-backed optimizer credentials"),
        )
          ? "choose codex-cli-all for provider-free exploratory setup through Codex CLI login"
          : null,
      warnings: readiness.warnings || [],
    };
  } catch (error) {
    return {
      available: false,
      error: redact(`Readiness JSON could not be parsed: ${error.message}`),
    };
  }
}

function productionQuestion(args, plan) {
  const setupPhrase = plan.existing_setup.present
    ? "using the existing .agents setup"
    : "creating the .agents setup";
  return `Continue with production-grade setup for ${args.skill} ${setupPhrase} in ${args.mode} ${args.runProfile} mode?`;
}

function printReadinessSummary(summary) {
  console.log("");
  console.log("Readiness summary:");
  if (!summary.available) {
    console.log(`- unavailable: ${summary.error}`);
    return;
  }
  console.log(`- Target: ${summary.target_path || "<unresolved>"} (${summary.target_maturity})`);
  if (summary.skillopt_commit) {
    console.log(`- SkillOpt commit: ${summary.skillopt_commit}`);
  }
  console.log(`- Setup readiness: ${summary.setup_readiness}`);
  if (summary.setup_blockers.length) {
    console.log(`- Setup blockers: ${summary.setup_blockers.join("; ")}`);
  }
  console.log(`- Training readiness: ${summary.training_readiness}`);
  if (summary.training_blockers.length) {
    console.log(`- Training blockers: ${summary.training_blockers.join("; ")}`);
  }
  console.log(`- Proof status: ${summary.proof_status}`);
  if (summary.proof_blockers.length) {
    console.log(`- Proof blockers: ${summary.proof_blockers.join("; ")}`);
  }
  console.log(`- Data floor: ${summary.data_floor}; ${summary.benchmark_classification}`);
  if (summary.dataset_counts) {
    const generated = summary.dataset_counts.generated || {};
    console.log(
      `- Data: ${summary.dataset_counts.eval_positive} positive, ${summary.dataset_counts.eval_negative} negative; generated split train ${generated.train}, val ${generated.val}, test ${generated.test}`,
    );
  }
  if (summary.model_pin_blockers.length) {
    console.log(`- Missing model pin env: ${summary.model_pin_blockers.join(", ")}`);
  }
  if (summary.adapter_manifest && summary.adapter_manifest.status !== "matched") {
    console.log(`- Adapter manifest: ${summary.adapter_manifest.status}`);
  }
  console.log(`- Codex login probe: ${summary.codex_probe}`);
  if (summary.provider_free_alternative) {
    console.log(`- Provider-free alternative: ${summary.provider_free_alternative}.`);
  }
}

function printTrainingHandoff(plan) {
  console.log("Recommended SkillOpt start command:");
  console.log(
    "Paste this into a new terminal from the repo root. It streams logs, then prints the result summary and dry-run adoption preview automatically:",
  );
  console.log("```bash");
  console.log(plan.terminal_training_command);
  console.log("```");
  console.log("");
  console.log(
    "Rerunning the same command should resume from SkillOpt runtime state for the same output directory when that file exists.",
  );
  console.log("");
  console.log("Manual result commands, if you want to rerun them later:");
  for (const step of plan.post_training_steps) {
    console.log(`# ${step.description}`);
    console.log("```bash");
    console.log(step.command);
    console.log("```");
  }
  console.log("");
  console.log(plan.agent_execution_question);
}

function printExistingSetupChoice(plan) {
  if (!plan.existing_setup.present) return;
  console.log("");
  console.log("Existing local SkillOpt setup detected:");
  for (const entry of plan.existing_setup.paths) {
    console.log(`- ${entry.kind}: ${entry.path}`);
  }
  console.log("");
  console.log(
    "Cleanup is global to the local SkillOpt setup: it removes .agents/tools/SkillOpt, .agents/tools/SkillOpt.commit, and all .agents/skillopt-work contents. It does not remove .agents/skills.",
  );
  console.log("Dry-run did not remove it.");
}

function existingSetupChoiceRequired(args, plan) {
  return (
    plan.existing_setup.present &&
    !args.existingSetupChoice &&
    !args.resetExisting &&
    !args.cleanupOnly
  );
}

function dryRunPlan(plan) {
  return {
    local_workspace: plan.local_workspace,
    existing_setup: plan.existing_setup,
    run_profile: plan.run_profile,
    runProfile: plan.run_profile,
    python_alternatives: plan.python_alternatives,
  };
}

const args = parseArgs(process.argv.slice(2));
const skillOptPath = path.resolve(root, args.skillopt);
const plan = commandPlan(args, skillOptPath);
const pythonStatus = detectPython(args);

if (!args.approved) {
  if (existingSetupChoiceRequired(args, plan)) {
    const nextQuestion = "Remove the current local SkillOpt setup before continuing, or reuse/update it?";
    const result = {
      ok: false,
      dry_run: true,
      blocked: "existing_setup_choice_required",
      message:
        "Current local SkillOpt setup exists. Ask whether to remove it before continuing or reuse/update it.",
      selected_mode: args.mode,
      run_profile: args.runProfile,
      runProfile: args.runProfile,
      target_skill: args.skill,
      plan: dryRunPlan(plan),
      cleanup_scope:
        "global .agents SkillOpt setup only: .agents/tools/SkillOpt, .agents/tools/SkillOpt.commit, and .agents/skillopt-work; excludes .agents/skills",
      next_question: nextQuestion,
    };
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log("Current local SkillOpt setup detected:");
      for (const entry of plan.existing_setup.paths) {
        console.log(`- ${entry.kind}: ${entry.path}`);
      }
      console.log("");
      console.log(
        "Cleanup is global to the local SkillOpt setup: it removes .agents/tools/SkillOpt, .agents/tools/SkillOpt.commit, and all .agents/skillopt-work contents. It does not remove .agents/skills.",
      );
      console.log("");
      console.log("Choose before dry-run or production-grade setup:");
      console.log(nextQuestion);
    }
    process.exit(0);
  }

  const readiness = readinessSummary(args);
  const nextQuestion = productionQuestion(args, plan);
  const dryRun = {
    ok: true,
    dry_run: true,
    message: plan.existing_setup.present
      ? "Dry-run complete. Existing setup is present and unchanged."
      : "Dry-run complete. Ask whether to continue with production-grade setup.",
    selected_mode: args.mode,
    run_profile: args.runProfile,
    runProfile: args.runProfile,
    mode_note: modeNote(args.mode, args.runProfile),
    target_skill: args.skill,
    python: pythonStatus,
    readiness,
    plan: dryRunPlan(plan),
    next_question: nextQuestion,
  };
  if (args.json) console.log(JSON.stringify(dryRun, null, 2));
  else {
    console.log("SkillOpt local setup dry run");
    console.log(`Target skill: ${args.skill}`);
    console.log(`Mode: ${args.mode}`);
    console.log(`Run profile: ${args.runProfile}`);
    console.log(`Mode note: ${modeNote(args.mode, args.runProfile)}`);
    console.log(`Workspace: ${plan.local_workspace}`);
    console.log(`Python setup: ${pythonStatus.uv.installed ? "uv" : pythonStatus.action_required}`);
    printExistingSetupChoice(plan);
    printReadinessSummary(readiness);
    if (pythonStatus.action_required) {
      console.log("");
      console.log("Python setup alternatives:");
      console.log(`- Install uv: ${plan.python_alternatives.install_uv}`);
      console.log(`- Use local Python: ${plan.python_alternatives.use_local_python}`);
    }
    console.log("");
    console.log(`Next question: ${nextQuestion}`);
  }
  process.exit(0);
}

const steps = [];
try {
  ensureAgentsIgnored();
  if (args.cleanupOnly) {
    if (!args.approved) throw new Error("--cleanup-only requires --approved");
    removeExistingSetup(args, skillOptPath, steps);
    const result = {
      ok: true,
      cleanup_only: true,
      steps,
    };
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log("SkillOpt local setup cleanup complete.");
      for (const step of steps) console.log(`- ${step}`);
    }
    process.exit(0);
  }
  if (args.approved && existingSetupChoiceRequired(args, plan)) {
    throw new Error(
      "Current local SkillOpt setup exists. Ask whether to clean it up or reuse/update it before production-grade setup.",
    );
  }
  if (args.resetExisting) removeExistingSetup(args, skillOptPath, steps);
  setupSkillOpt(args, skillOptPath, steps);

  runBundledScript("prepare-skillopt-split.mjs", ["--skill", args.skill, "--seed", args.seed], {
    inherit: true,
  });
  steps.push("prepared split data");

  runBundledScript(
    "prepare-local-skillopt-adapter.mjs",
    [
      "--skill",
      args.skill,
      "--skillopt",
      relative(skillOptPath),
      "--mode",
      args.mode,
      "--run-profile",
      args.runProfile,
      "--run-name",
      args.runName,
    ],
    { inherit: true },
  );
  steps.push("prepared local adapter and configs");

  if (args.probeCodex && args.mode.includes("codex")) {
    runBundledScript("probe-codex-cli.mjs", ["--json"], { inherit: true, timeout: 300000 });
    steps.push("ran Codex CLI login probe");
  }

  const result = {
    ok: true,
    dry_run: false,
    selected_mode: args.mode,
    run_profile: args.runProfile,
    runProfile: args.runProfile,
    target_skill: args.skill,
    skillopt_path: relative(skillOptPath),
    steps,
    recommended_training_location: plan.recommended_training_location,
    terminal_training_command: plan.terminal_training_command,
    continue_after_setup: plan.continue_after_setup,
    post_training_steps: plan.post_training_steps,
    post_training_commands: plan.post_training_commands,
    eval_only_command: plan.eval_only_command,
    webui_command: plan.webui_command,
    agent_execution_question: plan.agent_execution_question,
  };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log("");
    console.log("SkillOpt local setup complete.");
    for (const step of steps) console.log(`- ${step}`);
    console.log("");
    printTrainingHandoff(plan);
  }
} catch (error) {
  const result = {
    ok: false,
    dry_run: false,
    selected_mode: args.mode,
    target_skill: args.skill,
    skillopt_path: relative(skillOptPath),
    completed_steps: steps,
    error: redact(error.message),
  };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.error("SkillOpt local setup failed.");
    for (const step of steps) console.error(`- ${step}`);
    console.error(redact(error.message));
  }
  process.exit(1);
}
