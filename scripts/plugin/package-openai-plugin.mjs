import path from "node:path";
import process from "node:process";

import { createDirectoryArchive } from "../lib/plugin-projections.mjs";
import { validateOpenAiListing } from "../lib/openai-contract.mjs";
import { validateOpenAiProjection, withOpenAiStage } from "../lib/openai-projection.mjs";
import { pluginIdentity } from "../lib/release-descriptor.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const outputIndex = argv.indexOf("--output");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  return {
    root,
    output:
      outputIndex === -1
        ? path.join(root, pluginIdentity(root).openaiArchive)
        : path.resolve(argv[outputIndex + 1]),
  };
}

try {
  const { root, output } = parseArgs(process.argv.slice(2));
  const listingValidation = validateOpenAiListing(root);
  if (listingValidation.errors.length > 0) {
    throw new Error(listingValidation.errors.join("\n"));
  }
  const result = withOpenAiStage(root, (staged) => {
    const validation = validateOpenAiProjection({
      root,
      targetRoot: staged.stage,
      bundle: staged.bundle,
      listing: staged.listing,
    });
    if (validation.errors.length > 0) {
      throw new Error(validation.errors.join("\n"));
    }
    return createDirectoryArchive({
      sourceRoot: staged.stage,
      output,
      archiveRoot: "",
    });
  });
  console.log(`Packaged OpenAI skills-only archive: ${result.output}`);
  console.log(`SHA-256: ${result.sha256}`);
  console.log(`Bytes: ${result.bytes}`);
} catch (error) {
  console.error(`OpenAI plugin packaging failed: ${error.message}`);
  process.exitCode = 1;
}
