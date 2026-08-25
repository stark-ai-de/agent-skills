import path from "node:path";
import process from "node:process";

import {
  createDirectoryArchive,
  PORTABLE_TARGET,
  validatePortableProjection,
} from "../lib/plugin-projections.mjs";
import { pluginIdentity } from "../lib/release-descriptor.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const outputIndex = argv.indexOf("--output");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  const identity = pluginIdentity(root);
  return {
    root,
    output:
      outputIndex === -1
        ? path.join(root, "dist", "agent-plugins", `${identity.name}-${identity.version}.zip`)
        : path.resolve(argv[outputIndex + 1]),
  };
}

try {
  const { root, output } = parseArgs(process.argv.slice(2));
  const validation = validatePortableProjection({ root, target: PORTABLE_TARGET });
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join("\n"));
  }
  const sourceRoot = path.join(root, PORTABLE_TARGET);
  const result = createDirectoryArchive({
    sourceRoot,
    output,
    archiveRoot: "",
  });
  console.log(`Packaged portable Agent Plugin: ${result.output}`);
  console.log(`SHA-256: ${result.sha256}`);
  console.log(`Bytes: ${result.bytes}`);
} catch (error) {
  console.error(`Portable Agent Plugin packaging failed: ${error.message}`);
  process.exitCode = 1;
}
