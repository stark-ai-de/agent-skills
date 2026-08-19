import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function usage() {
  console.log(`Usage: inventory-memories.mjs [--codex-home PATH] [--json]

List Codex memory files with size and modification metadata.

Options:
  --codex-home PATH  Use PATH instead of CODEX_HOME or ~/.codex.
  --json             Print structured JSON instead of text.
  -h, --help         Show this help.

This script is read-only. It does not print memory file contents.`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

function parseArgs() {
  let codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  let format = "text";
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    }

    if (arg === "--codex-home") {
      const value = args[i + 1];
      if (!value) fail("--codex-home requires a path.");
      codexHome = value;
      i += 1;
      continue;
    }

    if (arg === "--json") {
      format = "json";
      continue;
    }

    fail(`unknown argument: ${arg}`);
  }

  return { codexHome, format };
}

function collectFiles(dir, maxDepth) {
  const files = [];

  function visit(current, depth) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const childDepth = depth + 1;

      if (entry.isFile() && childDepth <= maxDepth) {
        files.push(fullPath);
      } else if (entry.isDirectory() && childDepth < maxDepth) {
        visit(fullPath, childDepth);
      }
    }
  }

  visit(dir, 0);
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

function isDirectory(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function classifyKind(file, memoriesDir) {
  const relative = path.relative(memoriesDir, file).replaceAll("\\", "/").toLowerCase();
  const name = path.basename(relative);

  if (relative.includes("rollout_summaries/") || relative.includes("session")) {
    return "generated-evidence";
  }
  if (relative.includes("raw") || relative.includes("candidate") || relative.includes("recent")) {
    return "raw-input";
  }
  if (relative.includes("extensions/") || relative.includes("ad_hoc/notes/")) {
    return "update-note";
  }
  if (relative.includes("skills/")) {
    return "skill-memory";
  }
  if (name === "memory_summary.md" || name === "memory.md" || name.includes("summary")) {
    return "curated-summary";
  }
  if (relative.includes("backup")) {
    return "backup";
  }
  return "unknown";
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

const { codexHome, format } = parseArgs();
const memoriesDir = path.join(codexHome, "memories");

if (!isDirectory(memoriesDir)) {
  const payload = {
    codex_home: codexHome,
    memories_dir: memoriesDir,
    files: [],
    message: `No memories directory found at: ${memoriesDir}`,
  };
  if (format === "json") {
    printJson(payload);
  } else {
    console.log(`Codex home: ${codexHome}`);
    console.log(payload.message);
  }
  process.exit(0);
}

const files = collectFiles(memoriesDir, 2);
if (files.length === 0) {
  const payload = {
    codex_home: codexHome,
    memories_dir: memoriesDir,
    files: [],
    message: `No memory files found under: ${memoriesDir}`,
  };
  if (format === "json") {
    printJson(payload);
  } else {
    console.log(`Codex home: ${codexHome}`);
    console.log(payload.message);
  }
  process.exit(0);
}

const records = [];
for (const file of files) {
  let stats;
  try {
    stats = fs.statSync(file);
  } catch {
    continue;
  }

  records.push({
    path: file,
    relative_path: path.relative(memoriesDir, file),
    kind: classifyKind(file, memoriesDir),
    size_bytes: stats.size,
    size: formatBytes(stats.size),
    modified_at: stats.mtime.toISOString(),
  });
}

if (format === "json") {
  printJson({
    codex_home: codexHome,
    memories_dir: memoriesDir,
    files: records,
  });
} else {
  console.log(`Codex home: ${codexHome}`);
  for (const record of records) {
    console.log(`${record.size} ${record.modified_at} ${record.kind} ${record.path}`);
  }
}
