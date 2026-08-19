import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const SITE_ORIGIN = "https://stark-ai-de.github.io";
const SITE_BASE_PATH = "/agent-skills";

function sitemapPriority(pathname) {
  if (pathname === `${SITE_BASE_PATH}/`) {
    return 1;
  }

  if (
    pathname === `${SITE_BASE_PATH}/skills/` ||
    pathname === `${SITE_BASE_PATH}/plugins/stark-ai-developer/`
  ) {
    return 0.9;
  }

  if (pathname.startsWith(`${SITE_BASE_PATH}/skills/`)) {
    return 0.8;
  }

  return 0.4;
}

export default defineConfig({
  site: SITE_ORIGIN,
  base: SITE_BASE_PATH,
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return !pathname.includes("/404") && !pathname.includes("/incubator/");
      },
      serialize(item) {
        const { pathname } = new URL(item.url);
        item.priority = sitemapPriority(pathname);
        item.changefreq =
          pathname === `${SITE_BASE_PATH}/` || pathname.includes("/skills/") ? "weekly" : "monthly";
        return item;
      },
    }),
  ],
});
