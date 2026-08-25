import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { readOpenAiListing } from "../lib/openai-projection.mjs";
import { renderOpenAiSubmissionWorksheet } from "../lib/openai-worksheet.mjs";
import { pluginArtifactPaths } from "../lib/release-descriptor.mjs";

const root = process.cwd();
const listing = readOpenAiListing(root);
const paths = pluginArtifactPaths(root);
const outputPath = path.join(root, paths.worksheet);
const expected = renderOpenAiSubmissionWorksheet(listing, paths);

if (process.argv.includes("--check")) {
  try {
    const actual = fs.readFileSync(outputPath, "utf8");
    if (actual !== expected) {
      console.error(`${paths.worksheet} is out of date`);
      process.exitCode = 1;
    } else {
      console.log(`${paths.worksheet} is up to date`);
    }
  } catch (error) {
    console.error(`Unable to check ${paths.worksheet}: ${error.message}`);
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(outputPath, expected, { mode: 0o644 });
  console.log(`Generated ${path.relative(root, outputPath)}`);
}
