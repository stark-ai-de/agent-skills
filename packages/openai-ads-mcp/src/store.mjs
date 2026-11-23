import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  constants,
  fchmodSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  closeSync,
} from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

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
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
function inspectPathComponents(target) {
  const absolute = path.resolve(target);
  const { root } = path.parse(absolute);
  let current = root;
  for (const component of absolute.slice(root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    try {
      if (lstatSync(current).isSymbolicLink())
        throw new Error("The credential database path must not contain symbolic links.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      // No deeper component can exist before this directory has been created.
      break;
    }
  }
}

/** Single-process durable credential vault. Keep its directory on a local persistent volume. */
export function createStore({ databasePath, encryptionKey, now = Date.now }) {
  if (!Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32)
    throw new Error("The credential encryption key must contain exactly 32 bytes.");
  if (typeof databasePath !== "string" || !databasePath)
    throw new Error("A credential database path is required.");
  const key = Buffer.from(encryptionKey);
  if (databasePath !== ":memory:") {
    inspectPathComponents(databasePath);
    mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
    inspectPathComponents(databasePath);
    if ((lstatSync(path.dirname(databasePath)).mode & 0o022) !== 0)
      throw new Error("The credential database directory must not be writable by other users.");
    // O_NOFOLLOW covers a leaf swapped after lstat; the parent must be operator-owned and private.
    const fd = openSync(
      databasePath,
      constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW,
      0o600,
    );
    try {
      if (!fstatSync(fd).isFile())
        throw new Error("The credential database must be a regular file.");
      fchmodSync(fd, 0o600);
    } finally {
      closeSync(fd);
    }
  }
  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA secure_delete = ON;
    CREATE TABLE IF NOT EXISTS meta (name TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS grants (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, account_id TEXT NOT NULL,
      resource TEXT NOT NULL, scopes TEXT NOT NULL, credential TEXT, credential_fingerprint TEXT,
      expires_at INTEGER NOT NULL, revoked_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS codes (
      hash TEXT PRIMARY KEY, grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
      redirect_uri TEXT NOT NULL, challenge TEXT NOT NULL, expires_at INTEGER NOT NULL,
      used_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS tokens (
      hash TEXT PRIMARY KEY, grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('access', 'refresh')), scopes TEXT NOT NULL,
      expires_at INTEGER NOT NULL, used_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS tokens_grant ON tokens(grant_id);
    CREATE TABLE IF NOT EXISTS flows (
      id TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS browser_sessions (
      hash TEXT NOT NULL, grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL, PRIMARY KEY(hash, grant_id)
    );
    CREATE TABLE IF NOT EXISTS handoffs (
      id TEXT PRIMARY KEY, grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
      operation TEXT NOT NULL, payload TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_limits (
      name TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
    );
  `);
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
  const keyCheck = db.prepare("SELECT value FROM meta WHERE name = 'key-check'").get();
  try {
    if (keyCheck) {
      if (open(keyCheck.value, "store:key-check") !== "stark-ai-ads-vault-v1") throw new Error();
    } else {
      db.prepare("INSERT INTO meta (name, value) VALUES ('key-check', ?)").run(
        seal("stark-ai-ads-vault-v1", "store:key-check"),
      );
    }
  } catch {
    db.close();
    key.fill(0);
    throw new Error("The configured encryption key cannot open this credential database.");
  }
  const transaction = (action) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = action();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  const validGrant = (id) => {
    const row = db.prepare("SELECT * FROM grants WHERE id = ?").get(id);
    return row && row.revoked_at === null && row.credential && row.expires_at > now() ? row : null;
  };
  const credentialFingerprint = (candidate) =>
    createHmac("sha256", key).update(candidate).digest("hex");
  const revokeGrant = (id) => {
    db.prepare(
      "UPDATE grants SET revoked_at = ?, credential = NULL, credential_fingerprint = NULL WHERE id = ?",
    ).run(now(), id);
    db.prepare("DELETE FROM browser_sessions WHERE grant_id = ?").run(id);
    db.prepare("DELETE FROM handoffs WHERE grant_id = ?").run(id);
  };
  const bindBrowserSession = (session, grantId) => {
    const grant = validGrant(grantId);
    if (!grant) return false;
    db.prepare(
      "INSERT INTO browser_sessions (hash, grant_id, expires_at) VALUES (?, ?, ?) ON CONFLICT(hash, grant_id) DO UPDATE SET expires_at = excluded.expires_at",
    ).run(tokenDigest(session), grantId, Math.min(grant.expires_at, now() + AUTH_TTL.browser));
    return true;
  };
  const issueTokens = (grant, scopes) => {
    const access = randomToken();
    const expiresAt = Math.min(grant.expires_at, now() + AUTH_TTL.access);
    const insert = db.prepare(
      "INSERT INTO tokens (hash, grant_id, kind, scopes, expires_at) VALUES (?, ?, ?, ?, ?)",
    );
    insert.run(tokenDigest(access), grant.id, "access", JSON.stringify(scopes), expiresAt);
    const result = {
      access_token: access,
      token_type: "Bearer",
      expires_in: Math.floor((expiresAt - now()) / 1000),
      scope: scopes.join(" "),
      resource: grant.resource,
    };
    if (scopes.includes("offline_access")) {
      const refresh = randomToken();
      insert.run(
        tokenDigest(refresh),
        grant.id,
        "refresh",
        JSON.stringify(scopes),
        grant.expires_at,
      );
      result.refresh_token = refresh;
    }
    return result;
  };
  const readFlow = (row) =>
    row && row.expires_at > now()
      ? {
          ...open(row.payload, `flow:${row.id}`),
          id: row.id,
          revision: row.revision,
          expiresAt: row.expires_at,
        }
      : null;
  let closed = false;
  return {
    createFlow(data) {
      const id = randomToken();
      const expiresAt = now() + AUTH_TTL.flow;
      db.prepare("INSERT INTO flows (id, revision, payload, expires_at) VALUES (?, 0, ?, ?)").run(
        id,
        seal(data, `flow:${id}`),
        expiresAt,
      );
      return { ...data, id, revision: 0, expiresAt };
    },
    getFlow(id) {
      return readFlow(db.prepare("SELECT * FROM flows WHERE id = ?").get(id));
    },
    updateFlow(id, revision, data) {
      return transaction(() => {
        const row = db
          .prepare("SELECT * FROM flows WHERE id = ? AND revision = ?")
          .get(id, revision);
        if (!row || row.expires_at <= now()) return null;
        db.prepare("UPDATE flows SET payload = ?, revision = revision + 1 WHERE id = ?").run(
          seal(data, `flow:${id}`),
          id,
        );
        return { ...data, id, revision: revision + 1, expiresAt: row.expires_at };
      });
    },
    consumeFlow(id, revision) {
      return transaction(() => {
        const row = db
          .prepare("SELECT * FROM flows WHERE id = ? AND revision = ?")
          .get(id, revision);
        const result = readFlow(row);
        if (result) db.prepare("DELETE FROM flows WHERE id = ?").run(id);
        return result;
      });
    },
    createAuthorizationCode({
      clientId,
      redirectUri,
      resource,
      codeChallenge,
      apiKey,
      account,
      scopes,
      browserSession,
    }) {
      return transaction(() => {
        const id = randomToken();
        const expiresAt =
          now() + (scopes.includes("offline_access") ? AUTH_TTL.grant : AUTH_TTL.access);
        db.prepare(
          "INSERT INTO grants (id, client_id, account_id, resource, scopes, credential, credential_fingerprint, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(
          id,
          clientId,
          account.id,
          resource,
          JSON.stringify(scopes),
          seal({ apiKey }, `grant:${id}`),
          credentialFingerprint(apiKey),
          expiresAt,
        );
        const code = randomToken();
        db.prepare(
          "INSERT INTO codes (hash, grant_id, redirect_uri, challenge, expires_at) VALUES (?, ?, ?, ?, ?)",
        ).run(tokenDigest(code), id, redirectUri, codeChallenge, now() + AUTH_TTL.code);
        if (browserSession) bindBrowserSession(browserSession, id);
        return code;
      });
    },
    exchangeCode({ code, clientId, redirectUri, resource, codeVerifier }) {
      return transaction(() => {
        const row = db.prepare("SELECT * FROM codes WHERE hash = ?").get(tokenDigest(code));
        if (!row || row.expires_at <= now()) return null;
        const grant = validGrant(row.grant_id);
        if (
          !grant ||
          grant.client_id !== clientId ||
          row.redirect_uri !== redirectUri ||
          grant.resource !== resource ||
          !/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)
        )
          return null;
        const proof = createHash("sha256").update(codeVerifier).digest("base64url");
        if (!equal(proof, row.challenge)) return null;
        if (row.used_at !== null) {
          revokeGrant(grant.id);
          return null;
        }
        db.prepare("UPDATE codes SET used_at = ? WHERE hash = ?").run(now(), row.hash);
        return issueTokens(grant, JSON.parse(grant.scopes));
      });
    },
    refresh({ refreshToken, clientId, resource, scopes }) {
      return transaction(() => {
        const row = db
          .prepare("SELECT * FROM tokens WHERE hash = ? AND kind = 'refresh'")
          .get(tokenDigest(refreshToken));
        if (!row || row.expires_at <= now()) return null;
        const grant = validGrant(row.grant_id);
        if (!grant || grant.client_id !== clientId || grant.resource !== resource) return null;
        if (row.used_at !== null) {
          revokeGrant(grant.id);
          return null;
        }
        const previous = JSON.parse(row.scopes);
        const next = scopes ?? previous;
        if (!next.includes("ads:read") || next.some((scope) => !previous.includes(scope)))
          return null;
        db.prepare("UPDATE tokens SET used_at = ? WHERE hash = ?").run(now(), row.hash);
        return issueTokens(grant, next);
      });
    },
    authenticate({ token, resource }) {
      const row = db
        .prepare("SELECT * FROM tokens WHERE hash = ? AND kind = 'access'")
        .get(tokenDigest(token));
      if (!row || row.expires_at <= now()) return null;
      const grant = validGrant(row.grant_id);
      if (!grant || grant.resource !== resource) return null;
      const credential = open(grant.credential, `grant:${grant.id}`);
      return {
        accountId: grant.account_id,
        apiKey: credential.apiKey,
        scopes: JSON.parse(row.scopes),
        grantId: grant.id,
        clientId: grant.client_id,
      };
    },
    revoke({ token, clientId }) {
      return transaction(() => {
        const row = db
          .prepare("SELECT grant_id FROM tokens WHERE hash = ?")
          .get(tokenDigest(token));
        const grant = row ? validGrant(row.grant_id) : null;
        if (grant?.client_id === clientId) revokeGrant(grant.id);
      });
    },
    bindBrowserSession,
    hasBrowserGrant(session, grantId) {
      const row = db
        .prepare("SELECT expires_at FROM browser_sessions WHERE hash = ? AND grant_id = ?")
        .get(tokenDigest(session), grantId);
      return Boolean(row && row.expires_at > now() && validGrant(grantId));
    },
    matchesGrantKey(grantId, candidate) {
      const grant = validGrant(grantId);
      if (!grant || typeof candidate !== "string") return false;
      return equal(grant.credential_fingerprint, credentialFingerprint(candidate));
    },
    bindBrowserByKey(session, candidate) {
      return transaction(() => {
        const rows = db
          .prepare(
            "SELECT id FROM grants WHERE credential_fingerprint = ? AND revoked_at IS NULL AND expires_at > ?",
          )
          .all(credentialFingerprint(candidate), now());
        for (const row of rows) bindBrowserSession(session, row.id);
        return rows.length;
      });
    },
    listBrowserGrants(session) {
      return db
        .prepare(
          "SELECT g.id, g.account_id, g.client_id, g.scopes, g.expires_at FROM grants g JOIN browser_sessions b ON g.id = b.grant_id WHERE b.hash = ? AND b.expires_at > ? AND g.expires_at > ? AND g.revoked_at IS NULL AND g.credential IS NOT NULL",
        )
        .all(tokenDigest(session), now(), now())
        .map((row) => ({
          grantId: row.id,
          accountId: row.account_id,
          clientId: row.client_id,
          scopes: JSON.parse(row.scopes),
          expiresAt: row.expires_at,
        }));
    },
    revokeBrowserGrant(session, grantId) {
      return transaction(() => {
        const row = db
          .prepare("SELECT expires_at FROM browser_sessions WHERE hash = ? AND grant_id = ?")
          .get(tokenDigest(session), grantId);
        if (!row || row.expires_at <= now() || !validGrant(grantId)) return false;
        revokeGrant(grantId);
        return true;
      });
    },
    createSecretHandoff({ grantId, operation, value, ttlMs = AUTH_TTL.handoff }) {
      const grant = validGrant(grantId);
      if (!grant) throw new Error("The account connection is no longer available.");
      if (!Number.isInteger(ttlMs) || ttlMs <= 0 || ttlMs > AUTH_TTL.handoff)
        throw new Error("Credential handoff lifetime must be at most ten minutes.");
      const id = randomToken();
      const expiresAt = Math.min(grant.expires_at, now() + ttlMs);
      db.prepare(
        "INSERT INTO handoffs (id, grant_id, operation, payload, expires_at) VALUES (?, ?, ?, ?, ?)",
      ).run(id, grantId, operation, seal(value, `handoff:${grantId}:${id}`), expiresAt);
      return { id, expiresAt };
    },
    getSecretHandoff(id) {
      const row = db
        .prepare("SELECT id, grant_id, operation, expires_at FROM handoffs WHERE id = ?")
        .get(id);
      if (!row || row.expires_at <= now() || !validGrant(row.grant_id)) return null;
      return {
        id: row.id,
        grantId: row.grant_id,
        operation: row.operation,
        expiresAt: row.expires_at,
      };
    },
    consumeSecretHandoff(id, grantId) {
      return transaction(() => {
        const row = db
          .prepare("SELECT * FROM handoffs WHERE id = ? AND grant_id = ?")
          .get(id, grantId);
        if (!row || row.expires_at <= now() || !validGrant(grantId)) return null;
        const result = open(row.payload, `handoff:${grantId}:${id}`);
        db.prepare("DELETE FROM handoffs WHERE id = ?").run(id);
        return result;
      });
    },
    allowRate(name, limit, windowMs) {
      return transaction(() => {
        const row = db
          .prepare("SELECT count, expires_at FROM rate_limits WHERE name = ?")
          .get(tokenDigest(name));
        if (!row || row.expires_at <= now()) {
          db.prepare(
            "INSERT INTO rate_limits (name, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(name) DO UPDATE SET count = 1, expires_at = excluded.expires_at",
          ).run(tokenDigest(name), now() + windowMs);
          return true;
        }
        if (row.count >= limit) return false;
        db.prepare("UPDATE rate_limits SET count = count + 1 WHERE name = ?").run(
          tokenDigest(name),
        );
        return true;
      });
    },
    prune() {
      transaction(() => {
        db.prepare("DELETE FROM grants WHERE expires_at <= ?").run(now());
        db.prepare("DELETE FROM flows WHERE expires_at <= ?").run(now());
        db.prepare("DELETE FROM handoffs WHERE expires_at <= ?").run(now());
        db.prepare("DELETE FROM browser_sessions WHERE expires_at <= ?").run(now());
        db.prepare("DELETE FROM rate_limits WHERE expires_at <= ?").run(now());
        // Keep spent refresh tokens and codes until their grant expires to detect replay.
        db.prepare("DELETE FROM tokens WHERE kind = 'access' AND expires_at <= ?").run(now());
      });
    },
    close() {
      if (!closed) {
        db.close();
        key.fill(0);
        closed = true;
      }
    },
  };
}
