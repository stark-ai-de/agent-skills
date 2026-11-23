import { isIP } from "node:net";
import { attachDatabasePool } from "@vercel/functions";
import { loadConfig } from "./config.mjs";
import { createApplication, REQUEST_TIMEOUT_MS } from "./http.mjs";
import { securityHeaders, textResponse } from "./http-utils.mjs";
import { createDatabasePool } from "./storage/postgres.mjs";

const proxyHeaders = [
  "x-ads-client-address",
  "forwarded",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-vercel-forwarded-for",
  "x-real-ip",
];

function trustedRequest(request, config, env) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  // Vercel schedules target the immutable production deployment URL, even when
  // OAuth uses a custom domain. Only its exact platform-owned host may reach
  // maintenance; the shared route still authenticates the cron bearer secret.
  const deploymentCron =
    config.isVercel &&
    env.VERCEL_URL &&
    url.origin === `https://${env.VERCEL_URL}` &&
    request.method === "GET" &&
    url.pathname === "/internal/prune" &&
    !url.search;
  if (
    (url.origin !== config.publicOrigin && !deploymentCron) ||
    (host && host.toLowerCase() !== url.host.toLowerCase()) ||
    url.pathname.startsWith("//")
  )
    return null;
  // This header is set by Vercel's edge, unlike caller-selected proxy headers.
  // Never use it in the native adapter or derive an OAuth origin from a header.
  const forwarded = config.isVercel ? request.headers.get("x-vercel-forwarded-for") : null;
  const address = forwarded && isIP(forwarded) ? forwarded : "unknown";
  const headers = new Headers(request.headers);
  for (const name of proxyHeaders) headers.delete(name);
  headers.set("x-ads-client-address", address);
  if (deploymentCron) {
    headers.set("host", new URL(config.publicOrigin).host);
    return new Request(new URL(url.pathname, config.publicOrigin), {
      method: request.method,
      headers,
      signal: request.signal,
    });
  }
  return new Request(request, { headers });
}

const observedOAuthPaths = new Set([
  "/oauth/authorize",
  "/oauth/token",
  "/oauth/revoke",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
]);
const observedOAuthErrors = new Set([
  "invalid_request",
  "invalid_client",
  "invalid_grant",
  "invalid_target",
  "unsupported_grant_type",
]);

function oauthObservation(request, response, config) {
  const route = new URL(request.url).pathname;
  if (!observedOAuthPaths.has(route)) return null;
  const origin = request.headers.get("origin");
  const method = ["GET", "POST", "OPTIONS"].includes(request.method) ? request.method : "other";
  const error = response.headers.get("x-ads-oauth-error");
  return {
    event: "ads.oauth.request",
    route,
    method,
    status: response.status,
    originClass: !origin
      ? "absent"
      : origin === "null"
        ? "opaque"
        : config?.allowedOrigins.includes(origin)
          ? "allowed"
          : "denied",
    ...(observedOAuthErrors.has(error) ? { error } : {}),
  };
}

function unavailable() {
  return textResponse("Service configuration or storage is unavailable.", 503, {
    "retry-after": "30",
    "cdn-cache-control": "no-store",
    "vercel-cdn-cache-control": "no-store",
  });
}

async function beforeDeadline(promise, signal) {
  signal.throwIfAborted();
  let onAbort;
  const aborted = new Promise((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([promise, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

/** One bounded pg pool per warm function instance; durable state remains in PostgreSQL. */
export function createVercelHandler({
  env = process.env,
  configLoader = loadConfig,
  poolFactory = createDatabasePool,
  attachPool = attachDatabasePool,
  applicationFactory = createApplication,
  oauthLogger = (event) => console.info(JSON.stringify(event)),
} = {}) {
  let config;
  let instance;
  async function application() {
    if (!instance) {
      instance = (async () => {
        const pool = poolFactory(config);
        try {
          attachPool(pool);
          const app = await applicationFactory({ config: { ...config, pool } });
          return { app, pool };
        } catch {
          await pool.end().catch(() => {});
          throw new Error("Application initialization failed.");
        }
      })();
      instance.catch(() => {
        instance = undefined;
      });
    }
    return instance;
  }
  return {
    async fetch(request) {
      const observe = (response) => {
        // Record only fixed route names, methods, status and error categories.
        // Never read or log query strings, headers, form bodies or credentials.
        const event = oauthObservation(request, response, config);
        if (event) {
          try {
            oauthLogger(event);
          } catch {
            // Logging must not interfere with authentication or response delivery.
          }
        }
        return response;
      };
      try {
        // Include cold-start schema verification in the same total invocation budget.
        // This signal remains valid until a returned SSE/body stream has completed.
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
        config ||= configLoader(env);
        const input = trustedRequest(new Request(request, { signal }), config, env);
        if (!input) return observe(textResponse("Invalid request host or origin.", 400));
        const { app } = await beforeDeadline(application(), signal);
        signal.throwIfAborted();
        const response = await app.handle(input);
        // Keep separate Set-Cookie entries and the original ReadableStream intact.
        const headers = new Headers(response.headers);
        for (const [name, value] of Object.entries(securityHeaders))
          if (!headers.has(name)) headers.set(name, value);
        for (const name of ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"])
          headers.set(name, "no-store");
        return observe(
          new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          }),
        );
      } catch {
        // Database/configuration errors can contain credentials or connection URLs.
        return observe(unavailable());
      }
    },
    async close() {
      if (!instance) return;
      const current = await instance;
      instance = undefined;
      try {
        await current.app.close();
      } finally {
        await current.pool.end();
      }
    },
  };
}

const runtime = createVercelHandler();
export const handler = (request) => runtime.fetch(request);
