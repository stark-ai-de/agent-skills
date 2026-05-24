import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function usage() {
  console.log(`Usage: scan-memory-risks.mjs [--codex-home PATH] [--json] [--max-findings N] [--include-generated-evidence]

Scan Codex memory files for high-risk terms that deserve review.

Options:
  --codex-home PATH              Use PATH instead of CODEX_HOME or ~/.codex.
  --json                         Print structured JSON instead of text.
  --max-findings N               Limit returned findings; default is 100.
  --include-generated-evidence   Also scan rollout/session evidence files.
  -h, --help                     Show this help.

This script is read-only. Output is redacted by default and never includes
the raw matching memory line.

Exit codes:
  0  scan completed and no risky lines were found, or no memories directory exists
  1  scan completed and one or more risky lines were found
  2  usage or input error`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

const DEFAULT_MAX_FINDINGS = 100;

function parseArgs() {
  let codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  let format = "text";
  let includeGeneratedEvidence = false;
  let maxFindings = DEFAULT_MAX_FINDINGS;
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

    if (arg === "--include-generated-evidence") {
      includeGeneratedEvidence = true;
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

  return { codexHome, format, includeGeneratedEvidence, maxFindings };
}

function collectFiles(dir) {
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

      if (entry.isFile()) {
        files.push(fullPath);
      } else if (entry.isDirectory()) {
        visit(fullPath);
      }
    }
  }

  visit(dir);
  return files.sort();
}

function isDirectory(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
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
    pattern: /\b(branch|temporary|one-off|todo|debug|old branch|migration branch)\b/i,
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
      /\b(config\.toml|\[features\]|\[memories\]|use_memories|generate_memories|disable_on_external_context|min_rate_limit_remaining_percent)\b/i,
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
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
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

function isGeneratedEvidence(file, memoriesDir) {
  const relative = path.relative(memoriesDir, file).replaceAll("\\", "/").toLowerCase();
  return (
    relative.includes("rollout_summaries/") ||
    relative.includes("sessions/") ||
    relative.includes("session")
  );
}

const { codexHome, format, includeGeneratedEvidence, maxFindings } = parseArgs();
const memoriesDir = path.join(codexHome, "memories");

if (!isDirectory(memoriesDir)) {
  const payload = {
    codex_home: codexHome,
    memories_dir: memoriesDir,
    files_considered: 0,
    files_scanned: 0,
    files_skipped: 0,
    skipped_generated_evidence_count: 0,
    max_findings: maxFindings,
    truncated: false,
    findings_count: 0,
    summary_by_category: {},
    findings: [],
    message: `No memories directory found at: ${memoriesDir}`,
  };
  if (format === "json") {
    printJson(payload);
  } else {
    console.log(payload.message);
  }
  process.exit(0);
}

const files = collectFiles(memoriesDir);
const findings = [];
let filesScanned = 0;
let filesSkipped = 0;
let skippedGeneratedEvidenceCount = 0;
let truncated = false;

for (const file of files) {
  if (!includeGeneratedEvidence && isGeneratedEvidence(file, memoriesDir)) {
    filesSkipped += 1;
    skippedGeneratedEvidenceCount += 1;
    continue;
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
      id: `R-${String(findings.length + 1).padStart(3, "0")}`,
      path: file,
      relative_path: path.relative(memoriesDir, file),
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
  codex_home: codexHome,
  memories_dir: memoriesDir,
  files_considered: files.length,
  files_scanned: filesScanned,
  files_skipped: filesSkipped,
  skipped_generated_evidence_count: skippedGeneratedEvidenceCount,
  max_findings: maxFindings,
  truncated,
  findings_count: findings.length,
  summary_by_category: summarize(findings),
  findings,
};

if (format === "json") {
  printJson(payload);
} else if (findings.length === 0) {
  console.log(`No risky memory lines found under: ${memoriesDir}`);
  if (skippedGeneratedEvidenceCount > 0) {
    console.log(
      `Skipped ${skippedGeneratedEvidenceCount} generated evidence file(s). Re-run with --include-generated-evidence if needed.`,
    );
  }
} else {
  for (const finding of findings) {
    console.log(
      `${finding.id} ${finding.path}:${finding.line} [${finding.categories.join(",")}] ${finding.redacted_line}`,
    );
  }
  if (truncated) {
    console.log(
      `Output truncated at ${maxFindings} finding(s). Re-run with --max-findings N if needed.`,
    );
  }
  if (skippedGeneratedEvidenceCount > 0) {
    console.log(
      `Skipped ${skippedGeneratedEvidenceCount} generated evidence file(s). Re-run with --include-generated-evidence if needed.`,
    );
  }
  console.log(`Summary: ${JSON.stringify(payload.summary_by_category)}`);
}

process.exit(findings.length > 0 ? 1 : 0);
