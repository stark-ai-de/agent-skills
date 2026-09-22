import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { scanNetworkSource } from "../lib/network-endpoint-policy.mjs";

import { loadValidatedBundle } from "../lib/bundle-contract.mjs";
import {
  enumerateTree,
  isGeneratedCachePath,
  listTrackedSourceFiles,
} from "../lib/plugin-projections.mjs";
import { pluginIdentity } from "../lib/release-descriptor.mjs";

const CODE_EXTENSIONS = new Set([".cjs", ".js", ".mjs", ".py", ".sh", ".ts"]);
function scanFile(absolute, relative, errors) {
  if (!CODE_EXTENSIONS.has(path.extname(relative))) return;
  errors.push(...scanNetworkSource(fs.readFileSync(absolute, "utf8"), relative));
}

function scanTrackedSkill(root, entry, label, errors) {
  for (const file of listTrackedSourceFiles(root, path.join(root, entry.source), entry.source)) {
    if (isGeneratedCachePath(file.relative)) continue;
    scanFile(file.absolute, `${label}/${file.relative}`, errors);
  }
}

function scanGeneratedTree(root, label, errors) {
  if (!fs.existsSync(root)) return;
  for (const file of enumerateTree(root, "", { excludeGeneratedCaches: true })) {
    scanFile(file.absolute, `${label}/${file.relative}`, errors);
  }
}

try {
  const root = process.cwd();
  const bundle = loadValidatedBundle(root);
  const portableTarget = pluginIdentity(root).portableProjection;
  const errors = [];
  for (const entry of bundle.skills) {
    scanTrackedSkill(root, entry, `canonical/${entry.name}`, errors);
    scanGeneratedTree(
      path.join(root, portableTarget, "skills", entry.name),
      `portable/${entry.name}`,
      errors,
    );
  }

  if (errors.length > 0) {
    console.error("Undeclared network endpoint validation errors:");
    for (const error of [...new Set(errors)]) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Validated declared network endpoints and offline runtime boundaries.");
  }
} catch (error) {
  console.error(`Network endpoint validation failed: ${error.message}`);
  process.exitCode = 1;
}
