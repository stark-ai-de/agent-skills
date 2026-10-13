import path from "node:path";
import process from "node:process";
import {
  claudeArchivePath,
  validateClaudeProjection,
  withClaudeStage,
} from "../lib/claude-projection.mjs";
import { createDirectoryArchive } from "../lib/plugin-projections.mjs";

try {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf("--root");
  const outputIndex = args.indexOf("--output");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(args[rootIndex + 1]);
  const output = outputIndex === -1 ? claudeArchivePath(root) : path.resolve(args[outputIndex + 1]);
  const result = withClaudeStage(root, ({ stage }) => {
    const validation = validateClaudeProjection({ root, targetRoot: stage });
    if (validation.errors.length) throw new Error(validation.errors.join("\n"));
    return createDirectoryArchive({ sourceRoot: stage, output });
  });
  console.log(`Packaged Claude plugin: ${result.output}`);
  console.log(`SHA-256: ${result.sha256}`);
  console.log(`Bytes: ${result.bytes}`);
} catch (error) {
  console.error(`Claude plugin packaging failed: ${error.message}`);
  process.exitCode = 1;
}
