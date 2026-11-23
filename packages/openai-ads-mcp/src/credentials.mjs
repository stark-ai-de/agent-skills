import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  browserFormSecurityHeaders,
  escapeHtml,
  HttpError,
  readBoundedBody,
  securityHeaders,
  textResponse,
} from "./http-utils.mjs";

function cookieValue(request, name) {
  const values = (request.headers.get("cookie") || "")
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${name}=`));
  return values.length === 1 ? values[0].slice(name.length + 1) : "";
}

function equalTokens(left, right) {
  const first = Buffer.from(left);
  const second = Buffer.from(right);
  return first.length >= 32 && first.length === second.length && timingSafeEqual(first, second);
}

export function createCredentialService({ config, store, auth, now = Date.now }) {
  const secure = new URL(config.publicOrigin).protocol === "https:";
  const cookieName = (id) =>
    `${secure ? "__Host-" : ""}stark_ads_download_${createHash("sha256").update(id).digest("hex").slice(0, 16)}`;
  const cookie = (id, value, age = 600) =>
    `${cookieName(id)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? "; Secure" : ""}`;

  async function limited(request, id) {
    if (!(await store.allowRate("credential-download:global", 10_000, 600000))) return true;
    const key = createHash("sha256")
      .update(`${request.headers.get("x-ads-client-address") || "local"}:${id}`)
      .digest("hex");
    return !(await store.allowRate(`credential-download:${key}`, 10, 600000));
  }

  async function createHandoff({ principal, operation, value }) {
    const result = await store.createSecretHandoff({
      grantId: principal.grantId,
      operation,
      value,
      ttlMs: 600000,
    });
    return { url: `${config.publicOrigin}/credentials/${result.id}`, expiresAt: result.expiresAt };
  }

  async function handle(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/credentials/")) return null;
    if (url.origin !== config.publicOrigin) return textResponse("Invalid origin.", 400);
    const id = url.pathname.slice("/credentials/".length);
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(id) || url.search)
      return textResponse("This download is unavailable.", 410);
    const metadata = await store.getSecretHandoff(id);
    if (!metadata || metadata.expiresAt <= now())
      return textResponse("This download expired, was revoked, or was already used.", 410);
    if (request.method === "GET") {
      const csrf = randomBytes(32).toString("base64url");
      const signedIn = await auth.hasBrowserGrant(request, metadata.grantId);
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Secure credential download · Ads API by stark AI</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#f5f7fb;color:#172132;margin:0}main{max-width:560px;margin:8vh auto;padding:32px;background:white;border-radius:16px;box-shadow:0 12px 48px #15213612}h1{font-size:28px;line-height:1.2}label{display:block;font-weight:600;margin-top:24px}input{display:block;box-sizing:border-box;width:100%;padding:12px;margin:8px 0 20px;border:1px solid #9aa6bb;border-radius:6px}button{padding:12px 20px;background:#174cce;color:white;border:0;border-radius:6px;font:inherit;cursor:pointer}small{color:#526077}code{overflow-wrap:anywhere}@media(max-width:640px){main{margin:16px;padding:24px}}</style></head><body><main><small>Ads API by stark AI</small><h1>Download your generated credential</h1><p>Created by <code>${escapeHtml(metadata.operation)}</code>. This download is available once and expires at ${escapeHtml(new Date(metadata.expiresAt).toISOString())}.</p><p>Store the file securely. The credential is not included in your ChatGPT conversation.</p><form method="post" action="${escapeHtml(url.pathname)}"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="action" value="download">${signedIn ? "<p>Your browser is connected to the account that created this credential.</p>" : '<label for="api-key">Confirm your Advertiser API key</label><input id="api-key" name="api_key" type="password" required autocomplete="off" maxlength="4096"><p><small>Use the same Ads Manager key you used to connect this account. The download link alone does not grant access.</small></p>'}<button type="submit">Download once</button></form></main></body></html>`;
      return new Response(html, {
        headers: {
          ...browserFormSecurityHeaders,
          "content-type": "text/html; charset=utf-8",
          "set-cookie": cookie(id, csrf),
        },
      });
    }
    if (request.method !== "POST")
      return textResponse("Method not allowed.", 405, { allow: "GET, POST" });
    if (
      request.headers.get("origin") !== config.publicOrigin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return textResponse("The download must be submitted from its original page.", 403);
    if (
      request.headers.get("content-type")?.split(";")[0].trim() !==
      "application/x-www-form-urlencoded"
    )
      return textResponse("Submit the download form.", 415);
    if (await limited(request, id))
      return textResponse("Too many attempts. Try again later.", 429, { "retry-after": "600" });
    try {
      const fields = new URLSearchParams(await readBoundedBody(request, 16384));
      if (
        fields.getAll("csrf").length !== 1 ||
        fields.getAll("action").length !== 1 ||
        fields.getAll("api_key").length > 1 ||
        fields.get("action") !== "download" ||
        !equalTokens(fields.get("csrf") || "", cookieValue(request, cookieName(id)))
      )
        return textResponse("Reload the download page and try again.", 403);
      const key = fields.get("api_key") || "";
      if (
        !(await auth.hasBrowserGrant(request, metadata.grantId)) &&
        !(key.length <= 4096 && (await store.matchesGrantKey(metadata.grantId, key)))
      )
        return textResponse(
          "The account could not be verified. Enter the Advertiser API key used for this connection.",
          401,
        );
      const value = await store.consumeSecretHandoff(id, metadata.grantId);
      if (value === null || value === undefined)
        return textResponse("This download is no longer available.", 410);
      return new Response(JSON.stringify(value, null, 2), {
        headers: {
          ...securityHeaders,
          "content-type": "application/json; charset=utf-8",
          "content-disposition": 'attachment; filename="stark-ai-ads-credential.json"',
          "set-cookie": cookie(id, "", 0),
        },
      });
    } catch (error) {
      return textResponse(
        error instanceof HttpError ? error.message : "Unable to download this credential.",
        error instanceof HttpError ? error.status : 500,
      );
    }
  }
  return { createHandoff, handle };
}
