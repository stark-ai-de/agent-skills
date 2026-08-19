import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { hashBytes } from "./bundle-contract.mjs";
import {
  assertNoUntrackedReleaseInputs,
  listTrackedBlobs,
  normalizedGitFileMode,
} from "./git-index.mjs";
import { LISTING_PATH } from "./openai-projection.mjs";
import { comparePosixPaths } from "./plugin-projections.mjs";
import { PLUGIN_SOURCE_PATH, PLUGIN_SOURCE_SCHEMA_PATH } from "./release-descriptor.mjs";

export const SOURCE_TREE_INPUTS = [
  PLUGIN_SOURCE_PATH,
  PLUGIN_SOURCE_SCHEMA_PATH,
  "skills",
  "scripts/vendor",
  LISTING_PATH,
  "LICENSE",
  "site/public/icon-512.png",
];

export const SOURCE_TREE_HASH_RECIPE = `For each Git-tracked blob under ${PLUGIN_SOURCE_PATH}, ${PLUGIN_SOURCE_SCHEMA_PATH}, skills/, scripts/vendor/, ${LISTING_PATH}, LICENSE, and site/public/icon-512.png in bytewise lexicographic path order: relative path, NUL, Git-normalized mode 0644 or 0755, NUL, file SHA-256, NUL; then SHA-256. Untracked and ignored files under those roots are rejected.`;

function fileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function sourceTreeEntries(root, { gitRoot = root } = {}) {
  const resolvedRoot = path.resolve(root);
  const resolvedGitRoot = path.resolve(gitRoot);
  assertNoUntrackedReleaseInputs(resolvedGitRoot, SOURCE_TREE_INPUTS);
  return SOURCE_TREE_INPUTS.flatMap((relativeRoot) =>
    listTrackedBlobs(resolvedGitRoot, relativeRoot).map((blob) => {
      const absolute = path.join(resolvedRoot, blob.path.split("/").join(path.sep));
      return {
        path: blob.path,
        mode: normalizedGitFileMode(resolvedGitRoot, blob.path) === 0o755 ? "0755" : "0644",
        sha256: fileSha256(absolute),
      };
    }),
  ).sort((left, right) => comparePosixPaths(left.path, right.path));
}

export function hashReleaseInputRecords(entries) {
  const parts = [];
  for (const entry of entries) {
    const mode = entry.mode === "0755" ? "0755" : "0644";
    parts.push(
      Buffer.from(entry.path, "utf8"),
      Buffer.from([0]),
      Buffer.from(mode, "utf8"),
      Buffer.from([0]),
      Buffer.from(entry.sha256, "utf8"),
      Buffer.from([0]),
    );
  }
  return hashBytes(Buffer.concat(parts));
}

export function sourceTreeSha256(root, options) {
  return hashReleaseInputRecords(sourceTreeEntries(root, options));
}
