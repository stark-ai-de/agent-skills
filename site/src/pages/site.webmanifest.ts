import { withBase } from "../lib/site";

export function GET() {
  const manifest = {
    name: "Agent Skills by stark\u200AAI",
    short_name: "Agent Skills",
    description:
      "Browse and install Agent Skills and the harness-first stark AI Developer toolkit for Codex, Claude Code, Cursor, diagrams, and repository workflows.",
    start_url: withBase("/"),
    scope: withBase("/"),
    display: "standalone",
    background_color: "#f6f8ff",
    theme_color: "#0021c7",
    categories: ["business", "developer-tools", "productivity", "technology"],
    lang: "en-US",
    id: withBase("/"),
    icons: [
      {
        src: withBase("/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBase("/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBase("/agent-skills-head.svg"),
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: withBase("/favicon.ico"),
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: withBase("/apple-icon.png"),
        sizes: "204x204",
        type: "image/png",
      },
    ],
  };
  return new Response(JSON.stringify(manifest, null, 2) + "\n", {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
