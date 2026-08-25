#!/usr/bin/env node
import path from "node:path";
import process from "node:process";

import { verifyOpenAiDirectory } from "../lib/openai-directory.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  return {
    root: rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]),
  };
}

try {
  const { root } = parseArgs(process.argv.slice(2));
  const result = await verifyOpenAiDirectory({ root });
  console.log(
    JSON.stringify(
      {
        pluginId: result.pluginId,
        documentUrl: result.documentUrl,
        catalogUrl: result.catalogUrl,
        categorySlug: result.categorySlug,
        pagesScanned: result.pagesScanned,
        expected: result.expectedIdentity,
        directory: result.directory,
        catalog: result.catalog,
      },
      null,
      2,
    ),
  );
  if (result.errors.length > 0) {
    console.error("ChatGPT directory identity check failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.error(
      "[DIR-001] listing JSON, skill interface, and skills-only invariants match the live ChatGPT directory document.",
    );
    console.error(
      `[DIR-002] plugin is ENABLED in the public ${result.categorySlug} category catalog with installation_policy AVAILABLE.`,
    );
  }
} catch (error) {
  console.error(`ChatGPT directory identity check failed: ${error.message}`);
  process.exitCode = 1;
}
