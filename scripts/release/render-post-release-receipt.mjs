#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { renderReceipt } from "../lib/post-release-receipt-renderer.mjs";

function parseArgs(argv) {
  const argument = (name) => {
    const index = argv.indexOf(name);
    const value = index === -1 ? null : (argv[index + 1] ?? null);
    return value && !value.startsWith("--") ? value : null;
  };
  const fileValue = argument("--file");
  const githubOutputValue = argument("--github-output");
  return {
    render: argument("--render"),
    file: fileValue ? path.resolve(fileValue) : null,
    githubOutput: githubOutputValue ? path.resolve(githubOutputValue) : null,
  };
}

function writeGithubOutput(filePath, receipt) {
  if (!filePath) return;
  const counts = receipt.tests?.counts ?? {};
  fs.appendFileSync(
    filePath,
    [
      `status=${receipt.status}`,
      `passed=${counts.passed ?? 0}`,
      `blocked=${counts.blocked ?? 0}`,
      `not_run=${counts.notRun ?? 0}`,
      `not_applicable=${counts.notApplicable ?? 0}`,
    ].join("\n") + "\n",
  );
}

const { render, file, githubOutput } = parseArgs(process.argv.slice(2));
if (!render || !file) {
  console.error(
    "Usage: bun --bun scripts/release/render-post-release-receipt.mjs --render <kind> --file <receipt.json> [--github-output <path>]",
  );
  process.exitCode = 1;
} else {
  try {
    const receipt = renderReceipt(render);
    fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`);
    writeGithubOutput(githubOutput, receipt);
    console.log(`Rendered post-release receipt: ${file}`);
  } catch (error) {
    console.error(`Post-release receipt rendering failed: ${error.message}`);
    process.exitCode = 1;
  }
}
