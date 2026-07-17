#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
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
const SAFE_MODEL_ENV_PLACEHOLDERS = [
  "SKILLOPT_OPTIMIZER_MODEL",
  "SKILLOPT_TARGET_MODEL",
  "SKILLOPT_JUDGE_MODEL",
  "SKILLOPT_REFLECTION_MODEL",
];
const OPENAI_COMPATIBLE_AUTH_MODES = new Set(["openai_compatible", "compat", "openai"]);
const TOKENLESS_AZURE_AUTH_MODES = new Set(["azure_cli", "managed_identity"]);
const REQUIRED_SPLIT_ITEM_FIELDS = new Set([
  "id",
  "skill_name",
  "case_path",
  "prompt",
  "expected_behavior",
  "rubric_path",
  "fixtures",
  "split_family",
  "split_group",
  "expected_artifacts",
  "deterministic_assertions",
  "visual_assertions",
  "tags",
  "should_trigger",
  "workspace_policy",
  "source_hash",
]);
const SUPPORTED_WORKSPACE_POLICIES = new Set(["text-only", "isolated-artifact-write"]);
const PYTHON_PATCH_AST_PROBE = String.raw`
import ast
import json
import sys

safe_names = set(json.loads(sys.argv[1]))
files = {
    "registry_train": sys.argv[2],
    "registry_eval": sys.argv[3],
    "safe_env": sys.argv[4],
    "trainer_steps": sys.argv[5],
}


def parse_file(filename):
    with open(filename, "r", encoding="utf-8") as handle:
        return ast.parse(handle.read(), filename="<live-skillopt-patch>")


def string_value(node):
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None


def subscript_key(node):
    return string_value(node.slice) if isinstance(node, ast.Subscript) else None


def is_name(node, name):
    return isinstance(node, ast.Name) and node.id == name


def is_os_environ(node):
    return (
        isinstance(node, ast.Attribute)
        and node.attr == "environ"
        and is_name(node.value, "os")
    )


def registry_assignment(tree):
    register = next(
        (
            node
            for node in tree.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            and node.name == "_register_builtins"
        ),
        None,
    )
    if register is None:
        return False
    for candidate in ast.walk(register):
        if not isinstance(candidate, ast.Try):
            continue
        imported = any(
            isinstance(node, ast.ImportFrom)
            and node.module == "skillopt.envs.agent_skills.adapter"
            and any(alias.name == "AgentSkillsAdapter" for alias in node.names)
            for statement in candidate.body
            for node in ast.walk(statement)
        )
        assigned = any(
            isinstance(node, (ast.Assign, ast.AnnAssign))
            and any(
                isinstance(target, ast.Subscript)
                and is_name(target.value, "_ENV_REGISTRY")
                and subscript_key(target) == "agent_skills"
                for target in (
                    node.targets
                    if isinstance(node, ast.Assign)
                    else [node.target]
                )
            )
            and is_name(node.value, "AgentSkillsAdapter")
            for statement in candidate.body
            for node in ast.walk(statement)
        )
        if imported and assigned:
            return True
    return False


def literal_string_set(node):
    if isinstance(node, ast.Call) and is_name(node.func, "frozenset") and len(node.args) == 1:
        node = node.args[0]
    if not isinstance(node, (ast.Set, ast.List, ast.Tuple)):
        return None
    values = [string_value(item) for item in node.elts]
    return set(values) if all(value is not None for value in values) else None


def safe_env_expansion(tree):
    allowlist = None
    for node in tree.body:
        if not isinstance(node, (ast.Assign, ast.AnnAssign)):
            continue
        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
        if any(is_name(target, "_ENV_PLACEHOLDER_ALLOWLIST") for target in targets):
            allowlist = literal_string_set(node.value)
    helper = next(
        (
            node
            for node in tree.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            and node.name == "_expand_safe_env_placeholders"
        ),
        None,
    )
    if allowlist != safe_names or helper is None:
        return False

    guarded_read = False
    for node in ast.walk(helper):
        if not isinstance(node, ast.If):
            continue
        membership = any(
            isinstance(part, ast.Compare)
            and is_name(part.left, "env_name")
            and len(part.ops) == 1
            and isinstance(part.ops[0], ast.In)
            and len(part.comparators) == 1
            and is_name(part.comparators[0], "_ENV_PLACEHOLDER_ALLOWLIST")
            for part in ast.walk(node.test)
        )
        presence_check = any(
            isinstance(part, ast.Call)
            and isinstance(part.func, ast.Attribute)
            and part.func.attr == "get"
            and is_os_environ(part.func.value)
            and len(part.args) == 1
            and is_name(part.args[0], "env_name")
            for part in ast.walk(node.test)
        )
        guarded_return = any(
            isinstance(part, ast.Return)
            and isinstance(part.value, ast.Subscript)
            and is_os_environ(part.value.value)
            and is_name(part.value.slice, "env_name")
            for statement in node.body
            for part in ast.walk(statement)
        )
        if membership and presence_check and guarded_return:
            guarded_read = True
            break

    applied_to_cfg = any(
        isinstance(node, ast.Assign)
        and any(is_name(target, "cfg") for target in node.targets)
        and isinstance(node.value, ast.Call)
        and is_name(node.value.func, "_expand_safe_env_placeholders")
        and len(node.value.args) == 1
        and is_name(node.value.args[0], "cfg")
        for node in ast.walk(tree)
    )
    return guarded_read and applied_to_cfg


def expression_dump(source):
    return ast.dump(ast.parse(source, mode="eval").body, include_attributes=False)


def trainer_step_logic(tree):
    assignments = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            assignments.setdefault(node.targets[0].id, []).append(
                ast.dump(node.value, include_attributes=False)
            )
    expected = {
        "requested_steps_per_epoch": expression_dump('int(cfg.get("steps_per_epoch", 0) or 0)'),
        "auto_steps_per_epoch": expression_dump("math.ceil(train_size / (batch_size * accumulation))"),
        "steps_per_epoch": expression_dump(
            "requested_steps_per_epoch if requested_steps_per_epoch > 0 else auto_steps_per_epoch"
        ),
        "batches_per_epoch": expression_dump("steps_per_epoch * accumulation"),
        "total_steps": expression_dump("num_epochs * steps_per_epoch"),
        "steps_source": expression_dump(
            '"configured" if requested_steps_per_epoch > 0 else "auto"'
        ),
    }
    return all(value in assignments.get(name, []) for name, value in expected.items())


checks = {}
errors = {}
for key, filename in files.items():
    try:
        tree = parse_file(filename)
        if key.startswith("registry_"):
            checks[key] = registry_assignment(tree)
        elif key == "safe_env":
            checks[key] = safe_env_expansion(tree)
        else:
            checks[key] = trainer_step_logic(tree)
    except (OSError, SyntaxError, UnicodeError):
        checks[key] = False
        errors[key] = "unparseable"

print(json.dumps({"checks": checks, "errors": errors}, sort_keys=True))
`;

function defaultRunProfile(mode) {
  return mode === "codex-cli-all" ? "exploratory" : "official-parity";
}

function parseArgs(argv) {
  const args = {
    mode: "hybrid-codex-target",
    json: false,
    setupOnly: false,
    codexProbe: false,
    strictTrainingReady: false,
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
    else if (arg === "--strict-training-ready") args.strictTrainingReady = true;
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
  --strict-training-ready
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
    env: options.env || process.env,
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

function commandPath(command) {
  const result =
    process.platform === "win32"
      ? commandResult("where", [command])
      : commandResult("sh", ["-lc", `command -v ${command}`]);
  return result.ok ? result.stdout.split(/\r?\n/)[0] || null : null;
}

function detectDrawioCli() {
  for (const command of ["drawio", "diagrams.net"]) {
    const found = commandPath(command);
    if (found) return { installed: true, command, path: redact(found) };
  }
  return { installed: false, command: null, path: null };
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
    "AZURE_OPENAI_MANAGED_IDENTITY_CLIENT_ID",
    "OPTIMIZER_AZURE_OPENAI_ENDPOINT",
    "OPTIMIZER_AZURE_OPENAI_API_KEY",
    "OPTIMIZER_AZURE_OPENAI_AUTH_MODE",
    "OPTIMIZER_AZURE_OPENAI_MANAGED_IDENTITY_CLIENT_ID",
    "AZURE_OPENAI_OPTIMIZER_ENDPOINT",
    "AZURE_OPENAI_OPTIMIZER_API_KEY",
    "AZURE_OPENAI_OPTIMIZER_AUTH_MODE",
    "AZURE_OPENAI_OPTIMIZER_MANAGED_IDENTITY_CLIENT_ID",
    "TARGET_AZURE_OPENAI_ENDPOINT",
    "TARGET_AZURE_OPENAI_API_KEY",
    "TARGET_AZURE_OPENAI_AUTH_MODE",
    "TARGET_AZURE_OPENAI_MANAGED_IDENTITY_CLIENT_ID",
    "AZURE_OPENAI_TARGET_ENDPOINT",
    "AZURE_OPENAI_TARGET_API_KEY",
    "AZURE_OPENAI_TARGET_AUTH_MODE",
    "AZURE_OPENAI_TARGET_MANAGED_IDENTITY_CLIENT_ID",
    "OPENAI_API_KEY",
    "QWEN_CHAT_BASE_URL",
    "QWEN_CHAT_MODEL",
    "QWEN_CHAT_API_KEY",
    "OPTIMIZER_QWEN_CHAT_BASE_URL",
    "OPTIMIZER_QWEN_CHAT_MODEL",
    "OPTIMIZER_QWEN_CHAT_API_KEY",
    "TARGET_QWEN_CHAT_BASE_URL",
    "TARGET_QWEN_CHAT_MODEL",
    "TARGET_QWEN_CHAT_API_KEY",
    "MINIMAX_API_KEY",
    "MINIMAX_BASE_URL",
    "MINIMAX_MODEL",
    "SKILLOPT_OPTIMIZER_MODEL",
    "SKILLOPT_TARGET_MODEL",
    "SKILLOPT_JUDGE_MODEL",
  ];
  return Object.fromEntries(names.map((name) => [name, Boolean(process.env[name])]));
}

function readJsonArray(file) {
  return readJsonArrayInfo(file).items;
}

function readJsonArrayInfo(file) {
  if (!fs.existsSync(file)) return { exists: false, valid: false, items: [] };
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      exists: true,
      valid: Array.isArray(data),
      items: Array.isArray(data) ? data : [],
    };
  } catch {
    return { exists: true, valid: false, items: [] };
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
  const items = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      if (current) items.push(current);
      current = bullet[1].trim();
      continue;
    }
    if (current && /^\s+\S/.test(line)) {
      current = `${current} ${line.trim()}`;
      continue;
    }
    if (current) {
      items.push(current);
      current = null;
    }
  }
  if (current) items.push(current);
  return items;
}

function isNoneBullet(value) {
  return /^none\.?$/i.test(String(value || "").trim());
}

function visualAssertionBullets(text) {
  return bullets(text).filter((bullet) => !isNoneBullet(bullet));
}

function hasBullets(text, heading) {
  return bullets(section(text, heading)).length > 0;
}

function hasVisualAssertionBullets(text) {
  return visualAssertionBullets(section(text, "Visual Assertions")).length > 0;
}

function shouldTrigger(text) {
  const value = section(text, "Should Trigger")
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[.]/g, "")
    .toLowerCase();
  return value !== "no" && value !== "false";
}

function canonicalFixturePath(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value !== value.trim() ||
    value.includes("\\") ||
    value.includes("|") ||
    /[\0-\x1f\x7f]/.test(value) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) ||
    path.posix.isAbsolute(value)
  ) {
    return null;
  }
  const normalized = path.posix.normalize(value);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) return null;
  return normalized;
}

function canonicalFixturePaths(text) {
  const fixtures = [...bullets(section(text, "Fixture")), ...bullets(section(text, "Fixtures"))];
  const normalized = fixtures.map(canonicalFixturePath);
  return normalized.every(Boolean) ? [...new Set(normalized)].sort() : null;
}

function expectedSplitFamily(text, caseFile, fixtures) {
  const explicit = section(text, "Split Family").trim();
  if (explicit) return explicit;
  return fixtures.length
    ? `fixture:${fixtures.join("|")}`
    : `case:${path.basename(caseFile, ".md")}`;
}

function expectedArtifactPaths(text, skillName) {
  const explicit = [
    ...bullets(section(text, "Expected Artifact")),
    ...bullets(section(text, "Expected Artifacts")),
  ];
  if (explicit.length) return explicit;
  return walk(path.join(root, "skill-evals", skillName, "expected"), (file) =>
    fs.statSync(file).isFile(),
  )
    .map((file) => path.relative(root, file).replaceAll("\\", "/"))
    .sort();
}

function validSplitFamily(value) {
  if (typeof value !== "string" || value !== value.trim()) return false;
  if (/^[a-z0-9][a-z0-9-]{0,79}$/.test(value)) return true;
  if (/^case:[a-z0-9][a-z0-9-]{0,127}$/.test(value)) return true;
  if (!value.startsWith("fixture:")) return false;
  const fixtures = value.slice("fixture:".length).split("|");
  const canonical = fixtures.map(canonicalFixturePath);
  return (
    fixtures.length > 0 &&
    canonical.every(Boolean) &&
    fixtures.join("|") === [...new Set(canonical)].sort().join("|")
  );
}

function evalCaseCounts(evalDir) {
  const counts = {
    positive: 0,
    negative: 0,
    total: 0,
    positive_with_deterministic_assertions: 0,
    positive_with_visual_assertions: 0,
    positive_with_fixtures: 0,
    positive_with_expected_artifacts: 0,
  };
  if (!evalDir || !fs.existsSync(evalDir)) return counts;
  for (const file of walk(path.join(evalDir, "cases"), (caseFile) => caseFile.endsWith(".md"))) {
    const text = fs.readFileSync(file, "utf8");
    counts.total += 1;
    if (!shouldTrigger(text)) {
      counts.negative += 1;
    } else {
      counts.positive += 1;
      if (hasBullets(text, "Deterministic Assertions")) {
        counts.positive_with_deterministic_assertions += 1;
      }
      if (hasVisualAssertionBullets(text)) {
        counts.positive_with_visual_assertions += 1;
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

function splitCountsInDir(splitDir) {
  const splitInfo = Object.fromEntries(
    ["train", "val", "test"].map((name) => [
      name,
      readJsonArrayInfo(path.join(splitDir, name, "items.json")),
    ]),
  );
  const train = splitInfo.train.items;
  const val = splitInfo.val.items;
  const test = splitInfo.test.items;
  const items = [...train, ...val, ...test];
  const splitEntries = Object.entries(splitInfo).flatMap(([splitName, info]) =>
    info.items.map((item) => ({ item, splitName })),
  );
  const crossingValues = (field) => {
    const memberships = new Map();
    for (const { item, splitName } of splitEntries) {
      const value = item && typeof item === "object" ? item[field] : null;
      if (typeof value !== "string" || !value.trim()) continue;
      if (!memberships.has(value)) memberships.set(value, new Set());
      memberships.get(value).add(splitName);
    }
    return new Set(
      [...memberships.entries()]
        .filter(([, splitNames]) => splitNames.size > 1)
        .map(([value]) => value),
    );
  };
  const crossingGroups = crossingValues("split_group");
  const crossingFamilies = crossingValues("split_family");
  const fixtureMemberships = new Map();
  for (const { item, splitName } of splitEntries) {
    if (!Array.isArray(item?.fixtures)) continue;
    for (const fixture of item.fixtures) {
      if (typeof fixture !== "string" || !fixture.trim()) continue;
      const normalized = canonicalFixturePath(fixture);
      if (!normalized) continue;
      if (!fixtureMemberships.has(normalized)) fixtureMemberships.set(normalized, new Set());
      fixtureMemberships.get(normalized).add(splitName);
    }
  }
  const crossingFixtures = new Set(
    [...fixtureMemberships.entries()]
      .filter(([, splitNames]) => splitNames.size > 1)
      .map(([fixture]) => fixture),
  );
  const validFixtures = (item) =>
    Array.isArray(item.fixtures) &&
    item.fixtures.every((fixture) => {
      const normalized = canonicalFixturePath(fixture);
      return Boolean(normalized) && !crossingFixtures.has(normalized);
    });
  const invalidItems = items.filter(
    (item) =>
      !item ||
      typeof item !== "object" ||
      [...REQUIRED_SPLIT_ITEM_FIELDS].some((field) => !(field in item)) ||
      typeof item.skill_name !== "string" ||
      !/^[a-z0-9][a-z0-9-]{0,127}$/.test(item.skill_name) ||
      typeof item.id !== "string" ||
      !new RegExp(
        `^${item.skill_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[a-z0-9][a-z0-9-]{0,127}$`,
      ).test(item.id) ||
      !validSplitFamily(item.split_family) ||
      !/^sha256:[0-9a-f]{64}$/.test(item.split_group || "") ||
      crossingGroups.has(item.split_group) ||
      crossingFamilies.has(item.split_family) ||
      !validFixtures(item) ||
      !SUPPORTED_WORKSPACE_POLICIES.has(item.workspace_policy) ||
      (item.workspace_policy === "isolated-artifact-write") !==
        (item.visual_assertions || []).some((assertion) => String(assertion || "").trim()),
  );
  return {
    train: train.length,
    val: val.length,
    test: test.length,
    positive: items.length,
    positive_with_visual_assertions: items.filter((item) =>
      (item.visual_assertions || []).some((assertion) => String(assertion || "").trim()),
    ).length,
    path: path.relative(root, splitDir).replaceAll("\\", "/"),
    exists: fs.existsSync(splitDir),
    missing_splits: Object.entries(splitInfo)
      .filter(([, info]) => !info.exists)
      .map(([name]) => name),
    invalid_splits: Object.entries(splitInfo)
      .filter(([, info]) => info.exists && !info.valid)
      .map(([name]) => name),
    invalid_item_count: invalidItems.length,
    cross_split_group_count: crossingGroups.size,
    cross_split_family_count: crossingFamilies.size,
    cross_split_fixture_count: crossingFixtures.size,
  };
}

function generatedSplitCounts(skillName, dirName = "data") {
  if (!skillName) {
    return {
      train: 0,
      val: 0,
      test: 0,
      positive: 0,
      positive_with_visual_assertions: 0,
      activation_negative: 0,
      path: null,
      exists: false,
      configured: false,
      configured_path: null,
    };
  }
  const workDir = path.join(root, ".agents/skillopt-work", skillName);
  const split = splitCountsInDir(path.join(workDir, dirName));
  return {
    ...split,
    configured: false,
    configured_path: null,
    activation_negative: readJsonArray(path.join(workDir, "activation/negative-cases.json")).length,
  };
}

function generatedSplitCountsFromConfig(skillName, configInfo) {
  const configured = String(configInfo?.values?.split_dir || "").trim();
  if (!configured || configured.includes("<")) return generatedSplitCounts(skillName);
  const absolute = path.isAbsolute(configured) ? configured : path.resolve(root, configured);
  const split = splitCountsInDir(absolute);
  return {
    ...split,
    configured: true,
    configured_path: configured,
    missing_configured_split: !split.exists,
    activation_negative: skillName
      ? readJsonArray(
          path.join(root, ".agents/skillopt-work", skillName, "activation/negative-cases.json"),
        ).length
      : 0,
  };
}

function activeSplitDir(skillName, configInfo) {
  const configured = String(configInfo?.values?.split_dir || "").trim();
  if (configured && !configured.includes("<")) {
    return path.isAbsolute(configured) ? configured : path.resolve(root, configured);
  }
  return path.join(root, ".agents/skillopt-work", skillName, "data");
}

function skillBody(text) {
  const match = text.match(/^---\n[\s\S]*?\n---\n?/);
  return (match ? text.slice(match[0].length) : text).trimStart();
}

function generatedDataFreshness(skillPath, skillName, configInfo) {
  if (!skillPath || !skillName) {
    return {
      status: "blocked",
      variant: null,
      blockers: ["target skill is unresolved"],
    };
  }
  const splitDir = activeSplitDir(skillName, configInfo);
  const splitInfo = splitCountsInDir(splitDir);
  const expectedTextOnly =
    path.resolve(splitDir) ===
      path.resolve(root, ".agents/skillopt-work", skillName, "data-text-only") ||
    configInfo.values.visual_eval_policy === "text-only";
  const blockers = [];
  if (!splitInfo.exists) blockers.push(`active split directory is missing: ${splitInfo.path}`);
  if (splitInfo.missing_splits.length) {
    blockers.push(`active split is missing items.json for: ${splitInfo.missing_splits.join(", ")}`);
  }
  if (splitInfo.invalid_splits.length) {
    blockers.push(
      `active split has invalid JSON arrays for: ${splitInfo.invalid_splits.join(", ")}`,
    );
  }

  const casesDir = path.join(root, "skill-evals", skillName, "cases");
  const expected = [];
  const expectedActivation = [];
  for (const caseFile of walk(casesDir, (file) => file.endsWith(".md")).sort()) {
    const text = fs.readFileSync(caseFile, "utf8");
    const fixtures = canonicalFixturePaths(text);
    const visualAssertions = visualAssertionBullets(section(text, "Visual Assertions"));
    const expectedItem = {
      id: `${skillName}/${path.basename(caseFile, ".md")}`,
      skill_name: skillName,
      case_path: path.relative(root, caseFile).replaceAll("\\", "/"),
      source_hash: `sha256:${sha256Text(text)}`,
      fixtures,
      split_family: fixtures ? expectedSplitFamily(text, caseFile, fixtures) : null,
      prompt: section(text, "Prompt"),
      expected_behavior: bullets(section(text, "Expected Behavior")),
      deterministic_assertions: bullets(section(text, "Deterministic Assertions")),
      visual_assertions: visualAssertions,
      expected_artifacts: expectedArtifactPaths(text, skillName),
      rubric_path: fs.existsSync(path.join(root, "skill-evals", skillName, "rubric.md"))
        ? `skill-evals/${skillName}/rubric.md`
        : null,
      tags: shouldTrigger(text) ? ["positive"] : ["negative", "activation"],
      should_trigger: shouldTrigger(text),
      workspace_policy: visualAssertions.length ? "isolated-artifact-write" : "text-only",
    };
    if (!shouldTrigger(text)) {
      expectedActivation.push(expectedItem);
      continue;
    }
    if (expectedTextOnly && hasVisualAssertionBullets(text)) continue;
    expected.push(expectedItem);
  }

  const duplicateExpectedIds = (items) => {
    const counts = new Map();
    for (const item of items) counts.set(item.id, (counts.get(item.id) || 0) + 1);
    return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  };
  const duplicateSourceIds = duplicateExpectedIds([...expected, ...expectedActivation]);
  if (duplicateSourceIds.length) {
    blockers.push(
      `eval sources contain duplicate case IDs: ${duplicateSourceIds.slice(0, 5).join(", ")}`,
    );
  }

  const generated = ["train", "val", "test"].flatMap((name) =>
    readJsonArray(path.join(splitDir, name, "items.json")),
  );
  const generatedById = new Map();
  for (const item of generated) {
    const id = String(item?.id || "");
    const current = generatedById.get(id) || [];
    current.push(item);
    generatedById.set(id, current);
  }
  const duplicateIds = [...generatedById.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([id]) => id);
  if (duplicateIds.length) {
    blockers.push(
      `active split contains duplicate case IDs: ${duplicateIds.slice(0, 5).join(", ")}`,
    );
  }
  const expectedById = new Map(expected.map((item) => [item.id, item]));
  const missingIds = expected.filter((item) => !generatedById.has(item.id)).map((item) => item.id);
  const unexpectedIds = [...generatedById.keys()].filter((id) => !expectedById.has(id));
  if (missingIds.length) {
    blockers.push(
      `active split is missing current positive cases: ${missingIds.slice(0, 5).join(", ")}`,
    );
  }
  if (unexpectedIds.length) {
    blockers.push(
      `active split contains stale or unexpected cases: ${unexpectedIds.slice(0, 5).join(", ")}`,
    );
  }
  for (const expectedItem of expected) {
    const generatedItem = generatedById.get(expectedItem.id)?.[0];
    if (!generatedItem) continue;
    if (generatedItem.case_path !== expectedItem.case_path) {
      blockers.push(`active split case path is stale for ${expectedItem.id}`);
    }
    if (generatedItem.source_hash !== expectedItem.source_hash) {
      blockers.push(`active split source hash is stale for ${expectedItem.id}`);
    }
    if (
      !expectedItem.fixtures ||
      JSON.stringify(generatedItem.fixtures) !== JSON.stringify(expectedItem.fixtures)
    ) {
      blockers.push(`active split fixtures are stale or invalid for ${expectedItem.id}`);
    }
    if (generatedItem.split_family !== expectedItem.split_family) {
      blockers.push(`active split family is stale for ${expectedItem.id}`);
    }
    for (const field of [
      "prompt",
      "skill_name",
      "expected_behavior",
      "deterministic_assertions",
      "visual_assertions",
      "expected_artifacts",
      "rubric_path",
      "tags",
      "should_trigger",
      "workspace_policy",
    ]) {
      if (JSON.stringify(generatedItem[field]) !== JSON.stringify(expectedItem[field])) {
        blockers.push(`active split ${field} is stale for ${expectedItem.id}`);
      }
    }
  }

  const activationPath = path.join(
    root,
    ".agents/skillopt-work",
    skillName,
    "activation/negative-cases.json",
  );
  const activationInfo = readJsonArrayInfo(activationPath);
  if (!activationInfo.exists) blockers.push("activation negative-cases.json is missing");
  else if (!activationInfo.valid)
    blockers.push("activation negative-cases.json is not a JSON array");
  const generatedActivationById = new Map();
  for (const item of activationInfo.items) {
    const id = String(item?.id || "");
    const current = generatedActivationById.get(id) || [];
    current.push(item);
    generatedActivationById.set(id, current);
  }
  const duplicateActivationIds = [...generatedActivationById.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([id]) => id);
  if (duplicateActivationIds.length) {
    blockers.push(
      `activation split contains duplicate case IDs: ${duplicateActivationIds.slice(0, 5).join(", ")}`,
    );
  }
  const expectedActivationById = new Map(expectedActivation.map((item) => [item.id, item]));
  const missingActivationIds = expectedActivation
    .filter((item) => !generatedActivationById.has(item.id))
    .map((item) => item.id);
  const unexpectedActivationIds = [...generatedActivationById.keys()].filter(
    (id) => !expectedActivationById.has(id),
  );
  if (missingActivationIds.length) {
    blockers.push(
      `activation split is missing current negative cases: ${missingActivationIds.slice(0, 5).join(", ")}`,
    );
  }
  if (unexpectedActivationIds.length) {
    blockers.push(
      `activation split contains stale or unexpected cases: ${unexpectedActivationIds.slice(0, 5).join(", ")}`,
    );
  }
  for (const expectedItem of expectedActivation) {
    const generatedItem = generatedActivationById.get(expectedItem.id)?.[0];
    if (!generatedItem) continue;
    if (generatedItem.case_path !== expectedItem.case_path) {
      blockers.push(`activation case path is stale for ${expectedItem.id}`);
    }
    if (generatedItem.source_hash !== expectedItem.source_hash) {
      blockers.push(`activation source hash is stale for ${expectedItem.id}`);
    }
    for (const field of [
      "prompt",
      "skill_name",
      "expected_behavior",
      "deterministic_assertions",
      "visual_assertions",
      "expected_artifacts",
      "rubric_path",
      "tags",
      "should_trigger",
      "workspace_policy",
      "fixtures",
      "split_family",
    ]) {
      if (JSON.stringify(generatedItem[field]) !== JSON.stringify(expectedItem[field])) {
        blockers.push(`activation ${field} is stale for ${expectedItem.id}`);
      }
    }
  }

  const workDir = path.join(root, ".agents/skillopt-work", skillName);
  const currentSkill = fs.readFileSync(skillPath, "utf8");
  const expectedSkillHash = `sha256:${sha256Text(currentSkill)}`;
  const recordedHashPath = path.join(workDir, "initial/initial-skill.sha256");
  const initialBodyPath = path.join(workDir, "initial/skill-body.md");
  const recordedHash = fs.existsSync(recordedHashPath)
    ? fs.readFileSync(recordedHashPath, "utf8").trim()
    : "";
  if (recordedHash !== expectedSkillHash)
    blockers.push("initial skill checksum is stale or missing");
  const recordedBody = fs.existsSync(initialBodyPath)
    ? fs.readFileSync(initialBodyPath, "utf8")
    : null;
  if (recordedBody !== skillBody(currentSkill))
    blockers.push("initial skill body is stale or missing");

  return {
    status: blockers.length ? "refresh_required" : "matched",
    variant: expectedTextOnly ? "text-only" : "full",
    path: splitInfo.path,
    expected_positive_cases: expected.length,
    generated_positive_cases: generated.length,
    expected_activation_negative_cases: expectedActivation.length,
    generated_activation_negative_cases: activationInfo.items.length,
    blockers: [...new Set(blockers)],
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
  const value = matches
    .at(-1)?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, "");
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
    split_dir: extractYamlValue(text, "split_dir"),
    visual_eval_policy: extractYamlValue(text, "visual_eval_policy"),
    train_num_epochs: extractYamlValue(text, "num_epochs"),
    train_batch_size: extractYamlValue(text, "batch_size"),
    workers: extractYamlValue(text, "workers"),
    tool_rollout_for_visual_assertions: extractYamlValue(
      text,
      "tool_rollout_for_visual_assertions",
    ),
    require_drawio_cli_for_visual_rollouts: extractYamlValue(
      text,
      "require_drawio_cli_for_visual_rollouts",
    ),
    visual_exec_timeout: extractYamlValue(text, "visual_exec_timeout"),
    gradient_minibatch_size: extractYamlValue(text, "minibatch_size"),
    gradient_analyst_workers: extractYamlValue(text, "analyst_workers"),
    optimizer_learning_rate: extractYamlValue(text, "learning_rate"),
    optimizer_min_learning_rate: extractYamlValue(text, "min_learning_rate"),
    optimizer_lr_scheduler: extractYamlValue(text, "lr_scheduler"),
    optimizer_use_slow_update: extractYamlValue(text, "use_slow_update"),
    optimizer_slow_update_samples: extractYamlValue(text, "slow_update_samples"),
    optimizer_slow_update_gate_with_selection: extractYamlValue(
      text,
      "slow_update_gate_with_selection",
    ),
    optimizer_use_meta_skill: extractYamlValue(text, "use_meta_skill"),
    optimizer_use_skill_aware_reflection: extractYamlValue(text, "use_skill_aware_reflection"),
    optimizer_skill_aware_appendix_source: extractYamlValue(text, "skill_aware_appendix_source"),
    optimizer_skill_aware_consolidate_threshold: extractYamlValue(
      text,
      "skill_aware_consolidate_threshold",
    ),
    evaluation_use_gate: extractYamlValue(text, "use_gate"),
    evaluation_eval_test: extractYamlValue(text, "eval_test"),
    target_backend: extractYamlValue(text, "target_backend"),
    optimizer_backend: extractYamlValue(text, "optimizer_backend"),
    judge_backend: extractYamlValue(text, "judge_backend"),
    reflection_backend: extractYamlValue(text, "reflection_backend"),
    codex_exec_path: extractYamlValue(text, "codex_exec_path") || "codex",
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
  const venv =
    process.platform === "win32"
      ? path.join(skillOptPath, ".venv", "Scripts", "python.exe")
      : path.join(skillOptPath, ".venv", "bin", "python");
  if (fs.existsSync(venv)) return { command: venv, argsPrefix: [] };
  const uv = resolveUvCommand();
  if (uv) return { command: uv, argsPrefix: ["run", "python"] };
  return null;
}

function localHelpOptions(skillOptPath, script) {
  const python = localPythonCommand(skillOptPath);
  if (!python)
    return {
      ok: false,
      options: new Set(),
      error: "uv or SkillOpt virtualenv unavailable",
    };
  const result = commandResult(python.command, [...python.argsPrefix, script, "--help"], {
    cwd: skillOptPath,
    timeout: 60000,
  });
  if (!result.ok) {
    return {
      ok: false,
      options: new Set(),
      error: result.stderr || result.stdout || "help failed",
    };
  }
  return {
    ok: true,
    options: parseCliOptions(result.stdout || result.stderr),
    error: null,
  };
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
      evalHelp.ok
        ? "local scripts/eval_only.py --help"
        : `eval help unavailable: ${evalHelp.error}`,
      "agent_skills adapter constructor/template keys",
    ],
  };
}

function splitCountsFor(datasetCounts) {
  const active = datasetCounts.generated_active;
  if (active?.configured) return active;
  if (active?.exists && active.train + active.val + active.test) return active;
  const generated = datasetCounts.generated;
  return generated.train + generated.val + generated.test
    ? generated
    : datasetCounts.estimated_split;
}

function benchmarkQuality(datasetCounts) {
  const split = splitCountsFor(datasetCounts);
  const positiveCases = Number.isFinite(Number(split.positive))
    ? Number(split.positive)
    : datasetCounts.eval_positive;
  const officialFloorMet =
    positiveCases >= OFFICIAL_RECOMMENDED.positive &&
    split.val >= OFFICIAL_RECOMMENDED.val &&
    split.test >= OFFICIAL_RECOMMENDED.test;
  const exploratoryFloorMet =
    positiveCases >= EXPLORATORY_MIN.positive &&
    split.val >= EXPLORATORY_MIN.val &&
    split.test >= EXPLORATORY_MIN.test;
  const blockers = [];
  if (positiveCases < OFFICIAL_RECOMMENDED.positive) {
    blockers.push(
      `needs ${OFFICIAL_RECOMMENDED.positive}+ active positive cases; found ${positiveCases}`,
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
    activePositiveCases: positiveCases,
    sourcePositiveCases: datasetCounts.eval_positive,
    activeSplitCounts: datasetCounts.generated_active || null,
    fullSplitCounts: datasetCounts.generated || null,
    thresholds: {
      exploratoryMinimum: EXPLORATORY_MIN,
      officialRecommended: OFFICIAL_RECOMMENDED,
    },
    positiveWithDeterministicAssertions: datasetCounts.positive_with_deterministic_assertions || 0,
    positiveWithVisualAssertions: datasetCounts.positive_with_visual_assertions || 0,
    positiveWithFixtures: datasetCounts.positive_with_fixtures || 0,
    positiveWithExpectedArtifacts: datasetCounts.positive_with_expected_artifacts || 0,
    blockers,
  };
}

function runnableSplitBlockers(datasetCounts, configInfo) {
  const split = datasetCounts.generated_active || datasetCounts.generated;
  const blockers = [];
  if (!split?.exists)
    blockers.push(`active split directory is missing: ${split?.path || "unknown"}`);
  for (const name of split?.missing_splits || []) {
    blockers.push(`active split is missing ${name}/items.json`);
  }
  for (const name of split?.invalid_splits || []) {
    blockers.push(`active split ${name}/items.json is not a JSON array`);
  }
  if (split?.invalid_item_count) {
    blockers.push(
      `active split contains ${split.invalid_item_count} item(s) with missing required fields`,
    );
  }
  if (split?.cross_split_group_count) {
    blockers.push(
      `active split leaks ${split.cross_split_group_count} split_group value(s) across train/validation/test`,
    );
  }
  if (split?.cross_split_family_count) {
    blockers.push(
      `active split leaks ${split.cross_split_family_count} split_family value(s) across train/validation/test`,
    );
  }
  if (split?.cross_split_fixture_count) {
    blockers.push(
      `active split leaks ${split.cross_split_fixture_count} normalized fixture path(s) across train/validation/test`,
    );
  }
  if (!split || split.train < 1) blockers.push("active split needs at least one training case");
  if (configInfo.values.evaluation_use_gate !== "false" && (!split || split.val < 1)) {
    blockers.push(
      "active split needs at least one validation case while the evaluation gate is enabled",
    );
  }
  if (configInfo.values.evaluation_eval_test !== "false" && (!split || split.test < 1)) {
    blockers.push("active split needs at least one test case while test evaluation is enabled");
  }
  return [...new Set(blockers)];
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
    "provider-backed slow update (keep optimizer.use_slow_update disabled in codex-cli-all)",
    "provider-backed meta skill (keep optimizer.use_meta_skill disabled in codex-cli-all)",
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

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function templateHashWarnings(manifest) {
  const sources = manifest.template_sources || manifest.templateSources;
  if (!sources || typeof sources !== "object" || Array.isArray(sources)) {
    return [
      "Adapter manifest predates current-template freshness tracking; production setup must refresh it before training.",
    ];
  }
  const warnings = [];
  for (const [rel, sourceSpec] of Object.entries(sources)) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) {
      warnings.push(`Adapter installed file is missing: ${rel}`);
      continue;
    }
    const sourceRel = typeof sourceSpec === "string" ? sourceSpec : sourceSpec?.source;
    if (!sourceRel || typeof sourceRel !== "string") {
      warnings.push(`Adapter manifest has no tracked source for installed file: ${rel}`);
      continue;
    }
    const source = path.join(root, sourceRel);
    if (!fs.existsSync(source)) {
      warnings.push(`Adapter tracked source template is missing: ${sourceRel}`);
      continue;
    }
    let expectedText = fs.readFileSync(source, "utf8");
    const replacements =
      typeof sourceSpec === "object" && sourceSpec && !Array.isArray(sourceSpec)
        ? sourceSpec.replacements || {}
        : {};
    for (const [from, to] of Object.entries(replacements)) {
      expectedText = expectedText.replaceAll(from, String(to));
    }
    const actualHash = sha256File(file);
    if (actualHash !== sha256Text(expectedText)) {
      warnings.push(`Adapter installed file differs from the current tracked template: ${rel}`);
    }
  }
  return warnings;
}

function actualSkillOptCommit(skillOptPath) {
  if (!fs.existsSync(skillOptPath)) return null;
  const result = commandResult("git", ["rev-parse", "HEAD"], {
    cwd: skillOptPath,
  });
  return result.ok && /^[a-f0-9]{40}$/i.test(result.stdout) ? result.stdout : null;
}

function pythonAstPatchProof(skillOptPath, pythonCommand) {
  const relativeFiles = {
    registry_train: "scripts/train.py",
    registry_eval: "scripts/eval_only.py",
    safe_env: "skillopt/config.py",
    trainer_steps: "skillopt/engine/trainer.py",
  };
  if (Object.values(relativeFiles).some((file) => !fs.existsSync(path.join(skillOptPath, file)))) {
    return {
      status: "failed",
      diagnostic: "required_file_missing",
      checks: {},
    };
  }
  const env = Object.fromEntries(
    ["PATH", "HOME", "USER", "LOGNAME", "LANG", "LC_ALL", "LC_CTYPE"].flatMap((name) =>
      process.env[name] ? [[name, process.env[name]]] : [],
    ),
  );
  const result = spawnSync(
    pythonCommand,
    [
      "-c",
      PYTHON_PATCH_AST_PROBE,
      JSON.stringify(SAFE_MODEL_ENV_PLACEHOLDERS),
      ...Object.values(relativeFiles).map((file) => path.join(skillOptPath, file)),
    ],
    {
      cwd: skillOptPath,
      encoding: "utf8",
      timeout: 5000,
      env,
      input: "",
    },
  );
  if (result.status !== 0) {
    const diagnostic =
      result.error?.code === "ENOENT"
        ? "python_unavailable"
        : result.error?.code === "ETIMEDOUT"
          ? "probe_timed_out"
          : "probe_failed";
    return { status: "failed", diagnostic, checks: {} };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    if (!parsed || typeof parsed.checks !== "object" || Array.isArray(parsed.checks)) {
      return {
        status: "failed",
        diagnostic: "invalid_probe_output",
        checks: {},
      };
    }
    return {
      status: "completed",
      diagnostic: Object.keys(parsed.errors || {}).length ? "unparseable_python" : null,
      checks: parsed.checks,
    };
  } catch {
    return { status: "failed", diagnostic: "invalid_probe_output", checks: {} };
  }
}

function liveAdapterPatchCheck(skillOptPath, manifest, pythonCommand) {
  const blockers = [];
  const files = [];
  const proof = pythonAstPatchProof(skillOptPath, pythonCommand);
  function check(relativeFile, proofKey, missingMessage) {
    const file = path.join(skillOptPath, relativeFile);
    if (!fs.existsSync(file)) {
      blockers.push(`${relativeFile} is missing from the live SkillOpt clone`);
      files.push({ file: relativeFile, status: "missing" });
      return;
    }
    const passed = proof.status === "completed" && proof.checks[proofKey] === true;
    files.push({
      file: relativeFile,
      status: passed ? "matched" : "refresh_required",
    });
    if (!passed) blockers.push(missingMessage);
  }

  check(
    "scripts/train.py",
    "registry_train",
    "scripts/train.py is missing the structural live agent_skills registry patch",
  );
  check(
    "scripts/eval_only.py",
    "registry_eval",
    "scripts/eval_only.py is missing the structural live agent_skills registry patch",
  );
  check(
    "skillopt/config.py",
    "safe_env",
    "skillopt/config.py is missing the structural safe model environment expansion patch",
  );
  check(
    "skillopt/engine/trainer.py",
    "trainer_steps",
    "skillopt/engine/trainer.py is missing the structural configured steps-per-epoch patch",
  );
  if (proof.status !== "completed") {
    blockers.push(`live SkillOpt structural patch proof failed: ${proof.diagnostic}`);
  }

  const manifestCommit = manifest?.skillopt_commit || manifest?.skilloptCommit || null;
  const liveCommit = actualSkillOptCommit(skillOptPath);
  if (!manifestCommit) blockers.push("adapter manifest is missing the SkillOpt commit identity");
  if (!liveCommit) blockers.push("live SkillOpt commit could not be resolved");
  if (manifestCommit && liveCommit && manifestCommit !== liveCommit) {
    blockers.push("adapter manifest SkillOpt commit does not match the live clone");
  }
  return {
    status: blockers.length ? "refresh_required" : "matched",
    manifest_commit: manifestCommit,
    live_commit: liveCommit,
    proof_method: "python_ast",
    proof_status: proof.status,
    proof_diagnostic: proof.diagnostic,
    files,
    blockers: [...new Set(blockers)],
  };
}

function requiredModelPinNames(mode, configInfo) {
  if (mode === "native-provider") return ["optimizer", "target"];
  if (mode === "hybrid-codex-target") return ["optimizer", "target", "codex_cli_judge_model"];
  if (configInfo.values.judge_backend === "codex_cli") {
    return ["target", "codex_cli_judge_model", "codex_cli_reflection_model"];
  }
  return [];
}

function semanticJudgeReadiness(args, configInfo) {
  const runProfile = args.mode === "codex-cli-all" ? "exploratory" : args.runProfile;
  const backend = String(configInfo.values.judge_backend || "heuristic")
    .trim()
    .toLowerCase();
  const officialParityRequired = runProfile === "official-parity";
  const supported = ["provider", "codex_cli"].includes(backend);
  const blockers =
    officialParityRequired && !supported
      ? [
          `official-parity runs require semantic judge_backend=provider or codex_cli; ${backend || "heuristic"} does not provide semantic judging`,
        ]
      : [];
  return {
    status: blockers.length ? "blocked" : supported ? "ready" : "exploratory_only",
    backend,
    officialParityRequired,
    blockers,
  };
}

function officialParityReport(
  args,
  providerOk,
  datasetCounts,
  configInfo,
  quality,
  schemaCheck,
  semanticJudge,
) {
  const gaps = [];
  const proofBlockers = [];
  const bypassed = upstreamBehaviorBypassed(args.mode);
  const effectiveProfile = args.mode === "codex-cli-all" ? "exploratory" : args.runProfile;
  const split = quality.splitCounts;
  const activePositiveCases = quality.activePositiveCases ?? datasetCounts.eval_positive;

  if (args.mode === "codex-cli-all") {
    gaps.push(
      "codex-cli-all is provider-free exploratory mode, not upstream-native optimizer parity",
    );
  }
  if (effectiveProfile !== "official-parity") gaps.push("run profile is exploratory");
  if (effectiveProfile === "official-parity" && !providerOk) {
    proofBlockers.push(
      "provider-backed optimizer credentials or endpoint preflight are incomplete",
    );
  }
  proofBlockers.push(...semanticJudge.blockers);
  if (semanticJudge.status === "exploratory_only") {
    gaps.push(
      `judge backend ${semanticJudge.backend} is non-semantic and is allowed only for exploratory runs`,
    );
  }
  if (activePositiveCases < EXPLORATORY_MIN.positive) {
    gaps.push(
      `only ${activePositiveCases} active positive eval case(s); ${EXPLORATORY_MIN.positive}+ recommended before non-exploratory use`,
    );
  }
  if (split.val < EXPLORATORY_MIN.val || split.test < EXPLORATORY_MIN.test) {
    gaps.push(
      `split has val=${split.val}, test=${split.test}; ${EXPLORATORY_MIN.val}+ val and ${EXPLORATORY_MIN.test}+ test cases recommended before non-exploratory use`,
    );
  }
  if (activePositiveCases < OFFICIAL_RECOMMENDED.positive) {
    gaps.push(
      `below official-parity recommendation of ${OFFICIAL_RECOMMENDED.positive}+ positive cases`,
    );
  }
  if (split.val < OFFICIAL_RECOMMENDED.val || split.test < OFFICIAL_RECOMMENDED.test) {
    gaps.push(
      `below official-parity split recommendation of ${OFFICIAL_RECOMMENDED.val}+ validation and ${OFFICIAL_RECOMMENDED.test}+ test cases`,
    );
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
      if (requiredPins.includes(key))
        proofBlockers.push(`${key} model env ${state.env} is missing`);
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
  if (
    configInfo.values.optimizer_lr_scheduler &&
    configInfo.values.optimizer_lr_scheduler !== "cosine"
  ) {
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

function cleanEnv(name) {
  return String(process.env[name] || "").trim();
}

function roleAzureConfig(role) {
  const upper = role.toUpperCase();
  const alternate = role === "optimizer" ? "OPTIMIZER" : "TARGET";
  const endpoint =
    cleanEnv(`${upper}_AZURE_OPENAI_ENDPOINT`) ||
    cleanEnv(`AZURE_OPENAI_${alternate}_ENDPOINT`) ||
    cleanEnv("AZURE_OPENAI_ENDPOINT");
  const apiKey =
    cleanEnv(`${upper}_AZURE_OPENAI_API_KEY`) ||
    cleanEnv(`AZURE_OPENAI_${alternate}_API_KEY`) ||
    cleanEnv("AZURE_OPENAI_API_KEY");
  const authMode = (
    cleanEnv(`${upper}_AZURE_OPENAI_AUTH_MODE`) ||
    cleanEnv(`AZURE_OPENAI_${alternate}_AUTH_MODE`) ||
    cleanEnv("AZURE_OPENAI_AUTH_MODE") ||
    "azure_cli"
  ).toLowerCase();
  return { endpoint, apiKey, authMode };
}

function resolvedModelPin(role, configInfo) {
  const state = configInfo.modelPins[role];
  if (!state) return "";
  if (state.env) return cleanEnv(state.env);
  return state.status === "pinned" ? state.value : "";
}

function providerRoleConfig(role, backend, configInfo) {
  const normalizedBackend = String(backend || "openai_chat")
    .trim()
    .toLowerCase();
  const blockers = [];
  let endpointProbe = null;
  const publicStatus = {
    role,
    backend: normalizedBackend,
    configured: false,
    endpoint_present: false,
    credential_present: false,
    auth_mode: null,
    blockers,
  };

  if (normalizedBackend === "codex_exec") {
    if (role === "target") publicStatus.configured = true;
    else blockers.push(`${role} codex_exec is unsupported for provider optimizer work`);
    return { publicStatus, endpointProbe };
  }

  if (normalizedBackend === "claude_code_exec") {
    blockers.push(`${role} claude_code_exec is unsupported by the Agent Skills rollout adapter`);
    publicStatus.auth_mode = "unsupported_local_cli";
    return { publicStatus, endpointProbe };
  }

  if (normalizedBackend === "openai_chat") {
    const azure = roleAzureConfig(role);
    const supportedAuthMode =
      ["api_key", "key"].includes(azure.authMode) ||
      TOKENLESS_AZURE_AUTH_MODES.has(azure.authMode) ||
      OPENAI_COMPATIBLE_AUTH_MODES.has(azure.authMode);
    publicStatus.endpoint_present = Boolean(azure.endpoint);
    publicStatus.credential_present = Boolean(azure.apiKey);
    publicStatus.auth_mode = supportedAuthMode ? azure.authMode : "unsupported";
    if (!azure.endpoint) blockers.push(`${role} openai_chat endpoint is missing`);
    if (["api_key", "key"].includes(azure.authMode) && !azure.apiKey) {
      blockers.push(`${role} openai_chat API key is missing`);
    } else if (azure.authMode === "azure_cli" && !commandExists("az")) {
      blockers.push(`${role} openai_chat requires Azure CLI for azure_cli auth`);
    } else if (!supportedAuthMode) {
      blockers.push(`${role} openai_chat auth mode is unsupported`);
    }
    if (azure.endpoint && OPENAI_COMPATIBLE_AUTH_MODES.has(azure.authMode)) {
      endpointProbe = {
        role,
        endpoint: azure.endpoint,
        apiKey: azure.apiKey,
        model: resolvedModelPin(role, configInfo),
      };
    }
  } else if (normalizedBackend === "claude_chat") {
    publicStatus.auth_mode = "unsupported_local_cli";
    blockers.push(
      `${role} claude_chat is unsupported because installed SkillOpt routes it through a local Claude CLI without a verified read-isolated execution boundary`,
    );
  } else if (normalizedBackend === "qwen_chat") {
    const upper = role.toUpperCase();
    const baseUrl = cleanEnv(`${upper}_QWEN_CHAT_BASE_URL`) || cleanEnv("QWEN_CHAT_BASE_URL");
    const model = cleanEnv(`${upper}_QWEN_CHAT_MODEL`) || cleanEnv("QWEN_CHAT_MODEL");
    const apiKey = cleanEnv(`${upper}_QWEN_CHAT_API_KEY`) || cleanEnv("QWEN_CHAT_API_KEY");
    publicStatus.endpoint_present = Boolean(baseUrl);
    publicStatus.credential_present = Boolean(apiKey);
    if (!baseUrl) blockers.push(`${role} qwen_chat base URL is missing`);
    if (!model) blockers.push(`${role} qwen_chat model is missing`);
    if (!apiKey) blockers.push(`${role} qwen_chat API key is missing`);
  } else if (normalizedBackend === "minimax_chat") {
    publicStatus.endpoint_present = Boolean(cleanEnv("MINIMAX_BASE_URL"));
    publicStatus.credential_present = Boolean(cleanEnv("MINIMAX_API_KEY"));
    if (role === "optimizer") {
      blockers.push(
        "optimizer minimax_chat is unsupported because installed SkillOpt implements MiniMax for target chat only",
      );
    }
    if (!publicStatus.credential_present) blockers.push(`${role} minimax_chat API key is missing`);
  } else {
    blockers.push(`${role} provider backend ${normalizedBackend || "<missing>"} is unsupported`);
  }

  publicStatus.configured = blockers.length === 0;
  return { publicStatus, endpointProbe };
}

function runOpenAiCompatibleEndpointProbe(spec) {
  if (!spec.model) {
    return {
      ok: false,
      status: "blocked",
      error: `${spec.role} model pin is missing`,
    };
  }
  const script = path.join(skillRoot, "scripts/probe-openai-compatible-endpoint.mjs");
  const result = commandResult(process.execPath, [script, "--json"], {
    timeout: 70000,
    env: {
      ...process.env,
      SKILLOPT_OPENAI_BASE_URL: spec.endpoint,
      SKILLOPT_OPENAI_API_KEY: spec.apiKey,
      SKILLOPT_TARGET_MODEL: spec.model,
      OPENAI_BASE_URL: spec.endpoint,
      OPENAI_API_KEY: spec.apiKey,
    },
  });
  if (!result.ok) {
    return {
      ok: false,
      status: "failed",
      error: `${spec.role} chat-completion preflight failed`,
    };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    return {
      ok: parsed.ok === true,
      status: parsed.ok === true ? "passed" : "failed",
      error: parsed.ok === true ? null : `${spec.role} chat-completion preflight failed`,
    };
  } catch {
    return {
      ok: false,
      status: "failed",
      error: `${spec.role} endpoint probe returned invalid JSON`,
    };
  }
}

function providerReadiness(args, configInfo) {
  if (args.mode === "codex-cli-all") {
    return { configured: true, roles: [], blockers: [], endpoint_probes: [] };
  }
  const requiredRoles = ["optimizer"];
  if (args.mode === "native-provider") requiredRoles.push("target");
  const roles = [];
  const endpointProbes = [];
  const blockers = [];
  for (const role of requiredRoles) {
    const backend =
      role === "optimizer" ? configInfo.values.optimizer_backend : configInfo.values.target_backend;
    const check = providerRoleConfig(role, backend, configInfo);
    roles.push(check.publicStatus);
    blockers.push(...check.publicStatus.blockers);
    if (check.endpointProbe) {
      const probe = args.strictTrainingReady
        ? runOpenAiCompatibleEndpointProbe(check.endpointProbe)
        : { ok: false, status: "not_run", error: null };
      endpointProbes.push({
        role,
        required: args.strictTrainingReady,
        ...probe,
      });
      if (args.strictTrainingReady && !probe.ok) blockers.push(probe.error);
    }
  }
  return {
    configured: blockers.length === 0,
    roles,
    blockers: [...new Set(blockers.filter(Boolean))],
    endpoint_probes: endpointProbes,
  };
}

function configBool(value) {
  return (
    String(value || "")
      .trim()
      .toLowerCase() === "true"
  );
}

function configBoolDefault(value, fallback) {
  const clean = String(value ?? "").trim();
  if (!clean) return fallback;
  return configBool(clean);
}

function codexPermissionCapability(configInfo) {
  const command = configInfo.values.codex_exec_path || "codex";
  let probeRoot = null;
  try {
    probeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skillopt-codex-capability-"));
    const codexHome = path.join(probeRoot, "codex-home");
    const workspace = path.join(probeRoot, "workspace");
    fs.mkdirSync(codexHome, { mode: 0o700 });
    fs.mkdirSync(workspace, { mode: 0o700 });
    const missingSchemaName = "probe-output-schema-never-created.json";
    const missingSchema = path.join(workspace, missingSchemaName);
    const env = Object.fromEntries(
      ["PATH", "HOME", "USER", "LOGNAME", "LANG", "LC_ALL", "LC_CTYPE"].flatMap((name) =>
        process.env[name] ? [[name, process.env[name]]] : [],
      ),
    );
    env.CODEX_HOME = codexHome;
    env.NO_COLOR = "1";
    env.TERM = "dumb";
    const baseArgs = [
      "exec",
      "--ignore-user-config",
      "--ignore-rules",
      "--strict-config",
      "--skip-git-repo-check",
      "--ephemeral",
      "--color",
      "never",
      "--cd",
      workspace,
      "--output-schema",
      missingSchema,
    ];
    const invoke = (permissionOverrides) =>
      spawnSync(
        command,
        [
          ...baseArgs,
          "-c",
          'default_permissions="skillopt_capability_probe"',
          ...permissionOverrides.flatMap((value) => ["-c", value]),
          "bounded local configuration capability probe",
        ],
        {
          cwd: workspace,
          encoding: "utf8",
          timeout: 5000,
          env,
          input: "",
        },
      );
    const validResult = invoke([
      'permissions.skillopt_capability_probe.filesystem={\":minimal\"=\"read\",\":workspace_roots\"={\".\"=\"write\"}}',
      "permissions.skillopt_capability_probe.network.enabled=false",
    ]);
    const invalidControl = invoke([
      "permissions.skillopt_capability_probe.filesystem=7",
      "permissions.skillopt_capability_probe.network.enabled=false",
    ]);
    const validOutput = `${validResult.stdout || ""}\n${validResult.stderr || ""}`;
    const invalidOutput = `${invalidControl.stdout || ""}\n${invalidControl.stderr || ""}`;
    const deliberatePreflightFailure =
      validResult.status !== 0 &&
      validOutput.includes("Failed to read output schema file") &&
      validOutput.includes(missingSchemaName);
    const invalidControlRejected =
      invalidControl.status !== 0 &&
      /Error loading config\.toml:[\s\S]*invalid type/i.test(invalidOutput) &&
      /permissions/i.test(invalidOutput) &&
      !invalidOutput.includes("Failed to read output schema file");
    const output = `${validOutput}\n${invalidOutput}`;
    const sessionStarted = /(?:session id:|responses_websocket|Reconnecting\.\.\.)/i.test(output);
    const supported = deliberatePreflightFailure && invalidControlRejected && !sessionStarted;
    let diagnostic = null;
    if (!supported) {
      if (validResult.error?.code === "ENOENT" || invalidControl.error?.code === "ENOENT") {
        diagnostic = "command_unavailable";
      } else if (
        validResult.error?.code === "ETIMEDOUT" ||
        invalidControl.error?.code === "ETIMEDOUT"
      ) {
        diagnostic = "probe_timed_out";
      } else if (/unknown configuration field|strict-config.*not supported/i.test(output)) {
        diagnostic = "strict_config_rejected";
      } else if (sessionStarted) diagnostic = "probe_crossed_model_boundary";
      else if (!invalidControlRejected) diagnostic = "strict_config_negative_control_failed";
      else diagnostic = "unexpected_probe_result";
    }
    return {
      status: supported ? "supported" : "unsupported",
      command: path.basename(command),
      strict_config: supported,
      permission_config: supported,
      probe: "strict_config_parse_with_invalid_control_before_deliberate_missing_schema_failure",
      negative_control_rejected: invalidControlRejected,
      model_or_network_started: sessionStarted,
      diagnostic,
    };
  } catch {
    return {
      status: "unsupported",
      command: path.basename(command),
      strict_config: false,
      permission_config: false,
      probe: "strict_config_parse_with_invalid_control_before_deliberate_missing_schema_failure",
      negative_control_rejected: false,
      model_or_network_started: false,
      diagnostic: "probe_setup_failed",
    };
  } finally {
    if (probeRoot) fs.rmSync(probeRoot, { recursive: true, force: true });
  }
}

function codexExecutionIsolationReadiness(datasetCounts, configInfo) {
  const targetBackend = String(configInfo.values.target_backend || "")
    .trim()
    .toLowerCase();
  const judgeBackend = String(configInfo.values.judge_backend || "")
    .trim()
    .toLowerCase();
  const reflectionBackend = String(configInfo.values.reflection_backend || "")
    .trim()
    .toLowerCase();
  const activePositiveCases = datasetCounts.generated_active?.exists
    ? datasetCounts.generated_active.positive
    : datasetCounts.eval_positive || 0;
  const activeRoles = [
    ...(targetBackend === "codex_exec" ? ["target"] : []),
    ...(judgeBackend === "codex_cli" ? ["judge"] : []),
    ...(reflectionBackend === "codex_cli" ? ["reflection"] : []),
  ];
  const required = activeRoles.length > 0 && activePositiveCases > 0;
  const capability = required
    ? codexPermissionCapability(configInfo)
    : {
        status: "not_applicable",
        command: null,
        strict_config: false,
        permission_config: false,
        probe: null,
        model_or_network_started: false,
        diagnostic: null,
      };
  const blockers =
    required && capability.status !== "supported"
      ? [
          `active Codex ${activeRoles.join("/")} execution requires a verified strict read-isolated permission profile`,
        ]
      : [];
  return {
    status: required ? (blockers.length ? "blocked" : "ready") : "not_applicable",
    required,
    activeRoles,
    targetBackend,
    judgeBackend,
    reflectionBackend,
    activePositiveCases,
    capability,
    blockers,
  };
}

function visualArtifactReadiness(datasetCounts, configInfo, codexIsolation) {
  const visualCases = datasetCounts.positive_with_visual_assertions || 0;
  const activeVisualCases =
    datasetCounts.generated_active?.positive_with_visual_assertions ?? visualCases;
  const activePositiveCases = datasetCounts.generated_active?.positive || 0;
  const drawioCli = detectDrawioCli();
  const toolRolloutForVisualAssertions = configBoolDefault(
    configInfo.values.tool_rollout_for_visual_assertions,
    true,
  );
  const requireDrawioCliForVisualRollouts = configBoolDefault(
    configInfo.values.require_drawio_cli_for_visual_rollouts,
    true,
  );
  const visualExecTimeoutSeconds = Number(configInfo.values.visual_exec_timeout || 0) || null;
  const activeSplitDir = datasetCounts.generated_active?.path || configInfo.values.split_dir || "";
  const visualEvalPolicy = configInfo.values.visual_eval_policy || "";
  const targetBackend = String(configInfo.values.target_backend || "")
    .trim()
    .toLowerCase();
  const codexPermissionProfile = codexIsolation.capability;
  const blockers = [];
  const warnings = [];
  let status = "not_applicable";

  if (visualCases > 0) {
    if (activeVisualCases > 0 && targetBackend !== "codex_exec") {
      status = "unsupported_visual_target_backend";
      blockers.push(
        `active visual assertion cases require target_backend=codex_exec; ${targetBackend || "the configured provider target"} cannot create local artifacts`,
      );
      warnings.push(
        "Provider-backed target runs must select the generated text-only split when source evals include visual assertions.",
      );
    } else if (codexIsolation.required && codexPermissionProfile.status !== "supported") {
      status = "unsupported_codex_permission_profile";
      blockers.push(
        "active Codex target cases require a verified strict custom permission profile, including text-only rollouts",
      );
    } else if (activePositiveCases > 0 && activeVisualCases === 0) {
      status = "text_only_ready";
      const isolationNote = codexIsolation.required
        ? "Codex read isolation remains mandatory."
        : "The provider-backed target remains text-only.";
      warnings.push(
        `${visualCases} visual assertion eval case(s) are excluded from the active text-only split ${activeSplitDir}; text-only bypasses draw.io readiness only. ${isolationNote}`,
      );
    } else if (!toolRolloutForVisualAssertions) {
      status = "blocked";
      blockers.push("visual assertions exist but tool_rollout_for_visual_assertions is disabled");
    } else if (requireDrawioCliForVisualRollouts && !drawioCli.installed) {
      status = "missing_drawio_cli";
      blockers.push(
        `${activeVisualCases} active visual assertion eval case(s) require draw.io Desktop CLI on PATH`,
      );
      warnings.push(
        `${activeVisualCases} active visual assertion eval case(s) will fast-fail until drawio or diagrams.net is on PATH, or an explicitly text-only split is used.`,
      );
    } else {
      status = "ready";
    }
  }

  return {
    status,
    visualAssertionCases: visualCases,
    activeVisualAssertionCases: activeVisualCases,
    activeSplitDir,
    visualEvalPolicy,
    targetBackend,
    drawioCli,
    toolRolloutForVisualAssertions,
    requireDrawioCliForVisualRollouts,
    visualExecTimeoutSeconds,
    codexPermissionProfile,
    blockers,
    warnings,
  };
}

function codexCliAllUnsupportedProviderFeatures(args, configInfo) {
  if (args.mode !== "codex-cli-all") return [];
  const blockers = [];
  if (configBool(configInfo.values.optimizer_use_slow_update)) {
    blockers.push(
      "codex-cli-all cannot enable optimizer.use_slow_update; slow update uses provider-backed chat_optimizer",
    );
  }
  if (configBool(configInfo.values.optimizer_use_meta_skill)) {
    blockers.push(
      "codex-cli-all cannot enable optimizer.use_meta_skill; meta skill uses provider-backed chat_optimizer",
    );
  }
  return blockers;
}

function adapterManifestCompatibility(adapterManifest, skillName, args, effectiveRunProfile) {
  if (!adapterManifest.data) {
    return {
      status: "missing",
      targetMatches: false,
      modeMatches: false,
      runProfileMatches: false,
      warnings: [
        "Adapter manifest is missing; production setup must create target-specific config before training.",
      ],
    };
  }

  const manifest = adapterManifest.data;
  const manifestTarget =
    manifest.target_skill || manifest.proof_target || manifest.proofTarget || null;
  const manifestMode = manifest.mode || manifest.selected_mode || null;
  const manifestRunProfile = manifest.runProfile || manifest.run_profile || null;
  const warnings = [];
  let reviewRequired = false;

  if (!adapterManifest.target_specific) {
    warnings.push(
      "Adapter manifest is legacy/global rather than target-specific; production setup must refresh it before training.",
    );
  }
  if (!manifestTarget) {
    warnings.push(
      "Adapter manifest is missing target identity; production setup must refresh it before training.",
    );
  } else if (manifestTarget !== skillName) {
    warnings.push(
      `Adapter manifest target ${manifestTarget} does not match requested target ${skillName}; production setup must refresh it before training.`,
    );
  }
  if (!manifestMode) {
    warnings.push(
      "Adapter manifest is missing mode identity; production setup must refresh it before training.",
    );
  } else if (manifestMode !== args.mode) {
    warnings.push(
      `Adapter manifest mode ${manifestMode} does not match requested mode ${args.mode}; production setup must refresh it before training.`,
    );
  }
  if (!manifestRunProfile) {
    warnings.push(
      "Adapter manifest is missing run profile identity; production setup must refresh it before training.",
    );
  } else if (manifestRunProfile !== effectiveRunProfile) {
    warnings.push(
      `Adapter manifest run profile ${manifestRunProfile} does not match requested run profile ${effectiveRunProfile}; production setup must refresh it before training.`,
    );
  }
  const registryStatus = manifest.registry_patch?.status || manifest.registryPatch?.status || null;
  if (registryStatus !== "ready") {
    reviewRequired = true;
    warnings.push(
      `Local SkillOpt registry/config patch status is ${registryStatus || "unknown"}; rerun adapter preparation and inspect the manifest if it still fails.`,
    );
  }
  warnings.push(...templateHashWarnings(manifest));

  return {
    status: reviewRequired ? "review_required" : warnings.length ? "refresh_required" : "matched",
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
    return {
      ok: false,
      error: redact(result.stderr || result.stdout || "Codex probe failed"),
    };
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { ok: false, error: "Codex probe returned non-JSON output" };
  }
}

function readExistingCodexProbe() {
  const readinessDir = path.join(root, ".agents/skillopt-work/_readiness");
  const finalPath = path.join(readinessDir, "codex-probe-final.txt");
  const diagnosticPath = path.join(readinessDir, "codex-probe-output.txt");
  if (!fs.existsSync(finalPath) || !fs.existsSync(diagnosticPath)) return null;
  const final = fs.readFileSync(finalPath, "utf8").trim();
  const diagnostic = fs.readFileSync(diagnosticPath, "utf8");
  const ok = final === "CODEX_READY" && /^status:\s*0\s*$/m.test(diagnostic);
  return {
    ok,
    cached: true,
    final_path: path.relative(root, finalPath).replaceAll("\\", "/"),
    diagnostic_path: path.relative(root, diagnosticPath).replaceAll("\\", "/"),
    error: ok ? null : "Existing Codex probe diagnostics are missing CODEX_READY or status 0",
  };
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
    positive_with_visual_assertions: evalCounts.positive_with_visual_assertions,
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
  const split =
    datasetCounts.generated.train + datasetCounts.generated.val + datasetCounts.generated.test
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
const configInfo = configProfile(skillName, args.mode);
const configSchema = configSchemaCheck(skillName, args.mode);
const provider = providerReadiness(args, configInfo);
const providerOk = provider.configured;
if (provider.endpoint_probes.some((probe) => probe.status === "not_run")) {
  warnings.push(
    "OpenAI-compatible endpoint chat preflight was not run; use strict training readiness before handoff.",
  );
}
if (args.mode === "native-provider" && !providerOk) missing.push(...provider.blockers);
if (args.mode === "hybrid-codex-target" && !providerOk && !args.setupOnly) {
  missing.push(...provider.blockers);
}
datasetCounts.generated_active = generatedSplitCountsFromConfig(skillName, configInfo);
const quality = benchmarkQuality(datasetCounts);
const semanticJudge = semanticJudgeReadiness(args, configInfo);
const codexCliAllProviderFeatureBlockers = codexCliAllUnsupportedProviderFeatures(args, configInfo);
if (codexCliAllProviderFeatureBlockers.length) {
  missing.push(...codexCliAllProviderFeatureBlockers);
  warnings.push(
    "codex-cli-all is the provider-free exploratory path; keep slow update and meta skill disabled, or choose hybrid-codex-target/native-provider for provider-backed optimizer features.",
  );
}
const officialParity = officialParityReport(
  args,
  providerOk,
  datasetCounts,
  configInfo,
  quality,
  configSchema,
  semanticJudge,
);
if (officialParity.officialParityStatus === "exploratory") {
  warnings.push(
    "Run is classified as exploratory; detailed parity differences are listed in JSON output.",
  );
}

let codex = {
  required:
    args.mode.includes("codex") ||
    configInfo.values.target_backend === "codex_exec" ||
    configInfo.values.judge_backend === "codex_cli" ||
    configInfo.values.reflection_backend === "codex_cli",
  installed: false,
  probe: null,
};
if (codex.required) {
  codex.installed = commandExists("codex");
  if (!codex.installed) {
    missing.push("Codex CLI");
  } else if (args.codexProbe) {
    codex.probe = runCodexProbe();
    if (!codex.probe.ok) missing.push("Codex CLI login probe");
  } else {
    const existingProbe = readExistingCodexProbe();
    if (existingProbe?.ok) {
      codex.probe = existingProbe;
    } else {
      codex.probe = existingProbe;
      warnings.push(
        "Codex CLI login probe was not run; ask before running it because the probe writes ignored diagnostics under .agents/skillopt-work/_readiness.",
      );
    }
    if (args.strictTrainingReady && !codex.probe?.ok) {
      missing.push("Codex CLI login probe");
    }
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
const liveAdapterPatches = adapterManifest.data
  ? liveAdapterPatchCheck(skillOptPath, adapterManifest.data, args.python)
  : {
      status: "refresh_required",
      manifest_commit: null,
      live_commit: actualSkillOptCommit(skillOptPath),
      files: [],
      blockers: ["target-specific adapter manifest is missing or invalid"],
    };
const datasetFreshness = generatedDataFreshness(skillPath, skillName, configInfo);
const codexIsolation = codexExecutionIsolationReadiness(datasetCounts, configInfo);
const visualArtifact = visualArtifactReadiness(datasetCounts, configInfo, codexIsolation);
warnings.push(...visualArtifact.warnings);
const configuredSplitBlockers =
  datasetCounts.generated_active?.configured && !datasetCounts.generated_active.exists
    ? [`configured split_dir is missing: ${datasetCounts.generated_active.configured_path}`]
    : [];
const dataFloorTrainingBlockers =
  officialParity.runProfile === "official-parity" && !quality.officialFloorMet
    ? quality.blockers.map((blocker) => `active dataset floor: ${blocker}`)
    : [];
const runnableDataBlockers = runnableSplitBlockers(datasetCounts, configInfo);
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
  ...officialParity.proofBlockers,
  ...configuredSplitBlockers,
  ...dataFloorTrainingBlockers,
  ...runnableDataBlockers,
  ...datasetFreshness.blockers,
  ...liveAdapterPatches.blockers,
  ...codexIsolation.blockers,
  ...visualArtifact.blockers,
  ...(adapterManifestCheck.status !== "matched"
    ? [
        adapterManifestCheck.status === "review_required"
          ? "adapter registry/config patch review required"
          : "adapter manifest/config refresh required",
      ]
    : []),
];
const uniqueTrainingBlockers = [...new Set(trainingBlockers)];
const finalProofBlockers =
  officialParity.runProfile === "official-parity"
    ? [...new Set([...officialParity.proofBlockers, ...uniqueTrainingBlockers])]
    : officialParity.proofBlockers;
const finalProofStatus =
  officialParity.runProfile === "official-parity" && finalProofBlockers.length
    ? "blocked"
    : officialParity.proofStatus;

const result = {
  ok: uniqueTrainingBlockers.length === 0,
  target_skill: skillName,
  mode: args.mode,
  requested_run_profile: officialParity.requestedRunProfile,
  run_profile: officialParity.runProfile,
  requestedRunProfile: officialParity.requestedRunProfile,
  runProfile: officialParity.runProfile,
  proofStatus: finalProofStatus,
  proofBlockers: finalProofBlockers,
  officialParityStatus:
    officialParity.runProfile === "official-parity" && finalProofStatus === "blocked"
      ? "blocked"
      : officialParity.officialParityStatus,
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
  semanticJudgeReadiness: semanticJudge,
  datasetFreshness,
  liveAdapterPatchCheck: liveAdapterPatches,
  codexIsolationReadiness: codexIsolation,
  visualArtifactReadiness: visualArtifact,
  artifactExpectations: artifactExpectations(skillName, configInfo),
  officialParityChecklist: {
    providerCredentials: providerOk,
    datasetFloor: quality.officialFloorMet,
    datasetFreshness: datasetFreshness.status,
    liveAdapterPatches: liveAdapterPatches.status,
    codexIsolation: codexIsolation.status,
    semanticJudge: semanticJudge.status,
    configSchema: configSchema.status,
    validationGate: configInfo.values.evaluation_use_gate !== "false",
    testEvaluation: configInfo.values.evaluation_eval_test !== "false",
    slowUpdate: configInfo.values.optimizer_use_slow_update === "true",
    slowUpdateGateWithSelection:
      configInfo.values.optimizer_slow_update_gate_with_selection === "true",
    metaSkill: configInfo.values.optimizer_use_meta_skill === "true",
    skillAwareReflection: configInfo.values.optimizer_use_skill_aware_reflection === "true",
    cosineScheduler: configInfo.values.optimizer_lr_scheduler === "cosine",
    visualArtifactReadiness: visualArtifact.status,
    requiredModelPins: requiredModelPinNames(args.mode, configInfo).map((name) => ({
      name,
      status: configInfo.modelPins[name]?.status || "not_applicable",
    })),
  },
  configPath: configInfo.path,
  adapterManifest,
  adapterManifestCheck,
  providerReadiness: provider,
  credential_presence: credentials,
  codex,
  missing,
  warnings,
  setupReadiness: safeToSetup ? "ready" : "blocked",
  setupBlockers,
  trainingReadiness: uniqueTrainingBlockers.length === 0 ? "ready" : "blocked",
  trainingBlockers: uniqueTrainingBlockers,
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
  if (result.proofBlockers.length)
    console.log(`Proof blockers: ${result.proofBlockers.join("; ")}`);
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
  if (result.visualArtifactReadiness.visualAssertionCases > 0) {
    console.log(`Visual artifact readiness: ${result.visualArtifactReadiness.status}`);
  }
  if (result.adapterManifestCheck.status !== "matched")
    console.log(`Adapter manifest: ${result.adapterManifestCheck.status}`);
  if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
  if (warnings.length) console.log(`Warnings: ${warnings.join("; ")}`);
  if (
    result.mode !== "codex-cli-all" &&
    result.proofBlockers.some((blocker) =>
      blocker.includes("provider-backed optimizer credentials"),
    )
  ) {
    console.log(
      "Provider-free alternative: choose codex-cli-all for exploratory setup through Codex CLI login.",
    );
  }
  console.log(`Safe to setup: ${result.safe_to_setup ? "yes" : "no"}`);
}

if (args.strictTrainingReady && result.trainingReadiness !== "ready") {
  process.exitCode = 1;
} else {
  process.exitCode = result.safe_to_setup ? 0 : 1;
}
