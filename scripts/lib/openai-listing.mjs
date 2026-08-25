import fs from "node:fs";
import path from "node:path";

import { pluginArtifactPaths, pluginIdentity } from "./release-descriptor.mjs";

export function listingPath(root) {
  return pluginArtifactPaths(root).listing;
}

export const LISTING_PATH = listingPath();

export function readOpenAiListing(root) {
  const listing = JSON.parse(fs.readFileSync(path.join(root, listingPath(root)), "utf8"));
  const identity = pluginIdentity(root);
  if (listing.plugin?.name !== identity.name || listing.plugin?.version !== identity.version) {
    throw new Error("listing source plugin identity does not match the release descriptor");
  }
  return listing;
}
