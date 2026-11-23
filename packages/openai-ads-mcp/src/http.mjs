import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, timingSafeEqual } from "node:crypto";
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
export const MCP_RESPONSE_BYTES = 4 * 1024 * 1024;
export const ADS_RESPONSE_BYTES = 1024 * 1024;
export const REQUEST_TIMEOUT_MS = 100_000;
export const OPERATION_TIMEOUT_MS = 80_000;
export const LEASE_TTL_MS = 150_000;

function deadline(milliseconds, parentSignal) {
  const controller = new AbortController();
  const timeout = new HttpError(
    504,
    "Request timed out. Inspect Ads state before retrying a write.",
  );
  const timer = setTimeout(() => controller.abort(timeout), milliseconds);
  timer.unref();
  const signal = parentSignal
    ? AbortSignal.any([parentSignal, controller.signal])
    : controller.signal;
  let rejectExpired;
  const expired = new Promise((_, reject) => {
    rejectExpired = reject;
  });
  const abort = () => rejectExpired(signal.reason ?? timeout);
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  // A stream can be canceled without a pending read; its timer still aborts fetches.
  expired.catch(() => {});
  return {
    signal,
    expiresAt: Date.now() + milliseconds,
    run: (promise) => Promise.race([promise, expired]),
    dispose() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    },
  };
}

function withSignal(fetchImpl, signal) {
  return (url, options = {}) => {
    const combined = options.signal ? AbortSignal.any([signal, options.signal]) : signal;
    combined.throwIfAborted();
    return fetchImpl(url, { ...options, signal: combined });
  };
}

async function acquireLease(store, scope, ownerId) {
  const id = await store.acquireLease({
    scope,
    ownerId,
    limit: 6,
    globalLimit: 128,
    ttlMs: LEASE_TTL_MS,
  });
  if (!id) return null;
  let released;
  return () => {
    // A failed cleanup leaves its bounded lease in place; it never permits more work.
    released ??= store.releaseLease(id).catch(() => {});
    return released;
  };
}

async function holdResponse(response, budget, release = async () => {}) {
  if (!response.body) {
    budget.dispose();
    await release();
    return response;
  }
  const reader = response.body.getReader();
  let finished = false;
  let bytes = 0;
  const finish = async () => {
    if (finished) return;
    finished = true;
    budget.dispose();
    await release();
  };
  const body = new ReadableStream({
    async pull(controller) {
      try {
        const next = await budget.run(reader.read());
        if (finished) return;
        if (next.done) {
          await finish();
          controller.close();
        } else {
          bytes += next.value.byteLength;
          if (bytes > MCP_RESPONSE_BYTES)
            throw new HttpError(
              502,
              "Response exceeded the delivery limit. Inspect state before retrying a write.",
            );
          controller.enqueue(next.value);
        }
      } catch (error) {
        if (finished) return;
        // A transport's cancellation hook must not extend the request deadline.
        // Active Ads work keeps its independent lease until it actually settles.
        reader.cancel(error).catch(() => {});
        await finish();
        controller.error(error);
      }
    },
    async cancel(reason) {
      reader.cancel(reason).catch(() => {});
      await finish();
    },
  });
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function authorizedCron(request, secret) {
  if (!secret) return false;
  const supplied = request.headers.get("authorization") || "";
  const hash = (value) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(supplied), hash(`Bearer ${secret}`));
}

export async function createApplication({
  config,
  store: providedStore,
  fetchImpl = fetch,
  auth: providedAuth,
  now = Date.now,
  requestTimeoutMs = REQUEST_TIMEOUT_MS,
  operationTimeoutMs = OPERATION_TIMEOUT_MS,
}) {
  if (
    !Number.isSafeInteger(requestTimeoutMs) ||
    requestTimeoutMs < 1 ||
    requestTimeoutMs > REQUEST_TIMEOUT_MS ||
    !Number.isSafeInteger(operationTimeoutMs) ||
    operationTimeoutMs < 1 ||
    operationTimeoutMs > OPERATION_TIMEOUT_MS ||
    operationTimeoutMs > requestTimeoutMs
  )
    throw new Error("Application deadlines must be within the bounded runtime limits.");
  const store = providedStore || (await createStore(config));
  const requests = new AsyncLocalStorage();
  const activeOperations = new Set();
  const auth =
    providedAuth ||
    createAuth({
      config,
      store,
      verifyAdsKey: (apiKey) =>
        createAdsClient({
          apiKey,
          fetchImpl: withSignal(fetchImpl, requests.getStore().budget.signal),
          maxResponseBytes: ADS_RESPONSE_BYTES,
        }).getAccount(),
      now,
    });
  const credentials = createCredentialService({ config, store, auth, now });
  const mcp = createMcpHandler(
    () => {
      const context = requests.getStore();
      const principal = context?.principal;
      if (!principal) throw new Error("Authenticated request context is required.");
      const server = new McpServer(
        { name: "stark-ai-ads", version: metadata.version },
        {
          instructions:
            "Use only the connected account. Inspect before applying authorized changes. A successful submission may still be pending; check operation status. Generated credentials are delivered through an authenticated browser download, never in tool output.",
        },
      );
      async function executeOperation(...args) {
        const budget = deadline(
          Math.max(1, Math.min(operationTimeoutMs, context.budget.expiresAt - Date.now())),
          context.budget.signal,
        );
        let release;
        try {
          budget.signal.throwIfAborted();
          release = await acquireLease(store, "ads-operation", principal.grantId);
          if (!release)
            throw new AdsClientError(
              "rate_limited",
              "Too many simultaneous Ads operations. Wait for current operations to finish.",
              { status: 429 },
            );
          budget.signal.throwIfAborted();
          const client = createAdsClient({
            apiKey: principal.apiKey,
            expectedAccountId: principal.accountId,
            fetchImpl: withSignal(fetchImpl, budget.signal),
            maxResponseBytes: ADS_RESPONSE_BYTES,
          });
          // Do not race execute() or release on SSE cancellation. The shared operation
          // lease stays held until the actual upstream work (including readback) settles.
          const result = await client.execute(...args);
          if (Buffer.byteLength(JSON.stringify(result)) > ADS_RESPONSE_BYTES)
            throw new AdsClientError(
              "response_too_large",
              args[0].readOnly
                ? "The result is too large for delivery. Reduce the query or page size."
                : "The Ads API may have applied the write, but the result is too large for delivery. Inspect resource/job state before any retry.",
              { uncertain: !args[0].readOnly },
            );
          return result;
        } catch (error) {
          if (error instanceof AdsClientError) {
            if (error.code === "response_too_large" && !args[0].readOnly)
              throw new AdsClientError(
                "response_too_large",
                "The Ads API may have applied the write, but its response is too large for delivery. Inspect resource/job state before any retry.",
                { status: error.status, uncertain: true },
              );
            if (
              error.details &&
              Buffer.byteLength(JSON.stringify(error.details)) > ADS_RESPONSE_BYTES
            )
              throw new AdsClientError(error.code, error.message, {
                status: error.status,
                uncertain: error.uncertain,
              });
          }
          throw error;
        } finally {
          budget.dispose();
          await release?.();
        }
      }
      const adsClient = {
        execute(...args) {
          const work = executeOperation(...args);
          activeOperations.add(work);
          work.finally(() => activeOperations.delete(work)).catch(() => {});
          return work;
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
    headers.set("cache-control", "no-store");
    headers.set("cdn-cache-control", "no-store");
    headers.set("vercel-cdn-cache-control", "no-store");
    if (config.publicOrigin.startsWith("https:"))
      headers.set("strict-transport-security", "max-age=31536000");
    const origin = request.headers.get("origin");
    if (origin && config.allowedOrigins.includes(origin)) {
      headers.set("access-control-allow-origin", origin);
      headers.set("vary", "Origin");
      headers.set("access-control-expose-headers", "WWW-Authenticate, MCP-Protocol-Version");
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  async function route(request) {
    const context = requests.getStore();
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
    if (url.pathname === "/internal/prune") {
      if (url.search) return textResponse("Prune query parameters are not supported.", 400);
      if (!authorizedCron(request, config.cronSecret))
        return textResponse("Authorized maintenance access is required.", 401);
      if (request.method !== "GET")
        return textResponse("Method not allowed.", 405, { allow: "GET" });
      await store.prune();
      return Response.json({ ok: true });
    }
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
    context.budget.signal.throwIfAborted();
    if (!principal)
      return textResponse("Connect your Ads account to use this service.", 401, {
        "www-authenticate": `Bearer resource_metadata="${config.publicOrigin}/.well-known/oauth-protected-resource/mcp", scope="ads:read", error="invalid_token"`,
      });
    if (request.method !== "POST")
      return textResponse("Method not allowed.", 405, { allow: "POST, OPTIONS" });
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json")
      return textResponse("MCP requests require application/json.", 415);
    const release = await acquireLease(store, "mcp-request", principal.grantId);
    if (!release)
      return textResponse("Too many simultaneous requests.", 429, { "retry-after": "1" });
    context.release = release;
    try {
      context.budget.signal.throwIfAborted();
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
      context.budget.signal.throwIfAborted();
      context.principal = principal;
      return await mcp.fetch(request, { parsedBody });
    } catch (error) {
      await release();
      throw error;
    }
  }

  async function handle(request) {
    const budget = deadline(requestTimeoutMs, request.signal);
    const context = { budget, release: async () => {} };
    let response;
    try {
      response = await budget.run(requests.run(context, () => route(request)));
    } catch (error) {
      await context.release();
      budget.dispose();
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
    return holdResponse(finish(response, request), budget, context.release);
  }
  async function close() {
    await mcp.close();
    await Promise.allSettled(activeOperations);
    await store.close();
  }
  return { handle, close, auth };
}
