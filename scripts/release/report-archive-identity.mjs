#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { pluginIdentity } from "../lib/release-descriptor.mjs";
import { inspectZipStoreV1 } from "../lib/reproducible-archive.mjs";

const root = process.cwd();
const identity = pluginIdentity(root);
const archives = {
  portable: path.join(root, "dist", "agent-plugins", `${identity.name}-${identity.version}.zip`),
  openai: path.join(root, identity.openaiArchive),
};
const report = {
  os: process.platform,
  node: process.version,
  archiveProfile: identity.archiveProfile,
  archives: {},
};
for (const [name, filePath] of Object.entries(archives)) {
  const bytes = fs.readFileSync(filePath);
  inspectZipStoreV1(bytes);
  report.archives[name] = {
    path: path.relative(root, filePath).split(path.sep).join("/"),
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
  };
}
const output = path.join(root, "dist", "archive-identity.json");
fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o755 });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${output}`);
for (const [name, archive] of Object.entries(report.archives)) {
  console.log(`${name}: ${archive.sha256}`);
}
