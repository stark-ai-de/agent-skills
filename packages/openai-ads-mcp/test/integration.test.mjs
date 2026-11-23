import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { request as nodeRequest } from "node:http";
import { createApplication, MCP_REQUEST_BYTES } from "../src/http.mjs";
import { createNodeServer } from "../src/server.mjs";
import { createStore } from "../src/store.mjs";

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

function fixture(t, { blockCampaigns = false } = {}) {
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
  };
  const store = createStore({ databasePath: ":memory:", encryptionKey: randomBytes(32) });
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
      return Response.json({ id: `campaign_${suffix}`, ...JSON.parse(options.body) });
    if (url.pathname === `/v1/campaigns/campaign_${suffix}`)
      return Response.json({ id: `campaign_${suffix}`, status: "paused" });
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
  const application = createApplication({ config, store, fetchImpl });
  t.after(() => application.close());
  return { application, config, calls, pending };
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
  const { application: app, calls } = fixture(t);
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

test("simultaneous MCP calls remain bound to distinct OAuth principals; mismatched account is blocked", async (t) => {
  const { application: app, calls } = fixture(t);
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
  const { application: app } = fixture(t);
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
  const { application: app } = fixture(t);
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
  const { application: app } = fixture(t);
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
  "SSE headers and cancellation cannot bypass the six-operation account limit",
  { timeout: 10000 },
  async (t) => {
    const { application: app, pending, calls } = fixture(t, { blockCampaigns: true });
    const session = await connect(app, "synthetic-advertiser-key-a");
    const call = () =>
      app.handle(
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
        const response = await call();
        assert.equal(response.status, 200);
        open.push(response);
      }
      // Headers are already available while the fake Ads service is still blocked.
      await new Promise(setImmediate);
      assert.equal(pending.length, 6);
      assert.equal((await call()).status, 429);
      await open[0].body.cancel();
      const afterCancel = await call();
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
