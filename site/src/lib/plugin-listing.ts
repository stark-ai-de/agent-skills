import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CatalogSkill } from "./skills";

export const STARK_AI_DEVELOPER_LISTING_PATH = "docs/listing/openai/stark-ai-developer.json";

export interface StarkAiDeveloperListing {
  plugin: {
    name: string;
    version: string;
    displayName: string;
    shortDescription: string;
    longDescription: string;
    developerName: string;
    capabilities: string[];
    starterPrompts: string[];
  };
  skills: Array<{
    name: string;
    intent: string;
  }>;
}

export function getStarkAiDeveloperListing(): StarkAiDeveloperListing {
  const listingPath = path.join(findRepoRoot(), STARK_AI_DEVELOPER_LISTING_PATH);
  const listing = JSON.parse(readFileSync(listingPath, "utf8")) as StarkAiDeveloperListing;
  if (
    typeof listing.plugin?.name !== "string" ||
    typeof listing.plugin.version !== "string" ||
    typeof listing.plugin.displayName !== "string" ||
    typeof listing.plugin.shortDescription !== "string" ||
    typeof listing.plugin.longDescription !== "string" ||
    typeof listing.plugin.developerName !== "string" ||
    !Array.isArray(listing.plugin.capabilities) ||
    !Array.isArray(listing.plugin.starterPrompts) ||
    !Array.isArray(listing.skills) ||
    listing.skills.some(
      (skill) => typeof skill?.name !== "string" || typeof skill.intent !== "string",
    )
  ) {
    throw new Error(`${STARK_AI_DEVELOPER_LISTING_PATH} is missing required public copy fields`);
  }
  return listing;
}

export function resolvePluginCatalogSkills(
  listing: StarkAiDeveloperListing,
  publicSkills: CatalogSkill[],
): CatalogSkill[] {
  return listing.skills.map((entry) => {
    const skill = publicSkills.find((item) => item.name === entry.name);
    if (!skill) {
      throw new Error(
        `${STARK_AI_DEVELOPER_LISTING_PATH}: skill ${entry.name} is missing from the public catalog`,
      );
    }
    return skill;
  });
}

export const PLUGIN_MARKETPLACE_SOURCE = "stark-ai-de/agent-skills";

export function pluginMarketplaceAddCommand() {
  return `codex plugin marketplace add ${PLUGIN_MARKETPLACE_SOURCE}`;
}

export function pluginAddCommand(listing: StarkAiDeveloperListing) {
  return `codex plugin add ${listing.plugin.name}`;
}

export function standaloneSkillsInstallCommand(listing: StarkAiDeveloperListing) {
  const skillNames = listing.skills.map((skill) => skill.name).join(" ");
  return `npx skills@latest add ${PLUGIN_MARKETPLACE_SOURCE} --skill ${skillNames}`;
}

function findRepoRoot() {
  const cwd = process.cwd();

  if (existsSync(path.join(cwd, "skills")) && existsSync(path.join(cwd, "incubator"))) {
    return cwd;
  }

  return path.resolve(cwd, "..");
}
