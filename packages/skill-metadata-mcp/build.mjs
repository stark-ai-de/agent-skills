import fs from "node:fs";
import { buildInputDigest, digest } from "../../scripts/lib/metadata-mcp-build.mjs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];
if (!["http", "stdio"].includes(mode)) throw new Error("Expected build mode http or stdio");
const child = spawnSync(
  "bun",
  [
    "build",
    `src/${mode}.mjs`,
    "--target=node",
    `--outfile=dist/${mode === "stdio" ? "index" : "http"}.mjs`,
  ],
  { cwd: root, stdio: "inherit" },
);
if (child.error || child.status !== 0) throw new Error("MCP bundle build failed");
// Retain notices for the pinned dependency closure; no startup installation.
const seen = new Set();
const notices = [];
function visit(directory) {
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  const key = `${pkg.name}@${pkg.version}`;
  if (seen.has(key)) return;
  seen.add(key);
  notices.push(`\n===== ${key} (${pkg.license ?? "SEE LICENSE"}) =====\n`);
  for (const file of fs.readdirSync(directory).sort())
    if (
      /^(?:licen[cs]e|notice)(?:\..*)?$/i.test(file) &&
      fs.statSync(path.join(directory, file)).isFile()
    )
      notices.push(fs.readFileSync(path.join(directory, file), "utf8"));
  const require = createRequire(path.join(directory, "package.json"));
  for (const name of Object.keys(pkg.dependencies ?? {}).sort()) {
    let entry = require.resolve(name);
    let dependency = path.dirname(entry);
    while (
      !fs.existsSync(path.join(dependency, "package.json")) ||
      JSON.parse(fs.readFileSync(path.join(dependency, "package.json"), "utf8")).name !== name
    ) {
      const parent = path.dirname(dependency);
      if (parent === dependency) throw new Error(`Cannot locate dependency notice: ${name}`);
      dependency = parent;
    }
    visit(dependency);
  }
}
visit(root);
fs.writeFileSync(path.join(root, "dist/THIRD-PARTY-NOTICES.txt"), notices.join("\n"));

const output = mode === "stdio" ? "index.mjs" : "http.mjs";
fs.writeFileSync(
  path.join(root, `dist/BUILD-MANIFEST-${mode}.json`),
  JSON.stringify(
    {
      schemaVersion: 1,
      inputDigest: buildInputDigest(root),
      output,
      sha256: digest(fs.readFileSync(path.join(root, "dist", output))),
      noticesSha256: digest(fs.readFileSync(path.join(root, "dist/THIRD-PARTY-NOTICES.txt"))),
    },
    null,
    2,
  ) + "\n",
);
