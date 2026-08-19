import path from "node:path";
import process from "node:process";

import { RETIRED_OPENAI_ADAPTER_TARGET } from "./lib/plugin-projections.mjs";
import { syncOpenAiProjection } from "./lib/openai-projection.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const targetIndex = argv.indexOf("--target");
  return {
    check: argv.includes("--check"),
    root: rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]),
    target: targetIndex === -1 ? undefined : argv[targetIndex + 1],
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (!options.target) {
    console.error(
      `The OpenAI adapter is not a committed tree (${RETIRED_OPENAI_ADAPTER_TARGET} is retired). Use:`,
    );
    console.error("  npm run validate:openai-plugin");
    console.error("  npm run package:openai-plugin");
    process.exitCode = 1;
  } else {
    const result = syncOpenAiProjection(options);
    if (result.drift.length > 0) {
      console.error("OpenAI adapter projection drift:");
      for (const drift of result.drift) console.error(`- ${drift}`);
      process.exitCode = 1;
    } else {
      console.log(
        `${options.check ? "OpenAI adapter projection is up to date" : "Synchronized OpenAI adapter projection"}: ${result.target}`,
      );
    }
  }
} catch (error) {
  console.error(`OpenAI adapter sync failed: ${error.message}`);
  process.exitCode = 1;
}
