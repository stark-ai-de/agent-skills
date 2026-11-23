import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { AUTH_TTL, tokenDigest } from "../src/store.mjs";
import { migrateDatabase, readMigrations } from "../src/storage/migrations.mjs";
import {
  createDatabasePool,
  validateDatabaseUrl,
  withTransaction,
} from "../src/storage/postgres.mjs";
import { createTestStore } from "./helpers/database.mjs";

const resource = "https://ads.example/mcp";
const redirectUri = "https://chatgpt.com/connector_platform_oauth_redirect";
const verifier = "a".repeat(64);
const codeChallenge = createHash("sha256").update(verifier).digest("base64url");
const authorization = {
  clientId: "chatgpt",
  redirectUri,
  resource,
  codeChallenge,
  apiKey: "ads-test-secret-account-one",
  account: { id: "adacct_one", name: "Account One" },
  scopes: ["ads:read", "ads:write", "offline_access"],
};
async function fixture(t, options = {}) {
  let timestamp = 1_800_000_000_000;
  const f = await createTestStore(t, { ...options, now: () => timestamp });
  return {
    ...f,
    get store() {
      return f.store;
    },
    advance(ms) {
      timestamp += ms;
    },
  };
}
async function connect(store, overrides = {}) {
  const code = await store.createAuthorizationCode({ ...authorization, ...overrides });
  const input = { code, clientId: "chatgpt", redirectUri, resource, codeVerifier: verifier };
  return { code, input, tokens: await store.exchangeCode(input) };
}
const principal = (store, tokens) => store.authenticate({ token: tokens.access_token, resource });

test("encrypted grants, flows and handoffs survive restart; no raw keys or tokens reach persisted rows", async (t) => {
  const f = await fixture(t);
  const { code, tokens } = await connect(f.store);
  assert.equal(tokens.token_type, "Bearer");
  assert.equal(tokens.expires_in, 900);
  const first = await principal(f.store, tokens);
  const flow = await f.store.createFlow({
    step: "consent",
    apiKey: "pending-key-secret",
    csrf: "csrf-secret",
  });
  const handoff = await f.store.createSecretHandoff({
    grantId: first.grantId,
    operation: "create_capi_key",
    value: { key: "issued-secret" },
  });
  await f.store.bindBrowserSession("browser-session-secret", first.grantId);
  await f.restart();
  assert.deepEqual(await principal(f.store, tokens), first);
  assert.equal((await f.store.getFlow(flow.id)).apiKey, "pending-key-secret");
  assert.deepEqual(await f.store.getSecretHandoff(handoff.id), {
    ...handoff,
    grantId: first.grantId,
    operation: "create_capi_key",
  });
  const persisted = [];
  for (const table of [
    "ads_grants",
    "ads_codes",
    "ads_tokens",
    "ads_flows",
    "ads_handoffs",
    "ads_browser_sessions",
    "ads_meta",
  ])
    persisted.push((await f.query(`SELECT * FROM ${table}`)).rows);
  const dump = JSON.stringify(persisted);
  for (const secret of [
    authorization.apiKey,
    code,
    tokens.access_token,
    tokens.refresh_token,
    "pending-key-secret",
    "csrf-secret",
    "issued-secret",
    "browser-session-secret",
  ])
    assert.equal(dump.includes(secret), false, "secret absent from persisted SQL rows");
  assert.ok(dump.includes(tokenDigest(tokens.access_token)));
  assert.equal(
    await f.store.authenticate({
      token: tokens.access_token,
      resource: "https://other.example/mcp",
    }),
    null,
  );
  assert.deepEqual(await f.store.consumeSecretHandoff(handoff.id, first.grantId), {
    key: "issued-secret",
  });
});

test("codes enforce PKCE, client, redirect and resource; proven reuse revokes the grant", async (t) => {
  const { store } = await fixture(t);
  const code = await store.createAuthorizationCode({ ...authorization, scopes: ["ads:read"] });
  const input = { code, clientId: "chatgpt", redirectUri, resource, codeVerifier: verifier };
  for (const patch of [
    { codeVerifier: "b".repeat(64) },
    { codeVerifier: "short" },
    { clientId: "other" },
    { redirectUri: "https://evil.example" },
    { resource: "https://other.example/mcp" },
  ])
    assert.equal(await store.exchangeCode({ ...input, ...patch }), null);
  const tokens = await store.exchangeCode(input);
  assert.ok(tokens.access_token);
  assert.equal(tokens.refresh_token, undefined);
  assert.equal(await store.exchangeCode(input), null);
  assert.equal(await principal(store, tokens), null);
});

test("authorization codes expire before unused grants can issue tokens", async (t) => {
  const f = await fixture(t);
  const code = await f.store.createAuthorizationCode(authorization);
  f.advance(AUTH_TTL.code + 1);
  assert.equal(
    await f.store.exchangeCode({
      code,
      clientId: "chatgpt",
      redirectUri,
      resource,
      codeVerifier: verifier,
    }),
    null,
  );
  assert.equal((await f.query("SELECT count(*) FROM ads_tokens")).rows[0].count, "0");
});

test("refresh rotation binds client/resource/scopes and replay revokes the entire grant", async (t) => {
  const { store } = await fixture(t);
  const { tokens } = await connect(store);
  const input = { refreshToken: tokens.refresh_token, clientId: "chatgpt", resource };
  assert.equal(await store.refresh({ ...input, clientId: "other" }), null);
  assert.equal(await store.refresh({ ...input, resource: "https://evil.example/mcp" }), null);
  assert.equal(await store.refresh({ ...input, scopes: ["admin"] }), null);
  const second = await store.refresh({ ...input, scopes: ["ads:read", "offline_access"] });
  assert.equal(second.scope, "ads:read offline_access");
  assert.notEqual(second.refresh_token, tokens.refresh_token);
  assert.equal(
    await store.refresh({ ...input, refreshToken: second.refresh_token, scopes: ["ads:write"] }),
    null,
  );
  assert.equal(await store.refresh(input), null);
  assert.equal(await principal(store, second), null);
  assert.equal(await principal(store, tokens), null);
});

test("grants are isolated and revocation erases only the matching credential and browser access", async (t) => {
  const f = await fixture(t);
  const one = await connect(f.store);
  const two = await connect(f.store, {
    account: { id: "adacct_two" },
    apiKey: "ads-test-secret-account-two",
  });
  const first = await principal(f.store, one.tokens);
  const second = await principal(f.store, two.tokens);
  assert.equal(await f.store.bindBrowserSession("browser-session", first.grantId), true);
  assert.equal(await f.store.hasBrowserGrant("browser-session", first.grantId), true);
  assert.equal(await f.store.hasBrowserGrant("browser-session", second.grantId), false);
  assert.equal(await f.store.matchesGrantKey(first.grantId, authorization.apiKey), true);
  assert.equal(await f.store.matchesGrantKey(first.grantId, "ads-test-secret-account-two"), false);
  await f.store.revoke({ token: one.tokens.refresh_token, clientId: "other" });
  assert.ok(await principal(f.store, one.tokens));
  await f.store.revoke({ token: one.tokens.refresh_token, clientId: "chatgpt" });
  assert.equal(await f.store.hasBrowserGrant("browser-session", first.grantId), false);
  assert.equal(await f.store.matchesGrantKey(first.grantId, authorization.apiKey), false);
  assert.equal(await principal(f.store, one.tokens), null);
  assert.equal((await principal(f.store, two.tokens)).accountId, "adacct_two");
  const row = (
    await f.query(
      "SELECT credential, credential_fingerprint, revoked_at FROM ads_grants WHERE id = $1",
      [first.grantId],
    )
  ).rows[0];
  assert.equal(row.credential, null);
  assert.equal(row.credential_fingerprint, null);
  assert.ok(row.revoked_at);
});

test("expired access tokens, browser sessions and encrypted flows cannot be used", async (t) => {
  const f = await fixture(t);
  const { tokens } = await connect(f.store);
  const first = await principal(f.store, tokens);
  await f.store.bindBrowserSession("browser", first.grantId);
  const flow = await f.store.createFlow({ step: "key", secret: "pending-key" });
  f.advance(AUTH_TTL.access + 1);
  assert.equal(await principal(f.store, tokens), null);
  assert.equal(await f.store.getFlow(flow.id), null);
  assert.ok(
    await f.store.refresh({ refreshToken: tokens.refresh_token, clientId: "chatgpt", resource }),
  );
  f.advance(AUTH_TTL.grant + 1);
  assert.equal(await f.store.hasBrowserGrant("browser", first.grantId), false);
  assert.equal(await f.store.matchesGrantKey(first.grantId, authorization.apiKey), false);
  await f.store.prune();
});

test("flow revision updates and consumption remain single-use across independent pools", async (t) => {
  const f = await fixture(t);
  const stores = [f.store, await f.openStore(), await f.openStore()];
  const flow = await f.store.createFlow({ step: "key", csrf: "sensitive-csrf" });
  const updates = await Promise.all(
    stores.map((store, index) =>
      store.updateFlow(flow.id, flow.revision, { step: "consent", index }),
    ),
  );
  assert.equal(updates.filter(Boolean).length, 1);
  assert.equal(await f.store.consumeFlow(flow.id, flow.revision), null);
  const consumed = await Promise.all(stores.map((store) => store.consumeFlow(flow.id, 1)));
  assert.equal(consumed.filter(Boolean).length, 1);
  assert.equal(consumed.find(Boolean).step, "consent");
  assert.equal(await f.store.getFlow(flow.id), null);
});

test("credential handoffs are grant-bound, expiring and consumed once across independent pools", async (t) => {
  const f = await fixture(t);
  const other = await f.openStore();
  const first = await principal(f.store, (await connect(f.store)).tokens);
  const second = await principal(
    other,
    (await connect(other, { account: { id: "adacct_two" } })).tokens,
  );
  const handoff = await f.store.createSecretHandoff({
    grantId: first.grantId,
    operation: "create_capi_key",
    value: { key: "new-secret-value" },
  });
  assert.equal(
    JSON.stringify(await other.getSecretHandoff(handoff.id)).includes("new-secret-value"),
    false,
  );
  assert.equal(await other.consumeSecretHandoff(handoff.id, second.grantId), null);
  const results = await Promise.all([
    f.store.consumeSecretHandoff(handoff.id, first.grantId),
    other.consumeSecretHandoff(handoff.id, first.grantId),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.deepEqual(results.find(Boolean), { key: "new-secret-value" });
  const expired = await f.store.createSecretHandoff({
    grantId: first.grantId,
    operation: "sftp_password",
    value: "password",
    ttlMs: 1000,
  });
  f.advance(1001);
  assert.equal(await other.getSecretHandoff(expired.id), null);
  assert.equal(await other.consumeSecretHandoff(expired.id, first.grantId), null);
  await assert.rejects(
    () =>
      f.store.createSecretHandoff({
        grantId: first.grantId,
        operation: "x",
        value: "x",
        ttlMs: AUTH_TTL.handoff + 1,
      }),
    /lifetime/,
  );
});

test("simultaneous authorization-code redemption issues one result then revokes on replay", async (t) => {
  const f = await fixture(t);
  const other = await f.openStore();
  const code = await f.store.createAuthorizationCode(authorization);
  const input = { code, clientId: "chatgpt", redirectUri, resource, codeVerifier: verifier };
  const results = await Promise.all([f.store.exchangeCode(input), other.exchangeCode(input)]);
  assert.equal(results.filter(Boolean).length, 1);
  const winner = results.find(Boolean);
  assert.equal(await principal(f.store, winner), null);
  assert.equal(
    await other.refresh({ refreshToken: winner.refresh_token, clientId: "chatgpt", resource }),
    null,
  );
});

test("simultaneous refresh rotation issues one result and invalidates its family on replay", async (t) => {
  const f = await fixture(t);
  const other = await f.openStore();
  const { tokens } = await connect(f.store);
  const input = { refreshToken: tokens.refresh_token, clientId: "chatgpt", resource };
  const results = await Promise.all([f.store.refresh(input), other.refresh(input)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(await principal(f.store, results.find(Boolean)), null);
  assert.equal(await principal(other, tokens), null);
});

test("revocation racing refresh, browser rebinding and handoff creation cannot resurrect a grant", async (t) => {
  const f = await fixture(t);
  const other = await f.openStore();
  const third = await f.openStore();
  const { tokens } = await connect(f.store, { browserSession: "browser" });
  const first = await principal(f.store, tokens);
  const results = await Promise.allSettled([
    f.store.revoke({ token: tokens.access_token, clientId: "chatgpt" }),
    other.refresh({ refreshToken: tokens.refresh_token, clientId: "chatgpt", resource }),
    third.bindBrowserByKey("browser-again", authorization.apiKey),
    other.createSecretHandoff({
      grantId: first.grantId,
      operation: "create_capi_key",
      value: { key: "secret" },
    }),
  ]);
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      assert.equal(index, 3);
      assert.match(result.reason.message, /no longer available/);
    }
  }
  assert.equal(await principal(third, tokens), null);
  if (results[1].status === "fulfilled" && results[1].value)
    assert.equal(await principal(other, results[1].value), null);
  assert.deepEqual(await third.listBrowserGrants("browser"), []);
  assert.deepEqual(await third.listBrowserGrants("browser-again"), []);
  assert.equal((await f.query("SELECT count(*) FROM ads_handoffs")).rows[0].count, "0");
  assert.equal(await f.store.bindBrowserSession("late", first.grantId), false);
});

test("atomic rate counters share the exact budget across pools and process restarts", async (t) => {
  const f = await fixture(t);
  const stores = [f.store, await f.openStore(), await f.openStore()];
  const results = await Promise.all(
    Array.from({ length: 36 }, (_, index) =>
      stores[index % stores.length].allowRate("key-submission", 7, 60_000),
    ),
  );
  assert.equal(results.filter(Boolean).length, 7);
  assert.equal((await f.query("SELECT count FROM ads_rate_limits")).rows[0].count, 7);
  await f.restart();
  assert.equal(await f.store.allowRate("key-submission", 7, 60_000), false);
  f.advance(60_001);
  const refreshed = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      (index % 2 ? f.store : stores[1]).allowRate("key-submission", 7, 60_000),
    ),
  );
  assert.equal(refreshed.filter(Boolean).length, 7);
});

test("concurrency leases enforce per-grant and global caps across pools with idempotent release", async (t) => {
  const f = await fixture(t);
  const stores = [f.store, await f.openStore(), await f.openStore()];
  const input = {
    scope: "ads-operation",
    ownerId: "grant-one",
    limit: 2,
    globalLimit: 3,
    ttlMs: 150_000,
  };
  const first = await Promise.all(
    Array.from({ length: 12 }, (_, index) => stores[index % 3].acquireLease(input)),
  );
  assert.equal(first.filter(Boolean).length, 2);
  const second = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      stores[index % 3].acquireLease({ ...input, ownerId: "grant-two" }),
    ),
  );
  assert.equal(second.filter(Boolean).length, 1);
  assert.equal(await stores[1].acquireLease({ ...input, ownerId: "grant-three" }), null);
  const active = (await f.query("SELECT * FROM ads_leases")).rows;
  assert.equal(active.length, 3);
  assert.equal(JSON.stringify(active).includes("grant-one"), false);
  const released = first.find(Boolean);
  await stores[1].releaseLease(released);
  await f.store.releaseLease(released);
  assert.ok(await stores[2].acquireLease({ ...input, ownerId: "grant-three" }));
  assert.ok(await stores[1].acquireLease({ ...input, scope: "mcp-request" }));
});

test("abandoned function leases survive a pool restart then expire by the shared TTL", async (t) => {
  const f = await fixture(t);
  const input = {
    scope: "mcp-request",
    ownerId: "grant-one",
    limit: 1,
    globalLimit: 1,
    ttlMs: 150_000,
  };
  const abandoned = await f.store.acquireLease(input);
  assert.ok(abandoned);
  await f.restart();
  assert.equal(await f.store.acquireLease(input), null);
  f.advance(150_001);
  const replacement = await f.store.acquireLease(input);
  assert.ok(replacement);
  assert.notEqual(replacement, abandoned);
  assert.equal((await f.query("SELECT count(*) FROM ads_leases")).rows[0].count, "1");
});

test("cleanup preserves spent codes/refresh tokens for replay and removes expired state and leases", async (t) => {
  const f = await fixture(t);
  const { input, tokens } = await connect(f.store, { browserSession: "browser" });
  const first = await principal(f.store, tokens);
  await f.store.refresh({ refreshToken: tokens.refresh_token, clientId: "chatgpt", resource });
  await f.store.createFlow({ step: "key", apiKey: "pending" });
  await f.store.createSecretHandoff({ grantId: first.grantId, operation: "key", value: "secret" });
  await f.store.allowRate("attempt", 2, 60_000);
  await f.store.acquireLease({
    scope: "mcp-request",
    ownerId: first.grantId,
    limit: 1,
    globalLimit: 1,
    ttlMs: 1000,
  });
  f.advance(AUTH_TTL.browser + 1);
  await f.store.prune();
  for (const table of [
    "ads_flows",
    "ads_browser_sessions",
    "ads_handoffs",
    "ads_rate_limits",
    "ads_leases",
  ])
    assert.equal((await f.query(`SELECT count(*) FROM ${table}`)).rows[0].count, "0");
  assert.equal(
    (await f.query("SELECT count(*) FROM ads_codes WHERE used_at IS NOT NULL")).rows[0].count,
    "1",
  );
  assert.equal(
    (await f.query("SELECT count(*) FROM ads_tokens WHERE kind = 'refresh'")).rows[0].count,
    "2",
  );
  assert.equal(
    (await f.query("SELECT count(*) FROM ads_tokens WHERE kind = 'access'")).rows[0].count,
    "0",
  );
  assert.equal(await f.store.exchangeCode(input), null);
  assert.equal((await f.query("SELECT credential FROM ads_grants")).rows[0].credential, null);
  f.advance(AUTH_TTL.grant + 1);
  await f.store.prune();
  for (const table of ["ads_grants", "ads_codes", "ads_tokens"])
    assert.equal((await f.query(`SELECT count(*) FROM ${table}`)).rows[0].count, "0");
});

test("prune removes abandoned grants and rechecks code redemption after waiting for a grant lock", async (t) => {
  const f = await fixture(t);
  const abandoned = await f.store.createAuthorizationCode(authorization);
  const code = await f.store.createAuthorizationCode(authorization);
  const input = { code, clientId: "chatgpt", redirectUri, resource, codeVerifier: verifier };
  const timestamp = (
    await f.query("SELECT expires_at FROM ads_codes WHERE hash = $1", [tokenDigest(code)])
  ).rows[0].expires_at;
  const pruner = await f.openStore({ now: () => Number(timestamp) + 1 });
  const pool = await f.openPool();
  const locked = Promise.withResolvers();
  const release = Promise.withResolvers();
  const blocker = withTransaction(pool, async (client) => {
    await client.query("SELECT hash FROM ads_codes WHERE hash = $1 FOR UPDATE", [
      tokenDigest(code),
    ]);
    locked.resolve(client.processID);
    await release.promise;
  });
  const waitForBlocked = async (pid) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const { rows } = await f.query(
        "SELECT pid FROM pg_stat_activity WHERE $1::integer = ANY(pg_blocking_pids(pid))",
        [pid],
      );
      if (rows.length) return rows[0].pid;
      await sleep(10);
    }
    assert.fail("Expected an independent transaction to be blocked on the row lock.");
  };
  const blockerPid = await locked.promise;
  const exchange = f.store.exchangeCode(input);
  let prune;
  try {
    const exchangePid = await waitForBlocked(blockerPid);
    prune = pruner.prune();
    await waitForBlocked(exchangePid);
  } finally {
    release.resolve();
    await blocker;
    await prune;
  }
  const tokens = await exchange;
  assert.ok(tokens);
  assert.ok(await principal(f.store, tokens));
  const { rows } = await f.query("SELECT hash, used_at FROM ads_codes");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hash, tokenDigest(code));
  assert.notEqual(rows[0].hash, tokenDigest(abandoned));
  assert.notEqual(rows[0].used_at, null);
  assert.equal((await f.query("SELECT count(*) FROM ads_grants")).rows[0].count, "1");
  assert.equal(await f.store.exchangeCode(input), null);
  assert.equal(await principal(f.store, tokens), null);
});

test("database constraint failures roll back code consumption and token issuance together", async (t) => {
  const f = await fixture(t);
  const code = await f.store.createAuthorizationCode(authorization);
  const input = { code, clientId: "chatgpt", redirectUri, resource, codeVerifier: verifier };
  await f.query("ALTER TABLE ads_tokens ADD CONSTRAINT deny_issuance CHECK (false) NOT VALID");
  await assert.rejects(() => f.store.exchangeCode(input));
  assert.equal(
    (await f.query("SELECT used_at FROM ads_codes WHERE hash = $1", [tokenDigest(code)])).rows[0]
      .used_at,
    null,
  );
  assert.equal((await f.query("SELECT count(*) FROM ads_tokens")).rows[0].count, "0");
  await f.query("ALTER TABLE ads_tokens DROP CONSTRAINT deny_issuance");
  assert.ok((await f.store.exchangeCode(input)).access_token);
});

test("the key sentinel rejects wrong keys and ciphertext cannot be transplanted between grants", async (t) => {
  const f = await fixture(t);
  const one = await connect(f.store);
  const two = await connect(f.store, { account: { id: "adacct_two" }, apiKey: "another-secret" });
  const first = await principal(f.store, one.tokens);
  const second = await principal(f.store, two.tokens);
  const before = (await f.query("SELECT value FROM ads_meta WHERE name = 'key-check'")).rows[0]
    .value;
  await assert.rejects(
    () => f.openStore({ encryptionKey: randomBytes(32) }),
    /cannot open this credential database/,
  );
  assert.equal(
    (await f.query("SELECT value FROM ads_meta WHERE name = 'key-check'")).rows[0].value,
    before,
  );
  await f.query(
    "UPDATE ads_grants SET credential = (SELECT credential FROM ads_grants WHERE id = $1) WHERE id = $2",
    [first.grantId, second.grantId],
  );
  await assert.rejects(() => principal(f.store, two.tokens));
  assert.equal((await principal(f.store, one.tokens)).apiKey, authorization.apiKey);
});

test("runtime refuses an unmigrated database without creating any tables", async (t) => {
  const f = await fixture(t, { initialize: false });
  await assert.rejects(() => f.openStore(), /needs explicit migration/);
  assert.equal(
    (
      await f.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = $1", [
        f.schema,
      ])
    ).rows[0].count,
    "0",
  );
});

test("concurrent explicit migrations serialize; concurrent different keys cannot replace the sentinel", async (t) => {
  const f = await fixture(t, { initialize: false });
  const input = { databaseUrl: f.databaseUrl, deploymentEnvironment: "test" };
  const migrations = await Promise.all([migrateDatabase(input), migrateDatabase(input)]);
  assert.deepEqual(migrations.map((r) => r.applied.length).sort(), [0, 1]);
  const opened = await Promise.allSettled([
    f.openStore({ encryptionKey: randomBytes(32) }),
    f.openStore({ encryptionKey: randomBytes(32) }),
  ]);
  assert.equal(opened.filter((r) => r.status === "fulfilled").length, 1);
  assert.match(
    opened.find((r) => r.status === "rejected").reason.message,
    /cannot open this credential database/,
  );
  assert.equal(
    (await f.query("SELECT count(*) FROM ads_meta WHERE name = 'key-check'")).rows[0].count,
    "1",
  );
});

test("migration failures roll back all schema changes and allow a clean retry", async (t) => {
  const f = await fixture(t, { initialize: false });
  await f.query("CREATE TABLE ads_tokens (unexpected TEXT)");
  await assert.rejects(() =>
    migrateDatabase({ databaseUrl: f.databaseUrl, deploymentEnvironment: "test" }),
  );
  const after = (
    await f.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
      [f.schema],
    )
  ).rows;
  assert.deepEqual(
    after.map((r) => r.table_name),
    ["ads_tokens"],
  );
  await f.query("DROP TABLE ads_tokens");
  assert.deepEqual(
    (await migrateDatabase({ databaseUrl: f.databaseUrl, deploymentEnvironment: "test" })).applied,
    ["001"],
  );
});

test("checksum drift, future schemas and deployment-environment mismatch fail closed", async (t) => {
  const f = await fixture(t);
  const input = { databaseUrl: f.databaseUrl, deploymentEnvironment: "test" };
  await assert.rejects(
    () => f.openStore({ deploymentEnvironment: "production" }),
    /deployment environment does not match/,
  );
  await assert.rejects(
    () => migrateDatabase({ ...input, deploymentEnvironment: "preview" }),
    /deployment environment does not match/,
  );
  assert.equal(
    (await f.query("SELECT value FROM ads_meta WHERE name = 'deployment-environment'")).rows[0]
      .value,
    "test",
  );
  await f.query("UPDATE ads_schema_migrations SET checksum = 'changed'");
  await assert.rejects(() => f.openStore(), /checksum does not match/);
  await assert.rejects(() => migrateDatabase(input), /checksum does not match/);
  const checksum = (await readMigrations())[0].checksum;
  await f.query("UPDATE ads_schema_migrations SET checksum = $1", [checksum]);
  await f.query("INSERT INTO ads_schema_migrations (version, checksum) VALUES ('999', 'future')");
  await assert.rejects(() => f.openStore(), /unsupported newer schema/);
  await assert.rejects(() => migrateDatabase(input), /unsupported newer schema/);
});

test("an injected pool remains caller-owned while store close is idempotent and terminal", async (t) => {
  const f = await fixture(t);
  const pool = await f.openPool();
  const injected = await f.openStore({ pool });
  await injected.close();
  await injected.close();
  assert.equal((await pool.query("SELECT 1 AS alive")).rows[0].alive, 1);
  await assert.rejects(() => injected.getFlow("none"), /store is closed/);
});

test("the production clock comes from PostgreSQL and remote pools require verified TLS", async (t) => {
  const f = await createTestStore(t);
  const before = Number(
    (
      await f.query(
        "SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS timestamp",
      )
    ).rows[0].timestamp,
  );
  const flow = await f.store.createFlow({ step: "key" });
  const after = Number(
    (
      await f.query(
        "SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS timestamp",
      )
    ).rows[0].timestamp,
  );
  assert.ok(flow.expiresAt >= before + AUTH_TTL.flow);
  assert.ok(flow.expiresAt <= after + AUTH_TTL.flow);
  assert.throws(
    () => createDatabasePool({ databaseUrl: "postgresql://db.example/test?sslmode=require" }),
    /sslmode=verify-full/,
  );
  for (const suffix of [
    "sslmode=verify-full&sslmode=disable",
    "host=remote.example&sslmode=disable",
    "sslmode=disable&query_timeout=0",
    "sslmode=disable&options=-c%20statement_timeout%3D0",
  ])
    assert.throws(
      () => validateDatabaseUrl(`postgresql://localhost/ads_test?${suffix}`),
      /unsupported or duplicate|simple search_path/,
    );
  assert.equal(
    validateDatabaseUrl("postgresql://db.example/ads?sslmode=verify-full"),
    "postgresql://db.example/ads?sslmode=verify-full",
  );
});

test("server query limits are transaction-local and reset on pooled connection reuse", async (t) => {
  const f = await fixture(t);
  const pool = await f.openPool();
  const settings =
    "SELECT current_setting('statement_timeout') AS statement, current_setting('lock_timeout') AS lock, current_setting('idle_in_transaction_session_timeout') AS idle";
  const before = (await pool.query(settings)).rows[0];
  const inside = await withTransaction(
    pool,
    async (client) => (await client.query(settings)).rows[0],
  );
  assert.deepEqual(inside, { statement: "10s", lock: "5s", idle: "15s" });
  assert.deepEqual((await pool.query(settings)).rows[0], before);
});

test("migration CLI prefers DATABASE_URL_UNPOOLED and falls back to DATABASE_URL", async (t) => {
  const direct = await fixture(t, { initialize: false });
  const fallback = await fixture(t, { initialize: false });
  const script = fileURLToPath(new URL("../scripts/migrate.mjs", import.meta.url));
  const run = promisify(execFile);
  const env = { ...process.env, ADS_DEPLOYMENT_ENVIRONMENT: "test", VERCEL_ENV: "" };
  const first = await run(process.execPath, [script], {
    env: { ...env, DATABASE_URL: fallback.databaseUrl, DATABASE_URL_UNPOOLED: direct.databaseUrl },
    timeout: 20_000,
  });
  assert.deepEqual(JSON.parse(first.stdout).applied, ["001"]);
  assert.equal(
    (await fallback.query("SELECT to_regclass('ads_schema_migrations') AS ledger")).rows[0].ledger,
    null,
  );
  const second = await run(process.execPath, [script], {
    env: { ...env, DATABASE_URL: fallback.databaseUrl, DATABASE_URL_UNPOOLED: "" },
    timeout: 20_000,
  });
  assert.deepEqual(JSON.parse(second.stdout).applied, ["001"]);
  assert.equal(
    (await fallback.query("SELECT value FROM ads_meta WHERE name = 'deployment-environment'"))
      .rows[0].value,
    "test",
  );
});
