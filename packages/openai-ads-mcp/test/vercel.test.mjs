import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  const runtime = createVercelHandler({
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
    "/oauth/:path*",
    "/connections",
    "/credentials/:path*",
    "/.well-known/:path*",
    "/internal/prune",
  ])
    assert.ok(
      manifest.rewrites.some(
        (entry) => entry.source === route && entry.destination === "/api/index",
      ),
    );
  assert.equal(manifest.crons[0].path, "/internal/prune");
});
