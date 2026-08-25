import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { loadValidatedBundle } from "../lib/bundle-contract.mjs";
import {
  enumerateTree,
  isGeneratedCachePath,
  listTrackedSourceFiles,
} from "../lib/plugin-projections.mjs";
import { pluginIdentity } from "../lib/release-descriptor.mjs";

const CODE_EXTENSIONS = new Set([".cjs", ".js", ".mjs", ".py", ".sh", ".ts"]);
const NETWORK_CALL_PATTERNS = [
  /\b(?:fetch|axios|got|request)\s*\(/,
  /\b(?:http|https)\.request\s*\(/,
  /\bnew\s+WebSocket\s*\(/,
  /\b(?:dns|net|tls)\.(?:connect|createConnection|lookup)\s*\(/,
  /\b(?:curl|wget)\s+/,
];
const DECLARED_ENDPOINT_PREFIXES = [
  "http://www.w3.org/",
  "https://www.w3.org/",
  "https://app.diagrams.net/",
  "https://mcp.draw.io/mcp",
];
const ENDPOINT_PATTERN = /https?:\/\/[^\s"'`<>()[\]{}]+/gi;

function endpointIsDeclared(endpoint) {
  return DECLARED_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

function scanFile(absolute, relative, errors) {
  if (!CODE_EXTENSIONS.has(path.extname(relative))) return;
  const text = fs.readFileSync(absolute, "utf8");
  for (const pattern of NETWORK_CALL_PATTERNS) {
    if (pattern.test(text)) {
      errors.push(`${relative} contains an undeclared network API: ${pattern}`);
    }
    pattern.lastIndex = 0;
  }
  for (const match of text.matchAll(ENDPOINT_PATTERN)) {
    const endpoint = match[0].replace(/[),.;:]+$/, "");
    if (!endpointIsDeclared(endpoint)) {
      errors.push(`${relative} contains an undeclared network endpoint: ${endpoint}`);
    }
  }
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
