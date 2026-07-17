#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { listArtifacts, validateVisualEvalCases, walkFiles } from "../lib/visual-assertions.mjs";

const root = process.cwd();
const casesDir = path.join(root, "skill-evals/animated-readme-logo/cases");
const expectedCaseNames = [
  "animated-gif-only.md",
  "app-animation-negative.md",
  "browser-preview-fallback.md",
  "export-capability-unavailable.md",
  "export-install-approval.md",
  "expressive-mark-style.md",
  "lottie-readme-request.md",
  "no-initial-asset.md",
  "ordinary-readme-edit-negative.md",
  "portable-agent-host.md",
  "provider-cost-indeterminate-fallback.md",
  "provider-declined-local-fallback.md",
  "provider-preflight-approval-gate.md",
  "provider-unavailable-local-fallback.md",
  "raster-source-transform.md",
  "readme-path-safety.md",
  "static-svg-logo.md",
  "transparent-logo-requirement.md",
].sort();
const publicFields = [
  "Task mode",
  "Source route",
  "Provider state",
  "Approval state",
  "SVG readiness",
  "Export status",
];
const caseTextRequirements = new Map([
  [
    "browser-preview-fallback.md",
    [
      "managed Chrome or Chromium executable",
      "agent-browser skills get core",
      "separate explicit approval",
      "manual committed-GitHub preview",
    ],
  ],
  [
    "export-install-approval.md",
    [
      "exact install command",
      "persistence scope",
      "disk impact",
      "verification commands",
      "Local-tool approval: pending",
      "install nothing while pending",
    ],
  ],
]);

function parseArgs(argv) {
  const args = { caseFile: null, artifactsDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--case") args.caseFile = requiredValue(argv, ++i, arg);
    else if (arg === "--artifacts-dir") {
      args.artifactsDir = requiredValue(argv, ++i, arg);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }
  if (args.artifactsDir && !args.caseFile) {
    fail("--artifacts-dir requires --case so assertions are evaluated against one case");
  }
  return args;
}

function requiredValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("--")) fail(`Missing value for ${option}`);
  return value;
}

function printHelp() {
  console.log(`Usage: node scripts/validate-animated-readme-logo-evals.mjs [--case path] [--artifacts-dir dir]

Validates the fixed v0.9 animated-readme-logo eval-case schema and optional
## Visual Assertions sections.
When --artifacts-dir is supplied, also checks matching generated PNG/SVG artifacts.

Supported assertions:
  - artifact_exists: <glob>
  - png_dimensions: <glob> min_width=<px> min_height=<px>
  - png_nonblank: <glob> [min_size=<bytes>]
  - svg_valid: <glob>
  - svg_contains: <glob> <text>
  - svg_not_contains: <glob> <text>`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function resolveSelectedCase(value) {
  const lexicalPath = path.resolve(root, value);
  if (!isWithin(casesDir, lexicalPath)) {
    fail("--case must resolve inside skill-evals/animated-readme-logo/cases");
  }

  let canonicalCasesDir;
  let canonicalPath;
  let selectedStat;
  try {
    canonicalCasesDir = fs.realpathSync(casesDir);
    canonicalPath = fs.realpathSync(lexicalPath);
    selectedStat = fs.statSync(canonicalPath);
  } catch {
    fail("--case must name an existing eval case");
  }
  if (!isWithin(canonicalCasesDir, canonicalPath)) {
    fail("--case must not escape skill-evals/animated-readme-logo/cases through a symlink");
  }
  if (path.extname(canonicalPath).toLowerCase() !== ".md" || !selectedStat.isFile()) {
    fail("--case must name a Markdown eval-case file");
  }
  return canonicalPath;
}

function sectionMatches(markdown, heading) {
  const headings = [...markdown.matchAll(/^## ([^\r\n]+?)\s*$/gm)];
  return headings.flatMap((match, index) => {
    if (match[1] !== heading) return [];
    const bodyStart = match.index + match[0].length;
    const bodyEnd = headings[index + 1]?.index ?? markdown.length;
    return [[match[0], markdown.slice(bodyStart, bodyEnd), match.index]];
  });
}

function visualAssertionPrefixes(markdown) {
  const sections = sectionMatches(markdown, "Visual Assertions");
  return sections.flatMap((section) =>
    [...section[1].matchAll(/^\s*[-*]\s+([a-z0-9_-]+)\s*:/gim)].map((match) => match[1]),
  );
}

function validateCaseSchema(caseFile) {
  const errors = [];
  const relative = path.relative(root, caseFile);
  let markdown;
  try {
    markdown = fs.readFileSync(caseFile, "utf8");
  } catch (error) {
    return [`${relative}: unable to read eval case (${error.message})`];
  }

  const titles = [...markdown.matchAll(/^# (?!#)\S.+$/gm)];
  if (titles.length !== 1) {
    errors.push(`${relative}: expected exactly one non-empty level-one title`);
  }
  if (/^## Runtime Context\s*$/im.test(markdown)) {
    errors.push(`${relative}: Runtime Context is forbidden; keep the prompt self-contained`);
  }

  const sections = new Map();
  const sectionIndexes = [];
  for (const heading of ["Should Trigger", "Prompt", "Expected Behavior"]) {
    const matches = sectionMatches(markdown, heading);
    if (matches.length !== 1) {
      errors.push(`${relative}: expected exactly one ## ${heading} section`);
      continue;
    }
    const value = matches[0][1].trim();
    if (!value) errors.push(`${relative}: ## ${heading} must not be empty`);
    sections.set(heading, value);
    sectionIndexes.push(matches[0][2]);
  }
  if (
    sectionIndexes.length === 3 &&
    !(sectionIndexes[0] < sectionIndexes[1] && sectionIndexes[1] < sectionIndexes[2])
  ) {
    errors.push(`${relative}: sections must be ordered Should Trigger, Prompt, Expected Behavior`);
  }

  const trigger = sections.get("Should Trigger");
  if (trigger && !["Yes.", "No."].includes(trigger)) {
    errors.push(`${relative}: ## Should Trigger must be exactly Yes. or No.`);
  }
  if (trigger === "Yes.") {
    const expected = sections.get("Expected Behavior") || "";
    for (const field of publicFields) {
      if (!expected.includes(field)) {
        errors.push(`${relative}: positive case must assert the ${field} public field`);
      }
    }
  }

  for (const requiredText of caseTextRequirements.get(path.basename(caseFile)) || []) {
    if (!markdown.includes(requiredText)) {
      errors.push(`${relative}: expected case-specific contract text: ${requiredText}`);
    }
  }

  for (const prefix of visualAssertionPrefixes(markdown)) {
    if (/(?:gif|apng|webp)/i.test(prefix)) {
      errors.push(`${relative}: v0.9 must not add GIF/APNG/WebP visual assertion prefix ${prefix}`);
    }
  }
  return errors;
}

const args = parseArgs(process.argv.slice(2));
const selectedCase = args.caseFile ? resolveSelectedCase(args.caseFile) : null;
const caseFiles = selectedCase
  ? [selectedCase]
  : walkFiles(casesDir, (file) => file.endsWith(".md")).sort();
const schemaErrors = [];
if (!selectedCase) {
  const actualNames = caseFiles
    .map((file) => path.relative(casesDir, file).split(path.sep).join("/"))
    .sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedCaseNames)) {
    schemaErrors.push(
      `animated-readme-logo eval case set mismatch\nexpected: ${expectedCaseNames.join(", ")}\nactual: ${actualNames.join(", ")}`,
    );
  }
}
for (const caseFile of caseFiles) schemaErrors.push(...validateCaseSchema(caseFile));
const artifacts = args.artifactsDir ? listArtifacts(args.artifactsDir, { cwd: root }) : null;
const { assertionCount, errors, visualCaseCount } = validateVisualEvalCases({
  caseFiles,
  artifacts,
  rootDir: root,
});

const allErrors = [...schemaErrors, ...errors];
if (allErrors.length) {
  console.error(allErrors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${caseFiles.length} animated README logo eval case(s).`);
console.log(
  `Validated ${assertionCount} visual assertion(s) across ${visualCaseCount} animated README logo eval case(s).`,
);
