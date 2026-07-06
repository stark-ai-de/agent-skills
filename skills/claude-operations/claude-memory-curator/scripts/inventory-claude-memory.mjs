import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function usage() {
  console.log(`Usage: inventory-claude-memory.mjs [--repo PATH] [--claude-home PATH] [--memory-dir PATH] [--json]

List Claude Code memory and instruction files with size, modification metadata,
rule frontmatter, and visible settings signals.

Options:
  --repo PATH         Use PATH instead of the current working directory.
  --claude-home PATH  Use PATH instead of ~/.claude.
  --memory-dir PATH   Include an explicit auto memory directory.
  --json              Print structured JSON instead of text.
  -h, --help          Show this help.

This script is read-only. It does not print context file contents.`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

function parseArgs() {
  let repo = process.cwd();
  let claudeHome = path.join(os.homedir(), ".claude");
  let explicitMemoryDir = null;
  let format = "text";
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    }

    if (arg === "--repo") {
      const value = args[i + 1];
      if (!value) fail("--repo requires a path.");
      repo = value;
      i += 1;
      continue;
    }

    if (arg === "--claude-home") {
      const value = args[i + 1];
      if (!value) fail("--claude-home requires a path.");
      claudeHome = value;
      i += 1;
      continue;
    }

    if (arg === "--memory-dir") {
      const value = args[i + 1];
      if (!value) fail("--memory-dir requires a path.");
      explicitMemoryDir = value;
      i += 1;
      continue;
    }

    if (arg === "--json") {
      format = "json";
      continue;
    }

    fail(`unknown argument: ${arg}`);
  }

  return {
    claudeHome: expandHome(claudeHome),
    explicitMemoryDir: explicitMemoryDir ? expandHome(explicitMemoryDir) : null,
    format,
    repo: path.resolve(repo),
  };
}

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return path.resolve(value);
}

function isDirectory(value) {
  try {
    return fs.statSync(value).isDirectory();
  } catch {
    return false;
  }
}

function isFile(value) {
  try {
    return fs.statSync(value).isFile();
  } catch {
    return false;
  }
}

const ignoredDirectories = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  "node_modules",
]);

function walk(dir, predicate = () => true) {
  const files = [];

  function visit(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) visit(fullPath);
      } else if (entry.isFile() && predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  if (isDirectory(dir)) visit(dir);
  return files.sort();
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${unitIndex === 0 ? value : value.toFixed(1)}${units[unitIndex]}`;
}

function relativeToBase(base, file) {
  const relative = path.relative(base, file);
  if (relative === "") return ".";
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return file;
  }
  return relative;
}

function relativeInside(base, file) {
  const relative = path.relative(base, file);
  if (relative === "") return ".";
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  return relative;
}

function parseFrontmatter(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }

  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    data[key] = value;
  }

  return {
    paths: data.paths ?? null,
  };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function settingsSignals(file) {
  const data = readJson(file);
  if (!data || typeof data !== "object") return null;

  return {
    autoMemoryEnabled: Object.hasOwn(data, "autoMemoryEnabled")
      ? Boolean(data.autoMemoryEnabled)
      : null,
    autoMemoryDirectory:
      typeof data.autoMemoryDirectory === "string" ? data.autoMemoryDirectory : null,
    claudeMdExcludes: Array.isArray(data.claudeMdExcludes) ? data.claudeMdExcludes.length : null,
    hooks: data.hooks && typeof data.hooks === "object" ? Object.keys(data.hooks).length : null,
    permissions:
      data.permissions && typeof data.permissions === "object"
        ? Object.keys(data.permissions).length
        : null,
  };
}

function managedPolicyFiles() {
  const baseDirs = [
    "/etc/claude-code",
    "/Library/Application Support/ClaudeCode",
    "C:\\Program Files\\ClaudeCode",
  ];
  const files = [];

  for (const dir of baseDirs) {
    files.push(path.join(dir, "CLAUDE.md"));
    files.push(path.join(dir, "managed-settings.json"));
    const dropIns = path.join(dir, "managed-settings.d");
    files.push(...walk(dropIns, (file) => file.endsWith(".json")));
  }

  return files.filter((file) => isFile(file));
}

function collectProjectFiles(repo) {
  return [
    path.join(repo, "CLAUDE.md"),
    path.join(repo, ".claude", "CLAUDE.md"),
    path.join(repo, "CLAUDE.local.md"),
    path.join(repo, ".claude", "settings.json"),
    path.join(repo, ".claude", "settings.local.json"),
    ...walk(path.join(repo, ".claude", "rules"), (file) => file.endsWith(".md")),
    ...walk(repo, (file) => {
      const name = path.basename(file);
      return name === "CLAUDE.md" || name === "CLAUDE.local.md";
    }),
  ];
}

function collectUserFiles(claudeHome) {
  return [
    path.join(claudeHome, "CLAUDE.md"),
    path.join(claudeHome, "settings.json"),
    ...walk(path.join(claudeHome, "rules"), (file) => file.endsWith(".md")),
  ];
}

function expandConfiguredPath(value) {
  if (!value || typeof value !== "string") return null;
  return expandHome(value);
}

function visibleSettingsFiles(repo, claudeHome) {
  return [
    { path: path.join(claudeHome, "settings.json"), precedence: 1, source: "user" },
    { path: path.join(repo, ".claude", "settings.json"), precedence: 2, source: "project" },
    { path: path.join(repo, ".claude", "settings.local.json"), precedence: 3, source: "local" },
    ...managedPolicyFiles()
      .filter((file) => path.basename(file) !== "CLAUDE.md")
      .map((file) => ({ path: file, precedence: 4, source: "managed-policy" })),
  ].filter((entry) => isFile(entry.path));
}

function configuredAutoMemory(repo, claudeHome) {
  const settings = visibleSettingsFiles(repo, claudeHome)
    .map((entry) => ({ ...entry, signals: settingsSignals(entry.path) }))
    .filter((entry) => entry.signals?.autoMemoryDirectory)
    .sort((a, b) => b.precedence - a.precedence)[0];

  if (!settings) return null;

  return {
    dir: expandConfiguredPath(settings.signals.autoMemoryDirectory),
    source: settings.path,
    source_scope: settings.source,
  };
}

function derivedMemoryCandidate(repo, claudeHome) {
  const slug = repo.replace(/^[\\/]+/, "").replace(/[:\\/]+/g, "-");
  return path.join(claudeHome, "projects", slug, "memory");
}

function collectMemoryFiles(memoryDir) {
  if (!memoryDir || !isDirectory(memoryDir)) return [];
  return walk(memoryDir, (file) => file.endsWith(".md"));
}

function surfaceFor(repo, claudeHome, memoryDir, file) {
  const repoRelative = relativeInside(repo, file)?.replaceAll("\\", "/") ?? null;
  const homeRelative = relativeInside(claudeHome, file)?.replaceAll("\\", "/") ?? null;
  const memoryRelative = memoryDir
    ? (relativeInside(memoryDir, file)?.replaceAll("\\", "/") ?? null)
    : null;

  if (memoryDir && memoryRelative !== null) {
    return memoryRelative.toLowerCase() === "memory.md"
      ? "claude-auto-memory-entrypoint"
      : "claude-auto-memory-topic";
  }
  if (managedPolicyFiles().includes(file)) {
    return path.basename(file) === "CLAUDE.md"
      ? "claude-managed-policy"
      : "claude-managed-settings";
  }
  if (homeRelative !== null) {
    if (homeRelative === "CLAUDE.md") return "claude-user-md";
    if (homeRelative === "settings.json") return "claude-user-settings";
    if (homeRelative.startsWith("rules/")) return "claude-user-rule";
  }
  if (repoRelative !== null) {
    if (repoRelative === "CLAUDE.md" || repoRelative === ".claude/CLAUDE.md") {
      return "claude-project-md";
    }
    if (repoRelative.endsWith("CLAUDE.local.md")) return "claude-local-md";
    if (repoRelative === ".claude/settings.json") return "claude-project-settings";
    if (repoRelative === ".claude/settings.local.json") return "claude-local-settings";
    if (repoRelative.startsWith(".claude/rules/")) return "claude-project-rule";
  }
  return "unknown";
}

function recordFor(repo, claudeHome, memoryDir, file) {
  let stats;
  try {
    stats = fs.statSync(file);
  } catch {
    return null;
  }

  const surface = surfaceFor(repo, claudeHome, memoryDir, file);
  return {
    path: file,
    relative_path: relativeToBase(repo, file),
    surface,
    size_bytes: stats.size,
    size: formatBytes(stats.size),
    modified_at: stats.mtime.toISOString(),
    frontmatter:
      surface === "claude-project-rule" || surface === "claude-user-rule"
        ? parseFrontmatter(file)
        : null,
    settings:
      surface.includes("settings") || surface === "claude-managed-settings"
        ? settingsSignals(file)
        : null,
    read_only: surface === "claude-managed-policy" || surface === "claude-managed-settings",
  };
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

const { claudeHome, explicitMemoryDir, format, repo } = parseArgs();

if (!isDirectory(repo)) {
  fail(`repo path is not a directory: ${repo}`);
}

const configured = configuredAutoMemory(repo, claudeHome);
const derived = derivedMemoryCandidate(repo, claudeHome);
const memoryDir = explicitMemoryDir ?? configured?.dir ?? (isDirectory(derived) ? derived : null);

const candidateFiles = [
  ...collectProjectFiles(repo),
  ...collectUserFiles(claudeHome),
  ...managedPolicyFiles(),
  ...collectMemoryFiles(memoryDir),
].filter((file) => isFile(file));

const records = [...new Set(candidateFiles)]
  .sort()
  .map((file) => recordFor(repo, claudeHome, memoryDir, file))
  .filter(Boolean);

const payload = {
  repo,
  claude_home: claudeHome,
  auto_memory_dir: memoryDir,
  auto_memory_source: explicitMemoryDir
    ? "explicit --memory-dir"
    : configured
      ? `${configured.source_scope}: ${configured.source}`
      : isDirectory(derived)
        ? "derived candidate"
        : null,
  auto_memory_note: memoryDir
    ? null
    : "No auto memory directory found. Use /memory or pass --memory-dir when Claude Code uses a project-derived path that cannot be proven statically.",
  files_count: records.length,
  files: records,
  message:
    records.length === 0
      ? "No Claude context files found. Provide --claude-home, --memory-dir, or /memory evidence if needed."
      : undefined,
};

if (format === "json") {
  printJson(payload);
} else {
  console.log(`Repo: ${repo}`);
  console.log(`Claude home: ${claudeHome}`);
  if (payload.auto_memory_dir) console.log(`Auto memory: ${payload.auto_memory_dir}`);
  if (payload.auto_memory_note) console.log(payload.auto_memory_note);
  if (records.length === 0) {
    console.log(payload.message);
  } else {
    for (const record of records) {
      const frontmatter = record.frontmatter?.paths
        ? ` paths=${JSON.stringify(record.frontmatter.paths)}`
        : "";
      const settings = record.settings
        ? ` settings=${JSON.stringify(Object.fromEntries(Object.entries(record.settings).filter(([, value]) => value !== null)))}`
        : "";
      const readOnly = record.read_only ? " read-only" : "";
      console.log(
        `${record.size} ${record.modified_at} ${record.surface}${readOnly} ${record.relative_path}${frontmatter}${settings}`,
      );
    }
  }
}
