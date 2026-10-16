import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
export const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export function buildInputDigest(root) {
  const files = ["package.json", "build.mjs"];
  function walk(prefix) {
    for (const entry of fs
      .readdirSync(path.join(root, prefix), { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (entry.isSymbolicLink()) throw new Error("MCP build inputs must not be symlinks");
      const relative = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(relative);
      else if (entry.isFile()) files.push(relative);
      else throw new Error("MCP build inputs must be regular files");
    }
  }
  walk("src");
  walk("rules");
  files.push(
    "../../scripts/lib/metadata-mcp-build.mjs",
    "../../pnpm-lock.yaml",
    "../../scripts/vendor/agent-plugins/1.0.0/plugin.schema.json",
  );
  return digest(
    JSON.stringify(
      files.sort().map((file) => [file, digest(fs.readFileSync(path.join(root, file)))]),
    ),
  );
}
