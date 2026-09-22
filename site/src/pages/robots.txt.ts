import { renderRobots } from "../../site-config.mjs";

export function GET() {
  return new Response(renderRobots(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
