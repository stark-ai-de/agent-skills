import process from "node:process";
import path from "node:path";

import { validatePortableProjection } from "../lib/plugin-projections.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const targetIndex = argv.indexOf("--target");
  return {
    root: rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]),
    target: targetIndex === -1 ? undefined : argv[targetIndex + 1],
  };
}

try {
  const result = validatePortableProjection(parseArgs(process.argv.slice(2)));
  if (result.errors.length > 0) {
    console.error("Portable Agent Plugin validation errors:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Portable Agent Plugin projection is valid.");
  }
} catch (error) {
  console.error(`Portable Agent Plugin validation failed: ${error.message}`);
  process.exitCode = 1;
}
