import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { createCredentialService } from "../src/credentials.mjs";
import { createTestStore } from "./helpers/database.mjs";

async function fixture(t, { storeOverrides = {}, authOverrides = {} } = {}) {
  const config = { publicOrigin: "https://ads.example.test", allowHttpLocalhost: false };
  const { store: databaseStore, openStore } = await createTestStore(t, {
    encryptionKey: randomBytes(32),
  });
  const verifier = "v".repeat(64);
  const resource = `${config.publicOrigin}/mcp`;
  const redirectUri = "https://chatgpt.com/connector_platform_oauth_redirect";
  const code = await databaseStore.createAuthorizationCode({
    clientId: "chatgpt",
    redirectUri,
    resource,
    codeChallenge: createHash("sha256").update(verifier).digest("base64url"),
    apiKey: "test-advertiser-secret",
    account: { id: "adacct_credentials" },
    scopes: ["ads:read", "ads:write", "offline_access"],
  });
  const tokens = await databaseStore.exchangeCode({
    code,
    clientId: "chatgpt",
    redirectUri,
    resource,
    codeVerifier: verifier,
  });
  const principal = await databaseStore.authenticate({ token: tokens.access_token, resource });
  const store = { ...databaseStore, ...storeOverrides };
  const auth = {
    hasBrowserGrant: async (request, grant) =>
      grant === principal.grantId && request.headers.get("x-test-browser") === "verified",
    ...authOverrides,
  };
  const service = createCredentialService({ config, store, auth });
  const handoff = await service.createHandoff({
    principal,
    operation: "create_conversion_api_key",
    value: { api_key: "new-conversion-secret" },
  });
  const id = new URL(handoff.url).pathname.split("/").at(-1);
  return { id, handoff, principal, config, store, openStore, auth, service };
}

async function form(service, id, extra = {}) {
  const page = await service.handle(
    new Request(`https://ads.example.test/credentials/${id}`, { headers: extra }),
  );
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.ok(!html.includes("new-conversion-secret"));
  assert.equal(page.headers.get("cache-control"), "no-store");
  return {
    html,
    csrf: html.match(/name="csrf" value="([^"]+)"/)[1],
    cookie: page.headers.get("set-cookie").split(";")[0],
  };
}

function download(id, { csrf, cookie }, extra = {}, key = "") {
  return new Request(`https://ads.example.test/credentials/${id}`, {
    method: "POST",
    headers: {
      origin: "https://ads.example.test",
      "content-type": "application/x-www-form-urlencoded",
      cookie,
      ...extra,
    },
    body: new URLSearchParams({ csrf, api_key: key, action: "download" }),
  });
}

test("handoff URL and OAuth bearer alone never disclose generated credentials", async (t) => {
  const { service, id, handoff } = await fixture(t);
  assert.equal(handoff.url, `https://ads.example.test/credentials/${id}`);
  assert.ok(!JSON.stringify(handoff).includes("new-conversion-secret"));
  const fields = await form(service, id);
  const denied = await service.handle(
    download(id, fields, { authorization: "Bearer model-visible-token" }),
  );
  assert.equal(denied.status, 401);
  assert.ok(!(await denied.text()).includes("new-conversion-secret"));
});

test("browser-bound grant permits one explicit POST download and prevents replay", async (t) => {
  const { service, id } = await fixture(t);
  const fields = await form(service, id, { "x-test-browser": "verified" });
  const response = await service.handle(download(id, fields, { "x-test-browser": "verified" }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition"), /^attachment;/);
  assert.deepEqual(await response.json(), { api_key: "new-conversion-secret" });
  assert.equal(
    (await service.handle(download(id, fields, { "x-test-browser": "verified" }))).status,
    410,
  );
});

test("key reauthentication permits retrieval but CSRF and cross-origin downloads fail", async (t) => {
  const { service, id } = await fixture(t);
  const fields = await form(service, id);
  assert.equal(
    (await service.handle(download(id, { ...fields, csrf: "wrong" }, {}, "test-advertiser-secret")))
      .status,
    403,
  );
  assert.equal(
    (
      await service.handle(
        download(id, fields, { origin: "https://evil.example" }, "test-advertiser-secret"),
      )
    ).status,
    403,
  );
  assert.equal((await service.handle(download(id, fields, {}, "wrong-key"))).status, 401);
  assert.equal(
    (await service.handle(download(id, fields, {}, "test-advertiser-secret"))).status,
    200,
  );
});

test("promised false browser and key checks never authorize a credential download", async (t) => {
  let consumed = 0;
  const { service, id } = await fixture(t, {
    authOverrides: { hasBrowserGrant: async () => false },
    storeOverrides: {
      matchesGrantKey: async () => false,
      consumeSecretHandoff: async () => {
        consumed++;
        throw new Error("An unverified request must not consume a credential.");
      },
    },
  });
  const fields = await form(service, id);
  assert.match(fields.html, /Confirm your Advertiser API key/);
  assert.equal(fields.html.includes("Your browser is connected"), false);
  const response = await service.handle(download(id, fields, {}, "test-advertiser-secret"));
  assert.equal(response.status, 401);
  assert.equal(consumed, 0);
});

test("a promised shared rate-limit denial blocks an otherwise authorized download", async (t) => {
  const { service, id } = await fixture(t, {
    storeOverrides: { allowRate: async () => false },
  });
  const fields = await form(service, id, { "x-test-browser": "verified" });
  const response = await service.handle(download(id, fields, { "x-test-browser": "verified" }));
  assert.equal(response.status, 429);
  assert.ok(!(await response.text()).includes("new-conversion-secret"));
});

test("credential download attempts share a database rate limit across service instances", async (t) => {
  const { service, id, config, openStore, auth } = await fixture(t);
  const second = createCredentialService({ config, store: await openStore(), auth });
  const fields = await form(service, id);
  for (let attempt = 0; attempt < 10; attempt++) {
    const instance = attempt % 2 === 0 ? service : second;
    assert.equal(
      (await instance.handle(download(id, fields, {}, "incorrect-advertiser-key"))).status,
      401,
    );
  }
  assert.equal(
    (await second.handle(download(id, fields, {}, "test-advertiser-secret"))).status,
    429,
  );
});

test("concurrent downloads disclose an encrypted handoff once", async (t) => {
  const { service, id, config, openStore, auth } = await fixture(t);
  const second = createCredentialService({ config, store: await openStore(), auth });
  const fields = await form(service, id, { "x-test-browser": "verified" });
  const responses = await Promise.all([
    service.handle(download(id, fields, { "x-test-browser": "verified" })),
    second.handle(download(id, fields, { "x-test-browser": "verified" })),
  ]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 410]);
  assert.deepEqual(await responses.find((response) => response.status === 200).json(), {
    api_key: "new-conversion-secret",
  });
  assert.equal(
    (await responses.find((response) => response.status === 410).text()).includes(
      "new-conversion-secret",
    ),
    false,
  );
});
