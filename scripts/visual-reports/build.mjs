// SPDX-License-Identifier: Apache-2.0
// Maintenance-only builder. pnpm owns dependency resolution; Bun bundles for Node.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { load } from "js-yaml";
const root = process.cwd(),
  skill = path.join(root, "skills/engineering-workflows/visual-reports");
const output = path.join(skill, "assets/vendor");
await fs.mkdir(output, { recursive: true });
const result = await Bun.build({
  entrypoints: [path.join(skill, "scripts/lib/generator-entry.mjs")],
  target: "node",
  format: "esm",
  minify: true,
  sourcemap: "none",
  naming: "generator.mjs",
  outdir: output,
});
if (!result.success) throw new Error(result.logs.join("\n"));
const selected = [
  "activity",
  "arrow-right",
  "chart-column",
  "check",
  "circle-question-mark",
  "clock",
  "code",
  "file-text",
  "git-compare",
  "info",
  "layers",
  "search",
  "server",
  "triangle-alert",
  "wallet",
];
const icons = {};
for (const name of selected) {
  const module = await import(`@lucide/icons/icons/${name}`);
  const data = module.default;
  const nodes = Array.isArray(data) ? data : data.node;
  if (!Array.isArray(nodes)) throw new Error(`Unsupported Lucide data: ${name}`);
  icons[name] = nodes
    .map(([tag, props]) => {
      if (!["path", "circle", "line", "polyline", "polygon", "rect", "ellipse"].includes(tag))
        throw new Error("Unsafe icon tag");
      const safe = Object.entries(props)
        .filter(([key]) => key !== "key")
        .map(([key, val]) => {
          if (
            !/^(?:d|cx|cy|r|x|y|x1|y1|x2|y2|width|height|rx|ry|points)$/.test(key) ||
            /["<>&]/.test(String(val))
          )
            throw new Error(`Unsafe icon attribute ${key}`);
          return `${key}="${val}"`;
        });
      return `<${tag} ${safe.join(" ")}/>`;
    })
    .join("");
}
await fs.writeFile(
  path.join(output, "icons.mjs"),
  `// Generated Lucide subset; see NOTICE.txt.\nexport const icons = Object.freeze(${JSON.stringify(icons, null, 2)});\n`,
);
const roots = [
  "beautiful-mermaid",
  "unified",
  "remark-parse",
  "remark-gfm",
  "remark-directive",
  "@lucide/icons",
];
const lock = load(await fs.readFile(path.join(root, "pnpm-lock.yaml"), "utf8"));
const dependencies = new Map(),
  notices = [];
async function visit(name, parent) {
  const require = createRequire(path.join(parent, "package.json"));
  let directory;
  try {
    directory = path.dirname(require.resolve(`${name}/package.json`));
  } catch {
    directory = path.dirname(require.resolve(name));
  }
  while (true) {
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(directory, "package.json"), "utf8"));
      if (pkg.name === name) {
        const id = `${pkg.name}@${pkg.version}`;
        if (dependencies.has(id)) return;
        const files = (await fs.readdir(directory))
          .filter((file) => /^(?:licen[sc]e|copying|notice)(?:[.-]|$)/i.test(file))
          .sort();
        if (!files.length) throw new Error(`Missing license file for ${id}`);
        dependencies.set(id, {
          name: pkg.name,
          version: pkg.version,
          license: pkg.license,
          integrity: lock.packages[id]?.resolution?.integrity,
        });
        for (const file of files)
          if ((await fs.stat(path.join(directory, file))).isFile())
            notices.push(
              `=== ${id} / ${file} ===\n${await fs.readFile(path.join(directory, file), "utf8")}`,
            );
        for (const child of Object.keys(pkg.dependencies ?? {}).sort())
          await visit(child, directory);
        return;
      }
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const next = path.dirname(directory);
    if (next === directory) throw new Error(`Cannot resolve package ${name}`);
    directory = next;
  }
}
for (const name of roots) await visit(name, root);
await fs.writeFile(
  path.join(output, "NOTICE.txt"),
  "Bundled dependencies retain their original licenses. Original report code is Apache-2.0.\n\n" +
    notices.sort().join("\n\n"),
);
const files = {};
for (const name of ["generator.mjs", "icons.mjs", "NOTICE.txt"])
  files[name] = createHash("sha256")
    .update(await fs.readFile(path.join(output, name)))
    .digest("hex");
await fs.writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      builder: `Bun ${Bun.version}`,
      dependencies: [...dependencies.values()].sort((a, b) => a.name.localeCompare(b.name)),
      icons: selected,
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Bundled generator, ${selected.length} icons and ${dependencies.size} dependency notices.`,
);
