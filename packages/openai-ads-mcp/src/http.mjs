import { AsyncLocalStorage } from "node:async_hooks";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import metadata from "../package.json" with { type: "json" };
import { createAuth } from "./auth.mjs";
import { createStore } from "./store.mjs";
import { AdsClientError, createAdsClient } from "./ads-client.mjs";
import { registerTools } from "./tools.mjs";
import { createCredentialService } from "./credentials.mjs";
import {
  HttpError,
  readBoundedBody,
  securityHeaders,
  textResponse,
  withinDepth,
} from "./http-utils.mjs";

export const MCP_REQUEST_BYTES = 3 * 1024 * 1024;

function concurrencyLimit() {
  const counts = new Map();
  let total = 0;
  return (grantId) => {
    if (total >= 128 || (counts.get(grantId) || 0) >= 6) return null;
    total += 1;
    counts.set(grantId, (counts.get(grantId) || 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      total -= 1;
      const count = counts.get(grantId) - 1;
      if (count) counts.set(grantId, count);
      else counts.delete(grantId);
    };
  };
}

function holdResponse(response, release) {
  if (!response.body) {
    release();
    return response;
  }
  const reader = response.body.getReader();
  const body = new ReadableStream({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) {
          release();
          controller.close();
        } else controller.enqueue(next.value);
      } catch (error) {
        release();
        controller.error(error);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        release();
      }
    },
  });
  return new Response(body, { status: response.status, headers: response.headers });
}

export function createApplication({
  config,
  store = createStore(config),
  fetchImpl = fetch,
  auth: providedAuth,
  now = Date.now,
}) {
  const auth =
    providedAuth ||
    createAuth({
      config,
      store,
      verifyAdsKey: (apiKey) => createAdsClient({ apiKey, fetchImpl }).getAccount(),
      now,
    });
  const credentials = createCredentialService({ config, store, auth, now });
  const principals = new AsyncLocalStorage();
  const acquireRequest = concurrencyLimit();
  const acquireTool = concurrencyLimit();
  store.prune();
  const maintenance = setInterval(() => {
    try {
      store.prune();
    } catch {
      /* Subsequent requests still fail closed if the vault is unavailable. */
    }
  }, 60000);
  maintenance.unref();
  const mcp = createMcpHandler(
    () => {
      const principal = principals.getStore();
      if (!principal) throw new Error("Authenticated request context is required.");
      const server = new McpServer(
        { name: "stark-ai-ads", version: metadata.version },
        {
          instructions:
            "Use only the connected account. Inspect before applying authorized changes. A successful submission may still be pending; check operation status. Generated credentials are delivered through an authenticated browser download, never in tool output.",
        },
      );
      const client = createAdsClient({
        apiKey: principal.apiKey,
        expectedAccountId: principal.accountId,
        fetchImpl,
      });
      const adsClient = {
        async execute(...args) {
          const release = acquireTool(principal.grantId);
          if (!release)
            throw new AdsClientError(
              "rate_limited",
              "Too many simultaneous Ads operations. Wait for current operations to finish.",
              { status: 429 },
            );
          try {
            return await client.execute(...args);
          } finally {
            release();
          }
        },
      };
      registerTools(server, {
        principal,
        adsClient,
        resourceMetadataUrl: `${config.publicOrigin}/.well-known/oauth-protected-resource/mcp`,
        credentialSink: ({ operation, value }) =>
          credentials.createHandoff({ principal, operation, value }),
      });
      return server;
    },
    {
      legacy: "stateless",
      responseMode: "auto",
      maxRequestBodySize: MCP_REQUEST_BYTES,
      maxSubscriptions: 0,
      keepAliveMs: 0,
    },
  );

  function finish(response, request) {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(securityHeaders))
      if (!headers.has(key)) headers.set(key, value);
    if (config.publicOrigin.startsWith("https:"))
      headers.set("strict-transport-security", "max-age=31536000");
    const origin = request.headers.get("origin");
    if (origin && config.allowedOrigins.includes(origin)) {
      headers.set("access-control-allow-origin", origin);
      headers.set("vary", "Origin");
      headers.set("access-control-expose-headers", "WWW-Authenticate, MCP-Protocol-Version");
    }
    return new Response(response.body, { status: response.status, headers });
  }

  async function route(request) {
    const url = new URL(request.url);
    if (url.origin !== config.publicOrigin) return textResponse("Invalid request origin.", 400);
    const origin = request.headers.get("origin");
    if (origin && !config.allowedOrigins.includes(origin))
      return textResponse("Origin is not allowed.", 403);
    if (request.method === "OPTIONS" && url.pathname === "/mcp")
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers":
            "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id",
          "access-control-max-age": "600",
        },
      });
    if (url.pathname === "/health")
      return request.method === "GET"
        ? Response.json({ status: "ok", service: "stark-ai-ads", version: metadata.version })
        : textResponse("Method not allowed.", 405, { allow: "GET" });
    if (url.pathname === "/.well-known/openai-apps-challenge")
      return request.method !== "GET"
        ? textResponse("Method not allowed.", 405, { allow: "GET" })
        : config.openaiAppsChallenge
          ? textResponse(config.openaiAppsChallenge)
          : textResponse("Domain challenge is not configured.", 404);
    const authResponse = await auth.handle(request);
    if (authResponse) return authResponse;
    const credentialResponse = await credentials.handle(request);
    if (credentialResponse) return credentialResponse;
    if (url.pathname === "/")
      return request.method === "GET"
        ? textResponse(
            "stark AI Ads\nConnect this service through your ChatGPT plugin to use the OpenAI Advertiser API. An Ads Manager Advertiser API key is required. Manage or disconnect access at /connections.\n",
          )
        : textResponse("Method not allowed.", 405, { allow: "GET" });
    if (url.pathname !== "/mcp") return textResponse("Not found.", 404);
    if (url.search) return textResponse("MCP query parameters are not supported.", 400);
    const principal = await auth.authenticate(request);
    if (!principal)
      return textResponse("Connect your Ads account to use this service.", 401, {
        "www-authenticate": `Bearer resource_metadata="${config.publicOrigin}/.well-known/oauth-protected-resource/mcp", scope="ads:read", error="invalid_token"`,
      });
    if (request.method !== "POST")
      return textResponse("Method not allowed.", 405, { allow: "POST, OPTIONS" });
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json")
      return textResponse("MCP requests require application/json.", 415);
    const release = acquireRequest(principal.grantId);
    if (!release)
      return textResponse("Too many simultaneous requests.", 429, { "retry-after": "1" });
    let held = false;
    try {
      let parsedBody;
      const body = await readBoundedBody(request, MCP_REQUEST_BYTES);
      try {
        parsedBody = JSON.parse(body);
      } catch {
        return Response.json(
          { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
          { status: 400 },
        );
      }
      if (!withinDepth(parsedBody))
        return textResponse("Request nesting exceeds the allowed depth.", 400);
      const response = await principals.run(principal, () => mcp.fetch(request, { parsedBody }));
      held = true;
      return holdResponse(response, release);
    } finally {
      if (!held) release();
    }
  }

  async function handle(request) {
    try {
      return finish(await route(request), request);
    } catch (error) {
      return finish(
        textResponse(
          error instanceof HttpError
            ? error.message
            : "Request failed. No credentials have been included in this response.",
          error instanceof HttpError ? error.status : 500,
        ),
        request,
      );
    }
  }
  async function close() {
    clearInterval(maintenance);
    await mcp.close();
    store.close();
  }
  return { handle, close, auth };
}
