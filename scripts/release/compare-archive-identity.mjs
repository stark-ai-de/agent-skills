#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { archiveIdentityErrors } from "../lib/archive-identity.mjs";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const identities = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const file = path.join(root, entry.name, "archive-identity.json");
    if (!fs.existsSync(file)) {
      throw new Error(`missing archive-identity.json in ${entry.name}`);
    }
    return { os: entry.name, report: JSON.parse(fs.readFileSync(file, "utf8")) };
  });
const errors = archiveIdentityErrors(identities);
if (errors.length > 0) {
  console.error("Cross-platform zip-store-v1 identity failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(
  `zip-store-v1 archives are byte-identical across ${identities.map((item) => item.os).join(", ")}.`,
);
