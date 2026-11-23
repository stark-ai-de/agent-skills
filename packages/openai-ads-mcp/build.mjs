import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));

/** Deterministic native ESM staging, without environment secrets, database access or DDL. */
export function buildRuntime(root = packageRoot) {
  const output = join(root, "dist");
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  cpSync(join(root, "src"), join(output, "src"), { recursive: true });
  cpSync(join(root, "package.json"), join(output, "package.json"));
  mkdirSync(join(output, "references"), { recursive: true });
  cpSync(
    join(root, "references/advertiser-contract.json"),
    join(output, "references/advertiser-contract.json"),
  );
  mkdirSync(join(output, "migrations"), { recursive: true });
  for (const name of readdirSync(join(root, "migrations")).sort()) {
    if (!/^\d+_[a-z0-9_]+\.sql$/.test(name)) continue;
    cpSync(join(root, "migrations", name), join(output, "migrations", name));
  }
  const files = {};
  function record(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) record(file);
      else if (entry.isFile())
        files[relative(output, file)] = createHash("sha256")
          .update(readFileSync(file))
          .digest("hex");
      else throw new Error("Runtime staging contains an unsupported file type.");
    }
  }
  record(output);
  writeFileSync(
    join(output, "BUILD-MANIFEST.json"),
    `${JSON.stringify({ schemaVersion: 1, files }, null, 2)}\n`,
  );
  // Vercel's Other preset requires a nonempty public directory. Live routes are
  // explicitly rewritten to the function; no configuration or secrets are static.
  mkdirSync(join(root, "public"), { recursive: true });
  writeFileSync(join(root, "public/service.txt"), "stark AI Ads MCP. Service status: /health\n");
  return { output, files };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildRuntime();
  console.log("stark AI Ads native runtime staged with its pinned contract and migration ledger.");
}
