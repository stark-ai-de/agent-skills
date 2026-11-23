import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);

function valueOrFile(env, name) {
  const value = env[name];
  const file = env[`${name}_FILE`];
  if (value && file) throw new Error(`Configure only one of ${name} and ${name}_FILE.`);
  if (file) {
    try {
      const content = readFileSync(file, "utf8");
      if (content.length > 32768) throw new Error("size");
      return content.trim();
    } catch {
      throw new Error(`Cannot read ${name}_FILE as a bounded UTF-8 secret.`);
    }
  }
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function checkedUrl(value, label, allowHttpLocalhost, originOnly = false) {
  let url;
  try {
    if (typeof value !== "string" || value.length > 2048 || /[\s\\*]/.test(value))
      throw new Error();
    url = new URL(value);
  } catch {
    throw new Error(`Invalid ${label} URL.`);
  }
  if (url.username || url.password || url.hash)
    throw new Error(`${label} must not contain credentials or a fragment.`);
  if (url.protocol !== "https:") {
    if (!allowHttpLocalhost) throw new Error(`${label} requires HTTPS.`);
    if (url.protocol !== "http:" || !loopback.has(url.hostname))
      throw new Error(`${label} permits HTTP only on loopback during explicit local development.`);
  }
  if (originOnly && (url.pathname !== "/" || url.search))
    throw new Error(`${label} must be an origin without path or query.`);
  return url;
}

export function loadConfig(env = process.env) {
  const allowHttpLocalhost = env.ADS_ALLOW_HTTP_LOCALHOST === "1";
  if (!env.ADS_PUBLIC_ORIGIN) throw new Error("ADS_PUBLIC_ORIGIN is required.");
  const publicOrigin = checkedUrl(
    env.ADS_PUBLIC_ORIGIN,
    "public origin",
    allowHttpLocalhost,
    true,
  ).origin;
  const key = valueOrFile(env, "ADS_ENCRYPTION_KEY");
  const encryptionKey = Buffer.from(key, "base64");
  if (
    !/^[A-Za-z0-9+/]{43}=$/.test(key) ||
    encryptionKey.length !== 32 ||
    encryptionKey.toString("base64") !== key
  )
    throw new Error("ADS_ENCRYPTION_KEY must be a canonical base64-encoded 32-byte random key.");
  let clients;
  try {
    clients = JSON.parse(valueOrFile(env, "ADS_OAUTH_CLIENTS"));
  } catch (error) {
    if (
      error.message.includes("required") ||
      error.message.includes("only one") ||
      error.message.includes("Cannot read")
    )
      throw error;
    throw new Error(
      "ADS_OAUTH_CLIENTS must contain a JSON array of explicitly registered clients.",
    );
  }
  if (!Array.isArray(clients) || clients.length < 1 || clients.length > 20)
    throw new Error("ADS_OAUTH_CLIENTS requires one to twenty explicit clients.");
  const ids = new Set();
  const oauthClients = clients.map((client) => {
    if (
      !client ||
      typeof client.clientId !== "string" ||
      !/^[a-zA-Z0-9._:-]{1,128}$/.test(client.clientId) ||
      ids.has(client.clientId)
    )
      throw new Error("Each OAuth client requires a unique bounded clientId.");
    ids.add(client.clientId);
    if (
      !Array.isArray(client.redirectUris) ||
      client.redirectUris.length < 1 ||
      client.redirectUris.length > 20
    )
      throw new Error("Each OAuth client requires explicit redirect URIs.");
    const redirectUris = client.redirectUris.map(
      (uri) => checkedUrl(uri, "OAuth redirect", allowHttpLocalhost).href,
    );
    return Object.freeze({
      clientId: client.clientId,
      redirectUris: Object.freeze([...new Set(redirectUris)]),
    });
  });
  const allowedOrigins = [publicOrigin, "https://chatgpt.com", "https://platform.openai.com"];
  for (const origin of (env.ADS_ALLOWED_ORIGINS || "").split(",").filter(Boolean))
    allowedOrigins.push(
      checkedUrl(origin.trim(), "allowed origin", allowHttpLocalhost, true).origin,
    );
  const port = Number(env.ADS_PORT || "8789");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("ADS_PORT must be a valid port.");
  const host = env.ADS_HOST || "127.0.0.1";
  if (!["127.0.0.1", "::1", "0.0.0.0", "::"].includes(host))
    throw new Error("ADS_HOST must be a literal local bind address.");
  const databasePath = env.ADS_DATABASE_PATH || resolve("data/ads.sqlite");
  if (!isAbsolute(databasePath)) throw new Error("ADS_DATABASE_PATH must be absolute.");
  return Object.freeze({
    publicOrigin,
    encryptionKey,
    databasePath,
    oauthClients: Object.freeze(oauthClients),
    allowedOrigins: Object.freeze([...new Set(allowedOrigins)]),
    allowHttpLocalhost,
    port,
    host,
    openaiAppsChallenge: env.OPENAI_APPS_CHALLENGE || "",
  });
}
