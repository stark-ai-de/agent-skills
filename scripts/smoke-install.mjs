import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-smoke-"));
const copyRoot = path.join(tmpRoot, "repo");

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, predicate));
    if (entry.isFile() && predicate(full)) files.push(full);
  }

  return files;
}

function parseSkillName(file) {
  const text = fs.readFileSync(file, "utf8");
  return text.match(/^name:\s*([a-z0-9-]+)$/m)?.[1] ?? null;
}

try {
  fs.cpSync(root, copyRoot, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source);
      if (!rel) return true;
      const [topLevel] = rel.split(path.sep);
      return !new Set([".agents", ".git", "node_modules"]).has(topLevel);
    },
  });

  const names = walk(path.join(copyRoot, "skills"), (file) => path.basename(file) === "SKILL.md")
    .map(parseSkillName)
    .filter(Boolean)
    .sort();

  const result = spawnSync("npx", ["skills@latest", "add", ".", "--list"], {
    cwd: copyRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = `${result.stdout}\n${result.stderr}`;

  if (result.status !== 0) {
    console.error(output.trim());
    process.exit(result.status ?? 1);
  }

  const missing = names.filter((name) => !output.includes(name));
  if (missing.length > 0) {
    console.error(`Smoke install output did not list expected skill(s): ${missing.join(", ")}`);
    process.exit(1);
  }

  if (output.includes("agent-browser") || output.includes("grill-me")) {
    console.error(
      "Smoke install output included project-local helper skills from .agents/skills/.",
    );
    process.exit(1);
  }

  console.log(`Smoke install listed ${names.length} public skill(s) from a clean copy.`);
} finally {
  fs.rmSync(tmpRoot, { force: true, recursive: true });
}
