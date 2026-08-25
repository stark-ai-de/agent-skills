import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  comparePosixPaths,
  createStandaloneArchive,
  STANDALONE_TARGET,
} from "../lib/plugin-projections.mjs";
import { loadValidatedBundle } from "../lib/bundle-contract.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const outputIndex = argv.indexOf("--output");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  return {
    root,
    output: outputIndex === -1 ? STANDALONE_TARGET : argv[outputIndex + 1],
  };
}

try {
  const { root, output } = parseArgs(process.argv.slice(2));
  const bundle = loadValidatedBundle(root);
  const outputRoot = path.resolve(root, output);
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o755 });
  const checksums = [];
  for (const entry of bundle.skills) {
    const result = createStandaloneArchive({
      root,
      entry,
      output: path.join(outputRoot, `${entry.name}.zip`),
    });
    checksums.push(`${result.sha256}  ${entry.name}.zip`);
  }
  checksums.sort(comparePosixPaths);
  const checksumPath = path.join(outputRoot, "SHA256SUMS");
  const temporary = `${checksumPath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${checksums.join("\n")}\n`, { mode: 0o644 });
  fs.renameSync(temporary, checksumPath);
  console.log(`Packaged ${bundle.skills.length} standalone skill archive(s) in ${outputRoot}`);
  console.log(`Checksums: ${checksumPath}`);
} catch (error) {
  console.error(`Standalone skill packaging failed: ${error.message}`);
  process.exitCode = 1;
}
