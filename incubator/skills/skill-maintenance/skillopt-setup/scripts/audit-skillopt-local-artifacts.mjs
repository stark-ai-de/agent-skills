#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const skillRoot = path.resolve(path.dirname(scriptPath), "..");
const defaultRoot = process.cwd();
const skipDirs = new Set([".git", ".venv", "node_modules", "__pycache__"]);
const MAX_STAT_ENTRIES = 20_000;
const MAX_WALK_ENTRIES = 20_000;
const MAX_OUTPUT_ENTRIES = 100_000;
const MAX_RUN_DIRECTORIES = 4_096;
const knownTemplateMap = new Map([
  [
    ".agents/tools/SkillOpt/skillopt/envs/agent_skills/adapter.py",
    "assets/agent-skills-benchmark/adapter.py.template",
  ],
  [
    ".agents/tools/SkillOpt/skillopt/envs/agent_skills/dataloader.py",
    "assets/agent-skills-benchmark/dataloader.py.template",
  ],
  [
    ".agents/tools/SkillOpt/skillopt/envs/agent_skills/rollout.py",
    "assets/agent-skills-benchmark/rollout.py.template",
  ],
  [
    ".agents/tools/SkillOpt/skillopt/envs/agent_skills/evaluator.py",
    "assets/agent-skills-benchmark/evaluator.py.template",
  ],
  [
    ".agents/tools/SkillOpt/skillopt/envs/agent_skills/codex_cli_reflector.py",
    "assets/agent-skills-benchmark/codex_cli_reflector.py.template",
  ],
  [
    ".agents/tools/SkillOpt/configs/agent_skills/native-provider.yaml",
    "assets/agent-skills-benchmark/config.native-provider.yaml",
  ],
  [
    ".agents/tools/SkillOpt/configs/agent_skills/hybrid-codex-target.yaml",
    "assets/agent-skills-benchmark/config.hybrid-codex-target.yaml",
  ],
  [
    ".agents/tools/SkillOpt/configs/agent_skills/codex-cli-all.yaml",
    "assets/agent-skills-benchmark/config.codex-cli-all.yaml",
  ],
]);

function parseArgs(argv) {
  const args = { root: defaultRoot, skill: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--json") args.json = true;
    else if (arg === "--root") args.root = path.resolve(argv[++i] || "");
    else if (arg === "--skill") args.skill = argv[++i] || null;
    else fail(`Unknown argument: ${arg}`);
  }
  if (!args.root) fail("--root requires a path");
  return args;
}

function printHelp() {
  console.log(`Usage: node audit-skillopt-local-artifacts.mjs [options]

Options:
  --skill <skill>
  --root <repo-root>
  --json
  --help`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function exists(file) {
  return fs.existsSync(file);
}

function rel(root, file) {
  return path.relative(root, file).replaceAll("\\", "/") || ".";
}

function displayPath(root, file) {
  if (!file) return null;
  const relative = rel(root, file);
  return relative.startsWith("..") ? "[loaded skill package]" : relative;
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function readJson(file) {
  if (!exists(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function statDir(dir, depth = 0, maxDepth = 4) {
  const stats = {
    exists: exists(dir),
    files: 0,
    directories: 0,
    bytes: 0,
    skipped_directories: [],
    entries_scanned: 0,
    scan_limit_reached: false,
  };
  if (!stats.exists) return stats;
  function visit(current, currentDepth) {
    if (currentDepth > maxDepth || stats.scan_limit_reached) return;
    const handle = fs.opendirSync(current);
    try {
      let entry;
      while ((entry = handle.readSync()) !== null) {
        stats.entries_scanned += 1;
        if (stats.entries_scanned > MAX_STAT_ENTRIES) {
          stats.scan_limit_reached = true;
          return;
        }
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stats.directories += 1;
          if (skipDirs.has(entry.name)) {
            stats.skipped_directories.push(rel(dir, full));
            continue;
          }
          visit(full, currentDepth + 1);
        } else if (entry.isFile()) {
          stats.files += 1;
          stats.bytes += fs.statSync(full).size;
        }
      }
    } finally {
      handle.closeSync();
    }
  }
  visit(dir, depth);
  stats.skipped_directories = [...new Set(stats.skipped_directories)].sort();
  return stats;
}

function walk(dir, options = {}) {
  if (!exists(dir)) return [];
  const maxFiles = options.maxFiles || 1000;
  const maxEntries = options.maxEntries || MAX_WALK_ENTRIES;
  const maxDepth = options.maxDepth || 8;
  const files = [];
  let entries = 0;
  function visit(current, depth) {
    if (files.length >= maxFiles || entries >= maxEntries || depth > maxDepth)
      return;
    const handle = fs.opendirSync(current);
    try {
      let entry;
      while ((entry = handle.readSync()) !== null) {
        entries += 1;
        if (entries > maxEntries) return;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (skipDirs.has(entry.name)) continue;
          visit(full, depth + 1);
        } else if (entry.isFile()) {
          files.push(full);
          if (files.length >= maxFiles) return;
        }
      }
    } finally {
      handle.closeSync();
    }
  }
  visit(dir, 0);
  return files;
}

function discoverRunSummaries(outputs) {
  const result = {
    files: [],
    entries_scanned: 0,
    run_directories_scanned: 0,
    scan_limit_reached: false,
    layout: "outputs/<run-directory>/summary.json",
  };
  if (!exists(outputs)) return result;
  const handle = fs.opendirSync(outputs);
  try {
    let entry;
    while ((entry = handle.readSync()) !== null) {
      result.entries_scanned += 1;
      if (result.entries_scanned > MAX_OUTPUT_ENTRIES) {
        result.scan_limit_reached = true;
        break;
      }
      if (!entry.isDirectory() || skipDirs.has(entry.name)) continue;
      result.run_directories_scanned += 1;
      if (result.run_directories_scanned > MAX_RUN_DIRECTORIES) {
        result.scan_limit_reached = true;
        break;
      }
      const summary = path.join(outputs, entry.name, "summary.json");
      let stat;
      try {
        stat = fs.lstatSync(summary);
      } catch {
        continue;
      }
      if (stat.isFile() && !stat.isSymbolicLink()) result.files.push(summary);
    }
  } finally {
    handle.closeSync();
  }
  result.files.sort();
  return result;
}

function listFiles(dir) {
  return walk(dir, { maxFiles: 5000 })
    .map((file) => rel(dir, file))
    .filter((file) => !file.endsWith(".pyc"))
    .sort();
}

function compareDirectories(left, right) {
  if (!exists(left)) return { status: "missing_installed_copy" };
  const leftFiles = new Set(listFiles(left));
  const rightFiles = new Set(listFiles(right));
  const missing = [...rightFiles].filter((file) => !leftFiles.has(file));
  const extra = [...leftFiles].filter((file) => !rightFiles.has(file));
  const changed = [...leftFiles]
    .filter((file) => rightFiles.has(file))
    .filter(
      (file) =>
        sha256File(path.join(left, file)) !==
        sha256File(path.join(right, file)),
    );
  return {
    status:
      missing.length || extra.length || changed.length ? "differs" : "matched",
    installed_files: leftFiles.size,
    tracked_files: rightFiles.size,
    missing_from_installed: missing.slice(0, 25),
    extra_in_installed: extra.slice(0, 25),
    changed: changed.slice(0, 25),
    truncated: missing.length > 25 || extra.length > 25 || changed.length > 25,
  };
}

function compareKnownTemplates(root) {
  const checks = [];
  for (const [installedRel, sourceRel] of knownTemplateMap.entries()) {
    const installed = path.join(root, installedRel);
    const source = path.join(skillRoot, sourceRel);
    if (!exists(installed) || !exists(source)) continue;
    checks.push({
      installed: installedRel,
      source: sourceRel,
      status:
        sha256File(installed) === sha256File(source)
          ? "matched"
          : "differs_from_tracked_template",
    });
  }
  return checks;
}

function renderExpectedSource(root, sourceSpec) {
  const sourceRel =
    typeof sourceSpec === "string" ? sourceSpec : sourceSpec?.source;
  if (!sourceRel || typeof sourceRel !== "string")
    return { ok: false, reason: "missing_source" };
  const source = path.join(root, sourceRel);
  if (!exists(source))
    return { ok: false, reason: "source_file_missing", source: sourceRel };
  let text = fs.readFileSync(source, "utf8");
  const replacements =
    typeof sourceSpec === "object" && sourceSpec && !Array.isArray(sourceSpec)
      ? sourceSpec.replacements || {}
      : {};
  for (const [from, to] of Object.entries(replacements)) {
    text = text.replaceAll(from, String(to));
  }
  return { ok: true, source: sourceRel, hash: sha256Text(text) };
}

function auditManifest(root, manifestPath, expectedSkill, options = {}) {
  const data = readJson(manifestPath);
  const warnings = [];
  const refreshWarnings = [];
  const targetSpecific = options.targetSpecific !== false;
  if (!data) {
    return {
      path: rel(root, manifestPath),
      status: "invalid",
      target_specific: targetSpecific,
      warnings: ["manifest JSON could not be parsed"],
    };
  }
  const target =
    data.target_skill || data.proof_target || data.proofTarget || null;
  const mode = data.mode || data.selected_mode || null;
  const runProfile = data.runProfile || data.run_profile || null;
  const registryStatus =
    data.registry_patch?.status || data.registryPatch?.status || null;
  if (!targetSpecific) {
    warnings.push(
      "manifest is legacy/global compatibility copy; target-specific manifest is authoritative",
    );
  }
  if (expectedSkill && target !== expectedSkill) {
    const warning = `target identity is ${target || "missing"}, expected ${expectedSkill}`;
    warnings.push(warning);
    refreshWarnings.push(warning);
  }
  if (!target) {
    warnings.push("target identity is missing");
    refreshWarnings.push("target identity is missing");
  }
  if (!mode) {
    warnings.push("mode identity is missing");
    refreshWarnings.push("mode identity is missing");
  }
  if (!runProfile) {
    warnings.push("run profile identity is missing");
    refreshWarnings.push("run profile identity is missing");
  }
  if (registryStatus !== "ready") {
    const warning = `registry/config patch status is ${registryStatus || "unknown"}`;
    warnings.push(warning);
    refreshWarnings.push(warning);
  }
  const sources = data.template_sources || data.templateSources;
  if (!sources || typeof sources !== "object" || Array.isArray(sources)) {
    warnings.push("template freshness metadata is missing");
    refreshWarnings.push("template freshness metadata is missing");
  } else {
    for (const [installedRel, sourceSpec] of Object.entries(sources)) {
      const installed = path.join(root, installedRel);
      if (!exists(installed)) {
        const warning = `installed file is missing: ${installedRel}`;
        warnings.push(warning);
        refreshWarnings.push(warning);
        continue;
      }
      const expected = renderExpectedSource(root, sourceSpec);
      if (!expected.ok) {
        const warning = `tracked source unavailable for ${installedRel}: ${expected.reason}`;
        warnings.push(warning);
        refreshWarnings.push(warning);
        continue;
      }
      if (sha256File(installed) !== expected.hash) {
        const warning = `installed file differs from tracked source: ${installedRel}`;
        warnings.push(warning);
        refreshWarnings.push(warning);
      }
    }
  }
  return {
    path: rel(root, manifestPath),
    status: refreshWarnings.length
      ? "refresh_required"
      : targetSpecific
        ? "matched"
        : "legacy_compatibility_copy",
    target_specific: targetSpecific,
    target,
    mode,
    run_profile: runProfile,
    registry_patch_status: registryStatus,
    warnings,
  };
}

function manifestRequiresRefresh(manifest) {
  return (
    manifest.status !== "matched" &&
    manifest.status !== "legacy_compatibility_copy"
  );
}

function workSkillDirs(root, requestedSkill) {
  const base = path.join(root, ".agents/skillopt-work");
  if (!exists(base)) return [];
  if (requestedSkill) {
    const dir = path.join(base, requestedSkill);
    return exists(dir) ? [dir] : [];
  }
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => path.join(base, entry.name))
    .sort();
}

function collectRunSummaries(root, skillDir) {
  const outputs = path.join(skillDir, "outputs");
  const discovery = discoverRunSummaries(outputs);
  let regressing = 0;
  const items = [];
  for (const file of discovery.files) {
    const data = readJson(file);
    if (!data) continue;
    const delta = Number(data.test_delta_hard ?? data.final_test_delta_hard);
    const item = {
      path: rel(root, file),
      run_profile: data.config?.run_profile || null,
      total_steps: Number.isFinite(Number(data.total_steps))
        ? Number(data.total_steps)
        : null,
      total_accepts: Number.isFinite(Number(data.total_accepts))
        ? Number(data.total_accepts)
        : null,
      total_rejects: Number.isFinite(Number(data.total_rejects))
        ? Number(data.total_rejects)
        : null,
      total_skips: Number.isFinite(Number(data.total_skips))
        ? Number(data.total_skips)
        : null,
      baseline_test_hard:
        data.baseline_test_hard === null ||
        data.baseline_test_hard === undefined
          ? null
          : Number(data.baseline_test_hard),
      test_hard:
        data.test_hard === null || data.test_hard === undefined
          ? null
          : Number(data.test_hard),
      test_delta_hard: Number.isFinite(delta) ? delta : null,
    };
    if (item.test_delta_hard !== null && item.test_delta_hard < 0)
      regressing += 1;
    items.push(item);
  }
  return {
    count: items.length,
    regressing_runs: regressing,
    samples: items.slice(0, 20),
    truncated: items.length > 20,
    discovery: {
      status: discovery.scan_limit_reached ? "incomplete" : "complete",
      layout: discovery.layout,
      entries_scanned: discovery.entries_scanned,
      run_directories_scanned: discovery.run_directories_scanned,
      scan_limit_reached: discovery.scan_limit_reached,
    },
  };
}

function classifyWorkspaces(root, requestedSkill) {
  return workSkillDirs(root, requestedSkill).map((skillDir) => {
    const skill = path.basename(skillDir);
    const manifestPath = path.join(skillDir, "adapter-manifest.json");
    return {
      skill,
      path: rel(root, skillDir),
      configs: statDir(path.join(skillDir, "configs"), 0, 2),
      data: statDir(path.join(skillDir, "data"), 0, 3),
      outputs: statDir(path.join(skillDir, "outputs"), 0, 3),
      manifest: exists(manifestPath)
        ? auditManifest(root, manifestPath, skill)
        : null,
      run_summaries: collectRunSummaries(root, skillDir),
      move_action: "do_not_move_raw_workspace",
    };
  });
}

function topLevelCandidates(root) {
  const base = path.join(root, ".agents/skillopt-work");
  if (!exists(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(base, entry.name))
    .filter((file) => /\.(mjs|js|md|py|yaml|yml|json)$/i.test(file))
    .map((file) => ({
      path: rel(root, file),
      classification: "manual_review_only",
      move_action:
        "promote only after sanitizing into tracked skill source with validation",
    }));
}

function buildAudit(args) {
  const root = path.resolve(args.root);
  const agentsDir = path.join(root, ".agents");
  const skillOptPath = path.join(agentsDir, "tools/SkillOpt");
  const installedSkillCopy = path.join(agentsDir, "skills/skillopt-setup");
  const readinessDir = path.join(agentsDir, "skillopt-work/_readiness");
  const workDir = path.join(agentsDir, "skillopt-work");
  const classifications = [
    {
      path: ".agents/tools/SkillOpt",
      exists: exists(skillOptPath),
      classification: "local_tooling_do_not_move",
      move_action:
        "reuse or refresh with setup-skillopt-local.mjs; never commit clone, .git, or .venv",
      stats: statDir(skillOptPath, 0, 2),
      template_checks: compareKnownTemplates(root),
    },
    {
      path: ".agents/skills/skillopt-setup",
      exists: exists(installedSkillCopy),
      classification: "installed_skill_copy_compare_only",
      move_action:
        "tracked incubator skill is source of truth; reinstall installed copy after tracked changes",
      diff: compareDirectories(installedSkillCopy, skillRoot),
    },
    {
      path: ".agents/skillopt-work",
      exists: exists(workDir),
      classification: "generated_workspace_do_not_move",
      move_action:
        "move only curated summaries under skill-evals/<skill>/runs and sanitized docs/scripts/evals",
      stats: statDir(workDir, 0, 3),
    },
    {
      path: ".agents/skillopt-work/_readiness",
      exists: exists(readinessDir),
      classification: "ignored_diagnostics_do_not_publish",
      move_action: "use probe status only; do not publish diagnostic contents",
      stats: statDir(readinessDir, 0, 1),
    },
  ];

  const workspaceManifest = path.join(workDir, "adapter-manifest.json");
  const manifests = [];
  if (exists(workspaceManifest)) {
    manifests.push(
      auditManifest(root, workspaceManifest, args.skill, {
        targetSpecific: false,
      }),
    );
  }
  const workspaces = classifyWorkspaces(root, args.skill);
  for (const workspace of workspaces) {
    if (workspace.manifest) manifests.push(workspace.manifest);
  }

  const templateDrift = classifications[0].template_checks.filter(
    (check) => check.status !== "matched",
  );
  const staleManifests = manifests.filter(manifestRequiresRefresh);
  const regressingRuns = workspaces.reduce(
    (total, workspace) => total + workspace.run_summaries.regressing_runs,
    0,
  );
  const incompleteSummaryScans = workspaces.filter(
    (workspace) => workspace.run_summaries.discovery.status !== "complete",
  );

  const recommendations = [
    "Do not move local SkillOpt clones, virtualenvs, installed skill copies, raw data splits, or run outputs into tracked skill files.",
    "Promote only sanitized, reusable behavior as tracked scripts, references, templates, or eval cases, then cover it in validate-skillopt-setup.mjs.",
    "Use summarize-skillopt-run.mjs for public run evidence; keep raw histories and transcripts under ignored .agents.",
  ];
  if (templateDrift.length) {
    recommendations.push(
      "Refresh the local adapter with setup-skillopt-local.mjs before training; installed SkillOpt files differ from tracked templates.",
    );
  }
  if (staleManifests.length) {
    recommendations.push(
      "Rerun production setup with reuse/refresh so target adapter manifests include current identity and template freshness metadata.",
    );
  }
  if (regressingRuns) {
    recommendations.push(
      "Block best_skill.md adoption for runs with negative held-out test hard-score delta.",
    );
  }
  if (incompleteSummaryScans.length) {
    recommendations.push(
      "One or more output directories exceeded bounded summary-discovery limits; inspect or prune those ignored workspaces before relying on the run inventory.",
    );
  }

  return {
    schema_version: 1,
    target_skill: args.skill,
    agents_present: exists(agentsDir),
    loaded_skill_package: displayPath(root, skillRoot),
    classifications,
    workspaces,
    manifests,
    manual_review_candidates: topLevelCandidates(root),
    public_safe_moves: [
      "sanitized scripts under incubator/skills/skill-maintenance/skillopt-setup/scripts",
      "concise operational references under incubator/skills/skill-maintenance/skillopt-setup/references",
      "adapter/config templates under incubator/skills/skill-maintenance/skillopt-setup/assets",
      "SkillOpt eval cases and curated run summaries under skill-evals/<skill>",
    ],
    blocked_moves: [
      ".agents/tools/SkillOpt",
      ".agents/tools/SkillOpt/.venv",
      ".agents/tools/SkillOpt/.git",
      ".agents/skills",
      ".agents/skillopt-work/*/data",
      ".agents/skillopt-work/*/outputs",
      ".agents/skillopt-work/_readiness",
      "raw histories, transcripts, prompts, auth diagnostics, and temporary best_skill.md files",
    ],
    recommendations,
  };
}

function printHuman(report) {
  console.log("SkillOpt local artifact audit");
  console.log(
    `- Target skill: ${report.target_skill || "all discovered workspaces"}`,
  );
  console.log(`- .agents present: ${report.agents_present ? "yes" : "no"}`);
  console.log("");
  console.log("Classifications:");
  for (const item of report.classifications) {
    console.log(
      `- ${item.path}: ${item.exists ? item.classification : "absent"}`,
    );
    if (item.move_action) console.log(`  action: ${item.move_action}`);
    if (item.diff?.status) console.log(`  installed diff: ${item.diff.status}`);
    const drift =
      item.template_checks?.filter((check) => check.status !== "matched") || [];
    if (drift.length) console.log(`  template drift: ${drift.length} file(s)`);
  }
  if (report.workspaces.length) {
    console.log("");
    console.log("Workspaces:");
    for (const workspace of report.workspaces) {
      console.log(`- ${workspace.skill}: ${workspace.move_action}`);
      if (workspace.manifest) {
        console.log(`  manifest: ${workspace.manifest.status}`);
      }
      if (workspace.run_summaries.count) {
        console.log(
          `  summaries: ${workspace.run_summaries.count}, regressing test runs: ${workspace.run_summaries.regressing_runs}`,
        );
      }
      if (workspace.run_summaries.discovery.status !== "complete") {
        console.log(
          "  summary discovery: incomplete (bounded scan limit reached)",
        );
      }
    }
  }
  if (report.recommendations.length) {
    console.log("");
    console.log("Recommendations:");
    for (const recommendation of report.recommendations) {
      console.log(`- ${recommendation}`);
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const report = buildAudit(args);
if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHuman(report);
}
