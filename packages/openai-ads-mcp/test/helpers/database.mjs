import { randomBytes } from "node:crypto";
import { createStore } from "../../src/store.mjs";
import { migrateDatabase } from "../../src/storage/migrations.mjs";
import { createDatabasePool } from "../../src/storage/postgres.mjs";

/** Real PostgreSQL only. Each fixture owns a random schema in a dedicated test DB. */
export async function createTestStore(
  t,
  { encryptionKey = randomBytes(32), now, deploymentEnvironment = "test", initialize = true } = {},
) {
  const configuredUrl = process.env.ADS_TEST_DATABASE_URL;
  if (!configuredUrl)
    throw new Error(
      "ADS_TEST_DATABASE_URL is required for real PostgreSQL tests; database tests are never skipped.",
    );
  const url = new URL(configuredUrl);
  if (!/test/i.test(decodeURIComponent(url.pathname)))
    throw new Error(
      "ADS_TEST_DATABASE_URL must point to a dedicated database whose name contains 'test'.",
    );
  const admin = createDatabasePool({ databaseUrl: configuredUrl, max: 1 });
  const schema = `ads_test_${randomBytes(12).toString("hex")}`;
  const stores = new Set();
  const extraPools = new Set();
  let currentStore;
  let schemaCreated = false;
  t.after(async () => {
    await Promise.allSettled([...stores].map((store) => store.close()));
    await Promise.allSettled([...extraPools].map((pool) => pool.end()));
    try {
      if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await admin.end();
    }
  });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  // An isolated search_path also covers new independently created pg pools.
  // Exclude public so a missing test table cannot fall through to a real table.
  url.searchParams.set("options", `-c search_path=${schema}`);
  const databaseUrl = url.toString();
  const inspect = createDatabasePool({ databaseUrl, max: 2 });
  extraPools.add(inspect);
  const config = { databaseUrl, encryptionKey, deploymentEnvironment, now };
  const openStore = async (overrides = {}) => {
    const store = await createStore({ ...config, ...overrides });
    stores.add(store);
    return store;
  };
  if (initialize) {
    await migrateDatabase({ databaseUrl, deploymentEnvironment });
    currentStore = await openStore();
  }
  return {
    get store() {
      return currentStore;
    },
    databaseUrl,
    schema,
    openStore,
    query: (sql, parameters) => inspect.query(sql, parameters),
    async openPool() {
      const pool = createDatabasePool({ databaseUrl });
      extraPools.add(pool);
      return pool;
    },
    async restart() {
      if (currentStore) await currentStore.close();
      currentStore = await openStore();
      return currentStore;
    },
  };
}
