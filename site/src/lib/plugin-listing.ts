import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CatalogSkill } from "./skills";
import {
  githubRepositorySlug,
  listingArtifactPaths,
} from "../../../scripts/lib/listing-identity.mjs";

const PLUGIN_SOURCE_PATH = "plugins/stark-ai-developer.source.json";

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
    urls: {
      website: string;
      chatgptPlugin: string;
    };
  };
  skills: Array<{
    name: string;
    intent: string;
  }>;
}

function requireGithubRepositorySlug(packageJson: {
  repository?: string | { url?: string };
}): string {
  const slug = githubRepositorySlug(packageJson.repository);
  if (!slug) {
    throw new Error("package.json repository must be a GitHub URL");
  }
  return slug;
}

export function getListingSourcePath(repoRoot: string): string {
  const source = JSON.parse(readFileSync(path.join(repoRoot, PLUGIN_SOURCE_PATH), "utf8")) as {
    pluginId?: string;
    displayName?: string;
    listingId?: string;
    outputs?: { portableProjection?: string };
  };
  if (
    typeof source.pluginId !== "string" ||
    typeof source.displayName !== "string" ||
    typeof source.listingId !== "string" ||
    typeof source.outputs?.portableProjection !== "string"
  ) {
    throw new Error(`${PLUGIN_SOURCE_PATH} is missing listing identity fields`);
  }
  return listingArtifactPaths(source).listing;
}

export function getStarkAiDeveloperListing(): StarkAiDeveloperListing {
  const repoRoot = findRepoRoot();
  const listingRelative = getListingSourcePath(repoRoot);
  const listingPath = path.join(repoRoot, listingRelative);
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
    typeof listing.plugin.urls?.website !== "string" ||
    typeof listing.plugin.urls?.chatgptPlugin !== "string" ||
    !listing.plugin.urls.chatgptPlugin.startsWith("https://chatgpt.com/plugins/") ||
    !Array.isArray(listing.skills) ||
    listing.skills.some(
      (skill) => typeof skill?.name !== "string" || typeof skill.intent !== "string",
    )
  ) {
    throw new Error(`${listingRelative} is missing required public copy fields`);
  }
  return listing;
}

export function resolvePluginCatalogSkills(
  listing: StarkAiDeveloperListing,
  publicSkills: CatalogSkill[],
): CatalogSkill[] {
  const listingRelative = getListingSourcePath(findRepoRoot());
  return listing.skills.map((entry) => {
    const skill = publicSkills.find((item) => item.name === entry.name);
    if (!skill) {
      throw new Error(`${listingRelative}: skill ${entry.name} is missing from the public catalog`);
    }
    return skill;
  });
}

export function pluginMarketplaceSource(repoRoot = findRepoRoot()): string {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
    repository?: string | { url?: string };
  };
  return requireGithubRepositorySlug(packageJson);
}

export const PLUGIN_MARKETPLACE_SOURCE = pluginMarketplaceSource();

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
