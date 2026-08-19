import fs from "node:fs";
import path from "node:path";

import { pluginIdentity } from "./release-descriptor.mjs";

export const LISTING_PATH = "docs/listing/openai/stark-ai-developer.json";

export function readOpenAiListing(root) {
  const listing = JSON.parse(fs.readFileSync(path.join(root, LISTING_PATH), "utf8"));
  const identity = pluginIdentity(root);
  if (listing.plugin?.name !== identity.name || listing.plugin?.version !== identity.version) {
    throw new Error("listing source plugin identity does not match the release descriptor");
  }
  return listing;
}
