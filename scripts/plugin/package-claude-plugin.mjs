import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDirectoryArchive,
  validatePortableProjection,
  writeClaudeStage,
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
  writeClaudeStage({ root, stage, bundle });
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
