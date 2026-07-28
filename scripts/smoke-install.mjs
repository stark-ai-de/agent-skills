import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skills-smoke-"));
const copyRoot = path.join(tmpRoot, "repo");
const installRoot = path.join(tmpRoot, "installs");
const smokeEnvironment = {
  ...process.env,
  CI: "1",
  DISABLE_TELEMETRY: "1",
  DO_NOT_TRACK: "1",
};
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

function architectureManifest(skillDir) {
  const catalog = path.join(skillDir, "references", "adr-catalog.md");
  if (!fs.existsSync(catalog)) {
    throw new Error("Installed architecture-compass payload is missing references/adr-catalog.md.");
  }

  const references = walk(path.join(skillDir, "references"), (file) => file.endsWith(".md"));
  const triplets = references.filter((file) =>
    /^ac-adr-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.(?:short|long|guide)\.md$/.test(path.basename(file)),
  );
  if (triplets.length !== 75) {
    throw new Error(
      `Installed architecture-compass payload has ${triplets.length} ADR variant(s); expected 75.`,
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
    variantsByStem.size !== 25 ||
    [...variantsByStem.values()].some(
      (variants) => !["short", "long", "guide"].every((variant) => variants.has(variant)),
    )
  ) {
    throw new Error(
      "Installed architecture-compass payload does not contain 25 complete triplets.",
    );
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

  const result = spawnSync(
    "npx",
    [
      "--yes",
      "skills@latest",
      "add",
      copyRoot,
      "--skill",
      skill,
      "--agent",
      agent,
      "--yes",
      "--copy",
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: smokeEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.status !== 0) {
    const output = `${result.stdout}\n${result.stderr}`.trim();
    console.error(output);
    console.error(`Smoke install failed for ${skill} with --agent ${agent}.`);
    process.exit(result.status ?? 1);
  }

  const installedSkillFile = path.join(projectRoot, destination, "SKILL.md");
  if (!fs.existsSync(installedSkillFile)) {
    console.error(
      `Smoke install placed ${skill} outside the expected ${path.relative(projectRoot, path.dirname(installedSkillFile))} destination for --agent ${agent}.`,
    );
    process.exit(1);
  }

  if (parseSkillName(installedSkillFile) !== skill) {
    console.error(`Smoke install destination for --agent ${agent} does not contain ${skill}.`);
    process.exit(1);
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
    console.error(
      `Smoke install unexpectedly placed ${skill} at ${unexpected} for --agent ${agent}.`,
    );
    process.exit(1);
  }

  console.log(`Smoke installed ${skill} for ${agent} at ${destination}.`);

  if (skill === "architecture-compass") {
    try {
      architectureManifests.set(agent, architectureManifest(path.dirname(installedSkillFile)));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

try {
  fs.cpSync(root, copyRoot, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source);
      if (!rel) return true;
      const [topLevel] = rel.split(path.sep);
      return !new Set([".agents", ".codegraph", ".git", "node_modules", "skills-lock.json"]).has(
        topLevel,
      );
    },
  });

  const names = walk(path.join(copyRoot, "skills"), (file) => path.basename(file) === "SKILL.md")
    .map(parseSkillName)
    .filter(Boolean)
    .sort();
  const incubatorNames = walk(
    path.join(copyRoot, "incubator", "skills"),
    (file) => path.basename(file) === "SKILL.md",
  )
    .map(parseSkillName)
    .filter(Boolean)
    .sort();

  const result = spawnSync("npx", ["--yes", "skills@latest", "add", ".", "--list"], {
    cwd: copyRoot,
    encoding: "utf8",
    env: smokeEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = `${result.stdout}\n${result.stderr}`;

  if (output.includes("agent-browser") || output.includes("grill-me")) {
    console.error(
      "Smoke install output included project-local helper skills from .agents/skills/.",
    );
    process.exit(1);
  }

  const leakedIncubator = incubatorNames.filter((name) => output.includes(name));
  if (leakedIncubator.length > 0) {
    console.error(
      `Smoke install output included incubator skill(s): ${leakedIncubator.join(", ")}`,
    );
    process.exit(1);
  }

  const noPublicSkills = names.length === 0;
  const noSkillsFound = /no skills found/i.test(output);

  if (result.status !== 0 && !(noPublicSkills && noSkillsFound)) {
    console.error(output.trim());
    process.exit(result.status ?? 1);
  }

  const missing = names.filter((name) => !output.includes(name));
  if (missing.length > 0) {
    console.error(`Smoke install output did not list expected skill(s): ${missing.join(", ")}`);
    process.exit(1);
  }

  if (noPublicSkills) {
    console.log("Smoke install found no public skills and no incubator/helper skill leaks.");
  } else {
    console.log(`Smoke install listed ${names.length} public skill(s) from a clean copy.`);
  }

  for (const installCase of installCases) {
    installAndAssertDestination(installCase);
  }

  const manifestValues = [...architectureManifests.values()];
  if (
    architectureManifests.size !== 3 ||
    manifestValues.some((manifest) => manifest !== manifestValues[0])
  ) {
    console.error(
      "Installed architecture-compass payload differs across Codex, Cursor, and Claude Code.",
    );
    process.exit(1);
  }
  console.log("Architecture Compass payload parity passed for Codex, Cursor, and Claude Code.");
} finally {
  fs.rmSync(tmpRoot, { force: true, recursive: true });
}
