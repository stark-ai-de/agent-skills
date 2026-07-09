import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(`Usage: scan-cursor-context-risks.mjs [--repo PATH] [--memory-bank PATH] [--json] [--max-findings N] [--exclude-agents]

Scan Cursor context files for high-risk lines that deserve review.

Options:
  --repo PATH         Use PATH instead of the current working directory.
  --memory-bank PATH  Include an explicit user-maintained memory-bank file or directory.
                      May be passed more than once.
  --json              Print structured JSON instead of text.
  --max-findings N    Limit returned findings; default is 100.
  --exclude-agents    Do not scan AGENTS.md files.
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
  const memoryBanks = [];
  let format = "text";
  let maxFindings = DEFAULT_MAX_FINDINGS;
  let includeAgents = true;
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

    if (arg === "--exclude-agents") {
      includeAgents = false;
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
    format,
    includeAgents,
    maxFindings,
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

function relativeToRepo(repo, file) {
  const relative = path.relative(repo, file);
  return relative.startsWith("..") ? file : relative || ".";
}

function surfaceFor(repo, file, memoryBankPaths) {
  const relative = relativeToRepo(repo, file).replaceAll("\\", "/");
  if (memoryBankPaths.some((item) => file.startsWith(path.resolve(item)))) return "memory-bank";
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

const riskRules = [
  {
    category: "sensitive",
    pattern:
      /\b(token|secret|password|passwd|api[_-]?key|private key|credential|client[_-]?secret|access[_-]?token|refresh[_-]?token|bearer)\b/i,
  },
  {
    category: "absolute-language",
    pattern: /\b(always|never|must|required|forbidden)\b/i,
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
    pattern: /\b(settings\.json|mcp\.json|cli-config\.json|\.cursor|\.vscode|cursor-agent)\b/i,
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

function addFileLevelFindings(findings, repo, file, surface) {
  if (surface === "legacy-cursorrules") {
    findings.push({
      id: `C-${String(findings.length + 1).padStart(3, "0")}`,
      path: file,
      relative_path: relativeToRepo(repo, file),
      surface,
      line: 1,
      categories: ["legacy"],
      redacted_line:
        "Legacy .cursorrules file exists; review for migration to .cursor/rules/*.mdc or AGENTS.md.",
    });
  }

  if (surface === "cursor-project-rule-plain-md") {
    findings.push({
      id: `C-${String(findings.length + 1).padStart(3, "0")}`,
      path: file,
      relative_path: relativeToRepo(repo, file),
      surface,
      line: 1,
      categories: ["ignored"],
      redacted_line:
        "Plain Markdown under .cursor/rules lacks Cursor Project Rule metadata; review for .mdc conversion or AGENTS.md relocation.",
    });
  }
}

const { format, includeAgents, maxFindings, memoryBanks, repo } = parseArgs();

if (!isDirectory(repo)) {
  fail(`repo path is not a directory: ${repo}`);
}

const candidateFiles = [
  ...collectProjectRuleFiles(repo),
  path.join(repo, ".cursorrules"),
  ...(includeAgents ? collectAgentsFiles(repo) : []),
].filter((file) => isFile(file));

for (const memoryBank of memoryBanks) {
  candidateFiles.push(...collectMemoryBankFiles(memoryBank));
}

const files = [...new Set(candidateFiles)].sort();
const findings = [];
let filesScanned = 0;
let truncated = false;

for (const file of files) {
  const surface = surfaceFor(repo, file, memoryBanks);
  addFileLevelFindings(findings, repo, file, surface);
  if (findings.length >= maxFindings) {
    truncated = true;
    break;
  }

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
      relative_path: relativeToRepo(repo, file),
      surface,
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
  console.log("No Cursor context risks found.");
} else {
  console.log(`Cursor context risks found: ${findings.length}`);
  for (const finding of findings) {
    console.log(
      `${finding.id} ${finding.relative_path}:${finding.line} ${finding.categories.join(",")} ${finding.redacted_line}`,
    );
  }
  if (truncated) console.log(`Findings truncated at ${maxFindings}.`);
}

process.exit(findings.length > 0 ? 1 : 0);
