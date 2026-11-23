import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createDatabasePool, lockTransaction, withTransaction } from "./postgres.mjs";

// Append migrations; never edit an applied file or remove its manifest entry.
const files = [
  { version: "001", file: new URL("../../migrations/001_initial.sql", import.meta.url) },
];
let manifestPromise;
export function validateDeploymentEnvironment(environment) {
  if (!["production", "preview", "development", "test"].includes(environment))
    throw new Error("A valid credential database deployment environment is required.");
  return environment;
}

export async function assertDeploymentEnvironment(pool, environment) {
  validateDeploymentEnvironment(environment);
  const { rows } = await pool.query(
    "SELECT value FROM ads_meta WHERE name = 'deployment-environment'",
  );
  if (rows[0]?.value !== environment)
    throw new Error("The credential database deployment environment does not match this service.");
}

export function readMigrations() {
  manifestPromise ??= Promise.all(
    files.map(async ({ version, file }) => {
      const sql = await readFile(file, "utf8");
      return Object.freeze({
        version,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      });
    }),
  );
  return manifestPromise;
}

function checkLedger(rows, migrations, { requireCurrent = false } = {}) {
  if (rows.length > migrations.length)
    throw new Error("The credential database contains an unsupported newer schema migration.");
  for (let index = 0; index < rows.length; index += 1) {
    const expected = migrations[index];
    if (rows[index].version !== expected.version)
      throw new Error("The credential database migration history is incomplete or unsupported.");
    if (rows[index].checksum !== expected.checksum)
      throw new Error("The credential database migration checksum does not match this release.");
  }
  if (requireCurrent && rows.length !== migrations.length)
    throw new Error(
      "The credential database needs explicit migration before starting the service.",
    );
}

/** Read-only runtime verification. Schema DDL is exclusive to migrateDatabase. */
export async function assertCurrentSchema(pool) {
  const migrations = await readMigrations();
  let rows;
  try {
    ({ rows } = await pool.query(
      "SELECT version, checksum FROM ads_schema_migrations ORDER BY version",
    ));
  } catch (error) {
    if (error.code === "42P01")
      throw new Error(
        "The credential database needs explicit migration before starting the service.",
      );
    throw error;
  }
  checkLedger(rows, migrations, { requireCurrent: true });
}

/** Explicit deploy/maintenance action; serialized and fully transactional on one client. */
export async function migrateDatabase({
  databaseUrl,
  pool: suppliedPool,
  deploymentEnvironment = "development",
} = {}) {
  validateDeploymentEnvironment(deploymentEnvironment);
  const pool = suppliedPool ?? createDatabasePool({ databaseUrl, max: 1 });
  try {
    const migrations = await readMigrations();
    return await withTransaction(pool, async (client) => {
      await lockTransaction(client, "schema-migrations:v1");
      await client.query(`CREATE TABLE IF NOT EXISTS ads_schema_migrations (
        version TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`);
      const { rows } = await client.query(
        "SELECT version, checksum FROM ads_schema_migrations ORDER BY version",
      );
      checkLedger(rows, migrations);
      const applied = [];
      for (const migration of migrations.slice(rows.length)) {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO ads_schema_migrations (version, checksum) VALUES ($1, $2)",
          [migration.version, migration.checksum],
        );
        applied.push(migration.version);
      }
      await client.query(
        "INSERT INTO ads_meta (name, value) VALUES ('deployment-environment', $1) ON CONFLICT(name) DO NOTHING",
        [deploymentEnvironment],
      );
      await assertDeploymentEnvironment(client, deploymentEnvironment);
      return { applied, version: migrations.at(-1)?.version ?? null };
    });
  } finally {
    if (!suppliedPool) await pool.end();
  }
}
