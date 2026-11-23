import { randomBytes } from "node:crypto";
import { browserFormSecurityHeaders } from "./http-utils.mjs";

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
const hidden = (name, value) =>
  `<input type="hidden" name="${escape(name)}" value="${escape(value)}">`;
const fields = (flow, stage) =>
  hidden("flow", flow.id) + hidden("csrf", flow.csrf) + hidden("stage", stage);
const secretInput = `<label for="api-key">Advertiser API key</label><input id="api-key" name="api_key" type="password" required maxlength="4096" autocomplete="off" spellcheck="false" autocapitalize="none">`;

// Call only with the transaction's redirect URI after exact client-allowlist validation.
// Chromium checks form-action at every redirect hop, not only at the form target.
// The stable ChatGPT callback relays Platform connections to platform.openai.com.
// This is a fixed additional CSP origin for that exact callback, not a redirect URI
// or an origin derived from client-supplied state.
export function oauthFormAction(redirectUri) {
  const callback = new URL(redirectUri);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(callback.hostname);
  if (
    (callback.protocol !== "https:" && !(callback.protocol === "http:" && loopback)) ||
    callback.username ||
    callback.password ||
    callback.hash ||
    /[\s;*'\\]/.test(callback.origin)
  )
    throw new Error("OAuth callback must have one explicit safe origin.");
  const sources = ["'self'", callback.origin];
  if (callback.href === "https://chatgpt.com/connector_platform_oauth_redirect")
    sources.push("https://platform.openai.com");
  return sources.join(" ");
}

function page(title, body, { status = 200, cookie, origin } = {}, formAction = "'self'") {
  const nonce = randomBytes(16).toString("base64url");
  const headers = {
    ...browserFormSecurityHeaders,
    "content-type": "text/html; charset=utf-8",
    pragma: "no-cache",
    "content-security-policy": `default-src 'none'; style-src 'nonce-${nonce}'; form-action ${formAction}; base-uri 'none'; frame-ancestors 'none'`,
  };
  if (cookie) headers["set-cookie"] = cookie;
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} · Ads API by stark AI</title><style nonce="${nonce}">
  :root{color-scheme:light dark;font-family:system-ui,sans-serif;background:#10201d;color:#edf6f1}body{margin:0;padding:3rem 1.25rem}main{max-width:38rem;margin:auto}header{color:#9ed0b5;font-weight:650;margin-bottom:2.5rem}h1{font-size:1.8rem;line-height:1.2}p,li{line-height:1.6}label{display:block;font-weight:650;margin-top:1.5rem}input[type=password]{box-sizing:border-box;width:100%;padding:.85rem;margin:.5rem 0 1rem;background:#192d27;color:inherit;border:1px solid #78998a;border-radius:.4rem}button{font:inherit;font-weight:650;padding:.8rem 1.1rem;border:0;border-radius:.4rem;cursor:pointer;background:#b8f2cb;color:#10201d;margin:.5rem .5rem .5rem 0}button.secondary{background:#243c32;color:#eef7f2;border:1px solid #78998a}.box{padding:1rem 1.25rem;margin:1rem 0;border:1px solid #486457;border-radius:.5rem;overflow-wrap:anywhere}.notice{color:#f2d99d}.muted{color:#b3c6bd;font-size:.9rem}dt{margin-top:.6rem;font-weight:650}dd{margin:0}.check{font-weight:400;line-height:1.5}a{color:#b8f2cb}code{overflow-wrap:anywhere}
  </style></head><body><main><header>Ads API by stark AI</header><h1>${escape(title)}</h1>${body}<p class="muted">Connection service: ${escape(origin ?? "")}<br><a href="/connections">Manage or disconnect your connections</a></p></main></body></html>`,
    { status, headers },
  );
}

export function keyPage(flow, options = {}) {
  return page(
    "Connect your Ads account",
    `
    <p>Connect <strong>${escape(flow.clientId)}</strong> to one OpenAI Ads account. Enter the Advertiser API key from Ads Manager Settings. An OpenAI Platform key cannot be used here.</p>
    <p class="muted">This service verifies and encrypts the key. ChatGPT receives separate connection tokens, never your Ads key. You will review the account and permissions before connecting.</p>
    ${options.message ? `<p class="notice" role="alert">${escape(options.message)}</p>` : ""}
    <form method="post" action="/oauth/authorize" autocomplete="off">${fields(flow, "key")}${secretInput}<button type="submit">Verify account</button></form>
  `,
    options,
  );
}

export function consentPage(flow, options = {}) {
  const account = flow.account;
  const writes = flow.scopes.includes("ads:write");
  return page(
    "Review this connection",
    `
    <p>Allow <strong>${escape(flow.clientId)}</strong> to use the following account through Ads API by stark AI?</p>
    <dl class="box"><dt>Account</dt><dd>${escape(account.name || account.id)}</dd><dt>Account ID</dt><dd>${escape(account.id)}</dd>${account.currency ? `<dt>Currency</dt><dd>${escape(account.currency)}</dd>` : ""}${account.timezone ? `<dt>Timezone</dt><dd>${escape(account.timezone)}</dd>` : ""}</dl>
    <p>This connection can read your account, campaigns, ads, reporting, feeds, audiences, and conversion settings through the available tools.</p>
    <form method="post" action="/oauth/authorize">${fields(flow, "consent")}
      ${writes ? `<label class="check"><input type="checkbox" name="allow_write" value="yes"> Also allow the tools to make changes you request, including campaigns, budgets, delivery, feeds, audiences, and conversion setup. Leave unchecked for read-only access.</label>` : ""}
      ${flow.scopes.includes("offline_access") ? '<p class="muted">Stay connected for up to 30 days without entering the Ads key again. You can disconnect this grant at any time from Manage connections.</p>' : '<p class="muted">This connection expires after 15 minutes.</p>'}
      <button type="submit" name="decision" value="approve">Connect account</button><button type="submit" class="secondary" name="decision" value="deny">Cancel</button>
    </form>
  `,
    options,
    oauthFormAction(flow.redirectUri),
  );
}

export function connectionsPage(flow, grants, options = {}) {
  return page(
    "Manage your connections",
    `
    <p>Disconnecting a grant blocks new Ads API requests and removes its stored Ads key and pending credential downloads from this service. Requests already sent to Ads can still finish.</p>
    ${options.message ? `<p class="notice" role="status">${escape(options.message)}</p>` : ""}
    ${grants.length ? grants.map((grant) => `<section class="box"><strong>${escape(grant.accountId)}</strong><p>Client: ${escape(grant.clientId)}<br>Access: ${grant.scopes.includes("ads:write") ? "Read and requested changes" : "Read only"}<br>Expires: ${escape(new Date(grant.expiresAt).toISOString())}</p><form method="post" action="/connections">${fields(flow, "revoke")}${hidden("grant_id", grant.grantId)}<button type="submit" class="secondary">Disconnect this grant</button></form></section>`).join("") : "<p>No active connections are unlocked in this browser.</p>"}
    <details><summary>Unlock connections with your Ads key</summary><p>Enter the same Advertiser API key that you used to connect. This unlocks only grants created with that key; the key is not displayed or sent to ChatGPT.</p><form method="post" action="/connections" autocomplete="off">${fields(flow, "unlock")}${secretInput}<button type="submit">Unlock connections</button></form></details>
  `,
    options,
  );
}

export function errorPage(message, options = {}) {
  return page(
    "Connection could not continue",
    `<p role="alert">${escape(message)}</p><p>Return to ChatGPT and start the connection again.</p>`,
    options,
  );
}
