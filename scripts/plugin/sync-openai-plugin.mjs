import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { RETIRED_OPENAI_ADAPTER_TARGET } from "../lib/plugin-projections.mjs";
import { syncOpenAiProjection } from "../lib/openai-projection.mjs";

function writeStderr(lines) {
  fs.writeSync(process.stderr.fd, `${lines.join("\n")}\n`);
}

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
    writeStderr([
      `The OpenAI adapter is not a committed tree (${RETIRED_OPENAI_ADAPTER_TARGET} is retired). Use:`,
      "  pnpm run validate:openai-plugin",
      "  pnpm run package:openai-plugin",
    ]);
    process.exitCode = 1;
  } else {
    const result = syncOpenAiProjection(options);
    if (result.drift.length > 0) {
      writeStderr([
        "OpenAI adapter projection drift:",
        ...result.drift.map((drift) => `- ${drift}`),
      ]);
      process.exitCode = 1;
    } else {
      console.log(
        `${options.check ? "OpenAI adapter projection is up to date" : "Synchronized OpenAI adapter projection"}: ${result.target}`,
      );
    }
  }
} catch (error) {
  writeStderr([`OpenAI adapter sync failed: ${error.message}`]);
  process.exitCode = 1;
}
