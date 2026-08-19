import type { APIRoute } from "astro";

import { getStarkAiDeveloperListing } from "../lib/plugin-listing";
import { renderLlmsTxt } from "../lib/seo";
import { getPublicSkills } from "../lib/skills";

export const GET: APIRoute = async () => {
  const skills = await getPublicSkills();
  const listing = getStarkAiDeveloperListing();

  return new Response(renderLlmsTxt({ listing, skills }), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
