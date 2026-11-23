import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.mjs";

const valid = {
  ADS_PUBLIC_ORIGIN: "https://ads.example.test",
  ADS_ENCRYPTION_KEY: Buffer.alloc(32, 42).toString("base64"),
  ADS_OAUTH_CLIENTS: JSON.stringify([
    {
      clientId: "test-client",
      redirectUris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
    },
  ]),
  DATABASE_URL: "postgresql://ads:synthetic-password@db.example.test/ads?sslmode=verify-full",
};

test("production startup requires an explicit origin, key and exact OAuth callbacks", () => {
  const config = loadConfig(valid);
  assert.equal(config.publicOrigin, "https://ads.example.test");
  assert.equal(config.encryptionKey.length, 32);
  assert.ok(config.allowedOrigins.includes("https://chatgpt.com"));
  for (const key of [
    "ADS_PUBLIC_ORIGIN",
    "ADS_ENCRYPTION_KEY",
    "ADS_OAUTH_CLIENTS",
    "DATABASE_URL",
  ])
    assert.throws(() => loadConfig({ ...valid, [key]: "" }), /required/);
  for (const origin of [
    "http://ads.example.test",
    "https://user:pass@ads.example.test",
    "https://ads.example.test/path",
    "https://ads.example.test/?token=secret",
  ])
    assert.throws(() => loadConfig({ ...valid, ADS_PUBLIC_ORIGIN: origin }), /origin/);
  for (const key of ["not-base64", Buffer.alloc(16).toString("base64"), "A".repeat(44)])
    assert.throws(() => loadConfig({ ...valid, ADS_ENCRYPTION_KEY: key }), /32-byte/);
});

test("remote PostgreSQL uses verified TLS and errors never disclose its connection URL", () => {
  assert.equal(loadConfig(valid).databaseUrl, valid.DATABASE_URL);
  assert.equal(loadConfig(valid).deploymentEnvironment, "development");
  for (const url of [
    "sqlite:/tmp/ads.sqlite",
    "postgresql://ads:DO-NOT-LEAK@db.example.test/ads",
    "postgresql://ads:DO-NOT-LEAK@db.example.test/ads?sslmode=require",
    "postgresql://ads:DO-NOT-LEAK@db.example.test/ads?sslmode=disable",
    "postgresql://ads:DO-NOT-LEAK@db.example.test/ads?sslmode=verify-full&sslmode=disable",
    "postgresql://ads:DO-NOT-LEAK@localhost/ads?host=remote.example.test&sslmode=disable",
    "postgresql://ads:DO-NOT-LEAK@localhost/ads?query_timeout=0",
    "postgresql://ads:DO-NOT-LEAK@localhost/ads?options=-c%20statement_timeout=0",
    "postgresql://ads:DO-NOT-LEAK@db.example.test/",
  ])
    assert.throws(
      () => loadConfig({ ...valid, DATABASE_URL: url }),
      (error) => /DATABASE_URL/.test(error.message) && !/DO-NOT-LEAK/.test(error.message),
    );
  assert.equal(
    loadConfig({ ...valid, DATABASE_URL: "postgresql://ads@127.0.0.1/ads_test" }).databaseUrl,
    "postgresql://ads@127.0.0.1/ads_test",
  );
});

test("Vercel requires an explicit environment, value secrets and a protected cleanup token", () => {
  const production = {
    ...valid,
    VERCEL: "1",
    VERCEL_ENV: "production",
    ADS_DEPLOYMENT_ENVIRONMENT: "production",
    CRON_SECRET: "synthetic-cron-token-".repeat(3),
  };
  const config = loadConfig(production);
  assert.equal(config.isVercel, true);
  assert.equal(config.deploymentEnvironment, "production");
  assert.throws(
    () => loadConfig({ ...production, ADS_DEPLOYMENT_ENVIRONMENT: undefined }),
    /ADS_DEPLOYMENT_ENVIRONMENT/,
  );
  assert.throws(
    () => loadConfig({ ...production, ADS_DEPLOYMENT_ENVIRONMENT: "preview" }),
    /match/,
  );
  assert.throws(
    () => loadConfig({ ...production, CRON_SECRET: undefined }),
    /CRON_SECRET.*required/,
  );
  assert.throws(() => loadConfig({ ...production, CRON_SECRET: "short" }), /CRON_SECRET/);
  assert.throws(
    () => loadConfig({ ...production, ADS_ALLOW_HTTP_LOCALHOST: "1" }),
    /unavailable on Vercel/,
  );
  for (const name of ["DATABASE_URL", "ADS_ENCRYPTION_KEY", "ADS_OAUTH_CLIENTS", "CRON_SECRET"])
    assert.throws(
      () => loadConfig({ ...production, [`${name}_FILE`]: "/nonexistent/secret" }),
      /environment value/,
    );
});

test("Vercel non-production is disabled by default and cannot reuse the production origin", () => {
  const preview = {
    ...valid,
    VERCEL: "1",
    VERCEL_ENV: "preview",
    ADS_DEPLOYMENT_ENVIRONMENT: "preview",
    CRON_SECRET: "synthetic-cron-token-".repeat(3),
  };
  assert.throws(() => loadConfig(preview), /ADS_ENABLE_NON_PRODUCTION/);
  assert.equal(
    loadConfig({ ...preview, ADS_ENABLE_NON_PRODUCTION: "1" }).deploymentEnvironment,
    "preview",
  );
  assert.throws(
    () =>
      loadConfig({
        ...preview,
        ADS_ENABLE_NON_PRODUCTION: "1",
        VERCEL_PROJECT_PRODUCTION_URL: "ads.example.test",
      }),
    /own ADS_PUBLIC_ORIGIN/,
  );
});

test("development HTTP is opt-in and restricted to loopback", () => {
  assert.throws(
    () => loadConfig({ ...valid, ADS_PUBLIC_ORIGIN: "http://127.0.0.1:8789" }),
    /HTTPS/,
  );
  const config = loadConfig({
    ...valid,
    ADS_PUBLIC_ORIGIN: "http://127.0.0.1:8789",
    ADS_ALLOW_HTTP_LOCALHOST: "1",
  });
  assert.equal(config.allowHttpLocalhost, true);
  assert.throws(
    () =>
      loadConfig({
        ...valid,
        ADS_PUBLIC_ORIGIN: "http://0.0.0.0:8789",
        ADS_ALLOW_HTTP_LOCALHOST: "1",
      }),
    /loopback/,
  );
});

test("redirects and origins cannot contain wildcard, credentials or fragments", () => {
  for (const uri of [
    "https://*.example.test/callback",
    "http://example.test/callback",
    "https://user:pass@example.test/callback",
    "https://example.test/callback#token",
  ])
    assert.throws(
      () =>
        loadConfig({
          ...valid,
          ADS_OAUTH_CLIENTS: JSON.stringify([{ clientId: "test-client", redirectUris: [uri] }]),
        }),
      /redirect/,
    );
  assert.throws(() => loadConfig({ ...valid, ADS_ALLOWED_ORIGINS: "*" }), /origin/);
  assert.throws(
    () =>
      loadConfig({
        ...valid,
        ADS_OAUTH_CLIENTS: JSON.stringify([{ clientId: "x", redirectUris: [] }]),
      }),
    /redirect/,
  );
  assert.throws(() => loadConfig({ ...valid, ADS_PORT: "not-a-port" }), /port/);
});

test("mounted secrets can replace environment values without exposing their contents in errors", () => {
  const directory = mkdtempSync(join(tmpdir(), "ads-config-"));
  try {
    const keyPath = join(directory, "key");
    writeFileSync(keyPath, `${valid.ADS_ENCRYPTION_KEY}\n`);
    const config = loadConfig({
      ...valid,
      ADS_ENCRYPTION_KEY: undefined,
      ADS_ENCRYPTION_KEY_FILE: keyPath,
    });
    assert.deepEqual(config.encryptionKey, Buffer.alloc(32, 42));
    assert.throws(() => loadConfig({ ...valid, ADS_ENCRYPTION_KEY_FILE: keyPath }), /one/);
    writeFileSync(keyPath, "DO-NOT-LEAK-THIS-KEY");
    assert.throws(
      () =>
        loadConfig({ ...valid, ADS_ENCRYPTION_KEY: undefined, ADS_ENCRYPTION_KEY_FILE: keyPath }),
      (error) => !error.message.includes("DO-NOT-LEAK"),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("native startup errors do not log driver identities or secret file paths", () => {
  const privatePath = `/missing/ADS_STARTUP_DO_NOT_LEAK_${process.pid}.pem`;
  const url = new URL("postgresql://private-user:synthetic-secret@127.0.0.1:1/ads_test");
  url.searchParams.set("sslmode", "verify-full");
  url.searchParams.set("sslrootcert", privatePath);
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../src/server.mjs", import.meta.url))],
    {
      encoding: "utf8",
      timeout: 5000,
      env: { ...process.env, ...valid, DATABASE_URL: url.toString() },
    },
  );
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Check configuration, database connectivity and migration history/);
  assert.doesNotMatch(
    `${result.stdout}${result.stderr}`,
    /ADS_STARTUP_DO_NOT_LEAK|private-user|synthetic-secret|postgresql:\/\//,
  );
});
