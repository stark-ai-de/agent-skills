import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(`Usage: inventory-cursor-context.mjs [--repo PATH] [--memory-bank PATH] [--json]

List Cursor context files with size, modification metadata, and rule frontmatter.

Options:
  --repo PATH         Use PATH instead of the current working directory.
  --memory-bank PATH  Include an explicit user-maintained memory-bank file or directory.
                      May be passed more than once.
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
  const memoryBanks = [];
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

    if (arg === "--memory-bank") {
      const value = args[i + 1];
      if (!value) fail("--memory-bank requires a path.");
      memoryBanks.push(value);
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
    format,
    memoryBanks,
    repo: path.resolve(repo),
  };
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

function collectMemoryBankFiles(inputPath) {
  const fullPath = path.resolve(inputPath);
  if (isFile(fullPath)) return [fullPath];
  if (isDirectory(fullPath)) return walk(fullPath);
  return [];
}

function collectProjectRuleFiles(repo) {
  const rulesDir = path.join(repo, ".cursor", "rules");
  return walk(rulesDir, (file) => /\.(mdc|md)$/i.test(file));
}

function collectAgentsFiles(repo) {
  return walk(repo, (file) => path.basename(file) === "AGENTS.md");
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

function relativeToRepo(repo, file) {
  const relative = path.relative(repo, file);
  return relative.startsWith("..") ? file : relative || ".";
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
    alwaysApply: data.alwaysApply ?? null,
    description: data.description ?? null,
    globs: data.globs ?? null,
  };
}

function classifySurface(repo, file, sourceKind) {
  const relative = relativeToRepo(repo, file).replaceAll("\\", "/");
  if (sourceKind === "memory-bank") return "memory-bank";
  if (relative === ".cursorrules") return "legacy-cursorrules";
  if (path.basename(file) === "AGENTS.md") return "agents-md";
  if (relative.startsWith(".cursor/rules/") && file.endsWith(".mdc")) {
    return "cursor-project-rule";
  }
  if (relative.startsWith(".cursor/rules/") && file.endsWith(".md")) {
    return "cursor-project-rule-plain-md";
  }
  return "unknown";
}

function recordFor(repo, file, sourceKind = "repo") {
  let stats;
  try {
    stats = fs.statSync(file);
  } catch {
    return null;
  }

  const surface = classifySurface(repo, file, sourceKind);
  return {
    path: file,
    relative_path: relativeToRepo(repo, file),
    surface,
    size_bytes: stats.size,
    size: formatBytes(stats.size),
    modified_at: stats.mtime.toISOString(),
    frontmatter: file.endsWith(".mdc") ? parseFrontmatter(file) : null,
    note:
      surface === "cursor-project-rule-plain-md"
        ? "Plain Markdown under .cursor/rules lacks Cursor Project Rule metadata; consider .mdc or AGENTS.md."
        : null,
  };
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

const { format, memoryBanks, repo } = parseArgs();

if (!isDirectory(repo)) {
  fail(`repo path is not a directory: ${repo}`);
}

const candidateFiles = [
  ...collectProjectRuleFiles(repo),
  path.join(repo, ".cursorrules"),
  ...collectAgentsFiles(repo),
].filter((file) => isFile(file));

for (const memoryBank of memoryBanks) {
  candidateFiles.push(...collectMemoryBankFiles(memoryBank));
}

const records = [...new Set(candidateFiles)]
  .sort()
  .map((file) =>
    recordFor(
      repo,
      file,
      memoryBanks.some((item) => file.startsWith(path.resolve(item))) ? "memory-bank" : "repo",
    ),
  )
  .filter(Boolean);

const payload = {
  repo,
  files_count: records.length,
  files: records,
  message:
    records.length === 0
      ? "No Cursor context files found. Provide User Rules, Team Rules, or memory-bank exports if needed."
      : undefined,
};

if (format === "json") {
  printJson(payload);
} else {
  console.log(`Repo: ${repo}`);
  if (records.length === 0) {
    console.log(payload.message);
  } else {
    for (const record of records) {
      const frontmatter = record.frontmatter
        ? ` description=${JSON.stringify(record.frontmatter.description)} globs=${JSON.stringify(record.frontmatter.globs)} alwaysApply=${JSON.stringify(record.frontmatter.alwaysApply)}`
        : "";
      console.log(
        `${record.size} ${record.modified_at} ${record.surface} ${record.relative_path}${frontmatter}`,
      );
      if (record.note) console.log(`  note: ${record.note}`);
    }
  }
}
