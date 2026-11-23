import { createHash } from "node:crypto";
import { Pool } from "pg";

/** Validate the exact URL consumed by pg, without permitting query routing overrides. */
export function validateDatabaseUrl(databaseUrl) {
  if (
    typeof databaseUrl !== "string" ||
    !databaseUrl ||
    databaseUrl.length > 8192 ||
    /[\s\\]/.test(databaseUrl)
  )
    throw new Error("A bounded, valid DATABASE_URL PostgreSQL connection URL is required.");
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("A DATABASE_URL PostgreSQL connection URL is required.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL must use PostgreSQL.");
  if (!url.hostname || url.pathname.length < 2 || url.hash)
    throw new Error("DATABASE_URL must include a host and database, without a fragment.");
  const allowed = new Set([
    "sslmode",
    "sslrootcert",
    "sslcert",
    "sslkey",
    "channel_binding",
    "options",
    "application_name",
    "sslnegotiation",
    "uselibpqcompat",
  ]);
  const seen = new Set();
  for (const [name] of url.searchParams) {
    if (!allowed.has(name) || seen.has(name))
      throw new Error("DATABASE_URL contains an unsupported or duplicate connection parameter.");
    seen.add(name);
  }
  const options = url.searchParams.get("options");
  if (
    options !== null &&
    !/^-c search_path=[A-Za-z_][A-Za-z0-9_]*(?:,[A-Za-z_][A-Za-z0-9_]*)*$/.test(options)
  )
    throw new Error("DATABASE_URL options may only set a simple search_path.");
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
    url.searchParams.get("sslmode") !== "verify-full"
  )
    throw new Error("Remote DATABASE_URL connections require sslmode=verify-full.");
  return url.toString();
}

/** Keep connection budgets below the HTTP request budget, including failed acquisitions. */
export function createDatabasePool({ databaseUrl, max = 4 }) {
  const pool = new Pool({
    connectionString: validateDatabaseUrl(databaseUrl),
    max,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 20_000,
    query_timeout: 12_000,
    allowExitOnIdle: true,
    application_name: "stark-ai-openai-ads-mcp",
  });
  // pg removes failed idle clients. Do not log errors containing connection details;
  // the next request observes its own bounded connection/query failure.
  pool.on("error", () => {});
  return pool;
}

/** All statements in a transaction must use this one checked-out client. */
export async function withTransaction(pool, action) {
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query("BEGIN");
    // PgBouncer transaction pooling does not preserve session settings. Keep
    // server-side limits local to this transaction, never in startup parameters.
    await client.query(
      "SET LOCAL statement_timeout = '10000ms'; SET LOCAL lock_timeout = '5000ms'; SET LOCAL idle_in_transaction_session_timeout = '15000ms'",
    );
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      releaseError = rollbackError;
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

export const boundedQuery = (pool, sql, parameters) =>
  withTransaction(pool, (client) => client.query(sql, parameters));

/** Namespaced signed 64-bit advisory-lock key, stable across processes and pools. */
export const advisoryKey = (name) =>
  createHash("sha256").update(`stark-ai.ads:${name}`).digest().readBigInt64BE().toString();

export const lockTransaction = (client, name) =>
  client.query("SELECT pg_advisory_xact_lock($1::bigint)", [advisoryKey(name)]);
