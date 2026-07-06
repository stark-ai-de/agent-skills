import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(`Usage: backup-cursor-context.mjs [--repo PATH] [--memory-bank PATH]

Create a timestamped backup copy of Cursor context files.

Options:
  --repo PATH         Use PATH instead of the current working directory.
  --memory-bank PATH  Include an explicit user-maintained memory-bank file or directory.
                      May be passed more than once.
  -h, --help          Show this help.

This script creates a copy at <repo>/.cursor-context.backup.YYYYMMDD-HHMMSS.
It does not edit or delete context files.`);
}

function fail(message, code = 2) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

function parseArgs() {
  let repo = process.cwd();
  const memoryBanks = [];
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

    if (arg === "--memory-bank") {
      const value = args[i + 1];
      if (!value) fail("--memory-bank requires a path.");
      memoryBanks.push(value);
      i += 1;
      continue;
    }

    fail(`unknown argument: ${arg}`);
  }

  return {
    memoryBanks,
    repo: path.resolve(repo),
  };
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
          !entry.name.startsWith(".cursor-context.backup.")
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

function collectProjectRuleFiles(repo) {
  const rulesDir = path.join(repo, ".cursor", "rules");
  return walk(rulesDir);
}

function collectAgentsFiles(repo) {
  return walk(repo, (file) => path.basename(file) === "AGENTS.md");
}

function collectMemoryBankFiles(inputPath) {
  const fullPath = path.resolve(inputPath);
  if (isFile(fullPath)) return [fullPath];
  if (isDirectory(fullPath)) return walk(fullPath);
  return [];
}

function sanitizeSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "artifact";
}

function backupRelativePath(repo, file, memoryBanks) {
  const repoRelative = path.relative(repo, file);
  if (!repoRelative.startsWith("..")) return repoRelative;

  const ownerIndex = memoryBanks.findIndex((item) => file.startsWith(path.resolve(item)));
  const owner = ownerIndex >= 0 ? path.resolve(memoryBanks[ownerIndex]) : path.dirname(file);
  const ownerName = sanitizeSegment(path.basename(owner));
  const relative = path.relative(owner, file);
  return path.join("external-memory-bank", `${ownerIndex + 1}-${ownerName}`, relative);
}

const { memoryBanks, repo } = parseArgs();

if (!isDirectory(repo)) {
  fail(`repo path is not a directory: ${repo}`);
}

const files = [
  ...collectProjectRuleFiles(repo),
  path.join(repo, ".cursorrules"),
  ...collectAgentsFiles(repo),
];

for (const memoryBank of memoryBanks) {
  files.push(...collectMemoryBankFiles(memoryBank));
}

const existingFiles = [...new Set(files)].filter((file) => isFile(file)).sort();

if (existingFiles.length === 0) {
  fail("No Cursor context files found to back up.", 1);
}

const backupDir = path.join(repo, `.cursor-context.backup.${timestamp()}`);
if (fs.existsSync(backupDir)) {
  fail(`Backup path already exists: ${backupDir}`, 1);
}

try {
  for (const file of existingFiles) {
    const destination = path.join(backupDir, backupRelativePath(repo, file, memoryBanks));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(file, destination);
  }
} catch (error) {
  fail(`Could not create backup: ${error.message}`, 1);
}

console.log(`Backup created at ${backupDir}`);
console.log(`Files backed up: ${existingFiles.length}`);
