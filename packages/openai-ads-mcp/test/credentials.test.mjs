import assert from "node:assert/strict";
import test from "node:test";
import { createCredentialService } from "../src/credentials.mjs";

function fixture() {
  let consumed = false;
  const config = { publicOrigin: "https://ads.example.test", allowHttpLocalhost: false };
  const id = "a".repeat(64);
  const metadata = {
    id,
    grantId: "grant-1",
    operation: "create_conversion_api_key",
    expiresAt: Date.now() + 600000,
  };
  const store = {
    createSecretHandoff: () => ({ id, expiresAt: metadata.expiresAt }),
    getSecretHandoff: (value) => (value === id && !consumed ? metadata : null),
    matchesGrantKey: (grant, key) => grant === "grant-1" && key === "test-advertiser-secret",
    consumeSecretHandoff: (value, grant) => {
      if (value !== id || grant !== "grant-1" || consumed) return null;
      consumed = true;
      return { api_key: "new-conversion-secret" };
    },
  };
  const auth = {
    hasBrowserGrant: (request, grant) =>
      grant === "grant-1" && request.headers.get("x-test-browser") === "verified",
  };
  return { id, service: createCredentialService({ config, store, auth }) };
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

test("handoff URL and OAuth bearer alone never disclose generated credentials", async () => {
  const { service, id } = fixture();
  const handoff = await service.createHandoff({
    principal: { grantId: "grant-1" },
    operation: "create_conversion_api_key",
    value: { api_key: "new-conversion-secret" },
  });
  assert.equal(handoff.url, `https://ads.example.test/credentials/${id}`);
  assert.ok(!JSON.stringify(handoff).includes("new-conversion-secret"));
  const fields = await form(service, id);
  const denied = await service.handle(
    download(id, fields, { authorization: "Bearer model-visible-token" }),
  );
  assert.equal(denied.status, 401);
  assert.ok(!(await denied.text()).includes("new-conversion-secret"));
});

test("browser-bound grant permits one explicit POST download and prevents replay", async () => {
  const { service, id } = fixture();
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

test("key reauthentication permits retrieval but CSRF and cross-origin downloads fail", async () => {
  const { service, id } = fixture();
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
