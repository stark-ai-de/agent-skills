import path from "node:path";
import process from "node:process";
import { claudeArchivePath, validateClaudeArchive } from "../lib/claude-projection.mjs";

try {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf("--root");
  const archiveIndex = args.indexOf("--archive");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(args[rootIndex + 1]);
  const archive =
    archiveIndex === -1 ? claudeArchivePath(root) : path.resolve(args[archiveIndex + 1]);
  const { errors } = validateClaudeArchive({ root, archive });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Validated Claude archive offline: ${archive}`);
  console.log("Native claude plugin validate remains a manual merge acceptance gate.");
} catch (error) {
  console.error(`Claude archive validation failed: ${error.message}`);
  process.exitCode = 1;
}
