import path from "node:path";
import process from "node:process";

import { pluginIdentity } from "./lib/release-descriptor.mjs";
import { validateMarketplaceDocument } from "./lib/openai-marketplace.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const fileIndex = argv.indexOf("--file");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  return {
    root,
    file:
      fileIndex === -1
        ? path.join(root, ".agents", "plugins", "marketplace.json")
        : path.resolve(argv[fileIndex + 1]),
  };
}

try {
  const { root, file } = parseArgs(process.argv.slice(2));
  const identity = pluginIdentity(root);
  const { errors } = validateMarketplaceDocument({
    root,
    file,
    expectedSource: identity.marketplaceTarget,
  });
  if (errors.length > 0) {
    console.error("OpenAI marketplace validation errors:");
    for (const error of [...new Set(errors)]) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Repository-local OpenAI marketplace is valid.");
  }
} catch (error) {
  console.error(`OpenAI marketplace validation failed: ${error.message}`);
  process.exitCode = 1;
}
