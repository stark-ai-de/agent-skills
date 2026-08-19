import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { readOpenAiListing } from "./lib/openai-projection.mjs";
import { OPENAI_WORKSHEET_PATH, renderOpenAiSubmissionWorksheet } from "./lib/openai-worksheet.mjs";

const root = process.cwd();
const listing = readOpenAiListing(root);
const outputPath = path.join(root, OPENAI_WORKSHEET_PATH);
const expected = renderOpenAiSubmissionWorksheet(listing);

if (process.argv.includes("--check")) {
  try {
    const actual = fs.readFileSync(outputPath, "utf8");
    if (actual !== expected) {
      console.error(`${OPENAI_WORKSHEET_PATH} is out of date`);
      process.exitCode = 1;
    } else {
      console.log(`${OPENAI_WORKSHEET_PATH} is up to date`);
    }
  } catch (error) {
    console.error(`Unable to check ${OPENAI_WORKSHEET_PATH}: ${error.message}`);
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(outputPath, expected, { mode: 0o644 });
  console.log(`Generated ${path.relative(root, outputPath)}`);
}
