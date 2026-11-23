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

function trustedRequest(request, config) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (
    url.origin !== config.publicOrigin ||
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
  return new Request(request, { headers });
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
      try {
        // Include cold-start schema verification in the same total invocation budget.
        // This signal remains valid until a returned SSE/body stream has completed.
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
        config ||= configLoader(env);
        const input = trustedRequest(new Request(request, { signal }), config);
        if (!input) return textResponse("Invalid request host or origin.", 400);
        const { app } = await beforeDeadline(application(), signal);
        signal.throwIfAborted();
        const response = await app.handle(input);
        // Keep separate Set-Cookie entries and the original ReadableStream intact.
        const headers = new Headers(response.headers);
        for (const [name, value] of Object.entries(securityHeaders))
          if (!headers.has(name)) headers.set(name, value);
        for (const name of ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"])
          headers.set(name, "no-store");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch {
        // Database/configuration errors can contain credentials or connection URLs.
        return unavailable();
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
