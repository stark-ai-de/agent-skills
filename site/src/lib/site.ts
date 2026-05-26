export const SITE_ORIGIN = "https://stark-ai-de.github.io";
export const SITE_BASE_PATH = "/agent-skills";
export const SITE_TITLE = "Agent Skills by stark AI";
export const SITE_DESCRIPTION =
  "Public and incubator Agent Skills from stark-ai-de, generated from SKILL.md source files.";
export const GITHUB_REPO_URL = "https://github.com/stark-ai-de/agent-skills";
export const DEFAULT_OG_IMAGE_PATH = "/og-image.png";
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;
export const SEO_KEYWORDS = [
  "Agent Skills",
  "Codex",
  "OpenAI Codex",
  "AI agents",
  "developer tools",
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

  return `${normalized.slice(0, 155).trimEnd()}...`;
}
