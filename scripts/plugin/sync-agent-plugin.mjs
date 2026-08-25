import process from "node:process";
import path from "node:path";

import {
  COMMITTED_MARKETPLACE_PATH,
  syncCommittedMarketplace,
} from "../lib/openai-marketplace.mjs";
import { syncPortableProjection } from "../lib/plugin-projections.mjs";

function parseArgs(argv) {
  const args = new Set(argv);
  const rootIndex = argv.indexOf("--root");
  const targetIndex = argv.indexOf("--target");
  return {
    check: args.has("--check"),
    root: rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]),
    target: targetIndex === -1 ? undefined : argv[targetIndex + 1],
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const projection = syncPortableProjection(options);
  const marketplace = syncCommittedMarketplace({
    root: options.root,
    check: options.check,
  });
  const drift = [...projection.drift, ...marketplace.drift];
  if (drift.length > 0) {
    console.error("Portable Agent Plugin projection drift:");
    for (const item of drift) console.error(`- ${item}`);
    process.exitCode = 1;
  } else if (options.check) {
    console.log(
      `Portable Agent Plugin projection is up to date: ${projection.target}; ${COMMITTED_MARKETPLACE_PATH} matches release policy`,
    );
  } else {
    console.log(`Synchronized portable Agent Plugin projection: ${projection.target}`);
    console.log(
      `Synchronized repository marketplace from release policy: ${COMMITTED_MARKETPLACE_PATH}`,
    );
  }
} catch (error) {
  console.error(`Portable Agent Plugin sync failed: ${error.message}`);
  process.exitCode = 1;
}
