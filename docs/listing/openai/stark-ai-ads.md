# Ads API by stark AI

Ads API by stark AI combines the canonical `openai-advertiser-api` skill with a separately deployed, authenticated MCP service. It supports documented Advertiser API work when the official Ads Manager plugin is unavailable or lacks a requested operation or parameter. It is an independent integration maintained by servrox solutions UG and is not an OpenAI product.

The production MCP service is hosted at [stark-ai-ads-mcp.vercel.app](https://stark-ai-ads-mcp.vercel.app). The implementation and package source are reviewable in this repository. A package build alone is not evidence of a successful deployment, public listing approval or completed Ads operation.

## Connect an account

1. Install the plugin from the approved distribution for your workspace or account.
2. Complete its connection flow. ChatGPT uses OAuth to connect to the plugin operator's service; the service uses the Advertiser API key to access OpenAI Ads.
3. Enter the account-scoped **Advertiser API key from Ads Manager Settings** only on the protected connection page. A regular OpenAI Platform API key does not provide this access. Never paste the key into a chat, tool argument, repository or support ticket.
4. Review the verified account, requested scopes and consent. Choose whether to permit writes. Connecting an account does not itself authorize a campaign change or advertising spend.
5. Start a new chat and describe the task. The skill selects Inspect, Prepare or Apply from the requested outcome and the available tools.

The current tool schemas define the supported operations. OpenAI retains control over Ads account access and feature enablement. Unsupported features, denied access and unverified outcomes are reported rather than bypassed. Credential-producing operations use the protected browser handoff instead of returning new secrets to the model.

## Package the plugin

Canonical inputs are `plugins/stark-ai-ads.source.json` and `skills/engineering-workflows/openai-advertiser-api/`. They are independent of the existing Developer plugin's membership, profiles, versions and stable release artifacts. Canonical skill files, including `agents/openai.yaml`, are copied byte-for-byte. The native adapter and ZIP are generated; neither is a second editable skill source.

Run source validation before deployment:

```bash
node scripts/plugin/validate-ads-plugin.mjs
node --test scripts/validation/test-ads-plugin.mjs
```

After the service has a selected public HTTPS endpoint and the canonical package inputs are tracked in Git, supply the actual MCP URL:

```bash
node scripts/plugin/package-ads-plugin.mjs \
  --server-url "$ADS_PLUGIN_MCP_URL" \
  --oauth-client-id stark-ai-ads-chatgpt

node scripts/plugin/validate-ads-plugin.mjs \
  --server-url "$ADS_PLUGIN_MCP_URL" \
  --oauth-client-id stark-ai-ads-chatgpt \
  --archive dist/openai/stark-ai-ads-0.1.1.zip
```

`ADS_PLUGIN_MCP_URL` is a public configuration value, not a credential. It must use HTTPS, a real DNS hostname and the `/mcp` path on the deployed service. The packager rejects credentials in URLs, query strings, fragments, local addresses and example domains. It performs no network calls and does not claim that a syntactically valid hostname is deployed or owned by the publisher.

The ZIP uses the repository's reproducible `zip-store-v1` format. `SOURCE-MANIFEST.json` records the explicit endpoint and OAuth client ID plus file hashes. The archive validator rebuilds the expected bytes from the canonical source and supplied configuration; changed skill files, added entries, changed client IDs or tampered bytes fail validation. Untracked/ignored source files and symlinks are refused as distribution inputs. No service executable, database, environment file, Ads key or OAuth client secret belongs in the plugin ZIP.

The package includes four dedicated, independently branded PNG assets: 512 × 512 listing logos and 128 × 128 composer icons for light and dark themes. The original chart mark and palette are documented in [the asset directory](../../../plugins/assets/stark-ai-ads/README.md). It deliberately does not use the OpenAI logo. The portal should import all four manifest paths; check actual rendering in both themes before submission.

The default archive is `dist/openai/stark-ai-ads-0.1.1.zip`. Use `--output` for a different file in `dist/openai/` or an explicit external build directory. After the first published version, changing package metadata or the skill requires a new package version and archive. The repository release contains the canonical source and assets; the independent Ads ZIP must be built from the exact released tag with the actual selected MCP URL. Do not upload a fixture or placeholder archive.

## Deployment and public submission

Follow the [MCP runtime guide](../../../packages/openai-ads-mcp/README.md) to configure the dedicated Vercel project, external PostgreSQL, explicit migrations, isolated preview state, HTTPS, the OAuth client and its exact callback URI. The [service map](../../services.md) owns repository and deployment boundaries. The package's public client ID must match the runtime configuration. The authorization and token URLs use the same public origin as `/mcp`. The client uses OAuth authorization code flow with S256 PKCE and `token_endpoint_auth_method=none`; it has no embedded client secret. Dynamic registration and arbitrary redirect URIs are not part of this implementation.

The manifest requests `ads:read` and `offline_access` as base scopes; the default requested scopes also include `ads:write`. Users can decline write consent. Tool authorization is enforced by the service, in addition to ChatGPT's action permissions and the skill's user-intent checks.

Before public submission, the publisher must verify the selected service's domain ownership, exact OAuth callback, reconnection and revocation, read-only consent, authorized write behavior, restart persistence and actual ChatGPT installation. Review the privacy and terms sections below against the deployed operator's configuration and publish accessible policy/contact pages. The listing points to this public document on the repository's `main` branch. Review the actual deployment disclosures and support routes before submitting.

Upload an initial package that already contains its MCP connection. The current [OpenAI submission guide](https://developers.openai.com/plugins/deploy/submission) does not support adding MCP to an already published skills-only plugin. It also does not provide a fixed API-key connection flow; this package declares a registered OAuth public client rather than embedding a bearer token.

The ZIP imports five positive and three negative review cases, the commerce declaration and release notes from the canonical source manifest. Cases cover account identification, campaign and ad-group listing, scoped reporting, an explicitly authorized name-only change to a paused reviewer campaign, account mismatch, preparation without mutation and an unsupported credential/endpoint. Run the cases with a dedicated reviewer account and record the observed results; verify that a read-only OAuth grant denies writes. The actual reviewer-accessible demo recording and private credentials must be supplied in the OpenAI dashboard. Do not fabricate a recording URL, test-account access or publication receipt or put credentials into the archive.

The [package guide](https://developers.openai.com/plugins/build/plugins), [authentication guide](https://developers.openai.com/plugins/build/auth) and [submission guide](https://developers.openai.com/plugins/deploy/submission) are the live sources. This packaging contract was checked on 2026-11-23. A successful offline build does not replace portal checks, service operation or publication approval.

## Privacy

This section describes the production service operated by servrox solutions UG. The application runs on Vercel Functions in Frankfurt, Germany (`fra1`); the dedicated Neon PostgreSQL database uses AWS Europe Central (Frankfurt, `aws-eu-central-1`). At deployment qualification on 2026-11-23, the database's configured point-in-time restore history window was six hours. That window is not a promise about all infrastructure logs, backups or subprocessors. Contact the publisher using the private support route below for data-access, erasure and privacy inquiries.

The service receives the Ads API key in its HTTPS account-connection form. It verifies the account with OpenAI Ads and stores that key encrypted with AES-256-GCM in its external PostgreSQL database. Each authorization grant binds a key to one Ads account, OAuth client, resource and scope set. OAuth access and refresh tokens are stored as cryptographic hashes. The encryption key is operator-managed configuration and must be kept separate from the database and backups.

Requested tool inputs, account identifiers and Ads responses pass through the service to fulfil the user's task. Requests go to the documented OpenAI Ads API origin. Tool responses reach ChatGPT under the user's OpenAI account and workspace policies. No advertiser key, OAuth token, generated SFTP password or generated conversion key is intentionally returned in a tool response. Credential handoffs are one-time browser views with a maximum lifetime of ten minutes. The application does not intentionally log request bodies or credentials. OAuth operational diagnostics record only fixed route names, methods, HTTP status, broad origin categories and standardized error codes; they do not include URL queries, tokens, cookies, form data or account identifiers. Operators must configure proxies, observability and backups consistently; the application cannot control those systems' retention or logs.

Access tokens expire after fifteen minutes, authorization transactions after ten minutes and authorization codes after five minutes. Offline grants and rotating refresh tokens have an absolute maximum lifetime of thirty days; refresh rotation does not extend that maximum. Without `offline_access`, the grant lasts fifteen minutes. A browser consent session lasts one hour. Expired grants, temporary flows, sessions and handoffs are removed by authenticated scheduled cleanup; expired values are rejected immediately on access. Shared rate counters and expiring concurrency leases coordinate server instances. Revocation clears the grant's encrypted Ads key and removes browser bindings and handoffs immediately; token replay records and grant metadata can remain until the original grant expiry. Database pages and backups can retain older encrypted records according to the operator's backup lifecycle.

Open `/connections` on the deployed service's HTTPS origin to inspect and disconnect a connection. Your existing consent browser session shows only its grants. After that session expires, unlock the connections with the same Advertiser API key on the protected page. Disconnecting clears the selected grant's encrypted key and handoffs. Disconnecting a plugin in ChatGPT and revoking its Ads API key remain separate actions. Revoke the key in Ads Manager to block upstream API access immediately. Contact the deployed service operator for erasure or access support; never send the key or a bearer token in that request.

## Terms

Use the service only for Ads accounts, data and operations you are authorized to manage. OpenAI's account requirements, advertising policies, API limits and feature gates continue to apply. The connected Advertiser API key grants access to its specific account; this integration does not create a replacement Platform key or bypass Ads account onboarding.

Campaign activation, budget changes, audience changes and other writes can affect live advertising. Authorize the intended account, operation and fields before asking the plugin to apply a change. A connection consent or installed plugin is not a standing instruction to spend money. Review pending or partial results before retrying uncertain operations.

The repository's code and skill are distributed under [Apache-2.0](../../../LICENSE). Hosting, operational support, service availability and any commercial terms are separate from that source-code license and must be supplied by the deployed service operator. This integration makes no guarantee of ad delivery, campaign results, complete parity with Ads Manager or approval by OpenAI.

## Support

For reproducible code or packaging defects, open an issue in [stark-ai-de/agent-skills](https://github.com/stark-ai-de/agent-skills/issues). For private account-access, revocation, deletion or security matters, use the publisher's [support contact](https://stark-ai-de.github.io/agent-skills/support/) or the contact shown by your deployed service operator. Do not include credentials, customer audience data, private Ads responses or unredacted request logs in a public issue.
