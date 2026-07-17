import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const root = process.cwd();
const publicSkillsDir = path.join(root, "skills");
const incubatorSkillsDir = path.join(root, "incubator", "skills");
const errors = [];
const warnings = [];
const requiredSkillSections = [
  "Goal",
  "When to use",
  "When not to use",
  "Inputs to inspect",
  "Workflow",
  "Safety rules",
  "References",
  "Scripts",
  "Output format",
  "Completion criteria",
  "Failure modes",
];
const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const semverPattern = /^\d+\.\d+\.\d+$/;
const foreignOpenAiPromptControls = [
  ["Claude Code control", /\b(?:EnterPlanMode|ExitPlanMode|AskUserQuestion)\b/i],
  ["Cursor control", /\bAskQuestion\b|\bCursor\b.*\bPlan Mode\b|\bPlan Mode\b.*\bCursor\b/i],
];
const projectLocalOnlySkillNames = new Set([
  "agent-browser",
  "grill-me",
  "improve-codebase-architecture",
  "shadcn",
  "vercel-composition-patterns",
  "vercel-react-best-practices",
]);

const skillRoots = [
  {
    dir: publicSkillsDir,
    label: "public catalog",
    readmeMarker: ".agents/skills/",
    readmeMarkerMessage:
      "must state that third-party helper skills live outside the public catalog",
    openAiMetadataCategories: new Set(["codex-operations"]),
    requireAtLeastOne: false,
  },
  {
    dir: incubatorSkillsDir,
    label: "incubator",
    readmeMarker: "not part of the public catalog",
    readmeMarkerMessage: "must state that incubator skills are not part of the public catalog",
    requireInternalMetadata: true,
    openAiMetadataCategories: new Set(["codex-operations"]),
    requireAtLeastOne: false,
  },
];

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

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseFrontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push(`${path.relative(root, file)}: missing YAML frontmatter`);
    return { text, data: null };
  }

  let data;
  try {
    data = yaml.load(match[1]);
  } catch (error) {
    errors.push(`${path.relative(root, file)}: invalid YAML frontmatter: ${error.message}`);
    return { text, data: null };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    errors.push(`${path.relative(root, file)}: YAML frontmatter must be a mapping`);
    return { text, data: null };
  }

  return { text, data };
}

function validateSkillFile(file, skillRoot) {
  const { text, data } = parseFrontmatter(file);
  const rel = path.relative(root, file);
  if (!data) return null;
  const parent = path.basename(path.dirname(file));
  const category = path.relative(skillRoot.dir, path.dirname(file)).split(path.sep)[0];
  const name = typeof data.name === "string" ? data.name : undefined;
  const description = typeof data.description === "string" ? data.description : undefined;
  const compatibility = typeof data.compatibility === "string" ? data.compatibility : undefined;
  const metadata =
    data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? data.metadata
      : {};
  const metadataCategory = typeof metadata.category === "string" ? metadata.category : undefined;
  const metadataVersion = typeof metadata.version === "string" ? metadata.version : undefined;

  if (!name) errors.push(`${rel}: missing string frontmatter name`);
  if (!description) errors.push(`${rel}: missing string frontmatter description`);
  if (data.compatibility !== undefined && !compatibility) {
    errors.push(`${rel}: compatibility must be a string`);
  }

  if (metadata.category !== undefined && typeof metadata.category !== "string") {
    errors.push(`${rel}: metadata.category must be a string`);
  }

  if (metadataCategory !== undefined && metadataCategory !== category) {
    errors.push(
      `${rel}: metadata.category "${metadataCategory}" must match path-derived category "${category}"`,
    );
  }

  if (name && name !== parent) {
    errors.push(`${rel}: frontmatter name "${name}" must match parent folder "${parent}"`);
  }

  if (name) {
    if (name.length > 64) {
      errors.push(`${rel}: name exceeds 64 characters`);
    }
    if (!namePattern.test(name)) {
      errors.push(`${rel}: invalid skill name; use lowercase letters, numbers, and single hyphens`);
    }
  }

  if (name && projectLocalOnlySkillNames.has(name)) {
    errors.push(
      `${rel}: "${name}" is an upstream helper skill; install it project-locally with npx skills instead of publishing it from this repo`,
    );
  }

  if (description) {
    if (description.length > 1024) {
      errors.push(`${rel}: description exceeds 1024 characters`);
    }
    if (description.length < 80) {
      warnings.push(`${rel}: description is short; include trigger words and scope`);
    }
    if (description.length > 500) {
      warnings.push(`${rel}: description is long; front-load trigger words`);
    }
    if (!/\b(use when|when the user|trigger|asks?|mentions?)\b/i.test(description)) {
      warnings.push(`${rel}: description should say when to use the skill`);
    }
  }

  if (compatibility && compatibility.length > 500) {
    errors.push(`${rel}: compatibility exceeds 500 characters`);
  }

  if (!text.startsWith("---\n")) {
    errors.push(`${rel}: SKILL.md must start with frontmatter`);
  }

  if (
    skillRoot.requireInternalMetadata &&
    metadata.internal !== true &&
    metadata.internal !== "true"
  ) {
    errors.push(`${rel}: incubator skills must set metadata.internal: true`);
  }

  if (skillRoot.label === "public catalog") {
    if (!metadataVersion) {
      errors.push(`${rel}: public skills must set metadata.version`);
    } else if (!semverPattern.test(metadataVersion)) {
      errors.push(`${rel}: metadata.version must use x.y.z semver`);
    }
  }

  const body = text.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const lineCount = text.split("\n").length;
  const headings = new Set([...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim()));

  for (const section of requiredSkillSections) {
    if (!headings.has(section)) {
      errors.push(`${rel}: missing required section "${section}"`);
    }
  }

  if (body.length < 500) {
    warnings.push(`${rel}: body seems very short; ensure workflow and output format exist`);
  }

  if (body.length > 16000) {
    warnings.push(`${rel}: body is large; move long material to references/`);
  }

  if (lineCount > 500) {
    warnings.push(`${rel}: SKILL.md is over 500 lines; move detail to references/`);
  }

  if (/read all references/i.test(body)) {
    errors.push(`${rel}: do not tell agents to read all references by default`);
  }

  validateOpenAiMetadata(file, name, skillRoot, category);

  return { category, description, name, rel };
}

function validateOpenAiMetadata(file, name, skillRoot, category) {
  const skillDir = path.dirname(file);
  const metadataFile = path.join(skillDir, "agents", "openai.yaml");
  const rel = path.relative(root, metadataFile);
  const isRequired = skillRoot.openAiMetadataCategories?.has(category);

  if (!fs.existsSync(metadataFile)) {
    if (isRequired) {
      errors.push(`${rel}: ${skillRoot.label} ${category} skills must include agents/openai.yaml`);
    }
    return;
  }

  let data;
  try {
    data = yaml.load(fs.readFileSync(metadataFile, "utf8"));
  } catch (error) {
    errors.push(`${rel}: invalid YAML: ${error.message}`);
    return;
  }

  if (!isMapping(data)) {
    errors.push(`${rel}: YAML document must be a mapping`);
    return;
  }

  const interfaceBlock = data.interface;
  if (!isMapping(interfaceBlock)) {
    errors.push(`${rel}: interface must be a mapping`);
  } else {
    const displayName = interfaceBlock.display_name;
    const shortDescription = interfaceBlock.short_description;
    const defaultPrompt = interfaceBlock.default_prompt;

    if (typeof displayName !== "string" || !displayName.trim()) {
      errors.push(`${rel}: interface.display_name must be a non-empty string`);
    }
    if (typeof shortDescription !== "string") {
      errors.push(`${rel}: interface.short_description must be a string`);
    } else if (shortDescription.length < 25 || shortDescription.length > 64) {
      errors.push(`${rel}: interface.short_description must be 25-64 characters`);
    }
    if (typeof defaultPrompt !== "string" || !defaultPrompt.trim()) {
      errors.push(`${rel}: interface.default_prompt must be a non-empty string`);
    } else {
      if (name && !defaultPrompt.includes(`$${name}`)) {
        errors.push(`${rel}: interface.default_prompt must mention $${name}`);
      }
      const normalizedPrompt = defaultPrompt.replace(/\s+/g, " ");
      for (const [label, pattern] of foreignOpenAiPromptControls) {
        if (pattern.test(normalizedPrompt)) {
          errors.push(`${rel}: interface.default_prompt must not require or name a ${label}`);
        }
      }
    }
  }

  const policy = data.policy;
  if (!isMapping(policy)) {
    errors.push(`${rel}: policy must be a mapping`);
  } else if (typeof policy.allow_implicit_invocation !== "boolean") {
    errors.push(`${rel}: policy.allow_implicit_invocation must be a boolean`);
  }

  const dependencies = data.dependencies;
  if (!isMapping(dependencies)) {
    errors.push(`${rel}: dependencies must be a mapping`);
  } else if (!Array.isArray(dependencies.tools)) {
    errors.push(`${rel}: dependencies.tools must be an array, use [] when empty`);
  }
}

function validateCategoryReadmes(skillRoot, skillRecords) {
  const categories = new Map();
  for (const record of skillRecords) {
    if (!record?.name || !record.description) continue;
    const records = categories.get(record.category) ?? [];
    records.push(record);
    categories.set(record.category, records);
  }

  for (const [category, records] of [...categories.entries()].sort()) {
    const readmePath = path.join(skillRoot.dir, category, "README.md");
    const rel = path.relative(root, readmePath);

    if (!fs.existsSync(readmePath)) {
      errors.push(`${rel}: missing category README`);
      continue;
    }

    const readme = fs.readFileSync(readmePath, "utf8");
    if (!readme.includes(skillRoot.readmeMarker)) {
      errors.push(`${rel}: ${skillRoot.readmeMarkerMessage}`);
    }

    for (const record of records.sort((a, b) => a.name.localeCompare(b.name))) {
      const expectedLink = `[\`${record.name}\`](${record.name}/SKILL.md)`;
      if (!readme.includes(expectedLink)) {
        errors.push(`${rel}: missing link ${expectedLink}`);
      }
      if (!readme.includes(record.description)) {
        errors.push(`${rel}: description for "${record.name}" must match SKILL.md frontmatter`);
      }
    }
  }
}

function validateScripts(skillRoot) {
  for (const file of walk(skillRoot.dir)) {
    const normalized = file.replaceAll("\\", "/");
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, "utf8");

    if (/\/scripts\//.test(normalized)) {
      if (file.endsWith(".sh") && !text.includes("set -euo pipefail")) {
        warnings.push(`${rel}: shell scripts should use set -euo pipefail`);
      }
      if (skillRoot.label === "public catalog" && file.endsWith(".sh")) {
        warnings.push(
          `${rel}: public skill helper scripts should prefer Node .mjs for portability`,
        );
      }
      if (/\brm\s+-rf\b|\bsudo\b|\bcurl\b.*\|\s*(sh|bash)|\bwget\b.*\|\s*(sh|bash)/.test(text)) {
        warnings.push(`${rel}: contains high-risk shell pattern; review carefully`);
      }
    }

    if (/(secret|token|password)\s*=\s*['"][^'"]+['"]/i.test(text)) {
      warnings.push(`${rel}: possible hard-coded sensitive value pattern; review carefully`);
    }
  }
}

function validateSkillRoot(skillRoot) {
  const skillFiles = walk(skillRoot.dir, (file) => path.basename(file) === "SKILL.md").sort();

  if (skillRoot.requireAtLeastOne && skillFiles.length === 0) {
    errors.push(`No skills found under ${path.relative(root, skillRoot.dir)}/**/SKILL.md`);
  }

  const skillRecords = skillFiles.map((file) => validateSkillFile(file, skillRoot)).filter(Boolean);
  validateCategoryReadmes(skillRoot, skillRecords);
  validateScripts(skillRoot);

  return skillFiles.length;
}

const counts = new Map();
for (const skillRoot of skillRoots) {
  counts.set(skillRoot.label, validateSkillRoot(skillRoot));
}

const publicSkillFiles = walk(publicSkillsDir, (file) => path.basename(file) === "SKILL.md");
const publicSkillNames = new Set(publicSkillFiles.map((file) => path.basename(path.dirname(file))));
const portableSkillNames = publicSkillFiles
  .filter((file) => {
    const category = path.relative(publicSkillsDir, path.dirname(file)).split(path.sep)[0];
    return !category.endsWith("-operations");
  })
  .map((file) => path.basename(path.dirname(file)))
  .sort();

function validatePortableInstallSets(text, rel) {
  const commands = text
    .split("\n")
    .map((line) =>
      line
        .replace(/\s+#.*$/, "")
        .trim()
        .split(/\s+/),
    )
    .filter(
      (words) =>
        words[0] === "npx" &&
        /^skills(?:@latest)?$/.test(words[1]) &&
        words[2] === "add" &&
        words[3] === "stark-ai-de/agent-skills" &&
        words.includes("--skill"),
    );

  for (const host of ["codex", "cursor", "claude-code"]) {
    const hasCompleteSet = commands.some((words) => {
      const parsed = parseInstallCommandOptions(words);
      if (!parsed?.hosts.includes(host)) return false;

      return portableSkillNames.every((name) => parsed.skills.includes(name));
    });

    if (!hasCompleteSet) {
      errors.push(
        `${rel}: ${host} install set must include one command with every portable skill as a --skill operand: ${portableSkillNames.join(", ")}`,
      );
    }
  }
}

function parseInstallCommandOptions(words) {
  const booleanFlags = new Set(["--copy", "--global", "--yes", "-g", "-y"]);
  const knownHosts = new Set(["claude-code", "codex", "cursor"]);
  const parsed = { hosts: [], skills: [] };

  for (let index = 4; index < words.length; ) {
    const flag = words[index];
    if (booleanFlags.has(flag)) {
      index += 1;
      continue;
    }

    const target =
      flag === "--skill"
        ? parsed.skills
        : ["--agent", "-a"].includes(flag)
          ? parsed.hosts
          : undefined;
    const allowedValues = flag === "--skill" ? publicSkillNames : knownHosts;
    if (!target) return undefined;

    index += 1;
    const valueStart = index;
    while (index < words.length && !words[index].startsWith("-")) {
      if (!allowedValues.has(words[index])) return undefined;
      target.push(words[index]);
      index += 1;
    }
    if (index === valueStart) return undefined;
  }

  return parsed;
}

const readmePath = path.join(root, "README.md");
if (!fs.existsSync(readmePath)) {
  errors.push("README.md missing");
} else {
  const readme = fs.readFileSync(readmePath, "utf8");
  if (!readme.includes("npx skills")) {
    warnings.push("README.md should include npx skills install commands");
  }
  if (!readme.includes("--skill")) {
    warnings.push("README.md should show how to install one specific skill after promotion");
  }
  if (!readme.includes("incubator/skills")) {
    warnings.push("README.md should explain the incubator skill root");
  }
  if (!readme.includes("skill-evals/")) {
    warnings.push("README.md should explain the skill-evals proof root");
  }
  validatePortableInstallSets(readme, "README.md");
}

const publishingPath = path.join(root, "docs", "publishing.md");
if (!fs.existsSync(publishingPath)) {
  errors.push("docs/publishing.md missing");
} else {
  validatePortableInstallSets(fs.readFileSync(publishingPath, "utf8"), "docs/publishing.md");
}

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
  console.log("");
}

if (errors.length) {
  console.error("Errors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Validated ${counts.get("public catalog")} public skill(s) and ${counts.get("incubator")} incubator skill(s).`,
);
