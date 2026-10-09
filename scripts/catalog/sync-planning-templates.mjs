import fs from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--check")) throw new Error("Use --check or no arguments");
const check = args.includes("--check");
const root = fs.realpathSync(process.cwd());
const owner =
  "skills/engineering-workflows/architecture-compass/assets/product-planning-work-item.md";
const content = fs.readFileSync(path.join(root, owner), "utf8");
const zoomRoots = ["skills", "incubator/skills"]
  .map((base) => `${base}/engineering-workflows/architecture-zoom`)
  .filter((dir) => fs.existsSync(path.join(root, dir, "SKILL.md")));
if (zoomRoots.length !== 1) throw new Error("Exactly one Architecture Zoom source must exist");
const targets = [
  `${zoomRoots[0]}/assets/work-item-template.md`,
  "skills/codex-operations/codex-spec-interviewer/assets/product-planning-work-item.md",
];
// Preflight both destinations before writing either. Never follow a target or parent
// symlink outside the assigned repository; atomic replacement also avoids hard-link writes.
for (const target of targets) {
  const file = path.join(root, target);
  const stat = fs.lstatSync(file, { throwIfNoEntry: false });
  if (stat && (!stat.isFile() || stat.isSymbolicLink()))
    throw new Error(`Unsafe template destination: ${target}`);
  const parent = fs.realpathSync(path.dirname(file));
  const relative = path.relative(root, parent);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error(`Template destination escapes the repository: ${target}`);
}
for (const target of targets) {
  const file = path.join(root, target);
  if (check) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content) {
      console.error(`Planning template drift: ${target}`);
      process.exitCode = 1;
    }
  } else {
    const temporary = path.join(path.dirname(file), `.planning-template-${randomUUID()}.tmp`);
    try {
      fs.writeFileSync(temporary, content, { flag: "wx", mode: 0o644 });
      fs.renameSync(temporary, file);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
    console.log(`Synchronized ${target}`);
  }
}
