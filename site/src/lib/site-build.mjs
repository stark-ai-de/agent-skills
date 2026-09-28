export const SITE_ORIGIN = "https://stark-ai-de.github.io";
export const PRODUCTION_BASE_PATH = "/agent-skills";

export function resolveSiteBuild(env = process.env) {
  const pr = env.AGENT_SKILLS_PREVIEW_PR;
  const sha = env.AGENT_SKILLS_PREVIEW_SHA;
  if (pr === undefined && sha === undefined) {
    return { basePath: PRODUCTION_BASE_PATH, isPreview: false };
  }
  if (
    typeof pr !== "string" ||
    pr.trim() !== pr ||
    !/^[1-9][0-9]*$/.test(pr) ||
    typeof sha !== "string" ||
    sha.length !== 40 ||
    !/^[0-9a-f]{40}$/.test(sha)
  ) {
    throw new Error("Preview builds require a positive PR number and exact lowercase commit SHA.");
  }
  return { basePath: `/agent-skills-preview/pr-${pr}`, isPreview: true, pr, sha };
}

export const SITE_BUILD = resolveSiteBuild();
export const SITE_BASE_PATH = SITE_BUILD.basePath;
