#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const FORBIDDEN_OPTIMIZER_PATTERN = /codex[-_\s]?opt/i;

function parseArgs(argv) {
  const args = { approved: false, dryRun: true, json: false, summary: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--approved") {
      args.approved = true;
      args.dryRun = false;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--json") args.json = true;
    else if (arg === "--summary" || arg === "--compact") args.summary = true;
    else if (arg === "--skill") args.skill = argv[++i];
    else if (arg === "--best") args.best = argv[++i];
    else if (arg === "--version") args.version = argv[++i];
    else fail(`Unknown argument: ${arg}`);
  }
  if (!args.skill) fail("--skill is required");
  if (!args.best) fail("--best is required");
  return args;
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, predicate));
    else if (predicate(full)) files.push(full);
  }
  return files;
}

function resolveSkill(skill) {
  const direct = path.resolve(root, skill);
  if (fs.existsSync(direct) && path.basename(direct) === "SKILL.md") return direct;
  if (fs.existsSync(path.join(direct, "SKILL.md"))) return path.join(direct, "SKILL.md");
  return walk(root, (file) => path.basename(file) === "SKILL.md").find((file) => {
    const rel = path.relative(root, file).replaceAll("\\", "/");
    return (
      (rel.startsWith("skills/") || rel.startsWith("incubator/skills/")) &&
      path.basename(path.dirname(file)) === skill
    );
  });
}

function splitFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontmatter: null, body: text };
  return { frontmatter: match[1], body: text.slice(match[0].length) };
}

function parseTopLevelFrontmatter(frontmatter) {
  const data = {};
  if (!frontmatter) return data;
  for (const line of frontmatter.split("\n")) {
    if (/^\s/.test(line)) continue;
    const i = line.indexOf(":");
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return data;
}

function updateVersion(frontmatter, version) {
  if (!version) return frontmatter;
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("--version must use x.y.z semver");
  }
  if (!/^\s+version:\s*["']?[^"'\n]+["']?\s*$/m.test(frontmatter)) {
    throw new Error("Cannot update promoted skill version because metadata.version was not found");
  }
  return frontmatter.replace(/^(\s+version:\s*)["']?[^"'\n]+["']?\s*$/m, `$1"${version}"`);
}

function simpleDiff(before, after) {
  const a = logicalLines(before);
  const b = logicalLines(after);
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const lines = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (a[i] === b[j]) {
      lines.push(` ${a[i]}`);
      i += 1;
      j += 1;
    } else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) {
      lines.push(`+${b[j]}`);
      j += 1;
    } else if (i < a.length) {
      lines.push(`-${a[i]}`);
      i += 1;
    }
  }
  return lines.join("\n");
}

function logicalLines(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  const trimmed = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  return trimmed ? trimmed.split("\n") : [];
}

function changeStats(before, after) {
  const beforeLines = logicalLines(before);
  const afterLines = logicalLines(after);
  const dp = Array.from({ length: beforeLines.length + 1 }, () =>
    Array(afterLines.length + 1).fill(0),
  );
  for (let i = beforeLines.length - 1; i >= 0; i -= 1) {
    for (let j = afterLines.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        beforeLines[i] === afterLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const unchanged = dp[0][0];
  return {
    added_lines: afterLines.length - unchanged,
    removed_lines: beforeLines.length - unchanged,
    net_lines: afterLines.length - beforeLines.length,
    before_lines: beforeLines.length,
    after_lines: afterLines.length,
    char_delta: after.length - before.length,
  };
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function formatChangeStats(stats) {
  return `+${stats.added_lines} / -${stats.removed_lines} lines (net ${signed(stats.net_lines)}), chars ${signed(stats.char_delta)}`;
}

function rejectReasons(originalBody, candidateBody, candidateFrontmatter, originalFrontmatter) {
  const reasons = [];
  const topOriginal = parseTopLevelFrontmatter(originalFrontmatter);
  const topCandidate = parseTopLevelFrontmatter(candidateFrontmatter);

  if (candidateFrontmatter && candidateFrontmatter.trim() !== originalFrontmatter.trim()) {
    for (const key of ["name", "description", "license"]) {
      if (topCandidate[key] && topCandidate[key] !== topOriginal[key]) {
        reasons.push(`candidate changes frontmatter field ${key}`);
      }
    }
    if (!reasons.length)
      reasons.push(
        "candidate includes frontmatter; adoption preserves the original frontmatter instead",
      );
  }

  if (candidateBody.split(/\r?\n/).length > 500) reasons.push("candidate body exceeds 500 lines");
  if (/(sk-[A-Za-z0-9_-]{20,}|[A-Za-z0-9+/=._-]{40,})/.test(candidateBody)) {
    reasons.push("candidate contains a secret-like string");
  }
  if (/\/home\/|\/Users\/|[A-Z]:\\/.test(candidateBody))
    reasons.push("candidate contains a private local path");
  if (/\.agents\//.test(candidateBody))
    reasons.push("candidate depends on a local optimizer workspace path");
  if (FORBIDDEN_OPTIMIZER_PATTERN.test(candidateBody)) {
    reasons.push("candidate references an unsupported optimizer source");
  }
  if (/^##\s+Rubric\b/im.test(candidateBody) || /^#\s+.*Eval Proof\b/im.test(candidateBody)) {
    reasons.push("candidate appears to copy eval or rubric material into SKILL.md");
  }
  if (/##\s+Safety rules/i.test(originalBody) && !/##\s+Safety rules/i.test(candidateBody)) {
    reasons.push("candidate removes the Safety rules section");
  }
  for (const phrase of ["approval", "secret"]) {
    if (
      new RegExp(`\\b${phrase}\\b`, "i").test(originalBody) &&
      !new RegExp(`\\b${phrase}\\b`, "i").test(candidateBody)
    ) {
      reasons.push(`candidate drops existing ${phrase} guidance`);
    }
  }
  return reasons;
}

const args = parseArgs(process.argv.slice(2));
const skillPath = resolveSkill(args.skill);
if (!skillPath) fail(`Could not find skill: ${args.skill}`);

const bestPath = path.resolve(root, args.best);
if (!fs.existsSync(bestPath))
  fail(`Missing best skill candidate: ${path.relative(root, bestPath)}`);

const original = fs.readFileSync(skillPath, "utf8");
const candidate = fs.readFileSync(bestPath, "utf8");
const originalParts = splitFrontmatter(original);
const candidateParts = splitFrontmatter(candidate);
if (!originalParts.frontmatter) fail("Original SKILL.md has no frontmatter");

const candidateBody = candidateParts.body.trimStart();
const rejections = rejectReasons(
  originalParts.body,
  candidateBody,
  candidateParts.frontmatter,
  originalParts.frontmatter,
);
const promoted = path.relative(root, skillPath).replaceAll("\\", "/").startsWith("skills/");
if (promoted && args.approved && !args.version) {
  rejections.push("promoted public skills require --version for approved adoption");
}

let finalFrontmatter = originalParts.frontmatter;
try {
  finalFrontmatter = updateVersion(originalParts.frontmatter, args.version);
} catch (error) {
  rejections.push(error.message);
}

const normalizedBody = candidateBody.endsWith("\n") ? candidateBody : `${candidateBody}\n`;
const nextText = `---\n${finalFrontmatter.trim()}\n---\n\n${normalizedBody}`;
const diff = simpleDiff(original, nextText);
const changes = changeStats(original, nextText);
const report = {
  ok: rejections.length === 0,
  dry_run: args.dryRun || !args.approved,
  approved: args.approved,
  skill_path: path.relative(root, skillPath).replaceAll("\\", "/"),
  candidate_path: path.relative(root, bestPath).replaceAll("\\", "/"),
  promoted,
  preserved_frontmatter: true,
  rejections,
  changed: original !== nextText,
  changes,
};

if (rejections.length === 0 && args.approved) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(
    root,
    ".agents/skillopt-work",
    path.basename(path.dirname(skillPath)),
    "backups",
  );
  const backupPath = path.join(backupDir, `${timestamp}-SKILL.md`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(backupPath, original, "utf8");
  fs.writeFileSync(skillPath, nextText, "utf8");
  report.backup_path = path.relative(root, backupPath).replaceAll("\\", "/");
}

if (args.json) {
  console.log(JSON.stringify({ ...report, diff }, null, 2));
} else if (args.summary) {
  console.log(`SkillOpt adoption preview: ${args.skill}`);
  console.log(`Target: ${report.skill_path}`);
  console.log(`Candidate: ${report.candidate_path}`);
  console.log(`Changed: ${report.changed ? "yes" : "no"}`);
  console.log(`Change amount: ${formatChangeStats(report.changes)}`);
  console.log(`Safety checks: ${report.ok ? "pass" : "review blockers"}`);
  if (rejections.length) {
    console.log("Review blockers:");
    for (const reason of rejections) console.log(`- ${reason}`);
  }
  console.log("No files written.");
  if (report.changed) {
    console.log("For the full diff, rerun this command without --summary.");
  } else {
    console.log("No content differences after preserving frontmatter.");
  }
} else {
  console.log(`Skill: ${report.skill_path}`);
  console.log(`Candidate: ${report.candidate_path}`);
  console.log(`Dry run: ${report.dry_run ? "yes" : "no"}`);
  console.log(`Accepted by safety checks: ${report.ok ? "yes" : "no"}`);
  console.log(`Change amount: ${formatChangeStats(report.changes)}`);
  if (rejections.length) {
    console.log("Rejections:");
    for (const reason of rejections) console.log(`- ${reason}`);
  }
  console.log("");
  if (report.changed) {
    console.log(diff);
  } else {
    console.log("No content differences after preserving frontmatter.");
  }
  if (args.approved && report.ok) {
    console.log("");
    console.log("Wrote updated SKILL.md.");
    console.log(`Backup: ${report.backup_path}`);
    console.log("Next validation: npm run validate");
  } else if (!args.approved) {
    console.log("");
    console.log("No files written. Rerun with --approved after review.");
  }
}

process.exit(rejections.length ? 1 : 0);
