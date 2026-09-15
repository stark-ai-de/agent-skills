import fs from "node:fs";
import path from "node:path";
import { parseRecord } from "./domain.ts";
export function discover(root: string): string[] {
  const files = fs
    .readdirSync(root)
    .filter((name) => /\.(md|json)$/.test(name))
    .sort();
  if (!files.length) throw new Error("required input domain is empty");
  for (const file of files)
    if (!fs.statSync(path.join(root, file)).isFile()) throw new Error("input must be a file");
  return files;
}
export function affected(changed: string[]): string[] {
  // Filesystem inputs are outside the import graph; unknown inputs select the owner conservatively.
  return changed.length
    ? changed.every((file) => /^(inputs|schemas)\//.test(file))
      ? ["tests/contracts/inputs.test.ts"]
      : ["tests/contracts"]
    : [];
}

export function validateInputs(root: string): string[] {
  const files = discover(root);
  for (const name of files) {
    const content = fs.readFileSync(path.join(root, name), "utf8");
    if (name.endsWith(".json")) parseRecord(JSON.parse(content));
    else if (!content.startsWith("# ")) throw new Error(`invalid Markdown input: ${name}`);
  }
  return files;
}
