import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function usage() {
  console.log(`Usage: backup-claude-memory.mjs [--repo PATH] [--claude-home PATH] [--memory-dir PATH]

Create a timestamped backup copy of Claude Code memory and instruction files.

Options:
  --repo PATH         Use PATH instead of the current working directory.
  --claude-home PATH  Use PATH instead of ~/.claude.
  --memory-dir PATH   Include an explicit auto memory directory.
  -h, --help          Show this help.

This script creates a copy at <repo>/.claude-context.backup.YYYYMMDD-HHMMSS.
It does not edit or delete context files. Managed policy files are skipped by default.`);
}

function fail(message, code = 2) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

function parseArgs() {
  let repo = process.cwd();
  let claudeHome = path.join(os.homedir(), ".claude");
  let explicitMemoryDir = null;
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

    fail(`unknown argument: ${arg}`);
  }

  return {
    claudeHome: expandHome(claudeHome),
    explicitMemoryDir: explicitMemoryDir ? expandHome(explicitMemoryDir) : null,
    repo: path.resolve(repo),
  };
}

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return path.resolve(value);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function timestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
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
        if (
          !ignoredDirectories.has(entry.name) &&
          !entry.name.startsWith(".claude-context.backup.")
        ) {
          visit(fullPath);
        }
      } else if (entry.isFile() && predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  if (isDirectory(dir)) visit(dir);
  return files.sort();
}

function collectProjectFiles(repo) {
  return [
    path.join(repo, "CLAUDE.md"),
    path.join(repo, ".claude", "CLAUDE.md"),
    path.join(repo, "CLAUDE.local.md"),
    path.join(repo, ".claude", "settings.json"),
    path.join(repo, ".claude", "settings.local.json"),
    ...walk(path.join(repo, ".claude", "rules")),
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
    ...walk(path.join(claudeHome, "rules")),
  ];
}

function collectMemoryFiles(memoryDir) {
  if (!memoryDir || !isDirectory(memoryDir)) return [];
  return walk(memoryDir);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function configuredAutoMemory(repo, claudeHome) {
  const files = [
    path.join(claudeHome, "settings.json"),
    path.join(repo, ".claude", "settings.json"),
    path.join(repo, ".claude", "settings.local.json"),
  ].filter((file) => isFile(file));

  for (const file of files.reverse()) {
    const data = readJson(file);
    if (typeof data?.autoMemoryDirectory === "string") {
      return expandHome(data.autoMemoryDirectory);
    }
  }

  return null;
}

function derivedMemoryCandidate(repo, claudeHome) {
  const slug = repo.replace(/^[\\/]+/, "").replace(/[:\\/]+/g, "-");
  return path.join(claudeHome, "projects", slug, "memory");
}

function sanitizeSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "artifact";
}

function backupRelativePath(repo, claudeHome, memoryDir, file) {
  const repoRelative = path.relative(repo, file);
  if (!repoRelative.startsWith("..")) return repoRelative;

  const homeRelative = path.relative(claudeHome, file);
  if (!homeRelative.startsWith("..")) return path.join("user-claude-home", homeRelative);

  if (memoryDir) {
    const memoryRelative = path.relative(memoryDir, file);
    if (!memoryRelative.startsWith("..")) return path.join("auto-memory", memoryRelative);
  }

  return path.join(
    "external",
    sanitizeSegment(path.basename(path.dirname(file))),
    path.basename(file),
  );
}

const { claudeHome, explicitMemoryDir, repo } = parseArgs();

if (!isDirectory(repo)) {
  fail(`repo path is not a directory: ${repo}`);
}

const memoryDir =
  explicitMemoryDir ??
  configuredAutoMemory(repo, claudeHome) ??
  (isDirectory(derivedMemoryCandidate(repo, claudeHome))
    ? derivedMemoryCandidate(repo, claudeHome)
    : null);

const files = [
  ...collectProjectFiles(repo),
  ...collectUserFiles(claudeHome),
  ...collectMemoryFiles(memoryDir),
]
  .filter((file) => isFile(file))
  .filter((file, index, array) => array.indexOf(file) === index)
  .sort();

if (files.length === 0) {
  fail("No Claude context files found to back up.", 1);
}

const backupDir = path.join(repo, `.claude-context.backup.${timestamp()}`);
if (fs.existsSync(backupDir)) {
  fail(`Backup path already exists: ${backupDir}`, 1);
}

try {
  for (const file of files) {
    const destination = path.join(backupDir, backupRelativePath(repo, claudeHome, memoryDir, file));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(file, destination);
  }
} catch (error) {
  fail(`Could not create backup: ${error.message}`, 1);
}

console.log(`Backup created at ${backupDir}`);
console.log(`Files backed up: ${files.length}`);
