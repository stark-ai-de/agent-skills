import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function usage() {
  console.log(`Usage: scan-claude-memory-risks.mjs [--repo PATH] [--claude-home PATH] [--memory-dir PATH] [--json] [--max-findings N]

Scan Claude Code memory and instruction files for high-risk lines that deserve review.

Options:
  --repo PATH         Use PATH instead of the current working directory.
  --claude-home PATH  Use PATH instead of ~/.claude.
  --memory-dir PATH   Include an explicit auto memory directory.
  --json              Print structured JSON instead of text.
  --max-findings N    Limit returned findings; default is 100.
  -h, --help          Show this help.

This script is read-only. Output is redacted by default and never includes
the raw matching context line.

Exit codes:
  0  scan completed and no risky lines were found, or no context files exist
  1  scan completed and one or more risky lines were found
  2  usage or input error`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

const DEFAULT_MAX_FINDINGS = 100;

function parseArgs() {
  let repo = process.cwd();
  let claudeHome = path.join(os.homedir(), ".claude");
  let explicitMemoryDir = null;
  let format = "text";
  let maxFindings = DEFAULT_MAX_FINDINGS;
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

    if (arg === "--max-findings") {
      const value = args[i + 1];
      if (!value) fail("--max-findings requires a positive integer.");
      maxFindings = Number.parseInt(value, 10);
      if (!Number.isSafeInteger(maxFindings) || maxFindings < 1) {
        fail("--max-findings requires a positive integer.");
      }
      i += 1;
      continue;
    }

    fail(`unknown argument: ${arg}`);
  }

  return {
    claudeHome: expandHome(claudeHome),
    explicitMemoryDir: explicitMemoryDir ? expandHome(explicitMemoryDir) : null,
    format,
    maxFindings,
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
    files.push(...walk(path.join(dir, "managed-settings.d"), (file) => file.endsWith(".json")));
  }

  return files.filter((file) => isFile(file));
}

function collectMemoryFiles(memoryDir) {
  if (!memoryDir || !isDirectory(memoryDir)) return [];
  return walk(memoryDir, (file) => file.endsWith(".md"));
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
    ...managedPolicyFiles().filter((file) => path.basename(file) !== "CLAUDE.md"),
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

const riskRules = [
  {
    category: "sensitive",
    pattern:
      /\b(token|secret|password|passwd|api[_-]?key|private key|credential|client[_-]?secret|access[_-]?token|refresh[_-]?token|bearer)\b/i,
  },
  {
    category: "absolute-language",
    pattern: /\b(always|never|must|required|forbidden|block|enforce)\b/i,
  },
  {
    category: "temporary",
    pattern: /\b(branch|temporary|one-off|todo|debug|old branch|migration branch|workaround)\b/i,
  },
  {
    category: "repo-specific",
    pattern:
      /\b(apps[\\/]|packages[\\/]|pnpm|npm run|yarn|bun|turbo|workspace|repo|repository|pr #|issue #)\b/i,
  },
  {
    category: "local-environment",
    pattern: /\b(localhost|127\.0\.0\.1|\/home\/|\/users\/|[a-z]:\\|wsl|\.env)\b/i,
  },
  {
    category: "config",
    pattern:
      /\b(settings\.json|autoMemoryEnabled|autoMemoryDirectory|claudeMdExcludes|permissions|sandbox|hooks)\b/i,
  },
];

function categoriesFor(line) {
  return riskRules.filter((rule) => rule.pattern.test(line)).map((rule) => rule.category);
}

function redact(line) {
  return line
    .replace(/(https?:\/\/)[^/\s:@]+:[^/\s@]+@/gi, "$1[REDACTED]@")
    .replace(
      /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret|token|password|passwd|credential)\b(\s*[:=]\s*)(["']?)[^"',\s]+(["']?)/gi,
      "$1$2$3[REDACTED]$4",
    )
    .replace(
      /(\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret|token|password|passwd|credential)\b[^`'":=]{0,80}\b(?:is|was)\s+)([`'"]?)[^`'"\s.,;]+([`'"]?)/gi,
      "$1$2[REDACTED]$3",
    )
    .replace(
      /(\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret|token|password|passwd|credential|private key)\b[^`'"]{0,60}[`'"])[^`'"]+([`'"])/gi,
      "$1[REDACTED]$2",
    )
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----/gi, "[REDACTED_PRIVATE_KEY_BEGIN]")
    .replace(/-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED_PRIVATE_KEY_END]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/(\/home\/)[^\s`'"]+/gi, "$1[REDACTED_PATH]")
    .replace(/(\/Users\/)[^\s`'"]+/gi, "$1[REDACTED_PATH]");
}

function trimLine(line) {
  const normalized = line.trim();
  if (normalized.length <= 360) return normalized;
  return `${normalized.slice(0, 360)} ... [truncated]`;
}

function summarize(findings) {
  const counts = {};
  for (const finding of findings) {
    for (const category of finding.categories) {
      counts[category] = (counts[category] ?? 0) + 1;
    }
  }
  return counts;
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

const { claudeHome, explicitMemoryDir, format, maxFindings, repo } = parseArgs();

if (!isDirectory(repo)) {
  fail(`repo path is not a directory: ${repo}`);
}

const configuredMemoryDir = configuredAutoMemory(repo, claudeHome);
const derived = derivedMemoryCandidate(repo, claudeHome);
const memoryDir =
  explicitMemoryDir ?? configuredMemoryDir ?? (isDirectory(derived) ? derived : null);

const files = [
  ...collectProjectFiles(repo),
  ...collectUserFiles(claudeHome),
  ...managedPolicyFiles(),
  ...collectMemoryFiles(memoryDir),
]
  .filter((file) => isFile(file))
  .filter((file, index, array) => array.indexOf(file) === index)
  .sort();

const findings = [];
let filesScanned = 0;
let truncated = false;

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  filesScanned += 1;

  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const categories = categoriesFor(line);
    if (categories.length === 0) continue;

    findings.push({
      id: `C-${String(findings.length + 1).padStart(3, "0")}`,
      path: file,
      relative_path: relativeToBase(repo, file),
      surface: surfaceFor(repo, claudeHome, memoryDir, file),
      line: index + 1,
      categories,
      redacted_line: trimLine(redact(line)),
    });

    if (findings.length >= maxFindings) {
      truncated = true;
      break;
    }
  }

  if (truncated) break;
}

const payload = {
  repo,
  claude_home: claudeHome,
  auto_memory_dir: memoryDir,
  files_considered: files.length,
  files_scanned: filesScanned,
  max_findings: maxFindings,
  truncated,
  findings_count: findings.length,
  summary_by_category: summarize(findings),
  findings,
};

if (format === "json") {
  printJson(payload);
} else if (findings.length === 0) {
  console.log("No Claude context risks found.");
} else {
  console.log(`Claude context risks found: ${findings.length}`);
  for (const finding of findings) {
    console.log(
      `${finding.id} ${finding.relative_path}:${finding.line} ${finding.categories.join(",")} ${finding.redacted_line}`,
    );
  }
  if (truncated) console.log(`Findings truncated at ${maxFindings}.`);
}

process.exit(findings.length > 0 ? 1 : 0);
