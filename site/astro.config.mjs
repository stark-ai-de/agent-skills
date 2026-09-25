import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { readFile, writeFile } from "node:fs/promises";
import {
  SITE_ORIGIN,
  SITE_BASE_PATH,
  SITE_BUILD,
  PRODUCTION_BASE_PATH,
} from "./src/lib/site-build.mjs";

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
    ...(SITE_BUILD.isPreview
      ? [
          {
            name: "isolated-pr-preview",
            hooks: {
              "astro:build:done": async ({ dir }) => {
                // Only change generated output; checked-in production metadata stays intact.
                await writeFile(new URL("robots.txt", dir), "User-agent: *\nDisallow: /\n");
                const manifest = new URL("site.webmanifest", dir);
                await writeFile(
                  manifest,
                  (await readFile(manifest, "utf8")).replaceAll(
                    `${PRODUCTION_BASE_PATH}/`,
                    `${SITE_BASE_PATH}/`,
                  ),
                );
              },
            },
          },
        ]
      : [
          sitemap({
            filter: (page) => {
              const { pathname } = new URL(page);
              return !pathname.includes("/404") && !pathname.includes("/incubator/");
            },
            serialize(item) {
              const { pathname } = new URL(item.url);
              item.priority = sitemapPriority(pathname);
              item.changefreq =
                pathname === `${SITE_BASE_PATH}/` || pathname.includes("/skills/")
                  ? "weekly"
                  : "monthly";
              return item;
            },
          }),
        ]),
  ],
});
