export const SITE_ORIGIN = "https://stark-ai-de.github.io";
export const SITE_BASE_PATH = "/agent-skills";
export const SITE_TITLE = "Agent Skills by stark AI";
export const SITE_DESCRIPTION =
  "Browse and install source-backed Agent Skills for Codex, Claude Code, Cursor, diagrams, and repository workflows from stark-ai-de.";
export const GITHUB_REPO_URL = "https://github.com/stark-ai-de/agent-skills";
export const GITHUB_ORG_URL = "https://github.com/stark-ai-de";
export const STARK_AI_URL = "https://stark-ai.de/";
export const LOOPLATCH_URL = "https://loop-latch-opal.vercel.app/";
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

export function toSeoDescription(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= 158) {
    return normalized;
  }

  const candidate = normalized.slice(0, 155);
  const wordBoundary = candidate.lastIndexOf(" ");
  const truncated = wordBoundary >= 110 ? candidate.slice(0, wordBoundary) : candidate;

  return `${truncated.trimEnd()}...`;
}

export function toSeoTitle(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const suffix = " | stark AI";
  const maximumTitleLength = 60;

  if (normalized.length + suffix.length <= maximumTitleLength) {
    return `${normalized}${suffix}`;
  }

  const candidate = normalized.slice(0, maximumTitleLength - suffix.length - 1);
  const wordBoundary = candidate.lastIndexOf(" ");
  const truncated = wordBoundary >= 32 ? candidate.slice(0, wordBoundary) : candidate;

  return `${truncated.trimEnd()}…${suffix}`;
}
