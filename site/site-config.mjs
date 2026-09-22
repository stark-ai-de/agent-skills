// Preview identity is deliberately restricted to a PR number and an immutable commit.
// Origins, repository names and path prefixes cannot be supplied by the build caller.
export function resolveSiteConfig(env = process.env) {
  const pr = env.AGENT_SKILLS_PREVIEW_PR;
  const sha = env.AGENT_SKILLS_PREVIEW_SHA;
  const isPreview = pr !== undefined || sha !== undefined;
  if (isPreview && (!/^[1-9][0-9]*$/.test(pr ?? "") || !/^[a-fA-F0-9]{40}$/.test(sha ?? ""))) {
    throw new Error(
      "Preview builds require AGENT_SKILLS_PREVIEW_PR (positive integer) and AGENT_SKILLS_PREVIEW_SHA (40 hex characters).",
    );
  }
  return Object.freeze({
    origin: "https://stark-ai-de.github.io",
    basePath: isPreview ? `/agent-skills-preview/pr-${pr}` : "/agent-skills",
    isPreview,
    previewPr: isPreview ? pr : undefined,
    sourceRef: isPreview ? sha.toLowerCase() : "main",
  });
}

export const siteConfig = resolveSiteConfig();

export function renderRobots(config = siteConfig) {
  if (config.isPreview) {
    return "User-Agent: *\nDisallow: /\n";
  }
  const baseUrl = `${config.origin}${config.basePath}`;
  return `User-Agent: *\nAllow: /\n\nHost: stark-ai-de.github.io\nSitemap: ${baseUrl}/sitemap-index.xml\n# Curated AI index: ${baseUrl}/llms.txt\n`;
}
