import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { request as nodeRequest } from "node:http";
import {
  createApplication,
  MCP_REQUEST_BYTES,
  MCP_RESPONSE_BYTES,
  ADS_RESPONSE_BYTES,
} from "../src/http.mjs";
import { createNodeServer } from "../src/server.mjs";
import { createTestStore } from "./helpers/database.mjs";

const origin = "https://ads.example.test";
const redirectUri = "https://chatgpt.com/connector_platform_oauth_redirect";
const verifier = "test-pkce-proof-".repeat(5);
const fields = (html) =>
  Object.fromEntries(
    [...html.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );

async function fixture(
  t,
  { blockCampaigns = false, responsePadding = 0, ...applicationOptions } = {},
) {
  const calls = [];
  const pending = [];
  const config = {
    publicOrigin: origin,
    allowedOrigins: [origin, "https://chatgpt.com"],
    oauthClients: [{ clientId: "chatgpt", redirectUris: [redirectUri] }],
    allowHttpLocalhost: false,
    openaiAppsChallenge: "synthetic-challenge",
    port: 8789,
    host: "127.0.0.1",
    cronSecret: "synthetic-cron-secret-".repeat(3),
  };
  const database = await createTestStore(t);
  const store = database.store;
  const fetchImpl = async (url, options) => {
    assert.equal(url.origin, "https://api.ads.openai.com");
    assert.equal(options.redirect, "error");
    const key = options.headers.Authorization.slice(7);
    const suffix =
      key === "synthetic-advertiser-key-a"
        ? "a"
        : key === "synthetic-advertiser-key-b"
          ? "b"
          : null;
    calls.push({ path: url.pathname, method: options.method, account: suffix });
    if (!suffix) return Response.json({ error: { message: "Invalid key" } }, { status: 401 });
    if (url.pathname === "/v1/ad_account")
      return Response.json({
        id: `adacct_${suffix}`,
        name: `Account ${suffix}`,
        currency_code: "EUR",
        timezone: "Europe/Berlin",
      });
    if (url.pathname === "/v1/campaigns" && options.method === "GET") {
      if (blockCampaigns) await new Promise((resolve) => pending.push(resolve));
      await new Promise((resolve) => setTimeout(resolve, suffix === "a" ? 8 : 1));
      return Response.json({
        data: [{ id: `campaign_${suffix}`, name: `Campaign ${suffix}` }],
        has_more: false,
      });
    }
    if (url.pathname === "/v1/campaigns" && options.method === "POST")
      return Response.json({
        id: `campaign_${suffix}`,
        ...JSON.parse(options.body),
        ...(responsePadding ? { padding: "x".repeat(responsePadding) } : {}),
      });
    if (url.pathname === `/v1/campaigns/campaign_${suffix}`)
      return Response.json({
        id: `campaign_${suffix}`,
        status: "paused",
        ...(responsePadding ? { padding: "x".repeat(responsePadding) } : {}),
      });
    if (url.pathname === "/v1/conversions/api_keys" && options.method === "POST")
      return Response.json({
        id: "capi_test",
        name: "Test integration",
        api_key: "generated-synthetic-capi-secret",
      });
    if (url.pathname === "/v1/uploads" && options.method === "POST") {
      assert.equal(options.body.get("file").size, 2 * 1024 * 1024);
      return Response.json({ id: "file_test", file_id: "file_test" });
    }
    throw new Error("Unexpected synthetic upstream operation.");
  };
  const application = await createApplication({ config, store, fetchImpl, ...applicationOptions });
  t.after(() => application.close());
  return { application, config, calls, pending, database, fetchImpl };
}

async function postForm(app, path, values, cookie) {
  return app.handle(
    new Request(`${origin}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...(cookie ? { cookie, origin } : {}),
      },
      body: new URLSearchParams(values),
    }),
  );
}

async function connect(app, key, write = true) {
  const query = new URLSearchParams({
    response_type: "code",
    client_id: "chatgpt",
    redirect_uri: redirectUri,
    resource: `${origin}/mcp`,
    scope: "ads:read ads:write offline_access",
    state: randomBytes(16).toString("hex"),
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  });
  const first = await app.handle(new Request(`${origin}/oauth/authorize?${query}`));
  assert.equal(first.status, 200, await first.clone().text());
  const cookie = first.headers.getSetCookie()[0].split(";")[0];
  const keyStep = await postForm(
    app,
    "/oauth/authorize",
    { ...fields(await first.text()), api_key: key },
    cookie,
  );
  assert.equal(keyStep.status, 200, await keyStep.clone().text());
  const approved = await postForm(
    app,
    "/oauth/authorize",
    { ...fields(await keyStep.text()), decision: "approve", allow_write: write ? "yes" : "" },
    cookie,
  );
  assert.equal(approved.status, 303, await approved.clone().text());
  const callback = new URL(approved.headers.get("location"));
  const exchanged = await postForm(app, "/oauth/token", {
    grant_type: "authorization_code",
    code: callback.searchParams.get("code"),
    client_id: "chatgpt",
    redirect_uri: redirectUri,
    resource: `${origin}/mcp`,
    code_verifier: verifier,
  });
  assert.equal(exchanged.status, 200, await exchanged.clone().text());
  return { ...(await exchanged.json()), cookie };
}

async function rpc(app, token, method, params = {}) {
  const response = await app.handle(
    new Request(`${origin}/mcp`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  const text = await response.text();
  assert.equal(response.status, 200, text);
  const line = text.split("\n").find((value) => value.startsWith("data:"));
  return JSON.parse(line ? line.slice(5).trim() : text);
}

test("real OAuth-to-MCP path discovers tools, reads the connected account and enforces read-only scope", async (t) => {
  const { application: app, calls } = await fixture(t);
  const anonymous = await app.handle(new Request(`${origin}/mcp`, { method: "POST" }));
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get("www-authenticate"), /oauth-protected-resource\/mcp/);
  const discovery = await (
    await app.handle(new Request(`${origin}/.well-known/oauth-protected-resource/mcp`))
  ).json();
  assert.equal(discovery.resource, `${origin}/mcp`);
  assert.equal(calls.length, 0);
  const session = await connect(app, "synthetic-advertiser-key-a", false);
  const init = await rpc(app, session.access_token, "initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "integration-test", version: "1" },
  });
  assert.equal(init.result.serverInfo.name, "stark-ai-ads");
  const tools = (await rpc(app, session.access_token, "tools/list")).result.tools;
  assert.ok(tools.some((tool) => tool.name === "ads_submit_bulk_job"));
  assert.ok(tools.some((tool) => tool.name === "ads_create_conversion_key"));
  const report = await rpc(app, session.access_token, "tools/call", {
    name: "ads_list_campaigns",
    arguments: { expected_account_id: "adacct_a" },
  });
  assert.equal(report.result.structuredContent.data.data[0].id, "campaign_a");
  const write = await rpc(app, session.access_token, "tools/call", {
    name: "ads_create_campaign",
    arguments: {
      expected_account_id: "adacct_a",
      idempotency_key: "test-campaign-1",
      body: {
        name: "Test campaign",
        status: "paused",
        budget: { daily_spend_limit_micros: 1000000 },
      },
    },
  });
  assert.equal(write.result.structuredContent.error.code, "insufficient_scope");
  assert.equal(calls.filter((call) => call.method === "POST").length, 0);
});

test("allowed browser origins can preflight and call modern MCP with required metadata headers", async (t) => {
  const { application: app, calls } = await fixture(t);
  const browserOrigin = "https://chatgpt.com";
  const requestedHeaders = [
    "authorization",
    "content-type",
    "mcp-protocol-version",
    "mcp-method",
    "mcp-name",
  ];
  const preflight = await app.handle(
    new Request(`${origin}/mcp`, {
      method: "OPTIONS",
      headers: {
        origin: browserOrigin,
        "access-control-request-method": "POST",
        "access-control-request-headers": requestedHeaders.join(", "),
      },
    }),
  );
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), browserOrigin);
  const allowedHeaders = preflight.headers
    .get("access-control-allow-headers")
    .toLowerCase()
    .split(/,\s*/);
  for (const header of requestedHeaders) assert.ok(allowedHeaders.includes(header), header);

  const session = await connect(app, "synthetic-advertiser-key-a", false);
  async function modern(method, params = {}, headers = {}) {
    return app.handle(
      new Request(`${origin}/mcp`, {
        method: "POST",
        headers: {
          origin: browserOrigin,
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2026-07-28",
          "mcp-method": method,
          ...(params.name ? { "mcp-name": params.name } : {}),
          ...headers,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params: {
            ...params,
            _meta: {
              "io.modelcontextprotocol/protocolVersion": "2026-07-28",
              "io.modelcontextprotocol/clientInfo": { name: "browser-test", version: "1" },
              "io.modelcontextprotocol/clientCapabilities": {},
            },
          },
        }),
      }),
    );
  }
  async function result(response) {
    const text = await response.text();
    assert.equal(response.status, 200, text);
    assert.equal(response.headers.get("access-control-allow-origin"), browserOrigin);
    const line = text.split("\n").find((value) => value.startsWith("data:"));
    return JSON.parse(line ? line.slice(5).trim() : text).result;
  }
  const discovery = await result(await modern("server/discover"));
  assert.ok(discovery.supportedVersions.includes("2026-07-28"));
  assert.equal(discovery._meta["io.modelcontextprotocol/serverInfo"].name, "stark-ai-ads");
  const params = {
    name: "ads_list_campaigns",
    arguments: { expected_account_id: "adacct_a" },
  };
  const report = await result(await modern("tools/call", params));
  assert.equal(report.structuredContent.data.data[0].id, "campaign_a");
  const before = calls.length;
  const mismatch = await modern("tools/call", params, { "mcp-name": "ads_create_campaign" });
  assert.equal(mismatch.status, 400);
  assert.equal((await mismatch.json()).error.code, -32020);
  assert.equal(calls.length, before);
  const blocked = await app.handle(
    new Request(`${origin}/mcp`, {
      method: "OPTIONS",
      headers: { origin: "https://untrusted.example", "access-control-request-method": "POST" },
    }),
  );
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);
});

test("simultaneous MCP calls remain bound to distinct OAuth principals; mismatched account is blocked", async (t) => {
  const { application: app, calls } = await fixture(t);
  const a = await connect(app, "synthetic-advertiser-key-a");
  const b = await connect(app, "synthetic-advertiser-key-b");
  const outputs = await Promise.all(
    Array.from({ length: 8 }, (_, index) => {
      const suffix = index % 2 ? "a" : "b";
      return rpc(app, suffix === "a" ? a.access_token : b.access_token, "tools/call", {
        name: "ads_list_campaigns",
        arguments: { expected_account_id: `adacct_${suffix}` },
      }).then((output) => ({ suffix, output }));
    }),
  );
  for (const { suffix, output } of outputs)
    assert.equal(output.result.structuredContent.data.data[0].id, `campaign_${suffix}`);
  const count = calls.length;
  const mismatch = await rpc(app, a.access_token, "tools/call", {
    name: "ads_list_campaigns",
    arguments: { expected_account_id: "adacct_b" },
  });
  assert.equal(mismatch.result.structuredContent.error.code, "account_mismatch");
  assert.equal(calls.length, count);
});

test("authorized writes read back state and generated secrets require the authenticated browser handoff", async (t) => {
  const { application: app } = await fixture(t);
  const session = await connect(app, "synthetic-advertiser-key-a");
  const write = await rpc(app, session.access_token, "tools/call", {
    name: "ads_create_campaign",
    arguments: {
      expected_account_id: "adacct_a",
      idempotency_key: "create-test",
      body: {
        name: "Test campaign",
        status: "paused",
        budget: { daily_spend_limit_micros: 1000000 },
      },
    },
  });
  assert.equal(write.result.structuredContent.verification.status, "read_back");
  const credential = await rpc(app, session.access_token, "tools/call", {
    name: "ads_create_conversion_key",
    arguments: { expected_account_id: "adacct_a", body: { name: "Test integration" } },
  });
  assert.ok(!JSON.stringify(credential).includes("generated-synthetic-capi-secret"));
  const url = credential.result.structuredContent.credential.url;
  const page = await app.handle(new Request(url, { headers: { cookie: session.cookie } }));
  const csrfCookie = page.headers.getSetCookie()[0].split(";")[0];
  const html = await page.text();
  const downloaded = await postForm(
    app,
    new URL(url).pathname,
    fields(html),
    `${session.cookie}; ${csrfCookie}`,
  );
  assert.equal(downloaded.status, 200, await downloaded.clone().text());
  assert.equal((await downloaded.json()).api_key, "generated-synthetic-capi-secret");
  assert.equal((await app.handle(new Request(url))).status, 410);
});

test("HTTP guards reject hostile origins, encoded/oversized bodies and invalid token query strings", async (t) => {
  const { application: app } = await fixture(t);
  const session = await connect(app, "synthetic-advertiser-key-a");
  const headers = {
    authorization: `Bearer ${session.access_token}`,
    "content-type": "application/json",
  };
  assert.equal(
    (
      await app.handle(
        new Request(`${origin}/mcp`, {
          method: "POST",
          headers: { ...headers, origin: "https://evil.example" },
          body: "{}",
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await app.handle(
        new Request(`${origin}/mcp`, {
          method: "POST",
          headers: { ...headers, "content-encoding": "gzip" },
          body: "{}",
        }),
      )
    ).status,
    415,
  );
  assert.equal(
    (
      await app.handle(
        new Request(`${origin}/mcp`, {
          method: "POST",
          headers,
          body: "x".repeat(MCP_REQUEST_BYTES + 1),
        }),
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await app.handle(
        new Request(`${origin}/mcp?access_token=${session.access_token}`, {
          method: "POST",
          headers,
          body: "{}",
        }),
      )
    ).status,
    400,
  );
  const health = await app.handle(new Request(`${origin}/health`));
  assert.equal(health.headers.get("cache-control"), "no-store");
  assert.equal(health.headers.get("strict-transport-security"), "max-age=31536000");
});

test("the advertised maximum audience file fits the bounded MCP envelope", async (t) => {
  const { application: app } = await fixture(t);
  const session = await connect(app, "synthetic-advertiser-key-a");
  const result = await rpc(app, session.access_token, "tools/call", {
    name: "ads_upload_audience_file",
    arguments: {
      expected_account_id: "adacct_a",
      filename: "synthetic.csv",
      mimetype: "text/csv",
      content_base64: Buffer.alloc(2 * 1024 * 1024, "a").toString("base64"),
    },
  });
  assert.equal(result.result.structuredContent.ok, true, JSON.stringify(result));
  assert.equal(result.result.structuredContent.data.file_size, 2 * 1024 * 1024);
});

test(
  "SSE cancellation cannot bypass six shared operations across separate application instances",
  { timeout: 10000 },
  async (t) => {
    const {
      application: app,
      pending,
      calls,
      database,
      config,
      fetchImpl,
    } = await fixture(t, { blockCampaigns: true });
    const second = await createApplication({
      config,
      store: await database.openStore(),
      fetchImpl,
    });
    t.after(() => second.close());
    const session = await connect(app, "synthetic-advertiser-key-a");
    const call = (target = app) =>
      target.handle(
        new Request(`${origin}/mcp`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${session.access_token}`,
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
            "mcp-protocol-version": "2025-11-25",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "ads_list_campaigns", arguments: { expected_account_id: "adacct_a" } },
          }),
        }),
      );
    const open = [];
    try {
      for (let index = 0; index < 6; index++) {
        const response = await call(index % 2 ? second : app);
        assert.equal(response.status, 200);
        open.push(response);
      }
      // Headers are already available while the fake Ads service is still blocked.
      for (let attempt = 0; pending.length < 6 && attempt < 100; attempt++)
        await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(pending.length, 6);
      assert.equal((await call(second)).status, 429);
      await open[0].body.cancel();
      const afterCancel = await call(second);
      const text = await afterCancel.text();
      assert.equal(afterCancel.status, 200);
      assert.match(text, /rate_limited/);
      assert.equal(calls.filter((entry) => entry.path === "/v1/campaigns").length, 6);
    } finally {
      for (const resolve of pending) resolve();
      await Promise.all(open.slice(1).map((response) => response.text()));
    }
  },
);

test("oversized write results stay bounded and explicitly retain an uncertain outcome", async (t) => {
  // First case is a bounded API response + readback exceeding the combined result
  // limit; second is a single API response exceeding its upstream limit.
  for (const responsePadding of [600 * 1024, ADS_RESPONSE_BYTES + 1]) {
    const { application: app, calls } = await fixture(t, { responsePadding });
    const session = await connect(app, "synthetic-advertiser-key-a");
    const result = await rpc(app, session.access_token, "tools/call", {
      name: "ads_create_campaign",
      arguments: {
        expected_account_id: "adacct_a",
        idempotency_key: `bounded-${responsePadding}`,
        body: {
          name: "Bounded result",
          status: "paused",
          budget: { daily_spend_limit_micros: 1000000 },
        },
      },
    });
    assert.equal(result.result.structuredContent.error.code, "response_too_large");
    assert.equal(result.result.structuredContent.error.uncertain, true);
    assert.match(
      result.result.structuredContent.error.message,
      /Inspect resource\/job state before any retry/,
    );
    assert.equal(calls.filter((call) => call.method === "POST").length, 1);
    assert.ok(Buffer.byteLength(JSON.stringify(result)) < 10000);
  }
});

const deadlinePrincipal = {
  grantId: "synthetic-deadline-grant",
  accountId: "adacct_a",
  apiKey: "synthetic-advertiser-key-a",
  scopes: ["ads:read"],
};
const deadlineAuth = { handle: async () => null, authenticate: async () => deadlinePrincipal };
const deadlineConfig = { publicOrigin: origin, allowedOrigins: [origin] };
const deadlineRequest = () =>
  new Request(`${origin}/mcp`, {
    method: "POST",
    headers: {
      authorization: "Bearer synthetic",
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-11-25",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "ads_list_campaigns",
        arguments: { expected_account_id: "adacct_a" },
      },
    }),
  });

test(
  "the operation deadline bounds the entire account-check plus resource call",
  { timeout: 5000 },
  async (t) => {
    const database = await createTestStore(t);
    const paths = [];
    let aborts = 0;
    const app = await createApplication({
      config: deadlineConfig,
      store: database.store,
      auth: deadlineAuth,
      requestTimeoutMs: 2000,
      operationTimeoutMs: 250,
      fetchImpl: async (url, { signal }) => {
        paths.push(url.pathname);
        await new Promise((resolve, reject) => {
          const aborted = () => {
            clearTimeout(timer);
            aborts++;
            reject(signal.reason);
          };
          const timer = setTimeout(() => {
            signal.removeEventListener("abort", aborted);
            resolve();
          }, 160);
          signal.addEventListener("abort", aborted, { once: true });
          if (signal.aborted) aborted();
        });
        return url.pathname === "/v1/ad_account"
          ? Response.json({ id: "adacct_a", currency_code: "EUR", timezone: "Europe/Berlin" })
          : Response.json({ data: [], has_more: false });
      },
    });
    t.after(() => app.close());
    const response = await app.handle(deadlineRequest());
    const output = await response.text();
    assert.match(output, /transport_error/);
    assert.deepEqual(paths, ["/v1/ad_account", "/v1/campaigns"]);
    assert.equal(aborts, 1);
    assert.equal(
      (await database.query("SELECT count(*)::int AS count FROM ads_leases")).rows[0].count,
      0,
    );
  },
);

test(
  "a request lease acquired after its deadline is released once without starting Ads work",
  { timeout: 5000 },
  async (t) => {
    const database = await createTestStore(t);
    let resumeAcquire;
    const gate = new Promise((resolve) => {
      resumeAcquire = resolve;
    });
    let acquired;
    const acquiredPromise = new Promise((resolve) => {
      acquired = resolve;
    });
    let releases = 0;
    let released;
    const releasedPromise = new Promise((resolve) => {
      released = resolve;
    });
    let upstream = 0;
    const store = {
      ...database.store,
      async acquireLease(input) {
        const id = await database.store.acquireLease(input);
        acquired();
        await gate;
        return id;
      },
      async releaseLease(id) {
        releases++;
        await database.store.releaseLease(id);
        released();
      },
    };
    const app = await createApplication({
      config: deadlineConfig,
      store,
      auth: deadlineAuth,
      requestTimeoutMs: 150,
      operationTimeoutMs: 100,
      fetchImpl: async () => {
        upstream++;
        throw new Error("Must not start after deadline.");
      },
    });
    t.after(() => app.close());
    // A referenced timer models a pending database acquisition keeping the process alive.
    const keepAlive = setTimeout(() => resumeAcquire(), 2000);
    try {
      const responsePromise = app.handle(deadlineRequest());
      await acquiredPromise;
      const response = await responsePromise;
      assert.equal(response.status, 504);
      assert.match(await response.text(), /timed out/);
      assert.equal(
        (await database.query("SELECT count(*)::int AS count FROM ads_leases")).rows[0].count,
        1,
      );
      resumeAcquire();
      await releasedPromise;
      assert.equal(releases, 1);
      assert.equal(upstream, 0);
      assert.equal(
        (await database.query("SELECT count(*)::int AS count FROM ads_leases")).rows[0].count,
        0,
      );
    } finally {
      clearTimeout(keepAlive);
      resumeAcquire();
    }
  },
);

test(
  "response deadlines and byte limits do not wait for an unresponsive stream cancellation hook",
  { timeout: 5000 },
  async (t) => {
    const database = await createTestStore(t);
    let cancellations = 0;
    const app = await createApplication({
      config: deadlineConfig,
      store: database.store,
      requestTimeoutMs: 200,
      operationTimeoutMs: 100,
      auth: {
        handle: async (request) =>
          new Response(
            new ReadableStream({
              start(controller) {
                if (new URL(request.url).pathname === "/oversize")
                  controller.enqueue(new Uint8Array(MCP_RESPONSE_BYTES + 1));
              },
              cancel() {
                cancellations++;
                return new Promise(() => {});
              },
            }),
          ),
      },
    });
    t.after(() => app.close());
    const keepAlive = setTimeout(() => {}, 2000);
    try {
      const oversized = await app.handle(new Request(`${origin}/oversize`));
      await assert.rejects(oversized.text(), /delivery limit/);
      const silent = await app.handle(new Request(`${origin}/silent`));
      await assert.rejects(silent.text(), /timed out/);
      assert.equal(cancellations, 2);
    } finally {
      clearTimeout(keepAlive);
    }
  },
);

test("native HTTP adapter rejects host spoofing and replaces caller-supplied proxy identity", async (t) => {
  const config = { publicOrigin: origin };
  let observed;
  const server = createNodeServer({
    config,
    application: {
      handle: async (request) => {
        observed = request;
        return new Response("ok", {
          headers: [
            ["set-cookie", "first=1; Path=/"],
            ["set-cookie", "second=2; Path=/"],
          ],
        });
      },
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const send = (host) =>
    new Promise((resolve, reject) => {
      const req = nodeRequest(
        {
          hostname: "127.0.0.1",
          port: server.address().port,
          path: "/",
          headers: { host, "x-ads-client-address": "attacker", "x-forwarded-for": "attacker" },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res));
        },
      );
      req.on("error", reject);
      req.end();
    });
  assert.equal((await send("evil.example")).statusCode, 400);
  const response = await send("ads.example.test");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.headers["set-cookie"], ["first=1; Path=/", "second=2; Path=/"]);
  assert.equal(observed.headers.get("x-ads-client-address"), "127.0.0.1");
  assert.equal(observed.headers.get("x-forwarded-for"), null);
});
