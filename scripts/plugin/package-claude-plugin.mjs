import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDirectoryArchive,
  validatePortableProjection,
  canonicalJson,
} from "../lib/plugin-projections.mjs";
import { loadValidatedBundle } from "../lib/bundle-contract.mjs";
import { pluginIdentity } from "../lib/release-descriptor.mjs";

const root = process.cwd();
const identity = pluginIdentity(root);
const bundle = loadValidatedBundle(root);
const outputIndex = process.argv.indexOf("--output");
const output =
  outputIndex < 0
    ? path.join(root, "dist/claude", `${identity.name}-${identity.version}.zip`)
    : path.resolve(process.argv[outputIndex + 1]);
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "ssh-claude-package-"));
try {
  const validation = validatePortableProjection({ root });
  if (validation.errors.length) throw new Error(validation.errors.join("\n"));
  const portable = path.join(root, identity.portableProjection);
  fs.mkdirSync(path.join(stage, ".claude-plugin"));
  for (const file of ["skills", "LICENSE"])
    fs.cpSync(path.join(portable, file), path.join(stage, file), { recursive: true });
  const selected = bundle.mcp?.filter((mcp) => mcp.targets.includes("claude")) ?? [];
  if (selected.length) {
    fs.cpSync(path.join(portable, "runtime"), path.join(stage, "runtime"), { recursive: true });
    fs.writeFileSync(
      path.join(stage, ".mcp.json"),
      canonicalJson({
        mcpServers: {
          "ssh-management": { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/runtime/mcp.mjs"] },
        },
      }),
    );
  }
  fs.writeFileSync(
    path.join(stage, ".claude-plugin/plugin.json"),
    canonicalJson({
      name: identity.name,
      version: identity.version,
      description:
        "Developer skills and local SSH management with explicit target trust and capabilities.",
      skills: "./skills/",
      ...(selected.length ? { mcpServers: "./.mcp.json" } : {}),
    }),
  );
  fs.writeFileSync(
    path.join(stage, "SOURCE-MANIFEST.json"),
    canonicalJson({
      schemaVersion: 1,
      projection: "claude",
      plugin: { id: identity.name, version: identity.version },
      mcp: selected,
    }),
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(stage, ".claude-plugin/plugin.json"), "utf8"),
  );
  if (
    manifest.skills !== "./skills/" ||
    fs.existsSync(path.join(stage, "plugin.json")) ||
    fs.existsSync(path.join(stage, ".codex-plugin"))
  )
    throw new Error("Claude-native projection boundary is invalid.");
  const archive = createDirectoryArchive({ sourceRoot: stage, output });
  console.log(`Packaged Claude-native plugin: ${archive.output}\nSHA-256: ${archive.sha256}`);
} catch (error) {
  console.error(`Claude plugin packaging failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
