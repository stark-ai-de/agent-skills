import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const rootArg = args[0] === "--incubator" ? args.shift() : null;
const [target] = args;
const skillRoot = rootArg ? path.join("incubator", "skills") : "skills";

function usage() {
  console.error("Usage: npm run scaffold <category>/<skill-name>");
  console.error("       npm run scaffold:incubator <category>/<skill-name>");
  process.exit(1);
}

if (!target) usage();
if (target.startsWith("/") || target.includes("..")) {
  console.error(`Skill path must be relative and stay under ${skillRoot}/.`);
  process.exit(1);
}

const parts = target.split("/").filter(Boolean);
if (parts.length !== 2) {
  console.error("Skill path must be exactly <category>/<skill-name>.");
  process.exit(1);
}

const [category, skillName] = parts;
const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

if (!namePattern.test(category)) {
  console.error("Category must use lowercase letters, numbers, and hyphens.");
  process.exit(1);
}

if (!namePattern.test(skillName)) {
  console.error("Skill name must use lowercase letters, numbers, and hyphens.");
  process.exit(1);
}

const skillDir = path.join(root, skillRoot, category, skillName);
const skillFile = path.join(skillDir, "SKILL.md");

if (fs.existsSync(skillDir)) {
  console.error(`Refusing to overwrite existing folder: ${path.relative(root, skillDir)}`);
  process.exit(1);
}

fs.mkdirSync(skillDir, { recursive: true });
fs.writeFileSync(
  skillFile,
  `---\nname: ${skillName}\ndescription: Describe the workflow clearly. Use when the user asks for specific trigger terms related to ${skillName}. Do not use when another focused skill owns the task.\nlicense: Apache-2.0\nmetadata:\n  author: stark-ai-de\n  category: ${category}\n${rootArg ? "  internal: true\n" : ""}  version: "0.1.0"\n---\n\n# ${skillName
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(
      " ",
    )}\n\n## Goal\n\nDescribe the concrete outcome this skill should produce.\n\n## When to use\n\n- Add specific trigger case.\n- Add specific trigger case.\n- Add specific trigger case.\n\n## When not to use\n\n- Add exclusion.\n- Add exclusion.\n\n## Inputs to inspect\n\n- Add files, commands, issue data, PR data, or repo state.\n\n## Workflow\n\n1. Inspect the minimum context needed.\n2. Identify the decision points and constraints.\n3. Produce the requested artifact or recommendation.\n4. Validate against the completion criteria.\n5. Report remaining risks.\n\n## Safety rules\n\n- Do not perform destructive changes without explicit approval.\n- Do not include secrets in output.\n- Prefer minimal, reversible changes.\n\n## References\n\nRead only when needed:\n\n- Add reference files here after creating them.\n\n## Scripts\n\nNo bundled scripts.\n\n## Output format\n\nReturn:\n\n1. Summary\n2. Findings or decisions\n3. Changes or proposed changes\n4. Validation result\n5. Remaining risks\n6. Recommended next action\n\n## Completion criteria\n\n- The output artifact is concrete and scoped.\n- Safety constraints are respected.\n- The user can act on the recommended next step.\n\n## Failure modes\n\n- If required context is missing, say exactly what is missing.\n- If the task belongs to another skill, name the better skill.\n`,
  "utf8",
);

console.log(`Created ${path.relative(root, skillFile)}`);
console.log(`Next: add ${skillName} to ${path.join(skillRoot, category, "README.md")}.`);
if (!rootArg) {
  console.log("Next: add promotion proof under skill-evals/ before release.");
}
console.log("Then run npm run validate.");
