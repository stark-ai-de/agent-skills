#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const EXPLORATORY_MIN = { positive: 10, val: 3, test: 3 };
const OFFICIAL_RECOMMENDED = { positive: 20, val: 5, test: 5 };

function parseArgs(argv) {
  const args = { seed: 42, train: 0.6, val: 0.2, test: 0.2, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg === "--json") args.json = true;
    else if (arg === "--skill") args.skill = argv[++i];
    else if (arg === "--seed") args.seed = Number(argv[++i]);
    else if (arg === "--train") args.train = Number(argv[++i]);
    else if (arg === "--val") args.val = Number(argv[++i]);
    else if (arg === "--test") args.test = Number(argv[++i]);
    else fail(`Unknown argument: ${arg}`);
  }
  if (!args.skill) fail("--skill is required");
  const total = args.train + args.val + args.test;
  if (!Number.isFinite(total) || total <= 0) fail("Split ratios must be positive numbers");
  args.train /= total;
  args.val /= total;
  args.test /= total;
  return args;
}

function printUsage() {
  console.log(`Usage: node prepare-skillopt-split.mjs --skill <skill> [options]

Options:
  --seed <number>
  --train <ratio>
  --val <ratio>
  --test <ratio>
  --json
  --help`);
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
  const matches = walk(root, (file) => path.basename(file) === "SKILL.md").filter((file) => {
    const rel = path.relative(root, file).replaceAll("\\", "/");
    return (
      (rel.startsWith("skills/") || rel.startsWith("incubator/skills/")) &&
      path.basename(path.dirname(file)) === skill
    );
  });
  return matches[0] || null;
}

function splitFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontmatter: "", body: text };
  return { frontmatter: match[1], body: text.slice(match[0].length) };
}

function sha256(text) {
  return `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`;
}

function slugFromFile(file) {
  return path.basename(file, ".md");
}

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
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

function shouldTrigger(text) {
  const value = section(text, "Should Trigger")
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[.]/g, "")
    .toLowerCase();
  if (value === "no" || value === "false") return false;
  return true;
}

function fixturePaths(text) {
  return [...bullets(section(text, "Fixture")), ...bullets(section(text, "Fixtures"))];
}

function deterministicAssertions(text) {
  return bullets(section(text, "Deterministic Assertions"));
}

function visualAssertions(text) {
  return bullets(section(text, "Visual Assertions"));
}

function expectedArtifactPaths(text, skillName) {
  const explicit = [
    ...bullets(section(text, "Expected Artifact")),
    ...bullets(section(text, "Expected Artifacts")),
  ];
  return explicit.length ? explicit : listExpectedArtifacts(skillName);
}

function listExpectedArtifacts(skillName) {
  const expectedDir = path.join(root, "skill-evals", skillName, "expected");
  return walk(expectedDir, (file) => fs.statSync(file).isFile()).map((file) =>
    path.relative(root, file).replaceAll("\\", "/"),
  );
}

function seededShuffle(items, seed) {
  let state = seed >>> 0;
  function random() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  }
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function splitItems(items, ratios) {
  const n = items.length;
  if (n === 0) return { train: [], val: [], test: [] };
  if (n === 1) return { train: items, val: [], test: [] };
  if (n === 2) return { train: [items[0]], val: [items[1]], test: [] };

  let trainCount = Math.round(n * ratios.train);
  let valCount = Math.round(n * ratios.val);
  let testCount = n - trainCount - valCount;
  const heldoutFloor =
    n >= OFFICIAL_RECOMMENDED.positive
      ? OFFICIAL_RECOMMENDED.val
      : n >= EXPLORATORY_MIN.positive
        ? EXPLORATORY_MIN.val
        : 1;

  valCount = Math.max(heldoutFloor, valCount);
  testCount = Math.max(heldoutFloor, testCount);
  if (valCount + testCount > n - 1) {
    const availableHeldout = n - 1;
    valCount = Math.floor(availableHeldout / 2);
    testCount = availableHeldout - valCount;
  }
  trainCount = n - valCount - testCount;

  return {
    train: items.slice(0, trainCount),
    val: items.slice(trainCount, trainCount + valCount),
    test: items.slice(trainCount + valCount, trainCount + valCount + testCount),
  };
}

function hasVisualAssertions(item) {
  return (item.visual_assertions || []).length > 0;
}

function ensureTaggedSplit(splits, targetName, predicate, sourceNames) {
  if (splits[targetName].some(predicate)) return false;
  const replacementIndex = splits[targetName].findIndex((item) => !predicate(item));
  if (replacementIndex === -1) return false;

  for (const sourceName of sourceNames) {
    if (sourceName === targetName) continue;
    const sourceIndex = splits[sourceName].findIndex(predicate);
    if (sourceIndex === -1) continue;

    const tagged = splits[sourceName][sourceIndex];
    splits[sourceName][sourceIndex] = splits[targetName][replacementIndex];
    splits[targetName][replacementIndex] = tagged;
    return true;
  }
  return false;
}

function stratifyVisualAssertions(splits) {
  const allItems = [...splits.train, ...splits.val, ...splits.test];
  if (!allItems.some(hasVisualAssertions)) return splits;

  ensureTaggedSplit(splits, "test", hasVisualAssertions, ["train", "val"]);
  ensureTaggedSplit(splits, "val", hasVisualAssertions, ["train"]);
  return splits;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const args = parseArgs(process.argv.slice(2));
const skillPath = resolveSkill(args.skill);
if (!skillPath) fail(`Could not find skill: ${args.skill}`);

const skillName = path.basename(path.dirname(skillPath));
const evalDir = path.join(root, "skill-evals", skillName);
const casesDir = path.join(evalDir, "cases");
if (!fs.existsSync(casesDir)) fail(`Missing eval cases: ${path.relative(root, casesDir)}`);

const workDir = path.join(root, ".agents/skillopt-work", skillName);
const initialDir = path.join(workDir, "initial");
const dataDir = path.join(workDir, "data");
const activationDir = path.join(workDir, "activation");

const skillText = fs.readFileSync(skillPath, "utf8");
const { frontmatter, body } = splitFrontmatter(skillText);
fs.mkdirSync(initialDir, { recursive: true });
fs.writeFileSync(path.join(initialDir, "skill-body.md"), body.trimStart(), "utf8");
fs.writeFileSync(
  path.join(initialDir, "original-frontmatter.yaml"),
  `${frontmatter.trim()}\n`,
  "utf8",
);
fs.writeFileSync(path.join(initialDir, "initial-skill.sha256"), `${sha256(skillText)}\n`, "utf8");

const rubricPath = fs.existsSync(path.join(evalDir, "rubric.md"))
  ? path.relative(root, path.join(evalDir, "rubric.md")).replaceAll("\\", "/")
  : null;
const trainingItems = [];
const activationNegativeCases = [];
const qualityCounters = {
  positive_with_deterministic_assertions: 0,
  positive_with_visual_assertions: 0,
  positive_with_fixtures: 0,
  positive_with_expected_artifacts: 0,
};

for (const caseFile of walk(casesDir, (file) => file.endsWith(".md")).sort()) {
  const text = fs.readFileSync(caseFile, "utf8");
  const trigger = shouldTrigger(text);
  const relCasePath = path.relative(root, caseFile).replaceAll("\\", "/");
  const fixtures = fixturePaths(text);
  const expectedArtifacts = expectedArtifactPaths(text, skillName);
  const deterministic = deterministicAssertions(text);
  const visual = visualAssertions(text);
  const item = {
    id: `${skillName}/${slugFromFile(caseFile)}`,
    skill_name: skillName,
    case_path: relCasePath,
    prompt: section(text, "Prompt"),
    expected_behavior: bullets(section(text, "Expected Behavior")),
    rubric_path: rubricPath,
    fixtures,
    expected_artifacts: expectedArtifacts,
    deterministic_assertions: deterministic,
    visual_assertions: visual,
    tags: trigger ? ["positive"] : ["negative", "activation"],
    should_trigger: trigger,
    workspace_policy: "workspace-write",
    source_hash: sha256(text),
  };

  if (trigger) {
    if (deterministic.length) qualityCounters.positive_with_deterministic_assertions += 1;
    if (visual.length) qualityCounters.positive_with_visual_assertions += 1;
    if (fixtures.length) qualityCounters.positive_with_fixtures += 1;
    if (expectedArtifacts.length) qualityCounters.positive_with_expected_artifacts += 1;
    trainingItems.push(item);
  } else {
    activationNegativeCases.push(item);
  }
}

const shuffled = seededShuffle(trainingItems, args.seed);
const splits = splitItems(shuffled, args);
stratifyVisualAssertions(splits);
for (const [split, items] of Object.entries(splits)) {
  writeJson(path.join(dataDir, split, "items.json"), items);
}
writeJson(path.join(activationDir, "negative-cases.json"), activationNegativeCases);

const warnings = [];
if (trainingItems.length < EXPLORATORY_MIN.positive) {
  warnings.push(
    `Exploratory dataset: ${trainingItems.length} positive case(s); ${EXPLORATORY_MIN.positive}+ recommended before treating optimization as more than exploratory.`,
  );
}
if (splits.val.length < EXPLORATORY_MIN.val || splits.test.length < EXPLORATORY_MIN.test) {
  warnings.push(
    `Exploratory split: train=${splits.train.length}, val=${splits.val.length}, test=${splits.test.length}; at least ${EXPLORATORY_MIN.val} validation and ${EXPLORATORY_MIN.test} test cases are recommended.`,
  );
}
if (
  trainingItems.length < OFFICIAL_RECOMMENDED.positive ||
  splits.val.length < OFFICIAL_RECOMMENDED.val ||
  splits.test.length < OFFICIAL_RECOMMENDED.test
) {
  warnings.push(
    `Below official-parity recommendation: ${OFFICIAL_RECOMMENDED.positive}+ positive cases with ${OFFICIAL_RECOMMENDED.val}+ validation and ${OFFICIAL_RECOMMENDED.test}+ test cases.`,
  );
}

const quality = {
  classification:
    warnings.length === 0 &&
    trainingItems.length >= OFFICIAL_RECOMMENDED.positive &&
    splits.val.length >= OFFICIAL_RECOMMENDED.val &&
    splits.test.length >= OFFICIAL_RECOMMENDED.test
      ? "official-parity-candidate"
      : "exploratory",
  proofStatus:
    warnings.length === 0 &&
    trainingItems.length >= OFFICIAL_RECOMMENDED.positive &&
    splits.val.length >= OFFICIAL_RECOMMENDED.val &&
    splits.test.length >= OFFICIAL_RECOMMENDED.test
      ? "official-parity-candidate"
      : "blocked",
  thresholds: {
    exploratory_minimum: EXPLORATORY_MIN,
    official_recommended: OFFICIAL_RECOMMENDED,
  },
  positive_cases: trainingItems.length,
  split_counts: {
    train: splits.train.length,
    val: splits.val.length,
    test: splits.test.length,
  },
  activation_negative_cases: activationNegativeCases.length,
  ...qualityCounters,
  notes: [
    "Activation-only negative cases are excluded from body optimization training.",
    "Negative cases remain useful for readiness and adoption safety review.",
    "Deterministic assertions are used by the local evaluator before semantic LLM judging when present.",
    "Visual assertions are checked against rollout artifacts before semantic LLM judging when present.",
  ],
};
writeJson(path.join(workDir, "dataset-metadata.json"), quality);

const result = {
  ok: true,
  target_skill: skillName,
  skill_path: path.relative(root, skillPath).replaceAll("\\", "/"),
  work_dir: path.relative(root, workDir).replaceAll("\\", "/"),
  counts: {
    train: splits.train.length,
    val: splits.val.length,
    test: splits.test.length,
    activation_negative: activationNegativeCases.length,
  },
  quality,
  warnings,
};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Prepared SkillOpt split for ${skillName}`);
  console.log(`Work dir: ${result.work_dir}`);
  console.log(
    `Counts: train=${result.counts.train}, val=${result.counts.val}, test=${result.counts.test}, activation_negative=${result.counts.activation_negative}`,
  );
  if (warnings.length) console.log(`Warnings: ${warnings.join("; ")}`);
}
