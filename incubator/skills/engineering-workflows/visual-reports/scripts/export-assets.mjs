import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", ["-C", skill, ...args], { encoding: "utf8" }).trim();
const args = process.argv.slice(2);
const destinationIndex = args.indexOf("--destination");
if (destinationIndex < 0 || !args[destinationIndex + 1] || args.some((arg, i) => i !== destinationIndex + 1 && !["--destination", "--check"].includes(arg))) {
  throw new Error("Usage: node scripts/export-assets.mjs --destination <directory> [--check]");
}
const destination = path.resolve(args[destinationIndex + 1]);
const repo = await realpath(git("rev-parse", "--show-toplevel"));
const skillPath = path.relative(repo, skill).split(path.sep).join("/");
let ancestor = destination;
while (true) {
  try { ancestor = await realpath(ancestor); break; }
  catch (error) { if (error.code !== "ENOENT") throw error; ancestor = path.dirname(ancestor); }
}
if (ancestor === repo || ancestor.startsWith(repo + path.sep)) throw new Error("Export into a consumer directory outside the skill source repository.");
const inputs = {
  // Keep the original flat entry points for existing consumers.
  "configurator.mjs": "assets/graphite-grain/configurator.mjs",
  "configurator.html": "assets/graphite-grain/configurator.html",
  "relaxed.css": "assets/graphite-grain/relaxed.css",
  "cache_icon.py": "scripts/cache_icon.py",
  "LICENSE.txt": path.relative(skill, path.join(repo, "LICENSE")),
};
// Preserve canonical relative imports so the complete renderer runs offline from the bundle.
for (const input of git("ls-files", "--", "SKILL.md", "agents", "assets", "references", "scripts", "tests").split("\n").filter(Boolean)) inputs[input] = input;
for (const required of ["scripts/render-report.mjs", "assets/report-runtime.js", "assets/report-state.mjs", "assets/report-runtime.css", "assets/report-recipes.mjs", "references/renderer.md"]) {
  if (!inputs[required]) throw new Error(`Missing committed renderer input: ${required}`);
}
if (git("status", "--porcelain", "--untracked-files=all", "--", ".")) throw new Error("Uncommitted skill source; commit the complete snapshot before export.");
for (const input of Object.values(inputs)) {
  git("ls-files", "--error-unmatch", "--", input);
  if (git("status", "--porcelain", "--", input)) throw new Error(`Uncommitted source: ${input}`);
  if (!(await lstat(path.join(skill, input))).isFile()) throw new Error(`Not a regular file: ${input}`);
}
const payloads = await Promise.all(Object.entries(inputs).sort(([a], [b]) => a.localeCompare(b)).map(async ([file, input]) => {
  const bytes = await readFile(path.join(skill, input));
  return { file, input, bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
}));
const manifest = {
  version: 1, generated: true,
  source: { repository: "https://github.com/stark-ai-de/agent-skills", revision: git("rev-parse", "HEAD"), skillPath },
  files: payloads.map(({ file, input, sha256 }) => ({ file, source: path.posix.normalize(`${skillPath}/${input}`), sha256 })),
};
const outputs = [...payloads, { file: "manifest.json", bytes: Buffer.from(JSON.stringify(manifest, null, 2) + "\n") }];
if (!args.includes("--check")) await mkdir(destination, { recursive: true });
for (const { file, bytes } of outputs) {
  const target = path.join(destination, file);
  if (args.includes("--check")) {
    if (!(await lstat(target)).isFile() || !(await readFile(target)).equals(bytes)) throw new Error(`Bundle differs: ${file}`);
  } else {
    await mkdir(path.dirname(target), { recursive: true });
    const parent = await realpath(path.dirname(target));
    const root = await realpath(destination);
    if (parent !== root && !parent.startsWith(root + path.sep)) throw new Error(`Bundle path escapes destination: ${file}`);
    try { if (!(await lstat(target)).isFile()) throw new Error(`Not a regular output: ${file}`); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    await writeFile(target, bytes);
  }
}
console.log(`${outputs.length} files ${args.includes("--check") ? "verified" : "exported"}; ${manifest.source.revision}`);
