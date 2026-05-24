import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function usage() {
  console.log(`Usage: backup-memories.mjs [--codex-home PATH]

Create a timestamped backup copy of the Codex memories directory.

Options:
  --codex-home PATH  Use PATH instead of CODEX_HOME or ~/.codex.
  -h, --help         Show this help.

This script creates a copy at <codex-home>/memories.backup.YYYYMMDD-HHMMSS.
It does not edit or delete memory files.`);
}

function fail(message, code = 2) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

function parseArgs() {
  let codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
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

    fail(`unknown argument: ${arg}`);
  }

  return codexHome;
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

function isDirectory(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

const codexHome = parseArgs();
const memoriesDir = path.join(codexHome, "memories");

if (!isDirectory(memoriesDir)) {
  fail(`No memories directory found at: ${memoriesDir}`, 1);
}

const backupDir = path.join(codexHome, `memories.backup.${timestamp()}`);
if (fs.existsSync(backupDir)) {
  fail(`Backup path already exists: ${backupDir}`, 1);
}

try {
  fs.cpSync(memoriesDir, backupDir, {
    errorOnExist: true,
    force: false,
    preserveTimestamps: true,
    recursive: true,
  });
} catch (error) {
  fail(`Could not create backup: ${error.message}`, 1);
}

console.log(`Backup created at ${backupDir}`);
