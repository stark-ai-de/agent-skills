import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getTransformedRoutes } from "@vercel/routing-utils";
import { buildRuntime } from "../build.mjs";
import { createVercelHandler } from "../src/vercel.mjs";
import { createDatabasePool } from "../src/storage/postgres.mjs";
import { createTestStore } from "./helpers/database.mjs";

const origin = "https://ads.example.test";
const config = {
  publicOrigin: origin,
  isVercel: true,
  allowedOrigins: [origin, "https://chatgpt.com"],
  oauthClients: [
    {
      clientId: "test-client",
      redirectUris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
    },
  ],
  deploymentEnvironment: "development",
  cronSecret: "synthetic-cron-secret-".repeat(3),
};

function throughVercelRewrites(url, options) {
  const manifest = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const source = new URL(url);
  const { routes, error } = getTransformedRoutes({ rewrites: manifest.rewrites });
  assert.equal(error, null);
  const route = routes.find(
    (entry) => typeof entry.src === "string" && new RegExp(entry.src).test(source.pathname),
  );
  assert.ok(route, `No Vercel rewrite matches ${source.pathname}`);
  const destination = new URL(
    source.pathname.replace(new RegExp(route.src), route.dest),
    source.origin,
  );
  assert.equal(destination.pathname, "/api/index");
  // Vercel preserves the original pathname and merges the compiled rewrite's
  // query into the function URL. Unused named captures therefore reach guards.
  for (const [name, value] of destination.searchParams) source.searchParams.set(name, value);
  return new Request(source, options);
}

test("the Vercel adapter shares one warm pool and preserves streams, cookies and trusted client IP", async (t) => {
  let pools = 0;
  let attached = 0;
  let closed = 0;
  const observed = [];
  const runtime = createVercelHandler({
    configLoader: () => config,
    poolFactory: () => {
      pools++;
      return {
        end: async () => {
          closed++;
        },
      };
    },
    attachPool: () => {
      attached++;
    },
    applicationFactory: async () => ({
      handle: async (request) => {
        observed.push(request);
        let sent = false;
        return new Response(
          new ReadableStream({
            pull(controller) {
              if (!sent) {
                sent = true;
                controller.enqueue(new TextEncoder().encode("data: first\n\n"));
              } else {
                controller.enqueue(new TextEncoder().encode("data: last\n\n"));
                controller.close();
              }
            },
          }),
          {
            headers: [
              ["content-type", "text/event-stream"],
              ["cache-control", "public, max-age=3600"],
              ["set-cookie", "first=1; Path=/; Secure; HttpOnly"],
              ["set-cookie", "second=2; Path=/; Secure; HttpOnly"],
            ],
          },
        );
      },
      close: async () => {},
    }),
  });
  t.after(() => runtime.close());
  const responses = await Promise.all(
    Array.from({ length: 8 }, () =>
      runtime.fetch(
        new Request(`${origin}/mcp`, {
          headers: {
            host: "ads.example.test",
            "x-ads-client-address": "attacker",
            "x-forwarded-for": "attacker",
            "x-forwarded-host": "evil.example",
            "x-forwarded-proto": "http",
            forwarded: "for=attacker;host=evil.example",
            "x-vercel-forwarded-for": "203.0.113.7",
          },
        }),
      ),
    ),
  );
  assert.equal(pools, 1);
  assert.equal(attached, 1);
  assert.equal(closed, 0);
  for (const request of observed) {
    assert.equal(request.url, `${origin}/mcp`);
    assert.equal(request.headers.get("x-ads-client-address"), "203.0.113.7");
    assert.equal(request.headers.get("x-forwarded-for"), null);
    assert.equal(request.headers.get("forwarded"), null);
  }
  for (const response of responses) {
    assert.equal(response.headers.getSetCookie().length, 2);
    for (const name of ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"])
      assert.equal(response.headers.get(name), "no-store");
    assert.equal(await response.text(), "data: first\n\ndata: last\n\n");
  }
});

test("Vercel rejects spoofed origins before opening a database and never trusts proxy identity outside Vercel", async (t) => {
  let pools = 0;
  let observed;
  const runtime = createVercelHandler({
    env: { VERCEL_URL: "synthetic-deployment.vercel.app" },
    configLoader: () => ({ ...config, isVercel: false }),
    poolFactory: () => {
      pools++;
      return { end: async () => {} };
    },
    attachPool: () => {},
    applicationFactory: async () => ({
      handle: async (request) => {
        observed = request;
        return new Response("ok");
      },
      close: async () => {},
    }),
  });
  t.after(() => runtime.close());
  assert.equal(
    (
      await runtime.fetch(
        new Request("https://evil.example/mcp", {
          headers: { "x-forwarded-host": "ads.example.test", "x-forwarded-proto": "https" },
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await runtime.fetch(new Request(`${origin}/mcp`, { headers: { host: "evil.example" } })))
      .status,
    400,
  );
  assert.equal(
    (
      await runtime.fetch(
        new Request("https://synthetic-deployment.vercel.app/internal/prune", {
          headers: { authorization: `Bearer ${config.cronSecret}` },
        }),
      )
    ).status,
    400,
  );
  assert.equal(pools, 0);
  const result = await runtime.fetch(
    new Request(`${origin}/mcp`, {
      headers: { "x-ads-client-address": "attacker", "x-vercel-forwarded-for": "203.0.113.7" },
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(observed.headers.get("x-ads-client-address"), "unknown");
  await result.text();
});

test("failed initialization closes its pool, redacts details and retries on a later invocation", async (t) => {
  let attempts = 0;
  let closed = 0;
  const runtime = createVercelHandler({
    configLoader: () => config,
    poolFactory: () => ({
      end: async () => {
        closed++;
      },
    }),
    attachPool: () => {},
    applicationFactory: async () => {
      attempts++;
      if (attempts === 1) throw new Error("postgresql://user:DO-NOT-LEAK@private-db/ads");
      return { handle: async () => new Response("ready"), close: async () => {} };
    },
  });
  t.after(() => runtime.close());
  const failed = await runtime.fetch(new Request(`${origin}/health`));
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /DO-NOT-LEAK|private-db/);
  assert.equal(closed, 1);
  assert.equal(await (await runtime.fetch(new Request(`${origin}/health`))).text(), "ready");
  assert.equal(attempts, 2);
});

test("the native Vercel entry reaches the real PostgreSQL service and protected cleanup route", async (t) => {
  const encryptionKey = randomBytes(32);
  const database = await createTestStore(t, {
    encryptionKey,
    deploymentEnvironment: "development",
  });
  let pools = 0;
  let attached = 0;
  const deploymentHost = "synthetic-deployment.vercel.app";
  const deploymentOrigin = `https://${deploymentHost}`;
  const runtime = createVercelHandler({
    env: { VERCEL_URL: deploymentHost },
    configLoader: () => ({ ...config, databaseUrl: database.databaseUrl, encryptionKey }),
    poolFactory: (options) => {
      pools++;
      return createDatabasePool(options);
    },
    attachPool: () => {
      attached++;
    },
  });
  t.after(() => runtime.close());
  const request = (path, headers = {}) =>
    new Request(`${origin}${path}`, {
      headers: { "x-vercel-forwarded-for": "203.0.113.7", ...headers },
    });
  const [health, metadata] = await Promise.all([
    runtime.fetch(request("/health")),
    runtime.fetch(request("/.well-known/oauth-protected-resource/mcp")),
  ]);
  assert.equal((await health.json()).status, "ok");
  assert.equal((await metadata.json()).resource, `${origin}/mcp`);
  assert.equal(pools, 1);
  assert.equal(attached, 1);
  const blocked = await runtime.fetch(request("/internal/prune"));
  assert.equal(blocked.status, 401);
  await blocked.text();
  const pruned = await runtime.fetch(
    request("/internal/prune", { authorization: `Bearer ${config.cronSecret}` }),
  );
  assert.equal(pruned.status, 200);
  assert.deepEqual(await pruned.json(), { ok: true });
  const cronHeaders = { host: deploymentHost, authorization: `Bearer ${config.cronSecret}` };
  const scheduled = await runtime.fetch(
    new Request(`${deploymentOrigin}/internal/prune`, { headers: cronHeaders }),
  );
  assert.equal(scheduled.status, 200);
  assert.deepEqual(await scheduled.json(), { ok: true });
  const unauthenticatedCron = await runtime.fetch(
    new Request(`${deploymentOrigin}/internal/prune`, { headers: { host: deploymentHost } }),
  );
  assert.equal(unauthenticatedCron.status, 401);
  await unauthenticatedCron.text();
  for (const [url, method, headers] of [
    [`${deploymentOrigin}/internal/prune`, "POST", cronHeaders],
    [`${deploymentOrigin}/internal/prune?caller=value`, "GET", cronHeaders],
    [`${deploymentOrigin}/internal/prune`, "GET", { ...cronHeaders, host: "evil.example" }],
    [
      "https://other-deployment.vercel.app/internal/prune",
      "GET",
      {
        ...cronHeaders,
        host: "other-deployment.vercel.app",
      },
    ],
    [`${deploymentOrigin}/mcp`, "POST", cronHeaders],
    [`${deploymentOrigin}/oauth/authorize`, "GET", cronHeaders],
    [`${deploymentOrigin}/health`, "GET", cronHeaders],
    [`${deploymentOrigin}/credentials/${"a".repeat(43)}`, "GET", cronHeaders],
  ]) {
    const rejected = await runtime.fetch(new Request(url, { method, headers }));
    assert.equal(rejected.status, 400, `${method} ${url}`);
    await rejected.text();
  }
});

test("compiled Vercel rewrites preserve discovery and OAuth queries and permit one-time credential downloads", async (t) => {
  const encryptionKey = randomBytes(32);
  const database = await createTestStore(t, {
    encryptionKey,
    deploymentEnvironment: config.deploymentEnvironment,
  });
  const runtime = createVercelHandler({
    configLoader: () => ({ ...config, databaseUrl: database.databaseUrl, encryptionKey }),
    attachPool: () => {},
  });
  t.after(() => runtime.close());
  for (const path of [
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-protected-resource/mcp",
    "/oauth/authorize?state=keep%2Bthis&resource=https%3A%2F%2Fads.example.test%2Fmcp",
    "/oauth/token",
    "/oauth/revoke",
  ])
    assert.equal(throughVercelRewrites(`${origin}${path}`).url, `${origin}${path}`);

  const clientId = config.oauthClients[0].clientId;
  const redirectUri = config.oauthClients[0].redirectUris[0];
  const resource = `${origin}/mcp`;
  const verifier = "synthetic-verifier-".repeat(4);
  const apiKey = "synthetic-advertiser-download-key";
  const code = await database.store.createAuthorizationCode({
    clientId,
    redirectUri,
    resource,
    codeChallenge: createHash("sha256").update(verifier).digest("base64url"),
    apiKey,
    account: { id: "adacct_vercel_download" },
    scopes: ["ads:read", "ads:write"],
  });
  const tokens = await database.store.exchangeCode({
    code,
    clientId,
    redirectUri,
    resource,
    codeVerifier: verifier,
  });
  const principal = await database.store.authenticate({ token: tokens.access_token, resource });
  const handoff = await database.store.createSecretHandoff({
    grantId: principal.grantId,
    operation: "ads_create_conversion_key",
    value: { api_key: "synthetic-generated-conversion-key" },
  });
  const downloadUrl = `${origin}/credentials/${handoff.id}`;
  const queried = await runtime.fetch(throughVercelRewrites(`${downloadUrl}?caller=value`));
  assert.equal(queried.status, 410);
  await queried.text();

  const page = await runtime.fetch(throughVercelRewrites(downloadUrl));
  const html = await page.text();
  assert.equal(page.status, 200, html);
  assert.match(html, /Download once/);
  assert.doesNotMatch(html, /synthetic-generated-conversion-key/);
  const csrf = html.match(/name="csrf" value="([^"]+)"/)[1];
  const cookie = page.headers.getSetCookie()[0].split(";")[0];
  const downloaded = await runtime.fetch(
    throughVercelRewrites(downloadUrl, {
      method: "POST",
      headers: { origin, "content-type": "application/x-www-form-urlencoded", cookie },
      body: new URLSearchParams({ csrf, api_key: apiKey, action: "download" }),
    }),
  );
  assert.equal(downloaded.status, 200);
  assert.match(downloaded.headers.get("content-disposition"), /^attachment;/);
  assert.deepEqual(await downloaded.json(), { api_key: "synthetic-generated-conversion-key" });
  const replay = await runtime.fetch(throughVercelRewrites(downloadUrl));
  assert.equal(replay.status, 410);
  await replay.text();
});

test("the deployment build includes all runtime data and imports without secrets or database initialization", async (t) => {
  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const temporary = mkdtempSync(join(tmpdir(), "ads-vercel-build-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  for (const item of ["src", "references", "migrations", "api", "package.json"])
    cpSync(join(packageRoot, item), join(temporary, item), { recursive: true });
  symlinkSync(join(packageRoot, "node_modules"), join(temporary, "node_modules"), "dir");
  const first = buildRuntime(temporary);
  const second = buildRuntime(temporary);
  assert.deepEqual(first.files, second.files);
  assert.ok(first.files["references/advertiser-contract.json"]);
  assert.ok(Object.keys(first.files).some((name) => /^migrations\/\d+_.*\.sql$/.test(name)));
  assert.ok(!Object.keys(first.files).some((name) => /\.env|test\//.test(name)));
  const entry = await import(pathToFileURL(join(temporary, "api/index.mjs")).href);
  assert.equal(typeof entry.default.fetch, "function");
  const manifest = JSON.parse(readFileSync(join(packageRoot, "vercel.json"), "utf8"));
  assert.equal(manifest.functions["api/index.mjs"].maxDuration, 120);
  for (const route of [
    "/mcp",
    "/oauth/(.*)",
    "/connections",
    "/credentials/(.*)",
    "/.well-known/(.*)",
    "/internal/prune",
  ])
    assert.ok(
      manifest.rewrites.some(
        (entry) => entry.source === route && entry.destination === "/api/index",
      ),
    );
  assert.equal(manifest.crons[0].path, "/internal/prune");
});
