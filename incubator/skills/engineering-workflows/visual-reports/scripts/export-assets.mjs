import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", ["-C", skill, ...args], { encoding: "utf8" }).trim();
const args = process.argv.slice(2);
const destinationIndex = args.indexOf("--destination");
if (destinationIndex < 0 || !args[destinationIndex + 1]) {
  throw new Error("Usage: node scripts/export-assets.mjs --destination <directory> [--check]");
}
const destination = path.resolve(args[destinationIndex + 1]);
const repo = git("rev-parse", "--show-toplevel");
const skillPath = path.relative(repo, skill).split(path.sep).join("/");
if (destination === repo || destination.startsWith(repo + path.sep)) {
  throw new Error("Export into a consumer directory outside the skill source repository.");
}
const inputs = {
  "configurator.mjs": "assets/graphite-grain/configurator.mjs",
  "configurator.html": "assets/graphite-grain/configurator.html",
  "relaxed.css": "assets/graphite-grain/relaxed.css",
  "cache_icon.py": "scripts/cache_icon.py",
  "LICENSE.txt": path.relative(skill, path.join(repo, "LICENSE")),
};
// A revision is meaningful only when the exported sources match that commit.
for (const input of [...Object.values(inputs), "references/report-contract.md"]) {
  git("ls-files", "--error-unmatch", "--", input);
  if (git("status", "--porcelain", "--", input)) throw new Error(`Uncommitted source: ${input}`);
}
const payloads = await Promise.all(
  Object.entries(inputs).map(async ([file, input]) => {
    const bytes = await readFile(path.join(skill, input));
    return { file, input, bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
  }),
);
const manifest = {
  version: 1,
  generated: true,
  source: {
    repository: "https://github.com/stark-ai-de/agent-skills",
    revision: git("rev-parse", "HEAD"),
    skillPath,
  },
  files: payloads.map(({ file, input, sha256 }) => ({
    file,
    source: path.posix.normalize(`${skillPath}/${input}`),
    sha256,
  })),
};
const outputs = [
  ...payloads,
  {
    file: "manifest.json",
    bytes: Buffer.from(JSON.stringify(manifest, null, 2) + "\n"),
  },
];
if (!args.includes("--check")) await mkdir(destination, { recursive: true });
for (const { file, bytes } of outputs) {
  const target = path.join(destination, file);
  if (args.includes("--check")) {
    if (!(await readFile(target)).equals(bytes)) throw new Error(`Bundle differs: ${file}`);
  } else await writeFile(target, bytes);
}
console.log(
  `${outputs.length} files ${args.includes("--check") ? "verified" : "exported"}; ${manifest.source.revision}`,
);
