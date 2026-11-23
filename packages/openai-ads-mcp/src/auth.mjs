import { randomBytes, timingSafeEqual } from "node:crypto";
import { AUTH_TTL, tokenDigest } from "./store.mjs";
import { connectionsPage, consentPage, errorPage, keyPage, oauthFormAction } from "./auth-ui.mjs";

const SCOPES = Object.freeze(["ads:read", "ads:write", "offline_access"]);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const KEY_PATTERN = /^[\x21-\x7e]{16,4096}$/;
const MAX_FORM_BYTES = 16 * 1024;
const randomToken = () => randomBytes(32).toString("base64url");
const same = (a, b) => {
  const left = Buffer.from(a ?? "");
  const right = Buffer.from(b ?? "");
  return left.length === right.length && timingSafeEqual(left, right);
};
const responseHeaders = {
  "cache-control": "no-store",
  pragma: "no-cache",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};
const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { ...responseHeaders, ...headers } });
const oauthError = (error, description, status = 400) =>
  json({ error, error_description: description }, status, { "x-ads-oauth-error": error });
const methodError = (allow) =>
  new Response("Method not allowed", { status: 405, headers: { ...responseHeaders, allow } });
function uniqueParameters(params) {
  const result = Object.create(null);
  for (const [key, value] of params) {
    if (Object.hasOwn(result, key)) throw new Error("Duplicate parameter");
    result[key] = value;
  }
  return result;
}
function parseScopes(text, fallback = ["ads:read"]) {
  if (text === undefined) return fallback;
  if (typeof text !== "string" || text.length > 256) return null;
  const parts = [...new Set(text.split(" ").filter(Boolean))];
  if (!parts.includes("ads:read") || parts.some((scope) => !SCOPES.includes(scope))) return null;
  return SCOPES.filter((scope) => parts.includes(scope));
}
async function readForm(request) {
  if (
    request.headers.get("content-type")?.split(";")[0].toLowerCase() !==
    "application/x-www-form-urlencoded"
  )
    return { response: oauthError("invalid_request", "Use a URL-encoded form body.", 415) };
  if (
    request.headers.has("content-encoding") &&
    request.headers.get("content-encoding") !== "identity"
  )
    return {
      response: oauthError("invalid_request", "Encoded form bodies are not supported.", 415),
    };
  if (Number(request.headers.get("content-length")) > MAX_FORM_BYTES)
    return { response: oauthError("invalid_request", "The form body is too large.", 413) };
  const chunks = [];
  let bytes = 0;
  try {
    const reader = request.body?.getReader();
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.length;
        if (bytes > MAX_FORM_BYTES) {
          await reader.cancel();
          return { response: oauthError("invalid_request", "The form body is too large.", 413) };
        }
        chunks.push(chunk.value);
      }
    }
    return {
      parameters: uniqueParameters(new URLSearchParams(Buffer.concat(chunks).toString("utf8"))),
    };
  } catch {
    return { response: oauthError("invalid_request", "The form body is invalid.") };
  }
}

/** Fixed public-client OAuth with PKCE and explicit Ads-key/account consent. */
export function createAuth({ config, store, verifyAdsKey }) {
  const origin = new URL(config.publicOrigin).origin;
  const resource = `${origin}/mcp`;
  const secure = origin.startsWith("https://");
  const originUrl = new URL(origin);
  if (
    !secure &&
    !(config.allowHttpLocalhost && ["localhost", "127.0.0.1", "[::1]"].includes(originUrl.hostname))
  )
    throw new Error(
      "OAuth requires HTTPS; only explicitly enabled loopback development may use HTTP.",
    );
  const clients = new Map(
    config.oauthClients.map((client) => [client.clientId, new Set(client.redirectUris)]),
  );
  if (!clients.size || clients.size !== config.oauthClients.length)
    throw new Error("OAuth clients must have unique identifiers.");
  for (const [clientId, redirects] of clients) {
    if (typeof clientId !== "string" || !clientId || clientId.length > 256 || !redirects.size)
      throw new Error("Every OAuth client requires an identifier and exact redirect URIs.");
    for (const redirect of redirects) {
      const url = new URL(redirect);
      const local =
        config.allowHttpLocalhost && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (
        (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
        url.hash ||
        url.username ||
        url.password
      )
        throw new Error(
          "OAuth redirect URIs must use HTTPS and contain no fragment or credentials.",
        );
      oauthFormAction(redirect);
    }
  }
  const cookieName = secure ? "__Host-stark_ads_oauth" : "stark_ads_oauth_dev";
  const cookie = (session, ttl = AUTH_TTL.browser) =>
    `${cookieName}=${session}; Path=/; Max-Age=${Math.floor(ttl / 1000)}; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax`;
  const sessionFrom = (request) => {
    const matches = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${cookieName}=`));
    if (matches.length !== 1) return null;
    const value = matches[0].slice(cookieName.length + 1);
    return TOKEN_PATTERN.test(value) ? value : null;
  };
  const address = (request) =>
    (request.headers.get("x-ads-client-address") ?? "local-test").slice(0, 128);
  const allow = async (request, category, limit, extra = "", window = 60_000) =>
    await store.allowRate(`${category}:${address(request)}:${extra}`, limit, window);
  const pageOptions = (extra = {}) => ({ origin, ...extra });
  const blocked = (
    message = "This connection has expired or could not be verified.",
    status = 403,
  ) => errorPage(message, pageOptions({ status }));
  const tooMany = () =>
    new Response("Too many connection attempts. Try again later.", {
      status: 429,
      headers: { ...responseHeaders, "retry-after": "60" },
    });
  const authorizationServerMetadata = () => ({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    revocation_endpoint: `${origin}/oauth/revoke`,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [...SCOPES],
    authorization_response_iss_parameter_supported: true,
  });
  const protectedResourceMetadata = () => ({
    resource,
    authorization_servers: [origin],
    scopes_supported: ["ads:read", "ads:write"],
    bearer_methods_supported: ["header"],
    resource_name: "Ads API by stark AI",
  });
  const redirect = (flow, parameters) => {
    if (!clients.get(flow.clientId)?.has(flow.redirectUri))
      throw new Error("OAuth redirect is not registered for this client.");
    const location = new URL(flow.redirectUri);
    // Every allowed callback includes issuer identification, including denials.
    location.searchParams.set("iss", origin);
    location.searchParams.set("state", flow.state);
    for (const [key, value] of Object.entries(parameters)) location.searchParams.set(key, value);
    return new Response(null, {
      status: 303,
      headers: {
        ...responseHeaders,
        location: location.href,
        "content-security-policy": `default-src 'none'; form-action ${oauthFormAction(flow.redirectUri)}; base-uri 'none'; frame-ancestors 'none'`,
      },
    });
  };
  const authorizationInput = (url) => {
    if (url.search.length > MAX_FORM_BYTES) return null;
    let params;
    try {
      params = uniqueParameters(url.searchParams);
    } catch {
      return null;
    }
    const redirects = clients.get(params.client_id);
    const scopes = parseScopes(params.scope);
    if (
      !redirects?.has(params.redirect_uri) ||
      params.response_type !== "code" ||
      params.resource !== resource ||
      params.code_challenge_method !== "S256" ||
      !TOKEN_PATTERN.test(params.code_challenge ?? "") ||
      !params.state ||
      params.state.length > 2048 ||
      Array.from(params.state).some(
        (character) => character.codePointAt(0) < 32 || character.codePointAt(0) === 127,
      ) ||
      !scopes ||
      params.request ||
      params.request_uri ||
      (params.response_mode && params.response_mode !== "query")
    )
      return null;
    return {
      clientId: params.client_id,
      redirectUri: params.redirect_uri,
      state: params.state,
      resource,
      scopes,
      codeChallenge: params.code_challenge,
    };
  };
  const checkedFlow = async (request, parameters, session) => {
    if (
      request.headers.get("origin") !== origin ||
      !session ||
      !TOKEN_PATTERN.test(parameters.flow ?? "") ||
      !TOKEN_PATTERN.test(parameters.csrf ?? "")
    )
      return null;
    const flow = await store.getFlow(parameters.flow);
    if (!flow || !same(flow.sessionHash, tokenDigest(session)) || !same(flow.csrf, parameters.csrf))
      return null;
    return flow;
  };
  const managementPage = async (session, message, status = 200) => {
    const flow = await store.createFlow({
      step: "manage",
      sessionHash: tokenDigest(session),
      csrf: randomToken(),
    });
    return connectionsPage(
      flow,
      await store.listBrowserGrants(session),
      pageOptions({ message, status, cookie: cookie(session) }),
    );
  };
  async function authorization(request, url) {
    if (request.method === "GET") {
      if (
        !(await allow(request, "authorize", 120)) ||
        !(await store.allowRate("authorize:global", 1000, 60_000))
      )
        return tooMany();
      const input = authorizationInput(url);
      if (!input)
        return blocked(
          "The OAuth client, redirect URI, resource, scope, state, or PKCE request is invalid.",
          400,
        );
      const session = sessionFrom(request) ?? randomToken();
      const flow = await store.createFlow({
        ...input,
        step: "key",
        sessionHash: tokenDigest(session),
        csrf: randomToken(),
      });
      return keyPage(flow, pageOptions({ cookie: cookie(session) }));
    }
    if (request.method !== "POST") return methodError("GET, POST");
    const { parameters, response } = await readForm(request);
    if (response) return response;
    const session = sessionFrom(request);
    const flow = await checkedFlow(request, parameters, session);
    if (!flow) return blocked();
    if (parameters.stage === "key" && flow.step === "key") {
      if (
        !(await allow(request, "key", 30)) ||
        !(await store.allowRate(`key:flow:${flow.id}`, 5, AUTH_TTL.flow)) ||
        !(await store.allowRate("key:global", 300, 60_000))
      )
        return tooMany();
      const candidate = parameters.api_key?.trim();
      if (!KEY_PATTERN.test(candidate ?? ""))
        return keyPage(
          flow,
          pageOptions({
            status: 401,
            message: "Enter a valid Advertiser API key from Ads Manager Settings.",
          }),
        );
      // Reserve the transaction before network verification, so concurrent posts cannot bind different keys.
      const verifying = await store.updateFlow(flow.id, flow.revision, {
        ...flow,
        step: "verifying",
      });
      if (!verifying) return blocked();
      let account;
      try {
        const found = await verifyAdsKey(candidate);
        if (!found || typeof found.id !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(found.id))
          throw new Error();
        account = { id: found.id };
        for (const name of ["name", "timezone"])
          if (typeof found[name] === "string") account[name] = found[name].slice(0, 512);
        if (typeof found.currency_code === "string")
          account.currency = found.currency_code.slice(0, 16);
      } catch {
        const reset = await store.updateFlow(verifying.id, verifying.revision, {
          ...flow,
          step: "key",
        });
        return reset
          ? keyPage(
              reset,
              pageOptions({
                status: 401,
                message:
                  "The Ads account could not be verified. Check the Advertiser API key and try again.",
              }),
            )
          : blocked();
      }
      const next = await store.updateFlow(verifying.id, verifying.revision, {
        ...flow,
        step: "consent",
        csrf: randomToken(),
        apiKey: candidate,
        account,
      });
      return next ? consentPage(next, pageOptions()) : blocked();
    }
    if (
      parameters.stage === "consent" &&
      flow.step === "consent" &&
      ["approve", "deny"].includes(parameters.decision)
    ) {
      const consumed = await store.consumeFlow(flow.id, flow.revision);
      if (!consumed) return blocked();
      if (parameters.decision === "deny")
        return redirect(consumed, {
          error: "access_denied",
          error_description: "The account owner declined this connection.",
        });
      const scopes = consumed.scopes.filter(
        (scope) => scope !== "ads:write" || parameters.allow_write === "yes",
      );
      const code = await store.createAuthorizationCode({
        ...consumed,
        scopes,
        browserSession: session,
      });
      const result = redirect(consumed, { code });
      result.headers.set("set-cookie", cookie(session));
      return result;
    }
    return blocked();
  }
  async function token(request) {
    if (request.method !== "POST") return methodError("POST");
    if (
      !(await allow(request, "token", 240)) ||
      !(await store.allowRate("token:global", 2000, 60_000))
    )
      return tooMany();
    const { parameters: input, response } = await readForm(request);
    if (response) return response;
    if (
      !clients.has(input.client_id) ||
      input.client_secret !== undefined ||
      request.headers.has("authorization")
    )
      return oauthError("invalid_client", "Use a registered public client and PKCE.", 401);
    if (!(await allow(request, "token-client", 120, input.client_id))) return tooMany();
    if (input.resource !== resource)
      return oauthError("invalid_target", "The requested resource is not this MCP server.");
    let result;
    if (input.grant_type === "authorization_code") {
      if (
        !TOKEN_PATTERN.test(input.code ?? "") ||
        !clients.get(input.client_id).has(input.redirect_uri) ||
        !input.code_verifier
      )
        return oauthError("invalid_grant", "The authorization code or PKCE proof is invalid.");
      result = await store.exchangeCode({
        code: input.code,
        clientId: input.client_id,
        redirectUri: input.redirect_uri,
        resource,
        codeVerifier: input.code_verifier,
      });
    } else if (input.grant_type === "refresh_token") {
      const scopes = input.scope === undefined ? undefined : parseScopes(input.scope);
      if (!TOKEN_PATTERN.test(input.refresh_token ?? "") || scopes === null)
        return oauthError("invalid_grant", "The refresh token or requested scope is invalid.");
      result = await store.refresh({
        refreshToken: input.refresh_token,
        clientId: input.client_id,
        resource,
        scopes,
      });
    } else
      return oauthError(
        "unsupported_grant_type",
        "Only authorization_code and refresh_token grants are supported.",
      );
    return result
      ? json(result)
      : oauthError(
          "invalid_grant",
          "The grant has expired, was already used, or could not be verified.",
        );
  }
  async function revoke(request) {
    if (request.method !== "POST") return methodError("POST");
    if (!(await allow(request, "revoke", 120))) return tooMany();
    const { parameters: input, response } = await readForm(request);
    if (response) return response;
    if (
      !clients.has(input.client_id) ||
      input.client_secret !== undefined ||
      request.headers.has("authorization")
    )
      return oauthError("invalid_client", "Use a registered public client.", 401);
    if (TOKEN_PATTERN.test(input.token ?? ""))
      await store.revoke({ token: input.token, clientId: input.client_id });
    return new Response(null, { status: 200, headers: responseHeaders });
  }
  async function connections(request) {
    if (request.method === "GET") {
      if (!(await allow(request, "connections", 60))) return tooMany();
      return await managementPage(sessionFrom(request) ?? randomToken());
    }
    if (request.method !== "POST") return methodError("GET, POST");
    const { parameters: input, response } = await readForm(request);
    if (response) return response;
    const session = sessionFrom(request);
    const flow = await checkedFlow(request, input, session);
    if (!flow || flow.step !== "manage") return blocked();
    if (input.stage === "unlock") {
      if (
        !(await allow(request, "unlock", 5)) ||
        !(await store.allowRate("unlock:global", 120, 60_000))
      )
        return tooMany();
      const candidate = input.api_key?.trim();
      if (!KEY_PATTERN.test(candidate ?? ""))
        return await managementPage(
          session,
          "No active connection could be unlocked with this key.",
          401,
        );
      if (!(await store.consumeFlow(flow.id, flow.revision))) return blocked();
      const count = await store.bindBrowserByKey(session, candidate);
      return await managementPage(
        session,
        count
          ? "Your matching connections are unlocked."
          : "No active connection could be unlocked with this key.",
        count ? 200 : 401,
      );
    }
    if (input.stage === "revoke" && TOKEN_PATTERN.test(input.grant_id ?? "")) {
      if (!(await store.consumeFlow(flow.id, flow.revision))) return blocked();
      if (!(await store.revokeBrowserGrant(session, input.grant_id))) return blocked();
      return await managementPage(
        session,
        "The connection was disconnected and its stored Ads key was removed.",
      );
    }
    return blocked();
  }
  const paths = new Set([
    "/oauth/authorize",
    "/oauth/token",
    "/oauth/revoke",
    "/connections",
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/mcp",
  ]);
  return {
    authorizationServerMetadata,
    protectedResourceMetadata,
    async hasBrowserGrant(request, grantId) {
      const session = sessionFrom(request);
      return Boolean(session && (await store.hasBrowserGrant(session, grantId)));
    },
    async authenticate(request, beforeUnlock) {
      const authorization = request.headers.get("authorization") ?? "";
      const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(authorization);
      return match ? await store.authenticate({ token: match[1], resource }, beforeUnlock) : null;
    },
    async handle(request) {
      const url = new URL(request.url);
      if (!paths.has(url.pathname)) return null;
      if (url.origin !== origin)
        return blocked("The request origin does not match this connection service.", 400);
      if (url.pathname === "/oauth/authorize") return authorization(request, url);
      if (url.pathname === "/oauth/token") return token(request);
      if (url.pathname === "/oauth/revoke") return revoke(request);
      if (url.pathname === "/connections") return connections(request);
      if (request.method !== "GET") return methodError("GET");
      return json(
        url.pathname === "/.well-known/oauth-authorization-server"
          ? authorizationServerMetadata()
          : protectedResourceMetadata(),
      );
    },
  };
}
