#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const EXPLORATORY_MIN = { positive: 10, val: 3, test: 3 };
const OFFICIAL_RECOMMENDED = { positive: 20, val: 5, test: 5 };

function parseArgs(argv) {
  const args = { seed: 42, train: 0.6, val: 0.2, test: 0.2, json: false };
  const readNumber = (option, index) => {
    const raw = argv[index + 1];
    if (raw === undefined || !raw.trim() || raw.startsWith("--")) {
      fail(`${option} requires a number`);
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) fail(`${option} must be a finite number`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg === "--json") args.json = true;
    else if (arg === "--skill") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) fail("--skill requires a value");
      args.skill = value;
    } else if (arg === "--seed") args.seed = readNumber(arg, i++);
    else if (arg === "--train") args.train = readNumber(arg, i++);
    else if (arg === "--val") args.val = readNumber(arg, i++);
    else if (arg === "--test") args.test = readNumber(arg, i++);
    else fail(`Unknown argument: ${arg}`);
  }
  if (!args.skill) fail("--skill is required");
  if (!Number.isSafeInteger(args.seed) || args.seed < 0 || args.seed > 0xffffffff) {
    fail("--seed must be an integer between 0 and 4294967295");
  }
  for (const name of ["train", "val", "test"]) {
    if (!(args[name] > 0)) fail("Split ratios must each be positive numbers");
  }
  const total = args.train + args.val + args.test;
  if (!Number.isFinite(total)) fail("Split ratio total must be finite");
  args.train /= total;
  args.val /= total;
  args.test /= total;
  return args;
}

function printUsage() {
  console.log(`Usage: node prepare-skillopt-split.mjs --skill <skill> [options]

Options:
  --seed <uint32>
  --train <positive-ratio>
  --val <positive-ratio>
  --test <positive-ratio>
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

function isNoneAssertion(value) {
  return /^none\.?$/i.test(String(value || "").trim());
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

function normalizedFixtureIdentity(value) {
  const raw = String(value || "");
  if (
    !raw ||
    raw !== raw.trim() ||
    raw.includes("\\") ||
    raw.includes("|") ||
    /[\0-\x1f\x7f]/.test(raw) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw) ||
    path.posix.isAbsolute(raw)
  ) {
    fail("Fixture paths must be trimmed, relative, repository-local POSIX paths without pipes");
  }
  const normalized = path.posix.normalize(raw);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    fail("Fixture paths must stay inside the repository");
  }
  return normalized;
}

function deterministicAssertions(text) {
  return bullets(section(text, "Deterministic Assertions"));
}

function visualAssertions(text) {
  return bullets(section(text, "Visual Assertions")).filter(
    (assertion) => !isNoneAssertion(assertion),
  );
}

function explicitSplitFamily(text, caseFile) {
  const value = section(text, "Split Family").trim();
  if (!value) return null;
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(value)) {
    fail(
      `${path.relative(root, caseFile)}: Split Family must be a lowercase kebab-case identifier`,
    );
  }
  return value;
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
  return walk(expectedDir, (file) => fs.statSync(file).isFile())
    .map((file) => path.relative(root, file).replaceAll("\\", "/"))
    .sort();
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

function targetSplitCounts(items, ratios) {
  const n = items.length;
  if (n === 0) return { train: 0, val: 0, test: 0 };
  if (n === 1) return { train: 1, val: 0, test: 0 };
  if (n === 2) return { train: 1, val: 1, test: 0 };

  let trainCount = Math.round(n * ratios.train);
  let valCount = Math.round(n * ratios.val);
  let testCount = n - trainCount - valCount;
  const heldoutFloor = heldoutFloorFor(n);

  valCount = Math.max(heldoutFloor, valCount);
  testCount = Math.max(heldoutFloor, testCount);
  if (valCount + testCount > n - 1) {
    const availableHeldout = n - 1;
    valCount = Math.floor(availableHeldout / 2);
    testCount = availableHeldout - valCount;
  }
  trainCount = n - valCount - testCount;

  return { train: trainCount, val: valCount, test: testCount };
}

function heldoutFloorFor(itemCount) {
  if (itemCount >= OFFICIAL_RECOMMENDED.positive) return OFFICIAL_RECOMMENDED.val;
  if (itemCount >= EXPLORATORY_MIN.positive) return EXPLORATORY_MIN.val;
  return itemCount >= 3 ? 1 : 0;
}

function assignSplitGroups(items) {
  const parent = new Map(items.map((item) => [item.id, item.id]));
  const ownerByRelation = new Map();
  const find = (id) => {
    let current = id;
    while (parent.get(current) !== current) current = parent.get(current);
    let cursor = id;
    while (parent.get(cursor) !== current) {
      const next = parent.get(cursor);
      parent.set(cursor, current);
      cursor = next;
    }
    return current;
  };
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    const [first, second] = [leftRoot, rightRoot].sort();
    parent.set(second, first);
  };

  for (const item of items) {
    const relations = [];
    if (!item.split_family.startsWith("case:") && !item.split_family.startsWith("fixture:")) {
      relations.push(`family:${item.split_family}`);
    }
    for (const fixture of item.fixtures) {
      const identity = normalizedFixtureIdentity(fixture);
      if (identity) relations.push(`fixture:${identity}`);
    }
    for (const relation of new Set(relations)) {
      const owner = ownerByRelation.get(relation);
      if (owner) union(item.id, owner);
      else ownerByRelation.set(relation, item.id);
    }
  }

  const membersByRoot = new Map();
  for (const item of items) {
    const component = find(item.id);
    if (!membersByRoot.has(component)) membersByRoot.set(component, []);
    membersByRoot.get(component).push(item);
  }
  for (const members of membersByRoot.values()) {
    const splitGroup = sha256(
      members
        .map((item) => item.id)
        .sort()
        .join("\n"),
    );
    for (const item of members) item.split_group = splitGroup;
  }
}

function splitGroupKey(item) {
  return item.split_group || item.split_family || item.id;
}

function groupItems(items) {
  const groups = new Map();
  for (const item of items) {
    const key = splitGroupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.values()];
}

function splitGroups(groups, items, ratios) {
  const targets = targetSplitCounts(items, ratios);
  const itemCount = items.length;
  const heldoutFloor = heldoutFloorFor(itemCount);
  let states = new Map([["0,0,0,0", ""]]);

  for (const group of groups) {
    const groupHasVisual = group.some(hasVisualAssertions);
    const next = new Map();
    for (const [key, assignment] of states) {
      const [valCount, testCount, valHasVisual, testHasVisual] = key.split(",").map(Number);
      for (const [choice, nextVal, nextTest, nextValVisual, nextTestVisual] of [
        ["r", valCount, testCount, valHasVisual, testHasVisual],
        [
          "v",
          valCount + group.length,
          testCount,
          valHasVisual || groupHasVisual ? 1 : 0,
          testHasVisual,
        ],
        [
          "e",
          valCount,
          testCount + group.length,
          valHasVisual,
          testHasVisual || groupHasVisual ? 1 : 0,
        ],
      ]) {
        if (nextVal + nextTest > itemCount - 1) continue;
        const nextKey = `${nextVal},${nextTest},${nextValVisual},${nextTestVisual}`;
        if (!next.has(nextKey)) next.set(nextKey, `${assignment}${choice}`);
      }
    }
    states = next;
  }

  const candidates = [...states.entries()].map(([key, assignment]) => {
    const [val, test, valHasVisual, testHasVisual] = key.split(",").map(Number);
    return {
      assignment,
      train: itemCount - val - test,
      val,
      test,
      heldoutDeficit: Math.max(0, heldoutFloor - val) + Math.max(0, heldoutFloor - test),
      visualCoverage: valHasVisual + testHasVisual,
    };
  });
  const floorFeasible = candidates.filter(
    (candidate) => candidate.val >= heldoutFloor && candidate.test >= heldoutFloor,
  );
  let ranked = floorFeasible.length ? floorFeasible : candidates;
  const minimumHeldoutDeficit = ranked.reduce(
    (minimum, candidate) => Math.min(minimum, candidate.heldoutDeficit),
    Infinity,
  );
  ranked = ranked.filter((candidate) => candidate.heldoutDeficit === minimumHeldoutDeficit);
  const maximumVisualCoverage = ranked.reduce(
    (maximum, candidate) => Math.max(maximum, candidate.visualCoverage),
    0,
  );
  ranked = ranked.filter((candidate) => candidate.visualCoverage === maximumVisualCoverage);
  const targetDistance = (candidate) =>
    Math.abs(candidate.train - targets.train) +
    Math.abs(candidate.val - targets.val) +
    Math.abs(candidate.test - targets.test);
  ranked.sort(
    (left, right) =>
      left.heldoutDeficit - right.heldoutDeficit ||
      targetDistance(left) - targetDistance(right) ||
      Math.abs(left.val - left.test) - Math.abs(right.val - right.test) ||
      left.assignment.localeCompare(right.assignment),
  );

  const splits = { train: [], val: [], test: [] };
  const splitByChoice = { r: "train", v: "val", e: "test" };
  const winner = ranked[0]?.assignment || "";
  for (let index = 0; index < groups.length; index += 1) {
    splits[splitByChoice[winner[index]] || "train"].push(...groups[index]);
  }
  return splits;
}

function hasVisualAssertions(item) {
  return (item.visual_assertions || []).some((assertion) => !isNoneAssertion(assertion));
}

function buildSplits(items, args) {
  const shuffledGroups = seededShuffle(groupItems(items), args.seed);
  return splitGroups(shuffledGroups, items, args);
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeSplits(dataDir, splits) {
  for (const [split, items] of Object.entries(splits)) {
    writeJson(path.join(dataDir, split, "items.json"), items);
  }
}

function splitCounts(splits) {
  return {
    train: splits.train.length,
    val: splits.val.length,
    test: splits.test.length,
  };
}

function splitWarnings(items, splits, label) {
  const warnings = [];
  if (items.length < EXPLORATORY_MIN.positive) {
    warnings.push(
      `${label}: ${items.length} positive case(s); ${EXPLORATORY_MIN.positive}+ recommended before treating optimization as more than exploratory.`,
    );
  }
  if (splits.val.length < EXPLORATORY_MIN.val || splits.test.length < EXPLORATORY_MIN.test) {
    warnings.push(
      `${label}: train=${splits.train.length}, val=${splits.val.length}, test=${splits.test.length}; at least ${EXPLORATORY_MIN.val} validation and ${EXPLORATORY_MIN.test} test cases are recommended.`,
    );
  }
  if (
    items.length < OFFICIAL_RECOMMENDED.positive ||
    splits.val.length < OFFICIAL_RECOMMENDED.val ||
    splits.test.length < OFFICIAL_RECOMMENDED.test
  ) {
    warnings.push(
      `${label}: below official-parity recommendation of ${OFFICIAL_RECOMMENDED.positive}+ positive cases with ${OFFICIAL_RECOMMENDED.val}+ validation and ${OFFICIAL_RECOMMENDED.test}+ test cases.`,
    );
  }
  return warnings;
}

function qualityFor(items, splits, activationNegativeCases, extra = {}) {
  const warnings = splitWarnings(items, splits, extra.label || "dataset");
  return {
    classification:
      warnings.length === 0 &&
      items.length >= OFFICIAL_RECOMMENDED.positive &&
      splits.val.length >= OFFICIAL_RECOMMENDED.val &&
      splits.test.length >= OFFICIAL_RECOMMENDED.test
        ? "official-parity-candidate"
        : "exploratory",
    proofStatus:
      warnings.length === 0 &&
      items.length >= OFFICIAL_RECOMMENDED.positive &&
      splits.val.length >= OFFICIAL_RECOMMENDED.val &&
      splits.test.length >= OFFICIAL_RECOMMENDED.test
        ? "official-parity-candidate"
        : "blocked",
    thresholds: {
      exploratory_minimum: EXPLORATORY_MIN,
      official_recommended: OFFICIAL_RECOMMENDED,
    },
    positive_cases: items.length,
    split_counts: splitCounts(splits),
    activation_negative_cases: activationNegativeCases.length,
    positive_with_visual_assertions: items.filter(hasVisualAssertions).length,
    warnings,
    ...extra,
  };
}

const args = parseArgs(process.argv.slice(2));
const skillPath = resolveSkill(args.skill);
if (!skillPath) fail(`Could not find skill: ${args.skill}`);

const skillName = path.basename(path.dirname(skillPath));
const evalDir = path.join(root, "skill-evals", skillName);
const casesDir = path.join(evalDir, "cases");
if (!fs.existsSync(casesDir)) fail(`Missing eval cases: ${path.relative(root, casesDir)}`);
const caseFiles = walk(casesDir, (file) => file.endsWith(".md")).sort();
const casePathById = new Map();
for (const caseFile of caseFiles) {
  const slug = slugFromFile(caseFile);
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) {
    fail(`${path.relative(root, caseFile)}: Eval case basenames must be lowercase kebab-case`);
  }
  const id = `${skillName}/${slug}`;
  const previous = casePathById.get(id);
  if (previous) {
    fail(
      `Duplicate eval case ID ${id}: ${path.relative(root, previous)} and ${path.relative(root, caseFile)}. Case basenames must be unique within one skill.`,
    );
  }
  casePathById.set(id, caseFile);
  const text = fs.readFileSync(caseFile, "utf8");
  for (const fixture of fixturePaths(text)) normalizedFixtureIdentity(fixture);
  explicitSplitFamily(text, caseFile);
}

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

for (const caseFile of caseFiles) {
  const text = fs.readFileSync(caseFile, "utf8");
  const trigger = shouldTrigger(text);
  const relCasePath = path.relative(root, caseFile).replaceAll("\\", "/");
  const fixtures = fixturePaths(text);
  const normalizedFixtures = [
    ...new Set(fixtures.map(normalizedFixtureIdentity).filter(Boolean)),
  ].sort();
  const splitFamily =
    explicitSplitFamily(text, caseFile) ||
    (normalizedFixtures.length
      ? `fixture:${normalizedFixtures.join("|")}`
      : `case:${slugFromFile(caseFile)}`);
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
    fixtures: normalizedFixtures,
    split_family: splitFamily,
    expected_artifacts: expectedArtifacts,
    deterministic_assertions: deterministic,
    visual_assertions: visual,
    tags: trigger ? ["positive"] : ["negative", "activation"],
    should_trigger: trigger,
    workspace_policy: visual.length > 0 ? "isolated-artifact-write" : "text-only",
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

assignSplitGroups(trainingItems);
assignSplitGroups(activationNegativeCases);

const splits = buildSplits(trainingItems, args);
writeSplits(dataDir, splits);

const textOnlyItems = trainingItems.filter((item) => !hasVisualAssertions(item));
const textOnlyDataDir = path.join(workDir, "data-text-only");
const textOnlySplits = Object.fromEntries(
  Object.entries(splits).map(([name, items]) => [
    name,
    items.filter((item) => !hasVisualAssertions(item)),
  ]),
);
writeSplits(textOnlyDataDir, textOnlySplits);
const excludedVisualPositiveCases = trainingItems.length - textOnlyItems.length;
const textOnly = {
  data_dir: path.relative(root, textOnlyDataDir).replaceAll("\\", "/"),
  excluded_visual_positive_cases: excludedVisualPositiveCases,
  counts: splitCounts(textOnlySplits),
  quality: qualityFor(textOnlyItems, textOnlySplits, activationNegativeCases, {
    label: "text-only dataset",
    variant: "text-only",
  }),
};
writeJson(path.join(activationDir, "negative-cases.json"), activationNegativeCases);

const warnings = splitWarnings(trainingItems, splits, "full dataset");
if (excludedVisualPositiveCases > 0) warnings.push(...textOnly.quality.warnings);

const quality = {
  ...qualityFor(trainingItems, splits, activationNegativeCases, {
    label: "full dataset",
    variant: "full",
  }),
  ...qualityCounters,
  variants: {
    full: {
      data_dir: path.relative(root, dataDir).replaceAll("\\", "/"),
      counts: splitCounts(splits),
      positive_with_visual_assertions: trainingItems.filter(hasVisualAssertions).length,
    },
    text_only: textOnly,
  },
  notes: [
    "Activation-only negative cases are excluded from body optimization training.",
    "Negative cases remain useful for readiness and adoption safety review.",
    "Cases connected transitively by explicit split families or normalized shared fixture paths stay in one split.",
    "Split allocation preserves feasible heldout floors before maximizing validation and test visual coverage.",
    "The text-only variant filters the full split without changing train, validation, or test membership.",
    "Deterministic assertions are used by the local evaluator before semantic LLM judging when present.",
    "Visual assertions are checked against rollout artifacts before semantic LLM judging when present.",
    "A companion data-text-only split is always generated; when visual assertion cases exist, that split excludes them for environments without render tooling.",
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
  text_only: textOnly,
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
