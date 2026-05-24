import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, predicate));
    if (entry.isFile() && predicate(full)) files.push(path.relative(root, full));
  }

  return files;
}

function check(command, args) {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

const nodeScripts = walk(path.join(root, "scripts"), (file) => file.endsWith(".mjs")).sort();
const shellScripts = [
  ...walk(path.join(root, "skills"), (file) => file.endsWith(".sh")),
  ...walk(path.join(root, "incubator"), (file) => file.endsWith(".sh")),
].sort();

for (const script of nodeScripts) check(process.execPath, ["--check", script]);
for (const script of shellScripts) check("bash", ["-n", script]);

console.log(
  `Validated syntax for ${nodeScripts.length} Node script(s) and ${shellScripts.length} shell script(s).`,
);
