import fs from "node:fs";
import path from "node:path";

import { load as parseYaml } from "js-yaml";

import { loadValidatedBundle } from "./bundle-contract.mjs";
import { readOpenAiListing } from "./openai-listing.mjs";

export const CHATGPT_PLUGIN_URL_PATTERN = /^https:\/\/chatgpt\.com\/plugins\/(plugins_[0-9a-f]+)$/;
export const CHATGPT_DIRECTORY_DOCUMENT_PREFIX = "https://chatgpt.com/backend-api/ps/plugins/";
export const CHATGPT_CATEGORY_CATALOG_PREFIX =
  "https://chatgpt.com/backend-api/ps/plugin-categories/";
export const DIRECTORY_FETCH_TIMEOUT_MS = 20_000;
// The unofficial category catalog returns Cloudflare HTML 403 to a custom
// User-Agent. DIR-001 accepts a custom UA; DIR-002 does not. Use one browser
// UA for both GET-only checks.
export const DIRECTORY_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
export const CATEGORY_CATALOG_PAGE_LIMIT = 50;
export const CATEGORY_CATALOG_MAX_PAGES = 20;
export const EXPECTED_CATEGORY_INSTALLATION_POLICY = "AVAILABLE";
export const PORTAL_GLYPHS = [
  "default",
  "bolt",
  "chart",
  "chat",
  "code",
  "cursor",
  "heart",
  "hierarchy",
  "pdf",
  "pen",
  "radar",
  "search",
];

const FRONTMATTER_PATTERN = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const PLUGIN_FIELDS = [
  "name",
  "version",
  "displayName",
  "developerName",
  "category",
  "capabilities",
  "starterPrompts",
  "websiteURL",
  "privacyPolicyURL",
  "termsOfServiceURL",
  "brandColor",
];
const SKILL_FIELDS = [
  "name",
  "description",
  "displayName",
  "shortDescription",
  "defaultPrompt",
  "portalGlyph",
];

function asString(value) {
  return typeof value === "string" ? value : undefined;
}

function normalizeHexColor(value) {
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

function formatValue(value) {
  return JSON.stringify(value);
}

function isEmptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}

function readSkillDescription(skillRoot) {
  const skillFile = path.join(skillRoot, "SKILL.md");
  const content = fs.readFileSync(skillFile, "utf8");
  const frontmatter = content.match(FRONTMATTER_PATTERN);
  if (!frontmatter) {
    throw new Error("SKILL.md is missing YAML frontmatter");
  }
  const metadata = parseYaml(frontmatter[1]);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("SKILL.md frontmatter must be a mapping");
  }
  if (typeof metadata.description !== "string" || !metadata.description.trim()) {
    throw new Error("SKILL.md frontmatter description is missing");
  }
  return metadata.description;
}

function readSkillInterface(skillRoot) {
  const metadataPath = path.join(skillRoot, "agents", "openai.yaml");
  const metadata = parseYaml(fs.readFileSync(metadataPath, "utf8"));
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("agents/openai.yaml must be a mapping");
  }
  return {
    displayName: asString(metadata.interface?.display_name),
    shortDescription: asString(metadata.interface?.short_description),
    defaultPrompt: asString(metadata.interface?.default_prompt),
  };
}

function sortSkillRecords(records) {
  return [...records].sort((left, right) => {
    const leftName = left.name ?? "";
    const rightName = right.name ?? "";
    return leftName < rightName ? -1 : leftName > rightName ? 1 : 0;
  });
}

export function chatgptPluginIdFromUrl(url) {
  const match = CHATGPT_PLUGIN_URL_PATTERN.exec(asString(url) ?? "");
  if (!match) {
    throw new Error(
      "[DIR-001] listing.plugin.urls.chatgptPlugin must be https://chatgpt.com/plugins/plugins_<hex>",
    );
  }
  return match[1];
}

export function directoryDocumentUrl(pluginId) {
  if (typeof pluginId !== "string" || !pluginId.startsWith("plugins_")) {
    throw new Error("[DIR-001] ChatGPT plugin id is missing");
  }
  return `${CHATGPT_DIRECTORY_DOCUMENT_PREFIX}${pluginId}`;
}

export function pluginIdentityFromListing(listing) {
  const plugin = listing?.plugin ?? {};
  return {
    name: asString(plugin.name),
    version: asString(plugin.version),
    displayName: asString(plugin.displayName),
    developerName: asString(plugin.developerName),
    category: asString(plugin.category),
    capabilities: Array.isArray(plugin.capabilities) ? plugin.capabilities : undefined,
    starterPrompts: Array.isArray(plugin.starterPrompts) ? plugin.starterPrompts : undefined,
    websiteURL: asString(plugin.urls?.website),
    privacyPolicyURL: asString(plugin.urls?.privacyPolicy),
    termsOfServiceURL: asString(plugin.urls?.termsOfService),
    brandColor: normalizeHexColor(plugin.brandColors?.light),
  };
}

export function expectedSkillRecords(root, listing) {
  const resolvedRoot = path.resolve(root);
  const bundle = loadValidatedBundle(resolvedRoot);
  const listedByName = new Map(
    (Array.isArray(listing?.skills) ? listing.skills : []).map((skill) => [skill.name, skill]),
  );
  return sortSkillRecords(
    bundle.skills.map((entry) => {
      const skillRoot = path.join(resolvedRoot, entry.source);
      const listed = listedByName.get(entry.name);
      const skillInterface = readSkillInterface(skillRoot);
      return {
        name: entry.name,
        description: readSkillDescription(skillRoot),
        displayName: skillInterface.displayName,
        shortDescription: skillInterface.shortDescription,
        defaultPrompt: skillInterface.defaultPrompt,
        portalGlyph: asString(listed?.portalGlyph),
      };
    }),
  );
}

export function expectedDirectoryIdentity(root) {
  const listing = readOpenAiListing(root);
  return {
    pluginId: chatgptPluginIdFromUrl(listing.plugin?.urls?.chatgptPlugin),
    ...pluginIdentityFromListing(listing),
    skillRecords: expectedSkillRecords(root, listing),
    skillsOnly: {
      mcpServers: [],
      appManifest: null,
    },
  };
}

export function packageIdentityFromDirectoryDocument(document) {
  const release = document && typeof document === "object" ? document.release : undefined;
  const iface = release && typeof release === "object" ? release.interface : undefined;
  const skillRecords = sortSkillRecords(
    (Array.isArray(release?.skills) ? release.skills : []).map((skill) => ({
      name: asString(skill?.name),
      description: asString(skill?.description),
      displayName: asString(skill?.interface?.display_name),
      shortDescription: asString(skill?.interface?.short_description),
      defaultPrompt: asString(skill?.interface?.default_prompt),
      portalGlyph: asString(skill?.interface?.iconography),
    })),
  );
  return {
    id: asString(document?.id),
    name: asString(document?.name),
    status: asString(document?.status),
    version: asString(release?.version),
    displayName: asString(release?.display_name),
    developerName: asString(iface?.developer_name),
    category: asString(iface?.category),
    capabilities: Array.isArray(iface?.capabilities) ? iface.capabilities : undefined,
    starterPrompts: Array.isArray(iface?.default_prompts) ? iface.default_prompts : undefined,
    websiteURL: asString(iface?.website_url),
    privacyPolicyURL: asString(iface?.privacy_policy_url),
    termsOfServiceURL: asString(iface?.terms_of_service_url),
    brandColor: normalizeHexColor(iface?.brand_color),
    skillRecords,
    skillsOnly: {
      mcpServers: Array.isArray(release?.mcp_servers) ? release.mcp_servers : undefined,
      appManifest: Object.prototype.hasOwnProperty.call(release ?? {}, "app_manifest")
        ? release.app_manifest
        : undefined,
    },
  };
}

export function sanitizeDirectoryDocument(document) {
  const identity = packageIdentityFromDirectoryDocument(document);
  return {
    id: identity.id,
    name: identity.name,
    status: identity.status,
    version: identity.version,
    displayName: identity.displayName,
    developerName: identity.developerName,
    category: identity.category,
    capabilities: identity.capabilities,
    starterPrompts: identity.starterPrompts,
    websiteURL: identity.websiteURL,
    privacyPolicyURL: identity.privacyPolicyURL,
    termsOfServiceURL: identity.termsOfServiceURL,
    brandColor: identity.brandColor,
    skillRecords: identity.skillRecords,
    skillsOnly: identity.skillsOnly,
  };
}

export function compareDirectoryIdentity({
  expectedPluginId,
  expectedIdentity,
  directoryIdentity,
}) {
  const errors = [];
  if (directoryIdentity.id !== expectedPluginId) {
    errors.push(
      `[DIR-001] directory id ${formatValue(directoryIdentity.id)} does not match listing plugin id ${formatValue(expectedPluginId)}`,
    );
  }
  if (directoryIdentity.status !== "ENABLED") {
    errors.push(
      `[DIR-001] directory status is ${formatValue(directoryIdentity.status)}, expected ENABLED`,
    );
  }
  for (const field of PLUGIN_FIELDS) {
    if (formatValue(expectedIdentity[field]) !== formatValue(directoryIdentity[field])) {
      errors.push(
        `[DIR-001] ${field} mismatch: repository ${formatValue(expectedIdentity[field])} vs directory ${formatValue(directoryIdentity[field])}`,
      );
    }
  }
  const expectedSkills = expectedIdentity.skillRecords ?? [];
  const directorySkills = directoryIdentity.skillRecords ?? [];
  if (
    formatValue(expectedSkills.map((skill) => skill.name)) !==
    formatValue(directorySkills.map((skill) => skill.name))
  ) {
    errors.push(
      `[DIR-001] skill names mismatch: repository ${formatValue(expectedSkills.map((skill) => skill.name))} vs directory ${formatValue(directorySkills.map((skill) => skill.name))}`,
    );
  } else {
    for (const [index, expectedSkill] of expectedSkills.entries()) {
      const directorySkill = directorySkills[index];
      for (const field of SKILL_FIELDS) {
        if (formatValue(expectedSkill[field]) !== formatValue(directorySkill[field])) {
          errors.push(
            `[DIR-001] skill ${expectedSkill.name} ${field} mismatch: repository ${formatValue(expectedSkill[field])} vs directory ${formatValue(directorySkill[field])}`,
          );
        }
      }
    }
  }
  if (!isEmptyArray(directoryIdentity.skillsOnly?.mcpServers)) {
    errors.push(
      `[DIR-001] directory mcp_servers must be [] for a skills-only plugin, got ${formatValue(directoryIdentity.skillsOnly?.mcpServers)}`,
    );
  }
  if (directoryIdentity.skillsOnly?.appManifest !== null) {
    errors.push(
      `[DIR-001] directory app_manifest must be null for a skills-only plugin, got ${formatValue(directoryIdentity.skillsOnly?.appManifest)}`,
    );
  }
  return errors;
}

async function readResponseBytes(response, label, requirement) {
  const contentType = asString(response.headers?.get?.("content-type")) ?? "";
  const body = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new Error(`[${requirement}] ${label} returned HTTP ${response.status}`);
  }
  return { body, contentType };
}

async function fetchJsonDocument(url, { fetchImpl = fetch, timeoutMs, requirement, label } = {}) {
  const response = await fetchImpl(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs ?? DIRECTORY_FETCH_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": DIRECTORY_USER_AGENT,
    },
  });
  const { body, contentType } = await readResponseBytes(response, label, requirement);
  try {
    return JSON.parse(body.toString("utf8"));
  } catch (error) {
    throw new Error(
      `[${requirement}] ${label} is not JSON (content-type ${formatValue(contentType)}): ${error.message}`,
    );
  }
}

export async function fetchDirectoryDocument(url, { fetchImpl = fetch, timeoutMs } = {}) {
  return fetchJsonDocument(url, {
    fetchImpl,
    timeoutMs,
    requirement: "DIR-001",
    label: "ChatGPT directory document",
  });
}

export async function verifyListingAgainstDirectory({ root, fetchImpl = fetch, timeoutMs } = {}) {
  const resolvedRoot = path.resolve(root);
  const expectedIdentity = expectedDirectoryIdentity(resolvedRoot);
  const documentUrl = directoryDocumentUrl(expectedIdentity.pluginId);
  const document = await fetchDirectoryDocument(documentUrl, { fetchImpl, timeoutMs });
  const directoryIdentity = packageIdentityFromDirectoryDocument(document);
  const errors = compareDirectoryIdentity({
    expectedPluginId: expectedIdentity.pluginId,
    expectedIdentity,
    directoryIdentity,
  });
  return {
    pluginId: expectedIdentity.pluginId,
    documentUrl,
    expectedIdentity,
    directory: sanitizeDirectoryDocument(document),
    errors,
  };
}

export function categorySlugFromName(category) {
  const slug = (asString(category) ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error("[DIR-002] listing.plugin.category is missing");
  }
  return slug;
}

export function categoryCatalogUrl(slug, { pageToken, limit } = {}) {
  if (typeof slug !== "string" || !slug) {
    throw new Error("[DIR-002] ChatGPT category slug is missing");
  }
  const url = new URL(`${CHATGPT_CATEGORY_CATALOG_PREFIX}${encodeURIComponent(slug)}/plugins`);
  url.searchParams.set("scope", "GLOBAL");
  url.searchParams.set("limit", String(limit ?? CATEGORY_CATALOG_PAGE_LIMIT));
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  return url.toString();
}

export function publicCategoryCatalogUrl(slug) {
  return categoryCatalogUrl(slug);
}

export function catalogCardFromEntry(entry) {
  return {
    id: asString(entry?.id),
    displayName: asString(entry?.display_name),
    status: asString(entry?.status),
    installationPolicy: asString(entry?.installation_policy),
  };
}

export function sanitizeCatalogCard(card) {
  if (!card) return null;
  return {
    id: card.id,
    displayName: card.displayName,
    status: card.status,
    installationPolicy: card.installationPolicy,
  };
}

export function compareCategoryCatalog({
  expectedPluginId,
  expectedDisplayName,
  catalogCard,
  categorySlug,
  pagesScanned,
}) {
  const errors = [];
  if (!catalogCard) {
    errors.push(
      `[DIR-002] plugin ${formatValue(expectedPluginId)} was not found in category ${formatValue(categorySlug)} after ${pagesScanned} catalog page(s)`,
    );
    return errors;
  }
  if (catalogCard.id !== expectedPluginId) {
    errors.push(
      `[DIR-002] catalog id ${formatValue(catalogCard.id)} does not match listing plugin id ${formatValue(expectedPluginId)}`,
    );
  }
  if (catalogCard.status !== "ENABLED") {
    errors.push(`[DIR-002] catalog status is ${formatValue(catalogCard.status)}, expected ENABLED`);
  }
  if (catalogCard.displayName !== expectedDisplayName) {
    errors.push(
      `[DIR-002] displayName mismatch: repository ${formatValue(expectedDisplayName)} vs catalog ${formatValue(catalogCard.displayName)}`,
    );
  }
  if (catalogCard.installationPolicy !== EXPECTED_CATEGORY_INSTALLATION_POLICY) {
    errors.push(
      `[DIR-002] installationPolicy mismatch: expected ${formatValue(EXPECTED_CATEGORY_INSTALLATION_POLICY)} vs catalog ${formatValue(catalogCard.installationPolicy)}`,
    );
  }
  return errors;
}

export async function fetchCategoryCatalogPage(url, { fetchImpl = fetch, timeoutMs } = {}) {
  return fetchJsonDocument(url, {
    fetchImpl,
    timeoutMs,
    requirement: "DIR-002",
    label: "ChatGPT category catalog",
  });
}

export async function verifyListingAgainstCategoryCatalog({
  root,
  fetchImpl = fetch,
  timeoutMs,
} = {}) {
  const listing = readOpenAiListing(root);
  const pluginId = chatgptPluginIdFromUrl(listing.plugin?.urls?.chatgptPlugin);
  const displayName = asString(listing.plugin?.displayName);
  const categorySlug = categorySlugFromName(listing.plugin?.category);
  const catalogUrl = publicCategoryCatalogUrl(categorySlug);
  let pageToken;
  let pagesScanned = 0;
  let catalogCard;

  while (pagesScanned < CATEGORY_CATALOG_MAX_PAGES) {
    pagesScanned += 1;
    const page = await fetchCategoryCatalogPage(categoryCatalogUrl(categorySlug, { pageToken }), {
      fetchImpl,
      timeoutMs,
    });
    if (!Array.isArray(page?.plugins)) {
      throw new Error("[DIR-002] ChatGPT category catalog page is missing plugins[]");
    }
    const match = page.plugins.find((entry) => asString(entry?.id) === pluginId);
    if (match) {
      catalogCard = catalogCardFromEntry(match);
      break;
    }
    const nextPageToken = asString(page?.pagination?.next_page_token);
    if (!nextPageToken) break;
    pageToken = nextPageToken;
  }

  const errors = compareCategoryCatalog({
    expectedPluginId: pluginId,
    expectedDisplayName: displayName,
    catalogCard,
    categorySlug,
    pagesScanned,
  });
  return {
    pluginId,
    catalogUrl,
    categorySlug,
    pagesScanned,
    catalog: sanitizeCatalogCard(catalogCard),
    errors,
  };
}

export async function verifyOpenAiDirectory({ root, fetchImpl = fetch, timeoutMs } = {}) {
  const [directoryResult, catalogResult] = await Promise.all([
    verifyListingAgainstDirectory({ root, fetchImpl, timeoutMs }),
    verifyListingAgainstCategoryCatalog({ root, fetchImpl, timeoutMs }),
  ]);
  return {
    pluginId: directoryResult.pluginId,
    documentUrl: directoryResult.documentUrl,
    expectedIdentity: directoryResult.expectedIdentity,
    directory: directoryResult.directory,
    catalogUrl: catalogResult.catalogUrl,
    categorySlug: catalogResult.categorySlug,
    pagesScanned: catalogResult.pagesScanned,
    catalog: catalogResult.catalog,
    errors: [...directoryResult.errors, ...catalogResult.errors],
  };
}
