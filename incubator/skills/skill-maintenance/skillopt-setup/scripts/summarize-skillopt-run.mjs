#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { verifyRunArtifacts } from "./verify-skillopt-run-artifacts.mjs";

const root = process.cwd();

function parseArgs(argv) {
  const args = {
    write: false,
    json: false,
    terminal: false,
    date: new Date().toISOString().slice(0, 10),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg === "--write") args.write = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--terminal" || arg === "--compact") args.terminal = true;
    else if (arg === "--skill") args.skill = argv[++i];
    else if (arg === "--run") args.run = argv[++i];
    else if (arg === "--date") args.date = argv[++i];
    else fail(`Unknown argument: ${arg}`);
  }
  if (!args.skill) fail("--skill is required");
  if (!args.run) fail("--run is required");
  return args;
}

function printUsage() {
  console.log(`Usage: node summarize-skillopt-run.mjs --skill <skill> --run <run-dir> [options]

Options:
  --terminal
  --compact
  --write
  --date <yyyy-mm-dd>
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

function sha256File(file) {
  if (!fs.existsSync(file)) return "not available";
  const hash = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  return `sha256:${hash}`;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readText(file, fallback = "") {
  return fs.existsSync(file) ? redact(fs.readFileSync(file, "utf8")) : fallback;
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function countItems(file) {
  const data = readJson(file, []);
  return Array.isArray(data) ? data.length : 0;
}

function extractConfigValue(text, key) {
  const match = text.match(new RegExp(`^[ \\t]*${key}:[ \\t]*['"]?([^'"\\n#]*)`, "m"));
  return match?.[1]?.trim() || "unspecified";
}

function extractConfigLeafValue(text, key) {
  const matches = [...text.matchAll(new RegExp(`^[ \\t]+${key}:[ \\t]*['"]?([^'"\\n#]*)`, "gm"))];
  return matches.at(-1)?.[1]?.trim() || "unspecified";
}

function readManifest(skill) {
  const candidates = [
    path.join(root, ".agents/skillopt-work", skill, "adapter-manifest.json"),
    path.join(root, ".agents/skillopt-work/adapter-manifest.json"),
  ];
  for (const file of candidates) {
    const data = readJson(file, null);
    if (data) {
      return {
        path: path.relative(root, file).replaceAll("\\", "/"),
        data,
      };
    }
  }
  return { path: null, data: null };
}

function pinState(value) {
  const clean = String(value || "").trim();
  const envMatch = clean.match(/^\$\{([A-Z0-9_]+)\}$/);
  if (!clean || clean === "unspecified") return "inherited default";
  if (envMatch) return process.env[envMatch[1]] ? `${clean} present` : `${clean} missing`;
  return clean;
}

function codexVersion() {
  const result = spawnSync("codex", ["--version"], { cwd: root, encoding: "utf8", timeout: 30000 });
  return result.status === 0
    ? redact((result.stdout || result.stderr || "").trim())
    : "not used or unavailable";
}

function skillOptCommit() {
  const commitFile = path.join(root, ".agents/tools/SkillOpt.commit");
  if (fs.existsSync(commitFile)) {
    const recorded = fs.readFileSync(commitFile, "utf8").trim();
    if (/^[a-f0-9]{40}$/i.test(recorded)) return recorded;
  }
  const skillOptPath = path.join(root, ".agents/tools/SkillOpt");
  const head = path.join(skillOptPath, ".git/HEAD");
  if (!fs.existsSync(head)) return "not recorded";
  const value = fs.readFileSync(head, "utf8").trim();
  if (!value.startsWith("ref: ")) return value;
  const refFile = path.join(skillOptPath, ".git", value.slice(5));
  return fs.existsSync(refFile) ? fs.readFileSync(refFile, "utf8").trim() : value;
}

const args = parseArgs(process.argv.slice(2));
const runDir = path.resolve(root, args.run);
if (!fs.existsSync(runDir)) fail(`Run path does not exist: ${path.relative(root, runDir)}`);

const runName = path.basename(runDir);
const workDir = path.join(root, ".agents/skillopt-work", args.skill);
const manifest = readManifest(args.skill);
const summaryJson = readJson(path.join(runDir, "summary.json"), null);
const initialSkillHash = readText(
  path.join(workDir, "initial/initial-skill.sha256"),
  "not available",
).trim();
const bestSkill = path.join(runDir, "best_skill.md");
const history = readJson(path.join(runDir, "history.json"), null);
const configJson = readJson(path.join(runDir, "config.json"), null);
const resolvedConfig = summaryJson?.config || configJson || {};
const configYamlPath =
  configJson?.config_path ||
  [
    "agent-skills.hybrid-codex-target.yaml",
    "agent-skills.native-provider.yaml",
    "agent-skills.codex-cli-all.yaml",
  ]
    .map((file) => path.join(workDir, "configs", file))
    .find((file) => fs.existsSync(file));
const configYaml = configYamlPath ? readText(configYamlPath) : "";
const executionMode = resolvedConfig.reflection_backend === "codex_cli"
  ? "codex-cli-all"
  : resolvedConfig.target_backend === "codex_exec" || configYaml.includes("target_backend: codex_exec")
    ? "hybrid-codex-target"
    : "native-provider";
const targetBackend = resolvedConfig.target_backend || extractConfigValue(configYaml, "target_backend");
const judgeBackend = resolvedConfig.judge_backend || extractConfigValue(configYaml, "judge_backend");
const optimizerBackend =
  executionMode === "codex-cli-all"
    ? "adapter-managed codex_cli"
    : resolvedConfig.optimizer_backend || extractConfigValue(configYaml, "optimizer_backend");
const rawRunProfile =
  manifest.data?.runProfile ||
  manifest.data?.run_profile ||
  resolvedConfig.run_profile ||
  extractConfigValue(configYaml, "run_profile") ||
  (executionMode === "codex-cli-all" ? "exploratory" : "official-parity");
const runProfile =
  rawRunProfile === "<run-profile>"
    ? executionMode === "codex-cli-all"
      ? "exploratory"
      : "official-parity"
    : rawRunProfile;
const officialParityStatus =
  manifest.data?.officialParityStatus ||
  manifest.data?.official_parity_status ||
  (executionMode === "codex-cli-all" ? "exploratory" : "not recorded");
const officialParityGaps = manifest.data?.officialParityGaps || manifest.data?.official_parity_gaps || [];
const upstreamBehaviorBypassed =
  manifest.data?.upstreamBehaviorBypassed || manifest.data?.upstream_behavior_bypassed || [];
const modelPins = {
  optimizer: pinState(resolvedConfig.optimizer || extractConfigLeafValue(configYaml, "optimizer")),
  target: pinState(resolvedConfig.target || extractConfigLeafValue(configYaml, "target")),
  codex_cli_judge_model: pinState(
    resolvedConfig.codex_cli_judge_model ||
      extractConfigLeafValue(configYaml, "codex_cli_judge_model"),
  ),
  codex_cli_reflection_model: pinState(
    resolvedConfig.codex_cli_reflection_model ||
      extractConfigLeafValue(configYaml, "codex_cli_reflection_model"),
  ),
};
const configDefaults = {
  num_epochs: resolvedConfig.num_epochs || extractConfigValue(configYaml, "num_epochs"),
  batch_size: resolvedConfig.batch_size || extractConfigValue(configYaml, "batch_size"),
  workers: resolvedConfig.workers || extractConfigValue(configYaml, "workers"),
  learning_rate: resolvedConfig.learning_rate || extractConfigValue(configYaml, "learning_rate"),
  min_learning_rate:
    resolvedConfig.min_learning_rate || extractConfigValue(configYaml, "min_learning_rate"),
  lr_scheduler: resolvedConfig.lr_scheduler || extractConfigValue(configYaml, "lr_scheduler"),
  use_slow_update:
    resolvedConfig.use_slow_update || extractConfigValue(configYaml, "use_slow_update"),
  use_meta_skill: resolvedConfig.use_meta_skill || extractConfigValue(configYaml, "use_meta_skill"),
  scale_down_reason:
    executionMode === "hybrid-codex-target"
      ? "Hybrid Codex CLI target rollouts use smaller batch/workers than the upstream provider-backed default."
      : "",
};
const verification = verifyRunArtifacts({ root, skill: args.skill, run: runDir });
const artifactStatus = verification.artifactChecklist;

const recordedSkillOptCommit = skillOptCommit();
const dataDir = path.join(workDir, "data");
const counts = {
  train: countItems(path.join(dataDir, "train/items.json")),
  val: countItems(path.join(dataDir, "val/items.json")),
  test: countItems(path.join(dataDir, "test/items.json")),
  activation_negative: countItems(path.join(workDir, "activation/negative-cases.json")),
};

const rows = ["train", "val", "test"].map((split) => {
  const splitResult = history?.results?.[split] || history?.[split] || {};
  return `| ${split} | ${splitResult.hard_score ?? "..."} | ${splitResult.soft_score ?? "..."} | ${splitResult.notes ?? "not recorded"} |`;
});

const targetSkillCandidates = [
  path.join(root, "skills", "*", args.skill, "SKILL.md"),
  path.join(root, "incubator/skills", "*", args.skill, "SKILL.md"),
];
const targetSkillPath =
  findSkill(args.skill) ||
  targetSkillCandidates.map((file) => file.replaceAll("\\", "/")).join(" or ");
const trainingLog = path.join(runDir, "training.log");
const metrics = {
  baseline_selection_hard: summaryJson?.baseline_selection_hard ?? "not recorded",
  best_selection_hard: summaryJson?.best_selection_hard ?? "not recorded",
  baseline_test_hard: summaryJson?.baseline_test_hard ?? "not recorded",
  test_hard: summaryJson?.test_hard ?? "not recorded",
  test_delta_hard: summaryJson?.test_delta_hard ?? "not recorded",
  total_steps: summaryJson?.total_steps ?? "not recorded",
  total_accepts: summaryJson?.total_accepts ?? "not recorded",
  total_rejects: summaryJson?.total_rejects ?? "not recorded",
  total_skips: summaryJson?.total_skips ?? "not recorded",
  best_step: summaryJson?.best_step ?? "not recorded",
  total_wall_time_s: summaryJson?.total_wall_time_s ?? "not recorded",
};

function formatMetric(value) {
  return typeof value === "number" ? value.toFixed(4) : String(value);
}

function formatDuration(seconds) {
  if (typeof seconds !== "number") return String(seconds);
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${rest}s`;
}

const markdown = `# SkillOpt Run Summary: ${args.skill}

Date: ${args.date}
SkillOpt commit: ${recordedSkillOptCommit}
Target skill path: ${targetSkillPath}
Initial skill hash: ${initialSkillHash}
Best skill hash: ${sha256File(bestSkill)}
Execution mode: ${executionMode}
Run profile: ${runProfile}
Official-parity status: ${officialParityStatus}
Proof status: ${verification.proofStatus}
Optimizer backend: ${optimizerBackend}
Target backend: ${targetBackend}
Judge backend: ${judgeBackend || "heuristic"}
Codex CLI version: ${targetBackend === "codex_exec" || judgeBackend === "codex_cli" ? codexVersion() : "not used"}
Config: ${configYamlPath ? path.relative(root, configYamlPath).replaceAll("\\", "/") : "not recorded"}
Adapter manifest: ${manifest.path || "not recorded"}

## Official-Parity Checklist

- Status: ${officialParityStatus}
- Proof status: ${verification.proofStatus}
- Proof blockers: ${verification.proofBlockers.length ? verification.proofBlockers.join("; ") : "none"}
- Gaps: ${officialParityGaps.length ? officialParityGaps.join("; ") : "none recorded"}
- Upstream behavior bypassed: ${upstreamBehaviorBypassed.length ? upstreamBehaviorBypassed.join("; ") : "none recorded"}
- Model pins: optimizer=${modelPins.optimizer}; target=${modelPins.target}; judge=${modelPins.codex_cli_judge_model}; reflection=${modelPins.codex_cli_reflection_model}
- Config defaults: epochs=${configDefaults.num_epochs}, batch=${configDefaults.batch_size}, workers=${configDefaults.workers}, lr=${configDefaults.learning_rate}, min_lr=${configDefaults.min_learning_rate}, scheduler=${configDefaults.lr_scheduler}, slow_update=${configDefaults.use_slow_update}, meta_skill=${configDefaults.use_meta_skill}
- Scale-down reason: ${configDefaults.scale_down_reason || "none"}

## Dataset

- Train cases: ${counts.train}
- Validation cases: ${counts.val}
- Test cases: ${counts.test}
- Excluded activation-only negative cases: ${counts.activation_negative}

## Result Snapshot

- Selection hard: ${formatMetric(metrics.baseline_selection_hard)} -> ${formatMetric(metrics.best_selection_hard)}
- Test hard: ${formatMetric(metrics.baseline_test_hard)} -> ${formatMetric(metrics.test_hard)} (delta ${formatMetric(metrics.test_delta_hard)})
- Steps: ${metrics.total_steps}; accepted ${metrics.total_accepts}, rejected ${metrics.total_rejects}, skipped ${metrics.total_skips}
- Best step: ${metrics.best_step}
- Wall time: ${formatDuration(metrics.total_wall_time_s)}
- Training log: ${relative(trainingLog)}
- Best skill: ${relative(bestSkill)}
- Eval-only status: ${verification.evalOnlyStatus}
- WebUI status: ${verification.webuiStatus.status} (${verification.webuiStatus.detail})

## Expected Local Artifacts

${artifactStatus.map((artifact) => `- ${artifact.name}: ${artifact.exists ? "present" : "missing"} (${artifact.path})`).join("\n")}

## Results

| Split | Hard score | Soft score | Notes |
| --- | ---: | ---: | --- |
${rows.join("\n")}

## Accepted candidate?

Status: Proposed

## Human review notes

- Pending maintainer review.

## Adoption changes

- Preserved frontmatter: not reviewed
- Changed body sections: not reviewed
- Public skill version bumped: not applicable

## Validation

\`\`\`bash
npm run validate
npm run list:incubator
\`\`\`

Result: not run for this summary

## Redaction statement

Raw trajectories, provider credentials, Codex auth tokens, private paths, and local workspace files were not committed.
`;

function findSkill(skill) {
  for (const base of [path.join(root, "skills"), path.join(root, "incubator/skills")]) {
    if (!fs.existsSync(base)) continue;
    for (const category of fs.readdirSync(base)) {
      const file = path.join(base, category, skill, "SKILL.md");
      if (fs.existsSync(file)) return path.relative(root, file).replaceAll("\\", "/");
    }
  }
  return null;
}

let outputPath = null;
if (args.write) {
  outputPath = path.join(
    root,
    "skill-evals",
    args.skill,
    "runs",
    `${args.date}-skillopt-${runName}.md`,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, "utf8");
}

const result = {
  ok: true,
  summary_path: outputPath ? path.relative(root, outputPath).replaceAll("\\", "/") : null,
  execution_mode: executionMode,
  optimizer_backend: optimizerBackend,
  target_backend: targetBackend,
  judge_backend: judgeBackend,
  run_profile: runProfile,
  official_parity_status: officialParityStatus,
  proof_status: verification.proofStatus,
  proof_blockers: verification.proofBlockers,
  official_parity_gaps: officialParityGaps,
  upstream_behavior_bypassed: upstreamBehaviorBypassed,
  model_pins: modelPins,
  config_defaults: configDefaults,
  artifact_status: artifactStatus,
  artifact_checklist: artifactStatus,
  eval_only_status: verification.evalOnlyStatus,
  webui_status: verification.webuiStatus,
  counts,
  metrics,
};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (args.terminal) {
  console.log(`SkillOpt result: ${args.skill}`);
  console.log(`Run: ${relative(runDir)}`);
  console.log(
    `Mode: ${executionMode}; optimizer: ${optimizerBackend}; target: ${targetBackend}; judge: ${judgeBackend || "heuristic"}`,
  );
  console.log(`Run profile: ${runProfile}; official-parity status: ${officialParityStatus}`);
  console.log(`Proof status: ${verification.proofStatus}`);
  if (verification.proofBlockers.length)
    console.log(`Proof blockers: ${verification.proofBlockers.join("; ")}`);
  if (officialParityGaps.length) console.log(`Official-parity gaps: ${officialParityGaps.join("; ")}`);
  if (upstreamBehaviorBypassed.length)
    console.log(`Upstream behavior bypassed: ${upstreamBehaviorBypassed.join("; ")}`);
  console.log(
    `Model pins: optimizer=${modelPins.optimizer}; target=${modelPins.target}; judge=${modelPins.codex_cli_judge_model}; reflection=${modelPins.codex_cli_reflection_model}`,
  );
  if (configDefaults.scale_down_reason) {
    console.log(`Scale-down reason: ${configDefaults.scale_down_reason}`);
  }
  console.log(
    `Dataset: train ${counts.train}, val ${counts.val}, test ${counts.test}, activation-only negative ${counts.activation_negative}`,
  );
  console.log(
    `Selection hard: ${formatMetric(metrics.baseline_selection_hard)} -> ${formatMetric(metrics.best_selection_hard)}`,
  );
  console.log(
    `Test hard: ${formatMetric(metrics.baseline_test_hard)} -> ${formatMetric(metrics.test_hard)} (delta ${formatMetric(metrics.test_delta_hard)})`,
  );
  console.log(
    `Steps: ${metrics.total_steps}; accepted ${metrics.total_accepts}, rejected ${metrics.total_rejects}, skipped ${metrics.total_skips}; best step ${metrics.best_step}`,
  );
  console.log(`Wall time: ${formatDuration(metrics.total_wall_time_s)}`);
  console.log(
    `Expected artifacts: ${artifactStatus.map((artifact) => `${artifact.name}=${artifact.exists ? "present" : "missing"}`).join(", ")}`,
  );
  console.log(`Eval-only status: ${verification.evalOnlyStatus}`);
  console.log(`WebUI status: ${verification.webuiStatus.status} (${verification.webuiStatus.detail})`);
  console.log(`Best skill: ${relative(bestSkill)}${fs.existsSync(bestSkill) ? "" : " (missing)"}`);
  console.log(`Training log: ${relative(trainingLog)}${fs.existsSync(trainingLog) ? "" : " (missing)"}`);
} else {
  if (outputPath) console.log(`Wrote ${path.relative(root, outputPath).replaceAll("\\", "/")}`);
  else console.log(markdown);
}
