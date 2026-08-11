#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  extractVisualAssertionLines,
  listArtifacts,
  validateVisualEvalCases,
  walkFiles,
} from "../lib/visual-assertions.mjs";
import { runVisualAssertionRegressions } from "../lib/visual-assertion-regressions.mjs";

const root = process.cwd();
const casesDir = path.join(root, "skill-evals/drawio-diagrams/cases");
const skillPath = path.join(root, "skills/engineering-workflows/drawio-diagrams/SKILL.md");
const deterministicAssertionKinds = new Set([
  "contains",
  "not_contains",
  "regex",
  "section",
  "path",
]);
const requiredSections = [
  "Prompt",
  "Should Trigger",
  "Expected Behavior",
  "Deterministic Assertions",
];

function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase(),
  );
  if (start === -1) return "";
  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line)) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function bullets(text) {
  const items = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      if (current) items.push(current);
      current = bullet[1].trim();
      continue;
    }
    if (current && /^\s+\S/.test(line)) {
      current = `${current} ${line.trim()}`;
      continue;
    }
    if (current) {
      items.push(current);
      current = null;
    }
  }
  if (current) items.push(current);
  return items;
}

function deterministicRegexError(value) {
  if (/\\\*/.test(value)) {
    return "suspicious escaped asterisk; use .* for wildcard text or a contains assertion for a literal asterisk";
  }
  try {
    new RegExp(value, "im");
    return null;
  } catch (error) {
    return error.message;
  }
}

function validateSchemaParserRegressions() {
  const parsed = bullets("- regex: first\n  second\n- contains: third");
  if (parsed.length !== 2 || parsed[0] !== "regex: first second") {
    throw new Error("draw.io eval schema parser lost a multiline bullet continuation");
  }
  const visual = extractVisualAssertionLines(`## Visual Assertions

- drawio_valid: result.drawio
  min_pages=2 uncompressed=1
`);
  if (visual[0] !== "drawio_valid: result.drawio min_pages=2 uncompressed=1") {
    throw new Error("draw.io visual assertion parser lost a multiline bullet continuation");
  }
  if (!deterministicRegexError(String.raw`without.\*lookup`)) {
    throw new Error("draw.io eval schema accepted a suspicious escaped regex quantifier");
  }
  if (deterministicRegexError("without.*lookup")) {
    throw new Error("draw.io eval schema rejected a valid wildcard regex quantifier");
  }
}

function validateReviewWorkflowContract() {
  const text = fs.readFileSync(skillPath, "utf8");
  const reviewStart = text.indexOf("If `review` is selected, use a strict read-only branch");
  const authoringStart = text.indexOf("Author or patch `.drawio` XML");
  const errors = [];

  if (reviewStart === -1) {
    errors.push("drawio-diagrams/SKILL.md: missing strict read-only review branch");
    return errors;
  }
  if (authoringStart === -1 || reviewStart > authoringStart) {
    errors.push("drawio-diagrams/SKILL.md: review branch must precede XML authoring");
    return errors;
  }

  const reviewBranch = text.slice(reviewStart, authoringStart);
  for (const marker of [
    "Do not create backups",
    "render, rasterize, export",
    "or fix findings",
    "then return; do not execute the remaining workflow steps",
  ]) {
    if (!reviewBranch.includes(marker)) {
      errors.push(
        `drawio-diagrams/SKILL.md: read-only review branch missing ${JSON.stringify(marker)}`,
      );
    }
  }
  return errors;
}

function validateToolsetCapabilityContract() {
  const text = fs.readFileSync(skillPath, "utf8");
  const probePath = path.join(
    root,
    "skills/engineering-workflows/drawio-diagrams/scripts/probe-drawio-toolset.mjs",
  );
  const requirements = [
    ["strict XML preflight", /preflight-drawio-xml\.mjs/i],
    [
      "Linux-native descriptor boundary",
      /Linux[^\n]{0,160}(?:\/proc\/self\/fd|native draw\.io)|native draw\.io[^\n]{0,160}\/proc\/self\/fd/i,
    ],
    [
      "version-probed candidate selection",
      /probe-drawio-toolset\.mjs|--version[^\n]{0,160}(?:candidate|draw\.io|probe)|(?:candidate|draw\.io|probe)[^\n]{0,160}--version/i,
    ],
    [
      "stale/non-executable candidate fallback",
      /(?:stale|non-executable|unavailable)[^\n]{0,180}(?:candidate|DRAWIO_BIN|fallback)|(?:candidate|DRAWIO_BIN)[^\n]{0,180}(?:stale|non-executable|fallback)/i,
    ],
    ["raw/manual export fallback", /raw[^\n]{0,40}manual(?: export)?|raw export/i],
    [
      "pinned browser capability",
      /rasterize-themed-svg\.mjs[^\n]{0,180}(?:pinned|absolute)|(?:pinned|absolute)[^\n]{0,180}rasterize-themed-svg\.mjs/i,
    ],
    [
      "install/setup approval",
      /(?:install|setup)[^\n]{0,160}(?:explicit approval|approval-gated|approval)/i,
    ],
    [
      "sanitized capability receipt",
      /saniti[sz](?:ed|e)[^\n]{0,120}(?:receipt|path)|(?:receipt|path)[^\n]{0,120}(?:saniti[sz](?:ed|e)|private|temporary)/i,
    ],
  ];
  const errors = requirements.flatMap(([label, pattern]) =>
    pattern.test(text)
      ? []
      : [`drawio-diagrams/SKILL.md: missing toolset capability marker for ${label}`],
  );
  if (!fs.existsSync(probePath)) {
    errors.push("drawio-diagrams: missing probe-drawio-toolset.mjs runtime helper");
  } else {
    const probeText = fs.readFileSync(probePath, "utf8");
    for (const marker of [
      "export function probeDrawioToolset",
      "export function probeBrowser",
      "export function probeDrawio",
      "--json",
    ]) {
      if (!probeText.includes(marker)) {
        errors.push(`drawio-diagrams: probe helper is missing ${JSON.stringify(marker)}`);
      }
    }
  }
  return errors;
}

function validateCapabilityEvalCoverage(files) {
  const relativeNames = new Set(files.map((file) => path.relative(root, file)));
  const requiredCases = [
    "skill-evals/drawio-diagrams/cases/toolset-native-cli-selection.md",
    "skill-evals/drawio-diagrams/cases/toolset-drawio-bin-fallback.md",
    "skill-evals/drawio-diagrams/cases/toolset-wsl-raw-export-fallback.md",
    "skill-evals/drawio-diagrams/cases/toolset-preflight-install-approval.md",
    "skill-evals/drawio-diagrams/cases/toolset-install-declined-fallback.md",
    "skill-evals/drawio-diagrams/cases/browser-preview-capability-limits.md",
    "skill-evals/drawio-diagrams/cases/sanitized-capability-receipt.md",
    "skill-evals/drawio-diagrams/cases/review-preflight-read-only.md",
  ];
  const errors = requiredCases
    .filter((file) => !relativeNames.has(file))
    .map((file) => `draw.io eval corpus is missing required capability case: ${file}`);
  const corpus = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const markers = [
    ["DRAWIO_BIN candidate fallback", /DRAWIO_BIN/i],
    ["direct WSL Windows candidate", /\/mnt\/c/i],
    ["native version probe", /--version/i],
    ["PNG and SVG smoke result", /PNG[\s\S]{0,120}SVG|SVG[\s\S]{0,120}PNG/i],
    ["browser tri-state", /present[\s\S]{0,120}missing[\s\S]{0,120}indeterminate/i],
    ["strict preflight", /preflight-drawio-xml\.mjs/i],
    ["install/setup approval", /install[\s\S]{0,120}approval/i],
    ["raw/manual fallback", /raw[/-]manual export|direct XML[\s\S]{0,120}fallback/i],
    ["sanitized receipt", /sanitized[\s\S]{0,120}receipt/i],
  ];
  for (const [label, pattern] of markers) {
    if (!pattern.test(corpus)) errors.push(`draw.io eval corpus is missing ${label} coverage`);
  }
  const sideEffectCases = [
    "skill-evals/drawio-diagrams/cases/ambiguous-workflow-selection.md",
    "skill-evals/drawio-diagrams/cases/review-preflight-read-only.md",
  ];
  for (const file of sideEffectCases) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, "utf8");
    if (
      !/not_contains: (?:preflight completed|install proposal|backup created|staging directory)/i.test(
        text,
      )
    ) {
      errors.push(`${file}: ambiguous/review case must assert no preflight side effects`);
    }
  }
  return errors;
}

function validateIconFidelityCoverage(files) {
  const relativeNames = new Set(files.map((file) => path.relative(root, file)));
  const requiredCases = new Map([
    [
      "skill-evals/drawio-diagrams/cases/icon-official-logo-preference.md",
      [
        ["official logo priority", /official[\s\S]{0,120}(?:logo|mark|stencil)/i],
        ["generic queue fallback", /semantic[\s\S]{0,80}(?:queue|fallback|unresolved)/i],
        ["source artwork preservation", /original[\s\S]{0,120}(?:artwork|brand colors)/i],
      ],
    ],
    [
      "skill-evals/drawio-diagrams/cases/icon-brand-color-preservation.md",
      [
        ["original colors/artwork", /original[\s\S]{0,120}(?:colors|artwork)/i],
        ["recolor prohibition", /do not[\s\S]{0,80}(?:recolor|invert|filter|tint)/i],
        ["neutral contrast surface", /neutral[\s\S]{0,80}(?:chip|background)/i],
      ],
    ],
    [
      "skill-evals/drawio-diagrams/cases/icon-unresolved-peer-invariance.md",
      [
        ["per-node semantic fallback", /per-node[\s\S]{0,100}(?:semantic )?fallback/i],
        ["resolved peer invariance", /resolved[\s\S]{0,100}(?:peer|logo)/i],
        ["original peer artwork", /original[\s\S]{0,100}(?:artwork|colors)/i],
      ],
    ],
    [
      "skill-evals/drawio-diagrams/cases/icon-explicit-recolor-disclosure.md",
      [
        ["explicit recolor request", /explicit(?:ly)?[\s\S]{0,100}(?:recolor|monochrome)/i],
        ["source variant disclosure", /source[\s\S]{0,80}variant/i],
        ["changed color disclosure", /changed[\s\S]{0,80}color/i],
        ["reason and scope disclosure", /reason[\s\S]{0,100}(?:dark|print)[\s\S]{0,100}scope/i],
        ["contrast evidence", /contrast[\s\S]{0,80}evidence/i],
      ],
    ],
    [
      "skill-evals/drawio-diagrams/cases/visual-brand-logo-invariants.md",
      [
        ["byte/color preservation", /original[\s\S]{0,120}(?:colors|bytes)/i],
        ["unresolved semantic fallback", /semantic[\s\S]{0,100}fallback/i],
        ["resolved peer protection", /resolved[\s\S]{0,100}(?:peer|logo)/i],
        ["self-contained export contract", /--require-self-contained-images/i],
      ],
    ],
  ]);
  const errors = [];
  for (const [relativeFile, markers] of requiredCases) {
    if (!relativeNames.has(relativeFile)) {
      errors.push(`draw.io eval corpus is missing required icon-fidelity case: ${relativeFile}`);
      continue;
    }
    const text = fs.readFileSync(path.join(root, relativeFile), "utf8");
    for (const [label, pattern] of markers) {
      if (!pattern.test(text)) errors.push(`${relativeFile}: missing ${label} assertion`);
    }
  }
  return errors;
}
function validateCliArgumentRegressions() {
  for (const option of ["--case", "--artifacts-dir"]) {
    const result = spawnSync(process.execPath, [path.resolve(process.argv[1]), option], {
      cwd: root,
      encoding: "utf8",
      timeout: 5000,
    });
    if (result.status !== 2) {
      throw new Error(`${option} without a path exited ${result.status}, expected 2`);
    }
  }
}

function validateActivationCoverage(files) {
  const positives = files.filter((file) => {
    const contents = fs.readFileSync(file, "utf8");
    return section(contents, "Should Trigger") === "Yes";
  });
  const implicit = positives.filter((file) => {
    const prompt = section(fs.readFileSync(file, "utf8"), "Prompt");
    return !/\$drawio-diagrams\b/i.test(prompt);
  });
  const minimumImplicit = 20;
  if (implicit.length < minimumImplicit) {
    throw new Error(
      `draw.io eval activation coverage has ${implicit.length} implicit positive prompts; expected at least ${minimumImplicit}`,
    );
  }
  return { implicit: implicit.length, positives: positives.length };
}

function pathWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function validateFixture(relative, caseFile, errors) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
    errors.push(
      `${path.relative(root, caseFile)}: fixture must be repository-relative: ${relative}`,
    );
    return;
  }
  const candidate = path.resolve(root, relative);
  if (!pathWithin(candidate, root)) {
    errors.push(`${path.relative(root, caseFile)}: fixture escapes repository: ${relative}`);
    return;
  }
  let current = root;
  try {
    for (const part of path.relative(root, candidate).split(path.sep)) {
      current = path.join(current, part);
      if (fs.lstatSync(current).isSymbolicLink()) {
        errors.push(`${path.relative(root, caseFile)}: fixture contains a symlink: ${relative}`);
        return;
      }
    }
    if (!fs.statSync(candidate).isFile()) {
      errors.push(`${path.relative(root, caseFile)}: fixture is not a regular file: ${relative}`);
    }
  } catch {
    errors.push(`${path.relative(root, caseFile)}: fixture does not exist: ${relative}`);
  }
}

function validateCaseSchema(caseFile) {
  const relative = path.relative(root, caseFile);
  const text = fs.readFileSync(caseFile, "utf8");
  const errors = [];
  for (const heading of requiredSections) {
    if (!section(text, heading)) errors.push(`${relative}: missing or empty ## ${heading}`);
  }

  const trigger = section(text, "Should Trigger");
  if (trigger && !/^(?:Yes|No)$/.test(trigger)) {
    errors.push(`${relative}: ## Should Trigger must be exactly Yes or No`);
  }
  if (bullets(section(text, "Expected Behavior")).length === 0) {
    errors.push(`${relative}: ## Expected Behavior needs at least one bullet`);
  }

  const splitFamily = section(text, "Split Family");
  if (splitFamily && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(splitFamily)) {
    errors.push(`${relative}: ## Split Family must be a lowercase kebab-case identifier`);
  }

  const deterministic = bullets(section(text, "Deterministic Assertions"));
  if (deterministic.length === 0) {
    errors.push(`${relative}: ## Deterministic Assertions needs at least one bullet`);
  }
  for (const assertion of deterministic) {
    const separator = assertion.indexOf(":");
    const kind = separator === -1 ? assertion : assertion.slice(0, separator).trim();
    const value = separator === -1 ? "" : assertion.slice(separator + 1).trim();
    if (!deterministicAssertionKinds.has(kind) || !value) {
      errors.push(`${relative}: unsupported deterministic assertion: ${assertion}`);
      continue;
    }
    if (kind === "regex") {
      const regexError = deterministicRegexError(value);
      if (regexError) {
        errors.push(
          `${relative}: invalid deterministic regex ${JSON.stringify(value)}: ${regexError}`,
        );
      }
    }
  }

  for (const fixture of [
    ...bullets(section(text, "Fixture")),
    ...bullets(section(text, "Fixtures")),
  ]) {
    validateFixture(fixture, caseFile, errors);
  }
  return errors;
}

function parseArgs(argv) {
  const args = { caseFile: null, artifactsDir: null };
  const readPath = (option, index) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`${option} requires a path`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--case") args.caseFile = readPath(arg, i++);
    else if (arg === "--artifacts-dir") args.artifactsDir = readPath(arg, i++);
    else if (arg === "--help" || arg === "-h") {
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

function printHelp() {
  console.log(`Usage: node scripts/validate-drawio-visual-evals.mjs [--case path] [--artifacts-dir dir]

Validates drawio-diagrams eval case schema and optional ## Visual Assertions sections.
When --artifacts-dir is supplied, also checks matching generated .drawio, PNG, and SVG artifacts.

Supported assertions:
  - artifact_exists: <glob>
  - markdown_image: <glob> <relative-target>
  - markdown_link: <glob> <relative-target>
  - png_dimensions: <glob> min_width=<px> min_height=<px>
  - png_nonblank: <glob> [min_size=<bytes>]
  - png_pixels_differ: <left-glob> <right-glob> [min_changed_basis_points=<1-10000>]
  - svg_valid: <glob>
  - svg_theme: <glob> light|dark|adaptive
  - svg_has_flow_animation: <glob>
  - svg_contains: <glob> <text>
  - svg_not_contains: <glob> <text>
  - svg_self_contained_images: <glob>
  - drawio_valid: <glob> [animation_on=1|animation_off=1] [adaptive_colors=1] [min_pages=N] [min_native_stencils=N] [self_contained_svg=1] [uncompressed=1]
  - drawio_embeds_svg_sha256: <glob> <64-lowercase-hex> [cell=stable-id]
  - drawio_graph: <glob> [page=URL-encoded-name] [ids=id,...] [component_ids=id,...] [component_labels=URL-encoded-id:URL-encoded-label,...] [group_ids=id,...] [group_labels=URL-encoded-id:URL-encoded-label,...] [group_memberships=component-id@group-id,...] [exact_components=1] [exact_groups=1] [native_ids=id,...] [edges=source>target,...] [exact_edges=1] [not_edges=source>target,...] [edge_roles=edge-id:role,...] [profile_styles=URL-encoded-cell-id:styleKey:styleValue,...] [links=https://...]
    profile_styles: max 128 mappings; decoded values max 2048 characters without controls; keys: designProfile, shape, dataRole, strokeColor, fillColor, gradientColor, gradientDirection, shadow, glass, arcSize, strokeWidth, fontColor, fontSize, profileRole
  - drawio_self_contained_svg: <glob>`);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

const args = parseArgs(process.argv.slice(2));
const caseFiles = args.caseFile
  ? [path.resolve(root, args.caseFile)]
  : walkFiles(casesDir, (file) => file.endsWith(".md")).sort();
const schemaErrors = [
  ...validateReviewWorkflowContract(),
  ...validateToolsetCapabilityContract(),
  ...caseFiles.flatMap(validateCaseSchema),
];
if (!args.caseFile) schemaErrors.push(...validateCapabilityEvalCoverage(caseFiles));
if (!args.caseFile) schemaErrors.push(...validateIconFidelityCoverage(caseFiles));
if (schemaErrors.length) {
  console.error(schemaErrors.join("\n"));
  process.exit(1);
}
const activationCoverage = args.caseFile ? null : validateActivationCoverage(caseFiles);
const artifacts = args.artifactsDir ? listArtifacts(args.artifactsDir, { cwd: root }) : null;
const { assertionCount, errors, visualCaseCount } = validateVisualEvalCases({
  caseFiles,
  artifacts,
  rootDir: root,
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (!artifacts) {
  validateSchemaParserRegressions();
  validateCliArgumentRegressions();
  runVisualAssertionRegressions();
}

console.log(
  `Validated ${caseFiles.length} draw.io eval case schema(s) and ${assertionCount} visual assertion(s) across ${visualCaseCount} visual case(s).${activationCoverage ? ` Activation coverage includes ${activationCoverage.implicit}/${activationCoverage.positives} implicit positive prompts.` : ""}`,
);
