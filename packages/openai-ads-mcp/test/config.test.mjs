import assert from "node:assert/strict";
import test from "node:test";
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
  ADS_DATABASE_PATH: "/tmp/ads-config-test.sqlite",
};

test("production startup requires an explicit origin, key and exact OAuth callbacks", () => {
  const config = loadConfig(valid);
  assert.equal(config.publicOrigin, "https://ads.example.test");
  assert.equal(config.encryptionKey.length, 32);
  assert.ok(config.allowedOrigins.includes("https://chatgpt.com"));
  for (const key of ["ADS_PUBLIC_ORIGIN", "ADS_ENCRYPTION_KEY", "ADS_OAUTH_CLIENTS"])
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
