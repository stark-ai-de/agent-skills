#!/usr/bin/env node
import path from "node:path";

import { listArtifacts, validateVisualEvalCases, walkFiles } from "./lib/visual-assertions.mjs";
import { runVisualAssertionRegressions } from "./visual-assertion-regressions.mjs";

const root = process.cwd();
const casesDir = path.join(root, "skill-evals/drawio-diagrams/cases");

function parseArgs(argv) {
  const args = { caseFile: null, artifactsDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--case") args.caseFile = argv[++i];
    else if (arg === "--artifacts-dir") args.artifactsDir = argv[++i];
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

Validates optional ## Visual Assertions sections in drawio-diagrams eval cases.
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

const args = parseArgs(process.argv.slice(2));
const caseFiles = args.caseFile
  ? [path.resolve(root, args.caseFile)]
  : walkFiles(casesDir, (file) => file.endsWith(".md")).sort();
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

if (!artifacts) runVisualAssertionRegressions();

console.log(
  `Validated ${assertionCount} visual assertion(s) across ${visualCaseCount} draw.io eval case(s).`,
);
