import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { assertCurrentSchema, assertDeploymentEnvironment } from "./storage/migrations.mjs";
import {
  boundedQuery,
  createDatabasePool,
  lockTransaction,
  withTransaction,
} from "./storage/postgres.mjs";

export const AUTH_TTL = Object.freeze({
  access: 15 * 60_000,
  grant: 30 * 24 * 60 * 60_000,
  code: 5 * 60_000,
  flow: 10 * 60_000,
  browser: 60 * 60_000,
  handoff: 10 * 60_000,
});
export const tokenDigest = (value) => createHash("sha256").update(value).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");
const equal = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
const validAt = (grant, timestamp) =>
  Boolean(
    grant && grant.revoked_at === null && grant.credential && Number(grant.expires_at) > timestamp,
  );
const positiveInteger = (value, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value > 0 && value <= max;

/** Shared PostgreSQL vault. Apply migrations explicitly before opening the service. */
export async function createStore({
  databaseUrl,
  encryptionKey,
  deploymentEnvironment = "development",
  pool: suppliedPool,
  now,
}) {
  if (!Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32)
    throw new Error("The credential encryption key must contain exactly 32 bytes.");
  if (now !== undefined && typeof now !== "function")
    throw new Error("Invalid credential store clock.");
  const pool = suppliedPool ?? createDatabasePool({ databaseUrl });
  const query = (sql, parameters) => boundedQuery(pool, sql, parameters);
  const key = Buffer.from(encryptionKey);
  const seal = (value, aad) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(aad));
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
  };
  const open = (value, aad) => {
    const bytes = Buffer.from(value, "base64");
    if (bytes.length < 29) throw new Error("Invalid encrypted credential data.");
    const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"),
    );
  };
  const clock = async (client = { query }) => {
    const timestamp = now
      ? now()
      : Number(
          (
            await client.query(
              "SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS timestamp",
            )
          ).rows[0].timestamp,
        );
    if (!Number.isSafeInteger(timestamp) || timestamp < 0)
      throw new Error("Invalid credential store clock.");
    return timestamp;
  };
  const transaction = (action) => withTransaction(pool, action);
  try {
    // Serialize first-open key sentinels across independent pools. A losing key
    // must verify the winner's ciphertext, never replace it.
    await transaction(async (client) => {
      await assertCurrentSchema(client);
      await assertDeploymentEnvironment(client, deploymentEnvironment);
      await lockTransaction(client, "vault-key-check:v1");
      const { rows } = await client.query("SELECT value FROM ads_meta WHERE name = 'key-check'");
      if (!rows.length) {
        await client.query("INSERT INTO ads_meta (name, value) VALUES ('key-check', $1)", [
          seal("stark-ai-ads-vault-v1", "store:key-check"),
        ]);
        return;
      }
      try {
        if (open(rows[0].value, "store:key-check") !== "stark-ai-ads-vault-v1") throw new Error();
      } catch {
        throw new Error("The configured encryption key cannot open this credential database.");
      }
    });
  } catch (error) {
    key.fill(0);
    if (!suppliedPool) await pool.end();
    throw error;
  }

  const fingerprint = (candidate) => createHmac("sha256", key).update(candidate).digest("hex");
  const grantForUpdate = async (client, id) => {
    const { rows } = await client.query("SELECT * FROM ads_grants WHERE id = $1 FOR UPDATE", [id]);
    return rows[0];
  };
  const grantForShare = async (client, id) => {
    const { rows } = await client.query("SELECT * FROM ads_grants WHERE id = $1 FOR SHARE", [id]);
    return rows[0];
  };
  // All grant-bound writers lock the grant FIRST. Codes, tokens, browser rows,
  // and handoffs are only touched afterward; multi-grant work sorts grant IDs.
  const revokeGrant = async (client, grantId, timestamp) => {
    await client.query(
      "UPDATE ads_grants SET revoked_at = $2, credential = NULL, credential_fingerprint = NULL WHERE id = $1",
      [grantId, timestamp],
    );
    await client.query("DELETE FROM ads_browser_sessions WHERE grant_id = $1", [grantId]);
    await client.query("DELETE FROM ads_handoffs WHERE grant_id = $1", [grantId]);
  };
  const bindBrowser = (client, session, grant, timestamp) =>
    client.query(
      "INSERT INTO ads_browser_sessions (hash, grant_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT(hash, grant_id) DO UPDATE SET expires_at = excluded.expires_at",
      [
        tokenDigest(session),
        grant.id,
        Math.min(Number(grant.expires_at), timestamp + AUTH_TTL.browser),
      ],
    );
  const issueTokens = async (client, grant, scopes, timestamp) => {
    const access = randomToken();
    const expiresAt = Math.min(Number(grant.expires_at), timestamp + AUTH_TTL.access);
    await client.query(
      "INSERT INTO ads_tokens (hash, grant_id, kind, scopes, expires_at) VALUES ($1, $2, 'access', $3, $4)",
      [tokenDigest(access), grant.id, JSON.stringify(scopes), expiresAt],
    );
    const result = {
      access_token: access,
      token_type: "Bearer",
      expires_in: Math.floor((expiresAt - timestamp) / 1000),
      scope: scopes.join(" "),
      resource: grant.resource,
    };
    if (scopes.includes("offline_access")) {
      const refresh = randomToken();
      await client.query(
        "INSERT INTO ads_tokens (hash, grant_id, kind, scopes, expires_at) VALUES ($1, $2, 'refresh', $3, $4)",
        [tokenDigest(refresh), grant.id, JSON.stringify(scopes), grant.expires_at],
      );
      result.refresh_token = refresh;
    }
    return result;
  };
  const readFlow = (row) =>
    row
      ? {
          ...open(row.payload, `flow:${row.id}`),
          id: row.id,
          revision: row.revision,
          expiresAt: Number(row.expires_at),
        }
      : null;

  const methods = {
    async createFlow(data) {
      const id = randomToken();
      const expiresAt = (await clock()) + AUTH_TTL.flow;
      await query(
        "INSERT INTO ads_flows (id, revision, payload, expires_at) VALUES ($1, 0, $2, $3)",
        [id, seal(data, `flow:${id}`), expiresAt],
      );
      return { ...data, id, revision: 0, expiresAt };
    },
    async getFlow(id) {
      const { rows } = await query("SELECT * FROM ads_flows WHERE id = $1 AND expires_at > $2", [
        id,
        await clock(),
      ]);
      return readFlow(rows[0]);
    },
    async updateFlow(id, revision, data) {
      return transaction(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM ads_flows WHERE id = $1 AND revision = $2 FOR UPDATE",
          [id, revision],
        );
        const row = rows[0];
        if (!row || Number(row.expires_at) <= (await clock(client))) return null;
        await client.query(
          "UPDATE ads_flows SET payload = $2, revision = revision + 1 WHERE id = $1",
          [id, seal(data, `flow:${id}`)],
        );
        return { ...data, id, revision: revision + 1, expiresAt: Number(row.expires_at) };
      });
    },
    async consumeFlow(id, revision) {
      return transaction(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM ads_flows WHERE id = $1 AND revision = $2 FOR UPDATE",
          [id, revision],
        );
        const row = rows[0];
        if (!row || Number(row.expires_at) <= (await clock(client))) return null;
        const result = readFlow(row);
        await client.query("DELETE FROM ads_flows WHERE id = $1", [id]);
        return result;
      });
    },
    async createAuthorizationCode({
      clientId,
      redirectUri,
      resource,
      codeChallenge,
      apiKey,
      account,
      scopes,
      browserSession,
    }) {
      return transaction(async (client) => {
        const id = randomToken();
        const timestamp = await clock(client);
        const expiresAt =
          timestamp + (scopes.includes("offline_access") ? AUTH_TTL.grant : AUTH_TTL.access);
        await client.query(
          "INSERT INTO ads_grants (id, client_id, account_id, resource, scopes, credential, credential_fingerprint, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [
            id,
            clientId,
            account.id,
            resource,
            JSON.stringify(scopes),
            seal({ apiKey }, `grant:${id}`),
            fingerprint(apiKey),
            expiresAt,
          ],
        );
        const code = randomToken();
        await client.query(
          "INSERT INTO ads_codes (hash, grant_id, redirect_uri, challenge, expires_at) VALUES ($1, $2, $3, $4, $5)",
          [tokenDigest(code), id, redirectUri, codeChallenge, timestamp + AUTH_TTL.code],
        );
        if (browserSession)
          await bindBrowser(client, browserSession, { id, expires_at: expiresAt }, timestamp);
        return code;
      });
    },
    async exchangeCode({ code, clientId, redirectUri, resource, codeVerifier }) {
      if (typeof codeVerifier !== "string" || !/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier))
        return null;
      return transaction(async (client) => {
        const hash = tokenDigest(code);
        const initial = (
          await client.query("SELECT grant_id FROM ads_codes WHERE hash = $1", [hash])
        ).rows[0];
        if (!initial) return null;
        const grant = await grantForUpdate(client, initial.grant_id);
        const timestamp = await clock(client);
        const row = (
          await client.query("SELECT * FROM ads_codes WHERE hash = $1 FOR UPDATE", [hash])
        ).rows[0];
        if (
          !row ||
          !validAt(grant, timestamp) ||
          grant.client_id !== clientId ||
          row.redirect_uri !== redirectUri ||
          grant.resource !== resource
        )
          return null;
        const proof = createHash("sha256").update(codeVerifier).digest("base64url");
        if (!equal(proof, row.challenge)) return null;
        // Keep used codes through grant expiry; proven replay also revokes after
        // the original five-minute redemption window has closed.
        if (row.used_at !== null) {
          await revokeGrant(client, grant.id, timestamp);
          return null;
        }
        if (Number(row.expires_at) <= timestamp) return null;
        await client.query("UPDATE ads_codes SET used_at = $2 WHERE hash = $1", [hash, timestamp]);
        return issueTokens(client, grant, grant.scopes, timestamp);
      });
    },
    async refresh({ refreshToken, clientId, resource, scopes }) {
      return transaction(async (client) => {
        const hash = tokenDigest(refreshToken);
        const initial = (
          await client.query(
            "SELECT grant_id FROM ads_tokens WHERE hash = $1 AND kind = 'refresh'",
            [hash],
          )
        ).rows[0];
        if (!initial) return null;
        const grant = await grantForUpdate(client, initial.grant_id);
        const timestamp = await clock(client);
        const row = (
          await client.query(
            "SELECT * FROM ads_tokens WHERE hash = $1 AND kind = 'refresh' FOR UPDATE",
            [hash],
          )
        ).rows[0];
        if (
          !row ||
          Number(row.expires_at) <= timestamp ||
          !validAt(grant, timestamp) ||
          grant.client_id !== clientId ||
          grant.resource !== resource
        )
          return null;
        if (row.used_at !== null) {
          await revokeGrant(client, grant.id, timestamp);
          return null;
        }
        const next = scopes ?? row.scopes;
        if (
          !Array.isArray(next) ||
          !next.includes("ads:read") ||
          next.some((scope) => !row.scopes.includes(scope))
        )
          return null;
        await client.query("UPDATE ads_tokens SET used_at = $2 WHERE hash = $1", [hash, timestamp]);
        return issueTokens(client, grant, next, timestamp);
      });
    },
    async authenticate({ token, resource }, beforeUnlock) {
      return transaction(async (client) => {
        const hash = tokenDigest(token);
        const initial = (
          await client.query(
            "SELECT grant_id FROM ads_tokens WHERE hash = $1 AND kind = 'access'",
            [hash],
          )
        ).rows[0];
        if (!initial) return null;
        const grant = await grantForShare(client, initial.grant_id);
        const timestamp = await clock(client);
        const row = (
          await client.query("SELECT * FROM ads_tokens WHERE hash = $1 AND kind = 'access'", [hash])
        ).rows[0];
        if (
          !row ||
          Number(row.expires_at) <= timestamp ||
          !validAt(grant, timestamp) ||
          grant.resource !== resource
        )
          return null;
        const principal = {
          accountId: grant.account_id,
          apiKey: open(grant.credential, `grant:${grant.id}`).apiKey,
          scopes: row.scopes,
          grantId: grant.id,
          clientId: grant.client_id,
        };
        // Dispatch synchronously under the grant lock. The caller awaits the
        // upstream response separately so revocation can acquire the lock.
        beforeUnlock?.(principal);
        return principal;
      });
    },
    async revoke({ token, clientId }) {
      return transaction(async (client) => {
        const row = (
          await client.query("SELECT grant_id FROM ads_tokens WHERE hash = $1", [
            tokenDigest(token),
          ])
        ).rows[0];
        if (!row) return;
        const grant = await grantForUpdate(client, row.grant_id);
        const timestamp = await clock(client);
        if (validAt(grant, timestamp) && grant.client_id === clientId)
          await revokeGrant(client, grant.id, timestamp);
      });
    },
    async bindBrowserSession(session, grantId) {
      return transaction(async (client) => {
        const grant = await grantForUpdate(client, grantId);
        const timestamp = await clock(client);
        if (!validAt(grant, timestamp)) return false;
        await bindBrowser(client, session, grant, timestamp);
        return true;
      });
    },
    async hasBrowserGrant(session, grantId) {
      const { rowCount } = await query(
        "SELECT 1 FROM ads_grants g JOIN ads_browser_sessions b ON b.grant_id = g.id WHERE g.id = $1 AND b.hash = $2 AND b.expires_at > $3 AND g.expires_at > $3 AND g.revoked_at IS NULL AND g.credential IS NOT NULL",
        [grantId, tokenDigest(session), await clock()],
      );
      return rowCount > 0;
    },
    async matchesGrantKey(grantId, candidate) {
      if (typeof candidate !== "string") return false;
      const grant = (
        await query(
          "SELECT credential_fingerprint FROM ads_grants WHERE id = $1 AND revoked_at IS NULL AND credential IS NOT NULL AND expires_at > $2",
          [grantId, await clock()],
        )
      ).rows[0];
      return Boolean(grant && equal(grant.credential_fingerprint, fingerprint(candidate)));
    },
    async bindBrowserByKey(session, candidate) {
      if (typeof candidate !== "string") return 0;
      return transaction(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM ads_grants WHERE credential_fingerprint = $1 AND revoked_at IS NULL AND credential IS NOT NULL AND expires_at > $2 ORDER BY id FOR UPDATE",
          [fingerprint(candidate), await clock(client)],
        );
        const timestamp = await clock(client);
        let count = 0;
        for (const grant of rows) {
          if (!validAt(grant, timestamp)) continue;
          await bindBrowser(client, session, grant, timestamp);
          count += 1;
        }
        return count;
      });
    },
    async listBrowserGrants(session) {
      const { rows } = await query(
        "SELECT g.id, g.account_id, g.client_id, g.scopes, g.expires_at FROM ads_grants g JOIN ads_browser_sessions b ON g.id = b.grant_id WHERE b.hash = $1 AND b.expires_at > $2 AND g.expires_at > $2 AND g.revoked_at IS NULL AND g.credential IS NOT NULL ORDER BY g.id",
        [tokenDigest(session), await clock()],
      );
      return rows.map((row) => ({
        grantId: row.id,
        accountId: row.account_id,
        clientId: row.client_id,
        scopes: row.scopes,
        expiresAt: Number(row.expires_at),
      }));
    },
    async revokeBrowserGrant(session, grantId) {
      return transaction(async (client) => {
        const grant = await grantForUpdate(client, grantId);
        const timestamp = await clock(client);
        if (!validAt(grant, timestamp)) return false;
        const row = (
          await client.query(
            "SELECT expires_at FROM ads_browser_sessions WHERE hash = $1 AND grant_id = $2",
            [tokenDigest(session), grantId],
          )
        ).rows[0];
        if (!row || Number(row.expires_at) <= timestamp) return false;
        await revokeGrant(client, grantId, timestamp);
        return true;
      });
    },
    async createSecretHandoff({ grantId, operation, value, ttlMs = AUTH_TTL.handoff }) {
      if (!positiveInteger(ttlMs, AUTH_TTL.handoff))
        throw new Error("Credential handoff lifetime must be at most ten minutes.");
      return transaction(async (client) => {
        const grant = await grantForUpdate(client, grantId);
        const timestamp = await clock(client);
        if (!validAt(grant, timestamp))
          throw new Error("The account connection is no longer available.");
        const id = randomToken();
        const expiresAt = Math.min(Number(grant.expires_at), timestamp + ttlMs);
        await client.query(
          "INSERT INTO ads_handoffs (id, grant_id, operation, payload, expires_at) VALUES ($1, $2, $3, $4, $5)",
          [id, grantId, operation, seal(value, `handoff:${grantId}:${id}`), expiresAt],
        );
        return { id, expiresAt };
      });
    },
    async getSecretHandoff(id) {
      const { rows } = await query(
        "SELECT h.id, h.grant_id, h.operation, h.expires_at FROM ads_handoffs h JOIN ads_grants g ON g.id = h.grant_id WHERE h.id = $1 AND h.expires_at > $2 AND g.expires_at > $2 AND g.revoked_at IS NULL AND g.credential IS NOT NULL",
        [id, await clock()],
      );
      const row = rows[0];
      return row
        ? {
            id: row.id,
            grantId: row.grant_id,
            operation: row.operation,
            expiresAt: Number(row.expires_at),
          }
        : null;
    },
    async consumeSecretHandoff(id, grantId) {
      return transaction(async (client) => {
        const grant = await grantForUpdate(client, grantId);
        const timestamp = await clock(client);
        if (!validAt(grant, timestamp)) return null;
        const row = (
          await client.query(
            "SELECT * FROM ads_handoffs WHERE id = $1 AND grant_id = $2 FOR UPDATE",
            [id, grantId],
          )
        ).rows[0];
        if (!row || Number(row.expires_at) <= timestamp) return null;
        const result = open(row.payload, `handoff:${grantId}:${id}`);
        await client.query("DELETE FROM ads_handoffs WHERE id = $1", [id]);
        return result;
      });
    },
    async allowRate(name, limit, windowMs) {
      if (!positiveInteger(limit, 2_147_483_646) || !positiveInteger(windowMs, AUTH_TTL.grant))
        throw new Error("Invalid shared rate limit.");
      const timestamp = await clock();
      const { rowCount } = await query(
        `INSERT INTO ads_rate_limits (name, count, expires_at) VALUES ($1, 1, $2)
        ON CONFLICT(name) DO UPDATE SET
          count = CASE WHEN ads_rate_limits.expires_at <= $3 THEN 1 ELSE ads_rate_limits.count + 1 END,
          expires_at = CASE WHEN ads_rate_limits.expires_at <= $3 THEN excluded.expires_at ELSE ads_rate_limits.expires_at END
        WHERE ads_rate_limits.expires_at <= $3 OR ads_rate_limits.count < $4
        RETURNING count`,
        [tokenDigest(name), timestamp + windowMs, timestamp, limit],
      );
      return rowCount > 0;
    },
    async acquireLease({ scope, ownerId, limit, globalLimit, ttlMs }) {
      if (
        typeof scope !== "string" ||
        !/^[a-z][a-z0-9-]{0,63}$/.test(scope) ||
        typeof ownerId !== "string" ||
        !ownerId ||
        ownerId.length > 1024 ||
        !positiveInteger(limit, 1_000_000) ||
        !positiveInteger(globalLimit, 1_000_000) ||
        !positiveInteger(ttlMs, AUTH_TTL.handoff)
      )
        throw new Error("Invalid shared concurrency lease.");
      return transaction(async (client) => {
        await lockTransaction(client, `lease:${scope}`);
        const timestamp = await clock(client);
        await client.query("DELETE FROM ads_leases WHERE scope = $1 AND expires_at <= $2", [
          scope,
          timestamp,
        ]);
        const ownerHash = tokenDigest(ownerId);
        const row = (
          await client.query(
            "SELECT count(*) AS total, count(*) FILTER (WHERE owner_hash = $2) AS owned FROM ads_leases WHERE scope = $1 AND expires_at > $3",
            [scope, ownerHash, timestamp],
          )
        ).rows[0];
        if (Number(row.total) >= globalLimit || Number(row.owned) >= limit) return null;
        const id = randomToken();
        await client.query(
          "INSERT INTO ads_leases (id, scope, owner_hash, expires_at) VALUES ($1, $2, $3, $4)",
          [id, scope, ownerHash, timestamp + ttlMs],
        );
        return id;
      });
    },
    async releaseLease(id) {
      if (typeof id !== "string") return;
      // Deletion alone is atomic; an admission racing it can only under-admit.
      await query("DELETE FROM ads_leases WHERE id = $1", [id]);
    },
    async prune() {
      return transaction(async (client) => {
        const timestamp = await clock(client);
        // Grant locks always precede child-row locks, also in maintenance. Child
        // cleanup follows the same browser-before-handoff order as revocation.
        const expiredGrant = `expires_at <= $1 OR EXISTS (
          SELECT 1 FROM ads_codes
          WHERE grant_id = ads_grants.id AND used_at IS NULL AND expires_at <= $1
        )`;
        const candidates = (
          await client.query(
            `SELECT id FROM ads_grants WHERE ${expiredGrant} ORDER BY id FOR UPDATE`,
            [timestamp],
          )
        ).rows;
        // A concurrent exchange may have redeemed the code while prune waited
        // for its grant lock. Recheck with a fresh statement snapshot.
        if (candidates.length)
          await client.query(
            `DELETE FROM ads_grants WHERE id = ANY($2::text[]) AND (${expiredGrant})`,
            [timestamp, candidates.map(({ id }) => id)],
          );
        await client.query("DELETE FROM ads_flows WHERE expires_at <= $1", [timestamp]);
        await client.query("DELETE FROM ads_browser_sessions WHERE expires_at <= $1", [timestamp]);
        await client.query("DELETE FROM ads_handoffs WHERE expires_at <= $1", [timestamp]);
        await client.query("DELETE FROM ads_rate_limits WHERE expires_at <= $1", [timestamp]);
        await client.query("DELETE FROM ads_leases WHERE expires_at <= $1", [timestamp]);
        // Spent refresh tokens and codes survive until grant expiry for replay detection.
        await client.query("DELETE FROM ads_tokens WHERE kind = 'access' AND expires_at <= $1", [
          timestamp,
        ]);
      });
    },
  };
  let closed = false;
  let closePromise;
  const pending = new Set();
  const store = Object.fromEntries(
    Object.entries(methods).map(([name, action]) => [
      name,
      async (...args) => {
        if (closed) throw new Error("The credential store is closed.");
        const result = action(...args);
        pending.add(result);
        try {
          return await result;
        } finally {
          pending.delete(result);
        }
      },
    ]),
  );
  store.close = async () => {
    closePromise ??= (async () => {
      closed = true;
      await Promise.allSettled([...pending]);
      try {
        if (!suppliedPool) await pool.end();
      } finally {
        key.fill(0);
      }
    })();
    await closePromise;
  };
  return store;
}
