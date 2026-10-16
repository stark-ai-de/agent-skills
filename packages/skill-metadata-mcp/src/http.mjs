import { createMcpHandler } from "mcp-handler";
import { LIMITS, RULESETS, withinDepth } from "./core.mjs";
import { registerTools, SERVER_INFO } from "./tools.mjs";

const mcp = createMcpHandler(registerTools, {
  serverInfo: SERVER_INFO,
  verboseLogs: false,
  maxSubscriptions: 0,
});
const plain = (text, status = 200, extra = {}) =>
  new Response(text, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...extra },
  });
export async function handler(request) {
  const path = new URL(request.url).pathname;
  if (path === "/health")
    return request.method === "GET"
      ? Response.json(
          { status: "ok", ...SERVER_INFO, rulesets: RULESETS },
          { headers: { "cache-control": "no-store" } },
        )
      : plain("Method not allowed", 405, { allow: "GET" });
  if (path === "/.well-known/openai-apps-challenge") {
    if (request.method !== "GET") return plain("Method not allowed", 405, { allow: "GET" });
    const challenge = process.env.OPENAI_APPS_CHALLENGE;
    return challenge ? plain(challenge) : plain("Challenge not configured", 404);
  }
  if (path !== "/mcp") return plain("Not found", 404);
  if (request.method === "POST") {
    if (
      request.headers.has("content-encoding") &&
      request.headers.get("content-encoding") !== "identity"
    )
      return plain("Unsupported content encoding", 415);
    if (Number(request.headers.get("content-length")) > LIMITS.requestBytes)
      return plain("Request exceeds 128 KiB", 413);
    const reader = request.body?.getReader();
    const chunks = [];
    let bytes = 0;
    try {
      if (reader)
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          bytes += next.value.byteLength;
          if (bytes > LIMITS.requestBytes) {
            await reader.cancel();
            return plain("Request exceeds 128 KiB", 413);
          }
          chunks.push(next.value);
        }
    } catch {
      return plain("Invalid request body", 400);
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      if (!withinDepth(JSON.parse(new TextDecoder().decode(body))))
        return plain("Request exceeds nesting limit", 400);
    } catch {
      /* Let the SDK produce the MCP parse error. */
    }
    request = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body,
      signal: request.signal,
    });
  }
  try {
    const response = await mcp(request);
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return plain("MCP request failed", 500);
  }
}
