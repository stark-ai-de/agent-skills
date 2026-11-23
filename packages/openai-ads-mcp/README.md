# stark AI Ads MCP

An authenticated MCP adapter for the public OpenAI Advertiser API. It supplies the API tools used by the separate **stark AI Ads** plugin and the canonical [`openai-advertiser-api` skill](../../skills/engineering-workflows/openai-advertiser-api/). The skill remains usable separately in an environment with authorized direct HTTP execution.

This package contains the server implementation, deployment example and offline tests. It has not been deployed or submitted to the OpenAI plugin directory by this change. The example domain is a placeholder, not a running service.

## What it provides

- Account identification, campaign/ad-group/ad operations, reporting, product feeds, audiences, conversion setup, and explicitly documented bulk jobs through a pinned allowlist of API methods and fields. [`src/operations.mjs`](src/operations.mjs) and the [reviewed contract snapshot](references/advertiser-contract.json) define the exact supported surface.
- Per-connection account binding. Each resource operation requires the expected account ID and verifies the account returned by OpenAI before proceeding.
- Separate read and write scopes. Server-side validation and uploads require write access. The account owner explicitly chooses whether to grant write access; the host and skill still govern authorization for each requested operation.
- OAuth authorization-code flow with S256 PKCE, fixed registered public clients, exact redirects and resource binding. No client secret, dynamic client registration or arbitrary URL discovery is used.
- An encrypted local credential vault, token rotation/revocation, account connection management and protected one-time downloads for generated CAPI/SFTP credentials.

Account enablement still controls API availability, including limited-preview features. A regular OpenAI Platform API key cannot replace the **account-scoped Advertiser API key created in Ads Manager Settings**. CAPI keys are separate event-delivery credentials. The MCP server does not implement website Pixel instrumentation, continuous CAPI event forwarding, ad-account onboarding or automatic campaign optimization.

## Runtime and configuration

Use Node.js **24.18.0 or later** and the repository's pinned **pnpm 11.24.0**. The container pins Node.js `24.18.0-bookworm-slim`. Runtime dependencies are installed from the workspace lockfile; the application runs as UID/GID `1000:1000` (`node`).

| Setting                                           | Required value or default                                                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADS_PUBLIC_ORIGIN`                               | Public HTTPS origin, without path or query; for example your chosen service domain. The resource is this origin plus `/mcp`.                              |
| `ADS_ENCRYPTION_KEY` or `ADS_ENCRYPTION_KEY_FILE` | Exactly 32 random bytes encoded as canonical base64. Configure one form only; the mounted-file form is recommended.                                       |
| `ADS_OAUTH_CLIENTS` or `ADS_OAUTH_CLIENTS_FILE`   | JSON array of `{ "clientId": "…", "redirectUris": ["https://…"] }`. Configure one form only. One to twenty explicitly registered clients are accepted.    |
| `ADS_DATABASE_PATH`                               | Absolute local path. Direct startup defaults to `data/ads.sqlite` resolved from the working directory; the image uses `/var/lib/stark-ai-ads/ads.sqlite`. |
| `ADS_HOST`                                        | Direct startup defaults to `127.0.0.1`. The container binds `0.0.0.0` internally and Compose exposes it only on host loopback.                            |
| `ADS_PORT`                                        | Direct/container listener port; default `8789`. Compose keeps the container port fixed and uses `ADS_BIND_PORT` for the host mapping.                     |
| `ADS_ALLOWED_ORIGINS`                             | Optional comma-separated exact additional origins. The service origin, `https://chatgpt.com` and `https://platform.openai.com` are already permitted.     |
| `ADS_ALLOW_HTTP_LOCALHOST`                        | Set to `1` only for explicit loopback development. It permits HTTP only for loopback origins and callbacks. Production Compose keeps this disabled.       |
| `OPENAI_APPS_CHALLENGE`                           | Optional public domain-verification value supplied by the OpenAI submission portal.                                                                       |

Never configure a shared Advertiser key in the service environment or image. Each account owner supplies their own key through the protected connection form. The encryption key is a different service secret and must remain available across restarts.

### Local development

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @stark-ai/openai-ads-mcp test
```

Set the configuration above using protected files. For a loopback-only session, use `ADS_PUBLIC_ORIGIN=http://127.0.0.1:8789`, `ADS_HOST=127.0.0.1`, `ADS_ALLOW_HTTP_LOCALHOST=1` and explicitly registered loopback callback URLs for your test client. Then start:

```bash
pnpm --filter @stark-ai/openai-ads-mcp start
```

Local HTTP is for development; it is not a publicly connectable ChatGPT deployment. The automated tests use synthetic keys and mocked OpenAI responses, including the real OAuth-to-MCP transport path. They never require an Ads account or change live advertisements.

## Deploy one instance behind HTTPS

The supplied Compose file targets a Linux host with Docker Compose and a host-managed HTTPS reverse proxy. Run **one instance** with a private directory on **local persistent disk**. SQLite/WAL state is not designed here for replicas or a shared NFS volume. The service rejects symlinks in its database path and rejects a database parent directory writable by group or other users.

The following are operator-run setup commands, not actions performed by this PR. All paths below are examples outside the checkout. For rootless Docker, adapt the host ownership to its UID mapping rather than making secret files broadly readable.

### 1. Prepare private storage and service secrets

```bash
sudo install -d -m 0700 -o 1000 -g 1000 /srv/stark-ai-ads/data
sudo install -d -m 0700 -o root -g root /etc/stark-ai-ads
```

Generate the vault encryption key directly into a protected file. This command refuses to overwrite an existing key and never prints it:

```bash
sudo python3 - <<'PY'
import base64
import os
import secrets

with open("/etc/stark-ai-ads/encryption.key", "x", encoding="ascii") as stream:
    os.fchmod(stream.fileno(), 0o400)
    os.fchown(stream.fileno(), 1000, 1000)
    stream.write(base64.b64encode(secrets.token_bytes(32)).decode("ascii") + "\n")
PY
```

Prepare the configuration examples:

```bash
sudo install -m 0600 packages/openai-ads-mcp/deployment/config.env.example /etc/stark-ai-ads/config.env
sudo install -m 0400 -o 1000 -g 1000 packages/openai-ads-mcp/deployment/oauth-clients.example.json /etc/stark-ai-ads/oauth-clients.json
sudoedit /etc/stark-ai-ads/config.env /etc/stark-ai-ads/oauth-clients.json
```

Set the real HTTPS origin and host paths in `config.env`. Keep the client ID aligned with the plugin package, default `stark-ai-ads-chatgpt`. Copy the **exact production redirect URI shown in the OpenAI MCP connection management page** into `redirectUris`. The sample uses OpenAI's documented stable callback; confirm the value for the actual connection. Do not allow wildcards or arbitrary caller-supplied redirects.

The files are bind-mounted read-only. Their contents must be readable by container UID `1000`; Compose cannot repair permissions on a host bind mount. After editing, verify/reapply `1000:1000` ownership and `0400` permissions for both mounted files. Keep the containing host directory restricted. The environment file contains paths and public configuration, not the encryption key or an Advertiser key.

### 2. Configure the HTTPS reverse proxy

Use the same public origin for OAuth, credential downloads, metadata and `/mcp`. Forward the full path to `http://127.0.0.1:8789` and preserve the original public **Host** header. A different Host is rejected, except for loopback `/health` checks.

For example, the relevant NGINX location inside an existing TLS server block is:

```nginx
location / {
    proxy_pass http://127.0.0.1:8789;
    proxy_set_header Host $http_host;
    proxy_http_version 1.1;
    proxy_buffering off;
    client_max_body_size 3m;
    proxy_read_timeout 120s;
}
```

Provide a valid certificate, permit required request headers, and apply IP-based connection/request limits at the edge. The application deliberately ignores caller-supplied forwarding headers and bases its address limits on the socket peer. Behind a reverse proxy, that peer is the proxy, so application address limits are a shared backstop rather than per-user rate limiting. Do not expose the internal HTTP listener to the public internet.

Avoid logging request/response bodies, cookies, authorization headers or OAuth query strings at the proxy. OAuth callbacks carry short-lived codes, and connection forms contain secrets. Configure access-log formats accordingly.

MCP request bodies are limited to **3 MiB**. Audience uploads are additionally limited to **2 MiB decoded**, leaving room for Base64 and JSON overhead. OAuth/credential forms have smaller independent limits. The server never follows Ads API redirects and sends management requests only to `https://api.ads.openai.com/v1`.

### 3. Build and start

Run from the repository root:

```bash
sudo docker compose --env-file /etc/stark-ai-ads/config.env -f packages/openai-ads-mcp/deployment/compose.yaml config --quiet
sudo docker compose --env-file /etc/stark-ai-ads/config.env -f packages/openai-ads-mcp/deployment/compose.yaml build
sudo docker compose --env-file /etc/stark-ai-ads/config.env -f packages/openai-ads-mcp/deployment/compose.yaml up -d
```

Only explicitly selected manifests, dependencies, runtime source and public contract references enter the image. Secret files and the SQLite database remain separate host mounts. The service uses a read-only root filesystem, drops Linux capabilities, and enables no-new-privileges.

### 4. Verify the deployed service and package

Check the local health endpoint and the public metadata using your actual domain:

```bash
curl --fail http://127.0.0.1:8789/health
curl --fail https://YOUR_SERVICE_DOMAIN/.well-known/oauth-authorization-server
curl --fail https://YOUR_SERVICE_DOMAIN/.well-known/oauth-protected-resource/mcp
```

Confirm the issuer matches `ADS_PUBLIC_ORIGIN`, resource matches `ADS_PUBLIC_ORIGIN/mcp`, S256 is advertised, and the registered public-client method is `none`. An unauthenticated `/mcp` request must return `401` with its resource-metadata challenge. `/health` establishes process availability; it does not establish Ads access, a successful OAuth connection or publication eligibility.

Build the installable plugin with the same real MCP endpoint:

```bash
node scripts/plugin/package-ads-plugin.mjs --server-url https://YOUR_SERVICE_DOMAIN/mcp --oauth-client-id stark-ai-ads-chatgpt
```

Use the [plugin publication guide](../../docs/listing/openai/stark-ai-ads.md) for the exact package/client options, artifact validation, required listing material and portal flow. Include the MCP connection in the initial public package. Deployment, authenticated ChatGPT testing and directory publication are separate operator actions; none are implied by building a ZIP.

## Connection lifecycle and operations

| Endpoint                                        | Purpose                                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /health`                                   | Process/version check without credentials.                                                           |
| `GET /.well-known/oauth-authorization-server`   | OAuth endpoints, scopes, issuer and PKCE metadata.                                                   |
| `GET /.well-known/oauth-protected-resource/mcp` | Resource-specific discovery; the root well-known path is also served.                                |
| `GET/POST /oauth/authorize`                     | Verify the Ads key, then review the account and grant scopes.                                        |
| `POST /oauth/token`                             | Exchange a code or rotate a refresh token.                                                           |
| `POST /oauth/revoke`                            | Revoke the grant represented by a client-bound token.                                                |
| `GET/POST /connections`                         | Unlock and disconnect account connections in a browser.                                              |
| `POST /mcp`                                     | Authenticated MCP tools over Streamable HTTP.                                                        |
| `GET/POST /credentials/{id}`                    | Protected, one-time generated-credential download. A link or MCP bearer token alone is insufficient. |

The owner enters the Advertiser key in the service's HTTPS form, verifies the account ID/currency/timezone, and explicitly enables write access when wanted. ChatGPT receives opaque connection tokens; it never receives the upstream Ads key. The connection supports one Ads account. To use a different account, establish the intended connection and verify its account ID before calling resource tools.

Access tokens last **15 minutes**. Authorization transactions last **10 minutes**, codes **5 minutes**, browser sessions **1 hour**, and generated-credential downloads at most **10 minutes** with one successful download. Grants with `offline_access` last at most **30 days** from consent; refreshing rotates the token but does not extend that absolute lifetime. Without offline access, the grant lasts 15 minutes. Reconnect after expiration or when changing requested permissions.

Use `/connections` to disconnect an individual grant. An active browser session can manage its grants; after that session expires, entering the same Advertiser key unlocks matching active grants. Disconnecting immediately invalidates tokens, removes the stored encrypted Ads key, and deletes pending credential downloads. Revoking the upstream Advertiser key in Ads Manager independently prevents further API access. A fresh key requires a fresh connection.

Rate limits and expired-data cleanup are enforced locally. All instances of a horizontally scaled service would need a different reviewed shared-state design; do not scale this SQLite deployment by adding replicas. Back up and monitor the local state volume. Do not infer that a successful API write is already serving: inspect the returned verification/pending state and poll asynchronous operation results as appropriate.

## Persistence, backup and key rotation

The vault contains encrypted Ads keys, encrypted pending authorization state and encrypted credential-download payloads. Account IDs, client IDs, scopes and expiry metadata are stored for operating the connections. Access/refresh tokens are stored only as hashes; a keyed fingerprint permits the account owner to unlock matching grants without exposing the stored key. Tokens are never written to the application log.

Expired state is rejected on access and removed by cleanup. Revocation removes live credential ciphertext immediately; replay-detection records remain only until the grant expires. Database pages, snapshots and backups can retain historical **encrypted** data until the operator's retention policy removes them. Define backup retention and deletion procedures for your deployment.

For a consistent backup, stop the service briefly and back up the **entire SQLite state directory** (including any WAL/SHM files). Store the encryption key in a separate protected backup system. Restore the database and its matching key together, with the required ownership and permissions. A missing or incorrect key causes startup to fail closed. Neither the database nor the key alone is a complete recovery backup.

There is no in-place vault re-encryption command in this version. To rotate the vault encryption key, schedule a reconnect window: stop the service, retain or securely remove the old database and key under the backup policy, create a fresh empty private state directory and a new protected key file, then restart and have users reconnect. Do not overwrite the key while retaining the old database. Restoring an older backup can resurrect local grant state; revoke upstream Ads keys when a restored credential must remain unusable.

## Validation and deployment evidence

The repository test suite exercises API serialization, schemas, account/scope isolation, OAuth, CSRF, token replay/expiry, encrypted storage/restart, credential downloads, HTTP boundaries and concurrent MCP principals with synthetic inputs. The deployment examples are configuration, not evidence of a running service. The implementation environment does not provide Docker; the image build and Compose startup therefore require an operator/CI check before production use. Public HTTPS, real account feature enablement and installation in ChatGPT must also be verified on the intended deployment.

Primary contracts: [OpenAI Advertiser authentication](https://developers.openai.com/ads/api-reference/authentication), [MCP authentication in OpenAI](https://developers.openai.com/plugins/build/auth), [OpenAI plugin submission](https://developers.openai.com/plugins/deploy/submission).
