import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const STARK_AI_DEVELOPER_LISTING_PATH = "docs/listing/openai/stark-ai-developer.json";

export interface StarkAiDeveloperListing {
  plugin: {
    displayName: string;
    shortDescription: string;
    longDescription: string;
    capabilities: string[];
  };
}

export function getStarkAiDeveloperListing(): StarkAiDeveloperListing {
  const listingPath = path.join(findRepoRoot(), STARK_AI_DEVELOPER_LISTING_PATH);
  const listing = JSON.parse(readFileSync(listingPath, "utf8")) as StarkAiDeveloperListing;
  if (
    typeof listing.plugin?.displayName !== "string" ||
    typeof listing.plugin.shortDescription !== "string" ||
    typeof listing.plugin.longDescription !== "string" ||
    !Array.isArray(listing.plugin.capabilities)
  ) {
    throw new Error(`${STARK_AI_DEVELOPER_LISTING_PATH} is missing required public copy fields`);
  }
  return listing;
}

function findRepoRoot() {
  const cwd = process.cwd();

  if (existsSync(path.join(cwd, "skills")) && existsSync(path.join(cwd, "incubator"))) {
    return cwd;
  }

  return path.resolve(cwd, "..");
}
