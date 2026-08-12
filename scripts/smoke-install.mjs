import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  assertExactPublicSkillSet,
  copyGitCandidateRepository,
} from "./validation/smoke-install-contract.mjs";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const exactSkillsCliVersion = packageJson.devDependencies?.skills;
if (!/^\d+\.\d+\.\d+$/.test(exactSkillsCliVersion ?? "")) {
  throw new Error("package.json must pin an exact skills CLI devDependency.");
}
const defaultSkillsCliPackage = `skills@${exactSkillsCliVersion}`;

function validatedSkillsCliOverride() {
  const rawValue = process.env.SKILLS_SMOKE_CLI;
  if (rawValue === undefined) return undefined;

  const value = rawValue.trim();
  if (!value) {
    throw new Error("SKILLS_SMOKE_CLI must not be empty when configured.");
  }
  if (!path.isAbsolute(value)) {
    throw new Error("SKILLS_SMOKE_CLI must be an absolute path.");
  }

  let stat;
  try {
    stat = fs.statSync(value);
  } catch {
    throw new Error("SKILLS_SMOKE_CLI must reference an existing file.");
  }
  if (!stat.isFile()) {
    throw new Error("SKILLS_SMOKE_CLI must reference a regular file.");
  }
  try {
    fs.accessSync(value, fs.constants.X_OK);
  } catch {
    throw new Error("SKILLS_SMOKE_CLI must reference an executable file.");
  }
  return value;
}

function validatedForceTtySetting() {
  const rawValue = process.env.SKILLS_SMOKE_FORCE_TTY;
  if (rawValue === undefined) return false;

  const value = rawValue.trim();
  if (!new Set(["0", "1"]).has(value)) {
    throw new Error("SKILLS_SMOKE_FORCE_TTY must be either 0 or 1 when configured.");
  }
  return value === "1";
}

const configuredSkillsCli = validatedSkillsCliOverride();
const forceSkillsCliTty = validatedForceTtySetting();
if (forceSkillsCliTty && !configuredSkillsCli) {
  throw new Error("SKILLS_SMOKE_FORCE_TTY requires an explicit SKILLS_SMOKE_CLI.");
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skills-smoke-"));
const copyRoot = path.join(tmpRoot, "repo");
const installRoot = path.join(tmpRoot, "installs");
const smokeEnvironment = {
  ...process.env,
  CI: "1",
  DISABLE_TELEMETRY: "1",
  DO_NOT_TRACK: "1",
};
const skillsCommand = configuredSkillsCli || "npx";
const skillsPrefixArguments = configuredSkillsCli ? [] : ["--yes", defaultSkillsCliPackage];
const installCases = [
  {
    agent: "codex",
    destination: path.join(".agents", "skills", "codex-spec-interviewer"),
    skill: "codex-spec-interviewer",
  },
  {
    agent: "cursor",
    destination: path.join(".agents", "skills", "cursor-spec-interviewer"),
    skill: "cursor-spec-interviewer",
  },
  {
    agent: "claude-code",
    destination: path.join(".claude", "skills", "claude-spec-interviewer"),
    skill: "claude-spec-interviewer",
  },
  {
    agent: "codex",
    destination: path.join(".agents", "skills", "architecture-compass"),
    skill: "architecture-compass",
  },
  {
    agent: "cursor",
    destination: path.join(".agents", "skills", "architecture-compass"),
    skill: "architecture-compass",
  },
  {
    agent: "claude-code",
    destination: path.join(".claude", "skills", "architecture-compass"),
    skill: "architecture-compass",
  },
];

const architectureManifests = new Map();
const legacyCommit = "05b11f31ee22e4ed2e68c8d89d8a415affc48fe3";
let legacyEvidenceHashes = new Set();
let decisionLineageHash;

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function legacyEvidenceHashSet(repositoryRoot) {
  const evidenceFiles = [
    path.join(
      repositoryRoot,
      "scripts",
      "validation",
      "architecture-compass",
      "legacy-reference-source-lock.json",
    ),
    path.join(
      repositoryRoot,
      "scripts",
      "validation",
      "architecture-compass",
      "legacy-reference-coverage.json",
    ),
    ...walk(
      path.join(
        repositoryRoot,
        "skill-evals",
        "architecture-compass",
        "reference-baseline",
        legacyCommit,
      ),
      () => true,
    ),
  ];
  if (evidenceFiles.length !== 10 || evidenceFiles.some((file) => !fs.existsSync(file))) {
    throw new Error("Clean-copy legacy-reference evidence is incomplete.");
  }
  return new Set(evidenceFiles.map(sha256));
}

function repoOnlyDecisionLineageHash(repositoryRoot) {
  const file = path.join(
    repositoryRoot,
    "scripts",
    "validation",
    "architecture-compass",
    "decision-lineage.json",
  );
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error("Clean-copy decision-lineage manifest is missing or not a regular file.");
  }
  return sha256(file);
}

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

function shellQuote(argument) {
  return `'${String(argument).replaceAll("'", `'"'"'`)}'`;
}

function runSkills(arguments_, cwd) {
  const command = forceSkillsCliTty ? "script" : skillsCommand;
  const commandArguments = forceSkillsCliTty
    ? [
        "-qec",
        [skillsCommand, ...skillsPrefixArguments, ...arguments_].map(shellQuote).join(" "),
        "/dev/null",
      ]
    : [...skillsPrefixArguments, ...arguments_];
  return spawnSync(command, commandArguments, {
    cwd,
    encoding: "utf8",
    env: smokeEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function architectureManifest(skillDir) {
  const catalog = path.join(skillDir, "references", "adr-catalog.md");
  if (!fs.existsSync(catalog)) {
    throw new Error("Installed architecture-compass payload is missing references/adr-catalog.md.");
  }

  const references = walk(path.join(skillDir, "references"), (file) => file.endsWith(".md"));
  const triplets = references.filter((file) =>
    /^ac-adr-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.(?:short|long|guide)\.md$/.test(path.basename(file)),
  );
  if (triplets.length !== 159) {
    throw new Error(
      `Installed architecture-compass payload has ${triplets.length} ADR variant(s); expected 159.`,
    );
  }

  const variantsByStem = new Map();
  for (const file of triplets) {
    const match = path.basename(file).match(/^(ac-adr-\d{3}-.+)\.(short|long|guide)\.md$/);
    const variants = variantsByStem.get(match[1]) ?? new Set();
    variants.add(match[2]);
    variantsByStem.set(match[1], variants);
  }
  if (
    variantsByStem.size !== 53 ||
    [...variantsByStem.values()].some(
      (variants) => !["short", "long", "guide"].every((variant) => variants.has(variant)),
    )
  ) {
    throw new Error(
      "Installed architecture-compass payload does not contain 53 complete public triplets.",
    );
  }
  const expectedIds = new Set(
    Array.from({ length: 53 }, (_, index) => String(index + 1).padStart(3, "0")),
  );
  const actualIds = new Set(
    [...variantsByStem.keys()].map((stem) => /^ac-adr-(\d{3})-/.exec(stem)?.[1]).filter(Boolean),
  );
  const missingIds = [...expectedIds].filter((id) => !actualIds.has(id));
  const unexpectedIds = [...actualIds].filter((id) => !expectedIds.has(id));
  if (missingIds.length > 0 || unexpectedIds.length > 0) {
    throw new Error(
      `Installed architecture-compass payload has the wrong ADR IDs; missing ${missingIds.join(", ") || "none"}; unexpected ${unexpectedIds.join(", ") || "none"}.`,
    );
  }

  const internalReferenceRoot = path.join(skillDir, "references", "internal");
  const expectedInternalReferences = [
    "internal-adr-index.md",
    "internal-adr-001-resolve-persistence-surfaces-before-writes.short.md",
    "internal-adr-001-resolve-persistence-surfaces-before-writes.long.md",
    "internal-adr-001-resolve-persistence-surfaces-before-writes.guide.md",
    "internal-adr-002-select-capability-aware-receipt-renderers.short.md",
    "internal-adr-002-select-capability-aware-receipt-renderers.long.md",
    "internal-adr-002-select-capability-aware-receipt-renderers.guide.md",
  ];
  if (!fs.existsSync(internalReferenceRoot) || !fs.statSync(internalReferenceRoot).isDirectory()) {
    throw new Error("Installed architecture-compass payload is missing references/internal/.");
  }
  const missingInternalReferences = expectedInternalReferences.filter(
    (file) => !fs.existsSync(path.join(internalReferenceRoot, file)),
  );
  if (missingInternalReferences.length > 0) {
    throw new Error(
      `Installed architecture-compass payload is missing internal ADR reference(s): ${missingInternalReferences.join(", ")}.`,
    );
  }
  const expectedInternalReferenceSet = new Set(expectedInternalReferences);
  const unexpectedInternalReferences = walk(internalReferenceRoot, () => true)
    .map((file) => path.relative(internalReferenceRoot, file).split(path.sep).join("/"))
    .filter((file) => !expectedInternalReferenceSet.has(file));
  if (unexpectedInternalReferences.length > 0) {
    throw new Error(
      `Installed architecture-compass payload contains unexpected internal ADR reference(s): ${unexpectedInternalReferences.join(", ")}.`,
    );
  }
  const internalTripletReferences = expectedInternalReferences.filter((file) =>
    /\.(short|long|guide)\.md$/.test(file),
  );
  const invalidInternalStatusReferences = internalTripletReferences.filter((file) => {
    const content = fs.readFileSync(path.join(internalReferenceRoot, file), "utf8");
    return !/^Status:\s*(?:Accepted|Superseded)\s*$/m.test(content);
  });
  if (invalidInternalStatusReferences.length > 0) {
    throw new Error(
      `Installed architecture-compass payload contains internal ADR reference(s) without an Accepted or Superseded status: ${invalidInternalStatusReferences.join(", ")}.`,
    );
  }
  const decisionLineageStem = "ac-adr-044-record-material-decision-lineage-in-non-normative-guides";
  if (!variantsByStem.has(decisionLineageStem)) {
    throw new Error("Installed architecture-compass payload is missing the AC-ADR-044 triplet.");
  }
  const workflowRoutingStem =
    "ac-adr-048-persist-approved-governance-before-planned-architecture-refactors";
  if (!variantsByStem.has(workflowRoutingStem)) {
    throw new Error("Installed architecture-compass payload is missing the AC-ADR-048 triplet.");
  }
  const evidenceRankingStem =
    "ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority";
  if (!variantsByStem.has(evidenceRankingStem)) {
    throw new Error("Installed architecture-compass payload is missing the AC-ADR-046 triplet.");
  }
  const validationRiskStem =
    "ac-adr-049-distinguish-change-risk-from-representative-environment-observation";
  if (!variantsByStem.has(validationRiskStem)) {
    throw new Error("Installed architecture-compass payload is missing the AC-ADR-049 triplet.");
  }

  const legacyReferences = new Set([
    "adoption-workflows.md",
    "backend-runtime-patterns.md",
    "checklists.md",
    "host-collaboration-modes.md",
    "nextjs-request-patterns.md",
    "preferred-stack-profile.md",
    "repository-source-structure.md",
    "rule-extraction-and-conflict-resolution.md",
  ]);
  const legacy = references.find((file) => legacyReferences.has(path.basename(file)));
  if (legacy) {
    throw new Error(
      `Installed architecture-compass payload contains legacy reference ${path.basename(legacy)}.`,
    );
  }

  for (const required of [
    "assets/adr-template.short.md",
    "assets/adr-template.long.md",
    "assets/adr-template.guide.md",
    "assets/adr-example.short.md",
    "assets/adr-example.long.md",
    "assets/adr-example.guide.md",
  ]) {
    if (!fs.existsSync(path.join(skillDir, required))) {
      throw new Error(`Installed architecture-compass payload is missing ${required}.`);
    }
  }

  const files = walk(skillDir, () => true).sort();
  const leakedLegacyEvidence = files.find((file) => {
    const parts = path.relative(skillDir, file).split(path.sep);
    return (
      new Set(["legacy-reference-source-lock.json", "legacy-reference-coverage.json"]).has(
        path.basename(file),
      ) ||
      parts.includes("reference-baseline") ||
      legacyReferences.has(path.basename(file)) ||
      legacyEvidenceHashes.has(sha256(file))
    );
  });
  if (leakedLegacyEvidence) {
    throw new Error(
      `Installed architecture-compass payload contains repo-only legacy-reference evidence bytes at ${path.relative(skillDir, leakedLegacyEvidence)}.`,
    );
  }
  const leakedLineageManifest = files.find(
    (file) =>
      path.basename(file) === "decision-lineage.json" || sha256(file) === decisionLineageHash,
  );
  if (leakedLineageManifest) {
    throw new Error(
      `Installed architecture-compass payload contains repo-only decision-lineage bytes at ${path.relative(skillDir, leakedLineageManifest)}.`,
    );
  }
  return files
    .map((file) => {
      const rel = path.relative(skillDir, file).split(path.sep).join("/");
      const digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
      return `${rel}:${digest}`;
    })
    .join("\n");
}

function installAndAssertDestination({ agent, destination, skill }) {
  const projectRoot = path.join(installRoot, agent);
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, "package.json"),
    `${JSON.stringify({ name: `smoke-${agent}`, private: true }, null, 2)}\n`,
  );

  const result = runSkills(
    ["add", copyRoot, "--skill", skill, "--agent", agent, "--yes", "--copy"],
    projectRoot,
  );

  if (result.status !== 0) {
    const output = `${result.stdout}\n${result.stderr}`.trim();
    throw new Error(
      [`Smoke install failed for ${skill} with --agent ${agent}.`, output]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const installedSkillFile = path.join(projectRoot, destination, "SKILL.md");
  if (!fs.existsSync(installedSkillFile)) {
    throw new Error(
      `Smoke install placed ${skill} outside the expected ${path.relative(projectRoot, path.dirname(installedSkillFile))} destination for --agent ${agent}.`,
    );
  }

  if (parseSkillName(installedSkillFile) !== skill) {
    throw new Error(`Smoke install destination for --agent ${agent} does not contain ${skill}.`);
  }

  const alternativeDestinations = [
    path.join(".agents", "skills", skill),
    path.join(".claude", "skills", skill),
    path.join(".cursor", "skills", skill),
  ].filter((candidate) => candidate !== destination);
  const unexpected = alternativeDestinations.find((candidate) =>
    fs.existsSync(path.join(projectRoot, candidate)),
  );
  if (unexpected) {
    throw new Error(
      `Smoke install unexpectedly placed ${skill} at ${unexpected} for --agent ${agent}.`,
    );
  }

  console.log(`Smoke installed ${skill} for ${agent} at ${destination}.`);

  if (skill === "architecture-compass") {
    architectureManifests.set(agent, architectureManifest(path.dirname(installedSkillFile)));
  }
}

try {
  const copiedCandidate = copyGitCandidateRepository(root, copyRoot);
  console.log(`Smoke install copied ${copiedCandidate.fileCount} Git candidate file(s).`);
  console.log(`Git candidate fingerprint: ${copiedCandidate.algorithm}:${copiedCandidate.digest}`);

  const names = walk(path.join(copyRoot, "skills"), (file) => path.basename(file) === "SKILL.md")
    .map(parseSkillName)
    .filter(Boolean)
    .sort();
  legacyEvidenceHashes = legacyEvidenceHashSet(copyRoot);
  decisionLineageHash = repoOnlyDecisionLineageHash(copyRoot);
  const sourceArchitectureManifest = architectureManifest(
    path.join(copyRoot, "skills", "engineering-workflows", "architecture-compass"),
  );

  const result = runSkills(["add", ".", "--list", "--yes"], copyRoot);

  const output = `${result.stdout}\n${result.stderr}`;

  const noPublicSkills = names.length === 0;
  const noSkillsFound = /no skills found/i.test(output);

  if (result.status !== 0 && !(noPublicSkills && noSkillsFound)) {
    throw new Error(output.trim() || "Smoke install list command failed without output.");
  }

  assertExactPublicSkillSet(names, output);

  if (noPublicSkills) {
    console.log("Smoke install found no public skills and no incubator/helper skill leaks.");
  } else {
    console.log(`Smoke install listed ${names.length} public skill(s) from a clean copy.`);
  }

  for (const installCase of installCases) {
    installAndAssertDestination(installCase);
  }

  const manifestValues = [...architectureManifests.values()];
  if (manifestValues.some((manifest) => manifest !== sourceArchitectureManifest)) {
    throw new Error(
      "Installed architecture-compass payload differs from the clean-copy source payload.",
    );
  }
  console.log("Architecture Compass installed payload matches the clean-copy source payload.");
  if (
    architectureManifests.size !== 3 ||
    manifestValues.some((manifest) => manifest !== manifestValues[0])
  ) {
    throw new Error(
      "Installed architecture-compass payload differs across Codex, Cursor, and Claude Code.",
    );
  }
  console.log("Architecture Compass payload parity passed for Codex, Cursor, and Claude Code.");
} finally {
  fs.rmSync(tmpRoot, { force: true, recursive: true });
}
