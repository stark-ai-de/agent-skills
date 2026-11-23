import assert from "node:assert/strict";
import test from "node:test";
import { consentPage, keyPage, oauthFormAction } from "../src/auth-ui.mjs";

const stableCallback = "https://chatgpt.com/connector_platform_oauth_redirect";
const expectedRelayPolicy = "'self' https://chatgpt.com https://platform.openai.com";

test("only the exact stable ChatGPT callback permits the fixed Platform relay", () => {
  assert.equal(oauthFormAction(stableCallback), expectedRelayPolicy);
  for (const callback of [
    `${stableCallback}/other`,
    `${stableCallback}?extra=value`,
    "https://chatgpt.com/other",
    "https://chatgpt.com.evil.example/connector_platform_oauth_redirect",
    "https://another-client.example:8443/oauth/callback",
  ]) {
    assert.equal(oauthFormAction(callback), `'self' ${new URL(callback).origin}`);
  }
});

test("the key-entry page stays self-only while consent permits the trusted redirect chain", () => {
  const flow = {
    id: "synthetic-flow",
    csrf: "synthetic-csrf",
    clientId: "synthetic-client",
    redirectUri: stableCallback,
    state: "https://untrusted.example/redirect",
    account: { id: "synthetic-account" },
    scopes: ["ads:read"],
  };
  const formPolicy = (response) =>
    response.headers
      .get("content-security-policy")
      .split(";")
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith("form-action "));
  assert.equal(formPolicy(keyPage(flow)), "form-action 'self'");
  assert.equal(formPolicy(consentPage(flow)), `form-action ${expectedRelayPolicy}`);
  assert.equal(consentPage(flow).headers.get("referrer-policy"), "same-origin");
});
