import path from "node:path";
import process from "node:process";

import { validateOpenAiListing } from "./lib/openai-contract.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  return {
    root: rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]),
  };
}

try {
  const result = validateOpenAiListing(parseArgs(process.argv.slice(2)).root);
  if (result.errors.length > 0) {
    console.error("OpenAI listing validation errors:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("OpenAI listing source is valid.");
  }
} catch (error) {
  console.error(`OpenAI listing validation failed: ${error.message}`);
  process.exitCode = 1;
}
