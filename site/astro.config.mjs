import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://stark-ai-de.github.io",
  base: "/agent-skills",
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()],
});
