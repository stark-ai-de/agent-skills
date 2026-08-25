#!/usr/bin/env node
import process from "node:process";

import { validateContractSnapshots } from "../lib/contract-snapshots.mjs";

const rootIndex = process.argv.indexOf("--root");
const root = rootIndex === -1 ? process.cwd() : process.argv[rootIndex + 1];

const errors = validateContractSnapshots(root);
if (errors.length > 0) {
  console.error("Contract snapshot validation errors:");
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Contract snapshots are valid.");
}
