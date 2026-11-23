import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { test } from "node:test";
import { createAuth } from "../src/auth.mjs";
import { createTestStore } from "./helpers/database.mjs";

const origin = "https://ads.example";
const resource = `${origin}/mcp`;
const redirectUri = "https://chatgpt.com/connector_platform_oauth_redirect";
const verifier = "v".repeat(64);
const challenge = createHash("sha256").update(verifier).digest("base64url");
const key = "advertiser-key-only-visible-in-the-form-post";
const authParams = {
  response_type: "code",
  client_id: "chatgpt",
  redirect_uri: redirectUri,
  resource,
  code_challenge: challenge,
  code_challenge_method: "S256",
  state: "client-state",
  scope: "ads:read ads:write offline_access",
};
async function fixture(t, options = {}) {
  let clock = 1_800_000_000_000;
  const { store: databaseStore } = await createTestStore(t, {
    encryptionKey: randomBytes(32),
    now: () => clock,
  });
  const { storeOverrides = {}, ...authOptions } = options;
  const store = { ...databaseStore, ...storeOverrides };
  let calls = 0;
  const config = {
    publicOrigin: origin,
    oauthClients: [{ clientId: "chatgpt", redirectUris: [redirectUri] }],
    allowHttpLocalhost: false,
  };
  const auth = createAuth({
    config,
    store,
    verifyAdsKey: async (candidate) => {
      calls++;
      if (candidate !== key) throw new Error(`sensitive upstream response ${candidate}`);
      return {
        id: "adacct_test",
        name: '<img src=x onerror="steal()">',
        currency_code: "EUR",
        timezone: "Europe/Berlin",
      };
    },
    ...authOptions,
  });
  return {
    auth,
    store,
    advance(ms) {
      clock += ms;
    },
    get calls() {
      return calls;
    },
  };
}
const request = (route, params = {}, headers = {}) =>
  new Request(`${origin}${route}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    body: new URLSearchParams(params),
  });
async function start(auth, overrides = {}) {
  const response = await auth.handle(
    new Request(
      `${origin}/oauth/authorize?${new URLSearchParams({ ...authParams, ...overrides })}`,
    ),
  );
  const html = await response.text();
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  return { response, html, cookie, ...fields(html) };
}
function fields(html) {
  return Object.fromEntries(
    [...html.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}
function formActionSources(response) {
  const directive = response.headers
    .get("content-security-policy")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("form-action "));
  return directive?.split(/\s+/).slice(1);
}
async function consent(auth, first, overrides = {}) {
  const response = await auth.handle(
    request(
      "/oauth/authorize",
      { flow: first.flow, csrf: first.csrf, stage: "key", api_key: key, ...overrides },
      { cookie: first.cookie, origin },
    ),
  );
  const html = await response.text();
  return { response, html, cookie: first.cookie, ...fields(html) };
}
async function approve(auth, step, overrides = {}) {
  return auth.handle(
    request(
      "/oauth/authorize",
      {
        flow: step.flow,
        csrf: step.csrf,
        stage: "consent",
        decision: "approve",
        allow_write: "yes",
        ...overrides,
      },
      { cookie: step.cookie, origin },
    ),
  );
}
async function exchange(auth, code, overrides = {}) {
  const response = await auth.handle(
    request("/oauth/token", {
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: "chatgpt",
      redirect_uri: redirectUri,
      resource,
      ...overrides,
    }),
  );
  return { response, data: await response.json() };
}

test("complete authorization requires explicit account consent and returns only opaque credentials", async (t) => {
  const { auth } = await fixture(t);
  const first = await start(auth);
  assert.equal(first.response.status, 200);
  assert.equal(first.response.headers.get("referrer-policy"), "same-origin");
  assert.match(first.response.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Lax/);
  assert.match(first.response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.ok(first.flow && first.csrf);
  const step = await consent(auth, first);
  assert.equal(step.response.status, 200);
  assert.equal(step.response.headers.get("referrer-policy"), "same-origin");
  assert.equal(step.html.includes(key), false);
  assert.ok(step.html.includes("adacct_test"));
  assert.match(step.html, /<dt>Currency<\/dt><dd>EUR<\/dd>/);
  assert.ok(step.html.includes("Europe/Berlin"));
  assert.equal(step.html.includes('<img src=x onerror="steal()">'), false);
  assert.ok(step.html.includes("&lt;img"));
  assert.notEqual(step.csrf, first.csrf);
  const approved = await approve(auth, step);
  assert.equal(approved.status, 303);
  assert.equal(approved.headers.get("referrer-policy"), "no-referrer");
  const callback = new URL(approved.headers.get("location"));
  assert.equal(callback.origin, "https://chatgpt.com");
  assert.equal(callback.searchParams.get("state"), "client-state");
  assert.equal(callback.searchParams.get("iss"), origin);
  const { response, data } = await exchange(auth, callback.searchParams.get("code"));
  assert.equal(response.status, 200);
  assert.equal(JSON.stringify(data).includes(key), false);
  assert.equal(data.scope, "ads:read ads:write offline_access");
  const principal = await auth.authenticate(
    new Request(resource, { headers: { authorization: `Bearer ${data.access_token}` } }),
  );
  assert.equal(principal.accountId, "adacct_test");
  assert.equal(principal.apiKey, key);
  assert.equal(
    await auth.hasBrowserGrant(
      new Request(`${origin}/credentials/x`, { headers: { cookie: step.cookie } }),
      principal.grantId,
    ),
    true,
  );
  assert.equal(
    await auth.authenticate(new Request(`${resource}?access_token=${data.access_token}`)),
    null,
  );
  assert.equal(
    await auth.authenticate(new Request(resource, { headers: { authorization: `Bearer ${key}` } })),
    null,
  );
});

test("approval and denial permit the exact OpenAI callback and Platform relay through form-action CSP", async (t) => {
  const { auth } = await fixture(t);
  for (const decision of ["approve", "deny"]) {
    const step = await consent(auth, await start(auth));
    assert.deepEqual(formActionSources(step.response), [
      "'self'",
      "https://chatgpt.com",
      "https://platform.openai.com",
    ]);
    const redirected = await approve(auth, step, {
      decision,
      redirect_uri: "https://unregistered.example/steal",
    });
    assert.equal(redirected.status, 303);
    assert.deepEqual(formActionSources(redirected), [
      "'self'",
      "https://chatgpt.com",
      "https://platform.openai.com",
    ]);
    const callback = new URL(redirected.headers.get("location"));
    assert.equal(callback.origin, "https://chatgpt.com");
    assert.equal(callback.searchParams.get("iss"), origin);
    assert.equal(callback.searchParams.has("code"), decision === "approve");
    assert.equal(callback.searchParams.get("error"), decision === "deny" ? "access_denied" : null);
  }
});

test("consent CSP isolates the current flow from other registered callback origins", async (t) => {
  const secondCallback = "https://another-client.example:8443/oauth/callback";
  const { auth } = await fixture(t, {
    config: {
      publicOrigin: origin,
      oauthClients: [
        { clientId: "chatgpt", redirectUris: [redirectUri] },
        { clientId: "another-client", redirectUris: [secondCallback] },
      ],
      allowHttpLocalhost: false,
    },
  });
  for (const [clientId, callback] of [
    ["chatgpt", redirectUri],
    ["another-client", secondCallback],
  ]) {
    const step = await consent(
      auth,
      await start(auth, { client_id: clientId, redirect_uri: callback }),
    );
    const expected = [
      "'self'",
      new URL(callback).origin,
      ...(callback === redirectUri ? ["https://platform.openai.com"] : []),
    ];
    assert.deepEqual(formActionSources(step.response), expected);
    assert.deepEqual(formActionSources(await approve(auth, step)), expected);
  }
});

test("key entry, key failure, management and rejected callbacks keep self-only form actions", async (t) => {
  const { auth } = await fixture(t);
  const first = await start(auth);
  assert.deepEqual(formActionSources(first.response), ["'self'"]);
  const failed = await consent(auth, first, { api_key: "invalid-advertiser-key" });
  assert.deepEqual(formActionSources(failed.response), ["'self'"]);
  const management = await auth.handle(new Request(`${origin}/connections`));
  assert.deepEqual(formActionSources(management), ["'self'"]);
  const rejected = await start(auth, { redirect_uri: "https://unregistered.example/steal" });
  assert.equal(rejected.response.status, 400);
  assert.deepEqual(formActionSources(rejected.response), ["'self'"]);
});

test("registered callbacks cannot introduce wildcard or injected CSP sources", async (t) => {
  for (const callback of [
    "https://*.example/callback",
    "https://callback.example;unsafe/callback",
  ]) {
    await assert.rejects(
      () =>
        fixture(t, {
          config: {
            publicOrigin: origin,
            oauthClients: [{ clientId: "chatgpt", redirectUris: [callback] }],
            allowHttpLocalhost: false,
          },
        }),
      /explicit safe origin/,
    );
  }
});

test("client, redirect, resource, PKCE and duplicate parameters are rejected before key entry", async (t) => {
  const f = await fixture(t);
  for (const patch of [
    { client_id: "unknown" },
    { redirect_uri: "https://evil.example" },
    { resource: "https://evil.example/mcp" },
    { code_challenge_method: "plain" },
    { code_challenge: "short" },
    { scope: "ads:admin" },
    { response_type: "token" },
    { state: "" },
  ]) {
    const first = await start(f.auth, patch);
    assert.equal(first.response.status, 400);
    assert.equal(first.response.headers.get("location"), null);
  }
  const duplicate = await f.auth.handle(
    new Request(`${origin}/oauth/authorize?${new URLSearchParams(authParams)}&client_id=other`),
  );
  assert.equal(duplicate.status, 400);
  assert.equal(f.calls, 0);
});

test("cross-site posts, missing cookie and stale CSRF cannot verify or connect an account", async (t) => {
  const f = await fixture(t);
  const first = await start(f.auth);
  const body = { flow: first.flow, csrf: first.csrf, stage: "key", api_key: key };
  for (const headers of [
    { origin: "https://evil.example", cookie: first.cookie },
    { origin: "null", cookie: first.cookie },
    { cookie: first.cookie },
    { origin },
    { origin, cookie: first.cookie },
  ]) {
    const csrf = headers.cookie && headers.origin === origin ? "wrong-csrf" : first.csrf;
    const response = await f.auth.handle(request("/oauth/authorize", { ...body, csrf }, headers));
    assert.equal(response.status, 403);
  }
  assert.equal(f.calls, 0);
  const step = await consent(f.auth, first);
  assert.equal((await approve(f.auth, { ...step, csrf: first.csrf })).status, 403);
  assert.equal((await approve(f.auth, step)).status, 303);
  assert.equal((await approve(f.auth, step)).status, 403);
});

test("key verification failures never echo secrets; repeated failures are limited", async (t) => {
  const f = await fixture(t);
  const first = await start(f.auth);
  for (let i = 0; i < 5; i++) {
    const failed = await consent(f.auth, first, { api_key: "invalid-secret-in-input" });
    assert.equal(failed.response.status, 401);
    assert.equal(failed.html.includes("invalid-secret-in-input"), false);
    assert.equal(failed.html.includes("sensitive upstream"), false);
  }
  const limited = await consent(f.auth, first);
  assert.equal(limited.response.status, 429);
  assert.equal(f.calls, 5);
});

test("consent can decline writes or deny all access", async (t) => {
  const { auth } = await fixture(t);
  const first = await start(auth);
  const step = await consent(auth, first);
  const response = await approve(auth, step, { allow_write: "" });
  const { data } = await exchange(
    auth,
    new URL(response.headers.get("location")).searchParams.get("code"),
  );
  assert.equal(data.scope, "ads:read offline_access");
  const denied = await approve(auth, await consent(auth, await start(auth)), { decision: "deny" });
  const location = new URL(denied.headers.get("location"));
  assert.equal(location.searchParams.get("error"), "access_denied");
  assert.equal(location.searchParams.get("iss"), origin);
  assert.equal(location.searchParams.has("code"), false);
});

test("metadata declares fixed clients, S256 and resource-specific OAuth; unknown methods fail", async (t) => {
  const { auth } = await fixture(t);
  const authorization = await (
    await auth.handle(new Request(`${origin}/.well-known/oauth-authorization-server`))
  ).json();
  assert.equal(authorization.issuer, origin);
  assert.deepEqual(authorization.code_challenge_methods_supported, ["S256"]);
  assert.deepEqual(authorization.token_endpoint_auth_methods_supported, ["none"]);
  assert.equal(authorization.registration_endpoint, undefined);
  assert.equal(authorization.authorization_response_iss_parameter_supported, true);
  const protectedResource = await (
    await auth.handle(new Request(`${origin}/.well-known/oauth-protected-resource/mcp`))
  ).json();
  assert.equal(protectedResource.resource, resource);
  assert.deepEqual(protectedResource.authorization_servers, [origin]);
  assert.equal((await auth.handle(new Request(`${origin}/oauth/token`))).status, 405);
  assert.equal(await auth.handle(new Request(`${origin}/health`)), null);
});

test("token endpoints enforce resource/client binding and revocation invalidates access", async (t) => {
  const { auth } = await fixture(t);
  const approved = await approve(auth, await consent(auth, await start(auth)));
  const code = new URL(approved.headers.get("location")).searchParams.get("code");
  assert.equal(
    (await exchange(auth, code, { resource: "https://evil.example/mcp" })).response.status,
    400,
  );
  assert.equal(
    (await exchange(auth, code, { code_verifier: "x".repeat(64) })).response.status,
    400,
  );
  const { data } = await exchange(auth, code);
  const refresh = await auth.handle(
    request("/oauth/token", {
      grant_type: "refresh_token",
      refresh_token: data.refresh_token,
      client_id: "chatgpt",
      resource,
    }),
  );
  assert.equal(refresh.status, 200);
  const next = await refresh.json();
  const revoked = await auth.handle(
    request("/oauth/revoke", { token: next.refresh_token, client_id: "chatgpt" }),
  );
  assert.equal(revoked.status, 200);
  assert.equal(
    await auth.authenticate(
      new Request(resource, { headers: { authorization: `Bearer ${next.access_token}` } }),
    ),
    null,
  );
});

test("expired authorization transactions and oversized form bodies are rejected", async (t) => {
  const f = await fixture(t);
  const first = await start(f.auth);
  f.advance(11 * 60_000);
  assert.equal((await consent(f.auth, first)).response.status, 403);
  const response = await f.auth.handle(request("/oauth/token", { code: "x".repeat(70_000) }));
  assert.equal(response.status, 413);
});

test("connection management requires cookie and CSRF; the same Ads key can unlock and disconnect later", async (t) => {
  const f = await fixture(t);
  const step = await consent(f.auth, await start(f.auth));
  const approved = await approve(f.auth, step);
  const { data } = await exchange(
    f.auth,
    new URL(approved.headers.get("location")).searchParams.get("code"),
  );
  const principal = await f.auth.authenticate(
    new Request(resource, { headers: { authorization: `Bearer ${data.access_token}` } }),
  );
  f.advance(61 * 60_000);
  const management = await f.auth.handle(new Request(`${origin}/connections`));
  assert.equal(management.headers.get("referrer-policy"), "same-origin");
  const cookie = management.headers.get("set-cookie").split(";")[0];
  const html = await management.text();
  assert.equal(html.includes("adacct_test"), false);
  const form = fields(html);
  assert.equal(
    (
      await f.auth.handle(
        request(
          "/connections",
          { ...form, stage: "unlock", api_key: key },
          { cookie, origin: "https://evil.example" },
        ),
      )
    ).status,
    403,
  );
  const unlocked = await f.auth.handle(
    request("/connections", { ...form, stage: "unlock", api_key: key }, { cookie, origin }),
  );
  const unlockedHtml = await unlocked.text();
  assert.equal(unlocked.status, 200);
  assert.equal(unlockedHtml.includes(key), false);
  assert.ok(unlockedHtml.includes("adacct_test"));
  const next = fields(unlockedHtml);
  const revoked = await f.auth.handle(
    request(
      "/connections",
      { ...next, stage: "revoke", grant_id: principal.grantId },
      { cookie, origin },
    ),
  );
  assert.equal(revoked.status, 200);
  assert.equal(await f.store.matchesGrantKey(principal.grantId, key), false);
  const refresh = await f.auth.handle(
    request("/oauth/token", {
      grant_type: "refresh_token",
      client_id: "chatgpt",
      resource,
      refresh_token: data.refresh_token,
    }),
  );
  assert.equal(refresh.status, 400);
});

test("two browser sessions cannot approve or manage each other's grant", async (t) => {
  const { auth } = await fixture(t);
  const one = await start(auth);
  const two = await start(auth);
  assert.notEqual(one.cookie, two.cookie);
  const switched = await consent(auth, { ...one, cookie: two.cookie });
  assert.equal(switched.response.status, 403);
  const step = await consent(auth, one);
  const approved = await approve(auth, step);
  const { data } = await exchange(
    auth,
    new URL(approved.headers.get("location")).searchParams.get("code"),
  );
  const principal = await auth.authenticate(
    new Request(resource, { headers: { authorization: `Bearer ${data.access_token}` } }),
  );
  assert.equal(
    await auth.hasBrowserGrant(
      new Request(`${origin}/connections`, { headers: { cookie: two.cookie } }),
      principal.grantId,
    ),
    false,
  );
  const management = await auth.handle(
    new Request(`${origin}/connections`, { headers: { cookie: two.cookie } }),
  );
  const form = fields(await management.text());
  const revoked = await auth.handle(
    request(
      "/connections",
      { ...form, stage: "revoke", grant_id: principal.grantId },
      { cookie: two.cookie, origin },
    ),
  );
  assert.equal(revoked.status, 403);
  assert.ok(
    await auth.authenticate(
      new Request(resource, { headers: { authorization: `Bearer ${data.access_token}` } }),
    ),
  );
});

test("a promised false browser grant never authorizes a session", async (t) => {
  let checks = 0;
  const { auth } = await fixture(t, {
    storeOverrides: {
      hasBrowserGrant: async () => {
        checks++;
        return false;
      },
    },
  });
  assert.equal(
    await auth.hasBrowserGrant(
      new Request(`${origin}/connections`, {
        headers: { cookie: `__Host-stark_ads_oauth=${"a".repeat(43)}` },
      }),
      "unrelated-grant",
    ),
    false,
  );
  assert.equal(checks, 1);
});

test("a promised rate limit denial prevents creation of an authorization transaction", async (t) => {
  let created = 0;
  const { auth } = await fixture(t, {
    storeOverrides: {
      allowRate: async () => false,
      createFlow: async () => {
        created++;
        throw new Error("A denied request must not create a flow.");
      },
    },
  });
  assert.equal((await start(auth)).response.status, 429);
  assert.equal(created, 0);
});

test("a consent flow must be consumed successfully before a grant can be created", async (t) => {
  let created = 0;
  const { auth } = await fixture(t, {
    storeOverrides: {
      consumeFlow: async () => null,
      createAuthorizationCode: async () => {
        created++;
        throw new Error("An unconsumed flow must not authorize a grant.");
      },
    },
  });
  const step = await consent(auth, await start(auth));
  assert.equal(step.response.status, 200);
  assert.equal((await approve(auth, step)).status, 403);
  assert.equal(created, 0);
});

test("concurrent approval consumes a consent transaction once", async (t) => {
  const { auth } = await fixture(t);
  const step = await consent(auth, await start(auth));
  const responses = await Promise.all([approve(auth, step), approve(auth, step)]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [303, 403]);
  const callback = new URL(
    responses.find((response) => response.status === 303).headers.get("location"),
  );
  const result = await exchange(auth, callback.searchParams.get("code"));
  assert.equal(result.response.status, 200);
  assert.equal((await exchange(auth, callback.searchParams.get("code"))).response.status, 400);
});
