import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createStore } from "../src/store.mjs";

const resource = "https://ads.example/mcp";
const redirectUri = "https://chatgpt.com/connector_platform_oauth_redirect";
const verifier = "a".repeat(64);
const codeChallenge = createHash("sha256").update(verifier).digest("base64url");
function fixture(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "ads-store-"));
  const databasePath = path.join(dir, "state.sqlite");
  const encryptionKey = randomBytes(32);
  let clock = 1_800_000_000_000;
  const options = { databasePath, encryptionKey, now: () => clock };
  let store = createStore(options);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    get store() {
      return store;
    },
    databasePath,
    restart() {
      store.close();
      store = createStore(options);
    },
    advance(ms) {
      clock += ms;
    },
  };
}
function connect(store, overrides = {}) {
  const code = store.createAuthorizationCode({
    clientId: "chatgpt",
    redirectUri,
    resource,
    codeChallenge,
    apiKey: "ads-test-secret-account-one",
    account: { id: "adacct_one", name: "Account One" },
    scopes: ["ads:read", "ads:write", "offline_access"],
    ...overrides,
  });
  const input = { code, clientId: "chatgpt", redirectUri, resource, codeVerifier: verifier };
  return { code, input, tokens: store.exchangeCode(input) };
}

test("encrypted grants survive restart; access tokens and keys are not stored in plaintext", (t) => {
  const f = fixture(t);
  const { tokens } = connect(f.store);
  assert.equal(tokens.token_type, "Bearer");
  assert.equal(tokens.expires_in, 900);
  f.restart();
  const principal = f.store.authenticate({ token: tokens.access_token, resource });
  assert.equal(principal.accountId, "adacct_one");
  assert.equal(principal.apiKey, "ads-test-secret-account-one");
  const bytes = readFileSync(f.databasePath);
  assert.equal(bytes.includes(Buffer.from(principal.apiKey)), false);
  assert.equal(bytes.includes(Buffer.from(tokens.access_token)), false);
  assert.equal(bytes.includes(Buffer.from(tokens.refresh_token)), false);
  assert.equal(
    f.store.authenticate({ token: tokens.access_token, resource: "https://other.example/mcp" }),
    null,
  );
});

test("codes enforce PKCE, client, redirect and resource, and reuse revokes the resulting grant", (t) => {
  const { store } = fixture(t);
  const code = store.createAuthorizationCode({
    clientId: "chatgpt",
    redirectUri,
    resource,
    codeChallenge,
    apiKey: "ads-test-secret-account-one",
    account: { id: "adacct_one" },
    scopes: ["ads:read"],
  });
  const input = { code, clientId: "chatgpt", redirectUri, resource, codeVerifier: verifier };
  for (const patch of [
    { codeVerifier: "b".repeat(64) },
    { clientId: "other" },
    { redirectUri: "https://evil.example" },
    { resource: "https://other.example/mcp" },
  ]) {
    assert.equal(store.exchangeCode({ ...input, ...patch }), null);
  }
  const tokens = store.exchangeCode(input);
  assert.ok(tokens.access_token);
  assert.equal(tokens.refresh_token, undefined);
  assert.equal(store.exchangeCode(input), null);
  assert.equal(store.authenticate({ token: tokens.access_token, resource }), null);
});

test("refresh rotation binds client/resource/scopes and replay revokes the entire grant", (t) => {
  const { store } = fixture(t);
  const { tokens } = connect(store);
  const input = { refreshToken: tokens.refresh_token, clientId: "chatgpt", resource };
  assert.equal(store.refresh({ ...input, clientId: "other" }), null);
  assert.equal(store.refresh({ ...input, resource: "https://evil.example/mcp" }), null);
  assert.equal(store.refresh({ ...input, scopes: ["admin"] }), null);
  const second = store.refresh({ ...input, scopes: ["ads:read", "offline_access"] });
  assert.equal(second.scope, "ads:read offline_access");
  assert.notEqual(second.refresh_token, tokens.refresh_token);
  assert.equal(
    store.refresh({ ...input, refreshToken: second.refresh_token, scopes: ["ads:write"] }),
    null,
  );
  assert.equal(store.refresh(input), null);
  assert.equal(store.authenticate({ token: second.access_token, resource }), null);
  assert.equal(store.authenticate({ token: tokens.access_token, resource }), null);
});

test("grants are isolated; revocation erases only the matching credential and browser access", (t) => {
  const { store } = fixture(t);
  const one = connect(store);
  const two = connect(store, {
    account: { id: "adacct_two" },
    apiKey: "ads-test-secret-account-two",
  });
  const first = store.authenticate({ token: one.tokens.access_token, resource });
  const second = store.authenticate({ token: two.tokens.access_token, resource });
  store.bindBrowserSession("browser-session", first.grantId);
  assert.equal(store.hasBrowserGrant("browser-session", first.grantId), true);
  assert.equal(store.hasBrowserGrant("browser-session", second.grantId), false);
  assert.equal(store.matchesGrantKey(first.grantId, "ads-test-secret-account-one"), true);
  assert.equal(store.matchesGrantKey(first.grantId, "ads-test-secret-account-two"), false);
  store.revoke({ token: one.tokens.refresh_token, clientId: "other" });
  assert.ok(store.authenticate({ token: one.tokens.access_token, resource }));
  store.revoke({ token: one.tokens.refresh_token, clientId: "chatgpt" });
  assert.equal(store.hasBrowserGrant("browser-session", first.grantId), false);
  assert.equal(store.matchesGrantKey(first.grantId, "ads-test-secret-account-one"), false);
  assert.equal(store.authenticate({ token: one.tokens.access_token, resource }), null);
  assert.equal(
    store.authenticate({ token: two.tokens.access_token, resource }).accountId,
    "adacct_two",
  );
});

test("expired credentials, codes, browser sessions and flows cannot be used", (t) => {
  const f = fixture(t);
  const { tokens } = connect(f.store);
  const principal = f.store.authenticate({ token: tokens.access_token, resource });
  f.store.bindBrowserSession("browser", principal.grantId);
  const flow = f.store.createFlow({ step: "key", secret: "pending-key" });
  f.advance(16 * 60_000);
  assert.equal(f.store.authenticate({ token: tokens.access_token, resource }), null);
  assert.equal(f.store.getFlow(flow.id), null);
  assert.ok(f.store.refresh({ refreshToken: tokens.refresh_token, clientId: "chatgpt", resource }));
  f.advance(31 * 24 * 60 * 60_000);
  assert.equal(f.store.hasBrowserGrant("browser", principal.grantId), false);
  assert.equal(f.store.matchesGrantKey(principal.grantId, "ads-test-secret-account-one"), false);
  f.store.prune();
});

test("flow revision checks prevent concurrent reuse and rate limits persist across restart", (t) => {
  const f = fixture(t);
  const flow = f.store.createFlow({ step: "key", csrf: "sensitive-csrf" });
  const updated = f.store.updateFlow(flow.id, flow.revision, { step: "consent" });
  assert.equal(updated.step, "consent");
  assert.equal(f.store.updateFlow(flow.id, flow.revision, { step: "key" }), null);
  assert.equal(f.store.consumeFlow(flow.id, flow.revision), null);
  assert.equal(f.store.consumeFlow(flow.id, updated.revision).step, "consent");
  assert.equal(f.store.consumeFlow(flow.id, updated.revision), null);
  assert.equal(f.store.allowRate("key-submission", 1, 60_000), true);
  f.restart();
  assert.equal(f.store.allowRate("key-submission", 1, 60_000), false);
  f.advance(60_001);
  assert.equal(f.store.allowRate("key-submission", 1, 60_000), true);
});

test("credential handoffs are encrypted, grant-bound, expiring and consumable once", (t) => {
  const f = fixture(t);
  const a = connect(f.store);
  const b = connect(f.store, { account: { id: "adacct_two" } });
  const first = f.store.authenticate({ token: a.tokens.access_token, resource });
  const second = f.store.authenticate({ token: b.tokens.access_token, resource });
  const handoff = f.store.createSecretHandoff({
    grantId: first.grantId,
    operation: "create_capi_key",
    value: { key: "new-secret-value" },
  });
  assert.equal(
    JSON.stringify(f.store.getSecretHandoff(handoff.id)).includes("new-secret-value"),
    false,
  );
  assert.equal(f.store.consumeSecretHandoff(handoff.id, second.grantId), null);
  assert.deepEqual(f.store.consumeSecretHandoff(handoff.id, first.grantId), {
    key: "new-secret-value",
  });
  assert.equal(f.store.consumeSecretHandoff(handoff.id, first.grantId), null);
  const expired = f.store.createSecretHandoff({
    grantId: first.grantId,
    operation: "sftp_password",
    value: "password",
    ttlMs: 1000,
  });
  f.advance(1001);
  assert.equal(f.store.getSecretHandoff(expired.id), null);
  assert.equal(f.store.consumeSecretHandoff(expired.id, first.grantId), null);
  const revoked = f.store.createSecretHandoff({
    grantId: first.grantId,
    operation: "create_capi_key",
    value: "another-password",
  });
  f.store.revoke({ token: a.tokens.access_token, clientId: "chatgpt" });
  assert.equal(f.store.getSecretHandoff(revoked.id), null);
  assert.equal(f.store.consumeSecretHandoff(revoked.id, first.grantId), null);
});

test("the service refuses to open a durable vault with the wrong encryption key", (t) => {
  const f = fixture(t);
  connect(f.store);
  f.store.close();
  assert.throws(
    () => createStore({ databasePath: f.databasePath, encryptionKey: randomBytes(32) }),
    /cannot open this credential database/,
  );
  f.restart();
});

test("authorization codes expire before a pending grant can issue tokens", (t) => {
  const f = fixture(t);
  const code = f.store.createAuthorizationCode({
    clientId: "chatgpt",
    redirectUri,
    resource,
    codeChallenge,
    apiKey: "ads-test-secret-account-one",
    account: { id: "adacct_one" },
    scopes: ["ads:read", "offline_access"],
  });
  f.advance(5 * 60_000 + 1);
  assert.equal(
    f.store.exchangeCode({
      code,
      clientId: "chatgpt",
      redirectUri,
      resource,
      codeVerifier: verifier,
    }),
    null,
  );
});

test("database paths reject regular and dangling symlinks without creating or modifying their target", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "ads-store-links-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const encryptionKey = randomBytes(32);
  const missing = path.join(dir, "must-not-be-created");
  const dangling = path.join(dir, "dangling.sqlite");
  symlinkSync(missing, dangling);
  assert.throws(() => createStore({ databasePath: dangling, encryptionKey }), /symbolic links/);
  assert.equal(existsSync(missing), false);
  const existing = path.join(dir, "original.txt");
  writeFileSync(existing, "original contents");
  const linked = path.join(dir, "linked.sqlite");
  symlinkSync(existing, linked);
  assert.throws(() => createStore({ databasePath: linked, encryptionKey }), /symbolic links/);
  assert.equal(readFileSync(existing, "utf8"), "original contents");
  const actualDirectory = path.join(dir, "actual");
  mkdirSync(actualDirectory, { mode: 0o700 });
  const linkedDirectory = path.join(dir, "parent-link");
  symlinkSync(actualDirectory, linkedDirectory);
  assert.throws(
    () => createStore({ databasePath: path.join(linkedDirectory, "state.sqlite"), encryptionKey }),
    /symbolic links/,
  );
  assert.equal(existsSync(path.join(actualDirectory, "state.sqlite")), false);
});

test("the database parent must not be writable by other users", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "ads-store-public-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  chmodSync(dir, 0o777);
  assert.throws(
    () =>
      createStore({ databasePath: path.join(dir, "state.sqlite"), encryptionKey: randomBytes(32) }),
    /must not be writable by other users/,
  );
  assert.equal(existsSync(path.join(dir, "state.sqlite")), false);
});
