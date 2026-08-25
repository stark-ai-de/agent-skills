import path from "node:path";
import process from "node:process";

import { compareTrees } from "../lib/plugin-projections.mjs";
import { validateOpenAiListing } from "../lib/openai-contract.mjs";
import {
  assertWritableOpenAiTarget,
  readOpenAiListing,
  validateOpenAiProjection,
  withOpenAiStage,
} from "../lib/openai-projection.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const targetIndex = argv.indexOf("--target");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  return {
    root,
    target: targetIndex === -1 ? undefined : path.resolve(root, argv[targetIndex + 1]),
  };
}

try {
  const { root, target } = parseArgs(process.argv.slice(2));
  if (target) assertWritableOpenAiTarget(root, target);
  const listingResult = validateOpenAiListing(root);
  const errors = [...listingResult.errors];
  const listing = listingResult.listing ?? readOpenAiListing(root);
  const bundle = listingResult.bundle;
  withOpenAiStage(root, (staged) => {
    const targetRoot = target ?? staged.stage;
    const validation = validateOpenAiProjection({
      root,
      targetRoot,
      bundle,
      listing,
    });
    errors.push(...validation.errors);
    if (target) {
      errors.push(
        ...compareTrees(staged.stage, target).map((item) => `OpenAI adapter drift: ${item}`),
      );
    }
  });

  if (errors.length > 0) {
    console.error("OpenAI adapter validation errors:");
    for (const error of [...new Set(errors)]) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      target
        ? "OpenAI adapter projection is valid."
        : "Ephemeral OpenAI adapter projection is valid.",
    );
  }
} catch (error) {
  console.error(`OpenAI adapter validation failed: ${error.message}`);
  process.exitCode = 1;
}
