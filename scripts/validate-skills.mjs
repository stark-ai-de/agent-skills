import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillsDir = path.join(root, "skills");
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

function parseFrontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push(`${path.relative(root, file)}: missing YAML frontmatter`);
    return { text, data: null };
  }

  const data = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i === -1) {
      warnings.push(`${path.relative(root, file)}: suspicious frontmatter line: ${line}`);
      continue;
    }
    const key = line.slice(0, i).trim();
    const value = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    data[key] = value;
  }

  return { text, data };
}

const skillFiles = walk(skillsDir, (file) => path.basename(file) === "SKILL.md").sort();
const projectLocalOnlySkillNames = new Set([
  "agent-browser",
  "grill-me",
  "improve-codebase-architecture",
  "shadcn",
  "vercel-composition-patterns",
  "vercel-react-best-practices",
]);

if (skillFiles.length === 0) {
  errors.push("No skills found under skills/**/SKILL.md");
}

for (const file of skillFiles) {
  const { text, data } = parseFrontmatter(file);
  const rel = path.relative(root, file);
  if (!data) continue;

  const parent = path.basename(path.dirname(file));
  const name = data.name;
  const description = data.description;
  const compatibility = data.compatibility;

  if (!name) errors.push(`${rel}: missing frontmatter name`);
  if (!description) errors.push(`${rel}: missing frontmatter description`);

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
    warnings.push("README.md should show how to install one specific skill");
  }
}

for (const file of walk(skillsDir)) {
  const normalized = file.replaceAll("\\", "/");
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");

  if (/\/scripts\//.test(normalized)) {
    if (file.endsWith(".sh") && !text.includes("set -euo pipefail")) {
      warnings.push(`${rel}: shell scripts should use set -euo pipefail`);
    }
    if (/\brm\s+-rf\b|\bsudo\b|\bcurl\b.*\|\s*(sh|bash)|\bwget\b.*\|\s*(sh|bash)/.test(text)) {
      warnings.push(`${rel}: contains high-risk shell pattern; review carefully`);
    }
  }

  if (/(secret|token|password)\s*=\s*['"][^'"]+['"]/i.test(text)) {
    warnings.push(`${rel}: possible hard-coded sensitive value pattern; review carefully`);
  }
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

console.log(`Validated ${skillFiles.length} skill(s).`);
