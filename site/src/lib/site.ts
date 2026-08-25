import { pluginMarketplaceSource } from "./plugin-listing";

export const SITE_ORIGIN = "https://stark-ai-de.github.io";
export const SITE_BASE_PATH = "/agent-skills";
export const STARK_AI_MARK = "stark AI";
export const STARK_AI_HAIR_SPACE = "\u200A";
export const STARK_AI_NAME = `stark${STARK_AI_HAIR_SPACE}AI`;
export const SITE_TITLE = "Agent Skills by stark AI";
export const SITE_DESCRIPTION =
  "Browse and install Agent Skills and the harness-first stark AI Developer toolkit for Codex, Claude Code, Cursor, diagrams, and repository workflows.";
export const PUBLIC_SKILLS_DESCRIPTION =
  "Browse and install promoted Agent Skills for Codex, Claude Code, Cursor, diagrams, and repository workflows. Each page includes source, version, and install commands.";
export const INCUBATOR_SKILLS_DESCRIPTION =
  "Candidate Agent Skills kept outside the public catalog for maintainer review and local testing. They are not promoted install entries.";
export const PLUGIN_SEO_DESCRIPTION =
  "Install the harness-first stark AI Developer for Codex and ChatGPT: from a feature idea and code to specs, architecture, diagrams, docs, and agent memory.";
export type RobotsDirective = "index, follow" | "noindex, follow" | "noindex, nofollow";
const GITHUB_REPO_SLUG = pluginMarketplaceSource();
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO_SLUG}`;
export const GITHUB_ORG_URL = `https://github.com/${GITHUB_REPO_SLUG.split("/")[0]}`;
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
export const GITHUB_SECURITY_POLICY_URL = `${GITHUB_REPO_URL}/security/policy`;
export const GITHUB_SECURITY_ADVISORIES_URL = `${GITHUB_REPO_URL}/security/advisories/new`;
export const LICENSE_URL = `${GITHUB_REPO_URL}/blob/main/LICENSE`;
export const STARK_AI_URL = "https://stark-ai.de/";
export const STARK_AI_PRIVACY_URL = "https://stark-ai.de/en/datenschutz";
export const LOOPLATCH_URL = "https://loop-latch-opal.vercel.app/";
export const LOOPLATCH_LOGO_PATH = "/looplatch-logo.svg";
export const PLUGIN_PATH = "/plugins/stark-ai-developer/";
export const PUBLISHER_LEGAL_NAME = "servrox solutions UG";
export const PUBLISHER_LEGAL_NAME_FULL = "servrox solutions UG (haftungsbeschränkt)";
export const PUBLISHER_STREET = "Panoramastrasse 26";
export const PUBLISHER_POSTAL_CODE = "71296";
export const PUBLISHER_LOCALITY = "Heimsheim";
export const PUBLISHER_CITY = `${PUBLISHER_POSTAL_CODE} ${PUBLISHER_LOCALITY}`;
export const PUBLISHER_COUNTRY = "Germany";
export const PUBLISHER_COUNTRY_CODE = "DE";
export const PUBLISHER_REPRESENTATIVES = ["Marcel Mayer", "Aaron Röhl"] as const;
export const PUBLISHER_REGISTER_COURT = "Local Court Mannheim";
export const PUBLISHER_REGISTER_NUMBER = "HRB 755120";
export const PUBLISHER_VAT_ID = "DE346416845";
export const PUBLISHER_PRIVACY_CONTROLLER = "Aaron Röhl";
export const PUBLISHER_WEBSITE = "https://stark-ai.de";
export const PUBLISHER_CONSUMER_ARBITRATION = `${PUBLISHER_LEGAL_NAME_FULL} is neither willing nor obligated to participate in dispute resolution proceedings before a consumer arbitration board.`;
export const SUPPORT_EMAIL = "dev@stark-ai.de";
export const SECURITY_EMAIL = "security@stark-ai.de";
export const POLICY_EFFECTIVE_DATE = "19 August 2026";
export const LIST_PUBLIC_SKILLS_COMMAND = "npx skills@latest add stark-ai-de/agent-skills --list";
export const PUBLIC_POLICY_PAGES = [
  { path: "/imprint/", label: "Imprint" },
  { path: "/privacy/", label: "Privacy" },
  { path: "/terms/", label: "Terms" },
  { path: "/support/", label: "Support" },
  { path: "/security/", label: "Security" },
] as const;
export const DEFAULT_OG_IMAGE_PATH = "/og-image.png";
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;
export const SEO_KEYWORDS = [
  "Agent Skills",
  "Codex",
  "OpenAI Codex",
  "Claude Code",
  "Cursor",
  "AI agents",
  "developer tools",
  "harness-first",
  "draw.io diagrams",
  "repository maintenance",
  "skill catalog",
];

export function withBase(pathname = "/") {
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (cleanPath === "/") {
    return `${SITE_BASE_PATH}/`;
  }

  return `${SITE_BASE_PATH}${cleanPath}`;
}

export function absoluteSiteUrl(pathname = "/") {
  return new URL(withBase(pathname), SITE_ORIGIN).toString();
}

export function withStarkAi(text: string) {
  return text.replaceAll(STARK_AI_MARK, STARK_AI_NAME);
}

export function toSeoDescription(value: string) {
  const normalized = withStarkAi(value.replace(/\s+/g, " ").trim());

  if (normalized.length <= 158) {
    return normalized;
  }

  const candidate = normalized.slice(0, 155);
  const wordBoundary = candidate.lastIndexOf(" ");
  const truncated = wordBoundary >= 110 ? candidate.slice(0, wordBoundary) : candidate;

  return `${truncated.trimEnd()}...`;
}

export function robotsDirective(canonicalPath: string, noindex = false): RobotsDirective {
  if (noindex) {
    return "noindex, nofollow";
  }

  if (canonicalPath === "/incubator/" || canonicalPath.startsWith("/incubator/")) {
    return "noindex, follow";
  }

  return "index, follow";
}

export function toSeoTitle(value: string) {
  const normalized = withStarkAi(value.replace(/\s+/g, " ").trim());
  const suffix = ` | ${STARK_AI_NAME}`;
  const maximumTitleLength = 60;

  if (normalized.length + suffix.length <= maximumTitleLength) {
    return `${normalized}${suffix}`;
  }

  const candidate = normalized.slice(0, maximumTitleLength - suffix.length - 1);
  const wordBoundary = candidate.lastIndexOf(" ");
  const truncated = wordBoundary >= 32 ? candidate.slice(0, wordBoundary) : candidate;

  return `${truncated.trimEnd()}…${suffix}`;
}
