# stark AI Ads MCP

An authenticated MCP adapter for the public OpenAI Advertiser API, maintained in this repository as one deployable pnpm package. It supplies the tools used by the independent **stark AI Ads** plugin and the canonical [`openai-advertiser-api` skill](../../skills/engineering-workflows/openai-advertiser-api/).

**Selected hosting: native Node.js Vercel Functions with external PostgreSQL.** Neon is the recommended managed PostgreSQL provider; another compatible PostgreSQL service can be used. Docker is optional for self-hosting and local database development. The [service map](../../docs/services.md) explains repository ownership; the [listing guide](../../docs/listing/openai/stark-ai-ads.md) owns packaging and publication.

The code and deployment configuration are supplied here. They do not establish that a live endpoint, database, ChatGPT connection or public listing has been provisioned.

## Capability and credential boundary

- Typed account, campaign, ad-group, ad, reporting, feed, audience, conversion and bulk-job operations follow the [pinned API contract](references/advertiser-contract.json) and [`src/operations.mjs`](src/operations.mjs).
- Every resource operation checks the expected Ads account. Read and write scopes are enforced independently; connection consent does not authorize every later campaign change.
- OAuth uses registered public clients, exact redirects, S256 PKCE and resource binding. Dynamic registration and arbitrary upstream URLs are not accepted.
- The owner enters an **Advertiser API key from Ads Manager Settings** on the service's HTTPS connection form. The server verifies the account and encrypts the key in PostgreSQL. ChatGPT receives opaque OAuth tokens; the skill and tool arguments receive no Ads key.
- An ordinary OpenAI Platform API key cannot provide Advertiser API access. Account enablement and preview-feature eligibility still apply. Pixel instrumentation, continuous CAPI event forwarding and account onboarding are outside this adapter.
- Generated CAPI keys and SFTP passwords use an authenticated, one-time browser download; they are not returned to the model.

## Package layout

| Path                                             | Responsibility                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `src/`                                           | Shared HTTP application, OAuth, credentials, Ads client and tools                 |
| `src/storage/`, `src/store.mjs`                  | PostgreSQL transactions, encryption and distributed state                         |
| `api/index.mjs`, `src/vercel.mjs`, `vercel.json` | Thin Vercel adapter and deployment routing                                        |
| `src/server.mjs`                                 | Optional native HTTP listener for local/self-hosted operation                     |
| `migrations/`, `scripts/migrate.mjs`             | Append-only, checksummed SQL migrations; explicit operator command                |
| `test/`                                          | Real PostgreSQL tests, synthetic Ads responses, transport/authentication fixtures |
| `deployment/`                                    | Optional Compose and protected configuration examples                             |

## Configuration

Use Node.js **24.18.0 or later**, Vercel's **24.x** runtime and the pnpm version pinned in the repository `package.json`. Start from [`.env.example`](.env.example). Never commit real environment files or use an Advertiser key as a service-wide environment variable.

| Variable                     | Meaning                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Runtime PostgreSQL URL. Use Neon's pooled hostname for Functions. Remote URLs require `sslmode=verify-full`; never disable certificate verification. |
| `DATABASE_URL_UNPOOLED`      | Optional direct PostgreSQL URL for the migration command only. It overrides `DATABASE_URL` for migrations, not requests.                             |
| `ADS_DEPLOYMENT_ENVIRONMENT` | `production`, `preview` or `development`; must match the database's migration-time marker. Vercel requires an explicit value matching `VERCEL_ENV`.  |
| `ADS_PUBLIC_ORIGIN`          | Exact public HTTPS origin without path/query; OAuth, `/mcp` and credential downloads share it.                                                       |
| `ADS_ENCRYPTION_KEY`         | Exactly 32 random bytes in canonical base64; stable across instances and restarts. Store separately from the database.                               |
| `ADS_OAUTH_CLIENTS`          | JSON array of registered `{ "clientId": "…", "redirectUris": ["https://…"] }`; one to twenty clients, exact callback URLs.                           |
| `CRON_SECRET`                | Random bearer token of at least 32 characters for `/internal/prune`; required on Vercel.                                                             |
| `ADS_ENABLE_NON_PRODUCTION`  | Set to `1` only to enable a Vercel Preview/Development deployment with isolated state and secrets. Otherwise those deployments fail closed.          |
| `ADS_ALLOWED_ORIGINS`        | Optional comma-separated extra exact origins; service origin, ChatGPT and OpenAI Platform are included.                                              |
| `OPENAI_APPS_CHALLENGE`      | Optional public domain-verification text from the OpenAI portal.                                                                                     |
| `ADS_HOST`, `ADS_PORT`       | Native listener only; default `127.0.0.1:8789`.                                                                                                      |
| `ADS_ALLOW_HTTP_LOCALHOST`   | Native development only: `1` permits HTTP on loopback origins/callbacks. Rejected on Vercel.                                                         |

The native runtime also accepts protected `*_FILE` alternatives for `DATABASE_URL`, `ADS_ENCRYPTION_KEY`, `ADS_OAUTH_CLIENTS` and `CRON_SECRET`. Set either the value or its file, never both. Vercel uses environment values, not mounted secret files. The migration CLI uses `DATABASE_URL_UNPOOLED` or `DATABASE_URL`; it does not need the Ads encryption key.

Generate independent encryption and cron secrets in a secrets manager or directly into protected files; never print or paste them into chat. A protected native encryption-key file can be created without displaying its contents:

```bash
node --input-type=module -e 'import {randomBytes} from "node:crypto"; import {writeFileSync} from "node:fs"; writeFileSync("/YOUR_PRIVATE_DIRECTORY/encryption.key", randomBytes(32).toString("base64")+"\n", {flag:"wx",mode:0o600});'
```

## Vercel and Neon deployment

1. Create the dedicated Vercel project **`stark-ai-ads-mcp`**, connected to `stark-ai-de/agent-skills`. Set **Root Directory `packages/openai-ads-mcp`**, framework **Other**, Node **24.x**, Fluid Compute enabled, and the repository's pnpm workspace install. Keep source files outside the Root Directory available so the root workspace manifest/lockfile participate. Use the package's `vercel.json`; no Next.js application or container is required. Select the same region as the database and enable skipping unaffected workspace projects.
2. Provision a dedicated PostgreSQL database through the Vercel Marketplace Neon integration or your PostgreSQL operator. Scope production connection strings to **Production only**. Use the pooled URL for runtime; use the direct URL for migrations. Configure verified TLS, database backups/retention and an appropriate connection budget. The application has at most four connections per warm instance, not four connections for the entire deployment.
3. Configure the production variables above and choose the stable public HTTPS origin. Register the **exact callback displayed for the actual OpenAI connection**. The [client example](deployment/oauth-clients.example.json) uses OpenAI's documented callback and `stark-ai-ads-chatgpt`; verify it against the intended connection. Keep that client ID aligned with the plugin package.
4. Before rollout, run the migration command from a trusted operator environment with the selected database secrets and `ADS_DEPLOYMENT_ENVIRONMENT=production`:

   ```bash
   pnpm install --frozen-lockfile
   pnpm --filter @stark-ai/openai-ads-mcp run db:migrate
   ```

   This command **changes the selected database**. It takes a transaction-scoped advisory lock, validates existing migration checksums, applies pending SQL and records the environment. Re-running it is safe. Startup only verifies schema/key/environment; it never creates tables. Do not add migration execution to a Vercel build, cold start or PR preview.

5. Deploy the reviewed commit. Keep Vercel Deployment Protection on previews. Public production OAuth/discovery endpoints must be reachable by ChatGPT without a separate Vercel login; the service's own OAuth authenticates MCP requests. Configure edge request limits, sanitize logs and restrict administrative access to project/database secrets.
6. Verify metadata, authenticated connection, read-only behavior, authorized writes, revocation, credential downloads and the scheduled cleanup before publication. Then use the [publication guide](../../docs/listing/openai/stark-ai-ads.md) to build the plugin for that real endpoint.

The daily schedule in `vercel.json` calls `GET /internal/prune`. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically. The route checks this value in constant time and never accepts a token in the URL. No maintenance timer runs inside a Function. Monitor cron failures; expired records are rejected immediately even when pruning has not yet run. A native host must schedule the same authenticated route itself.

### Preview and production isolation

Do not attach production database URLs, encryption keys, OAuth clients or cron secrets to Preview/Development. Do not use Neon's default data-copying production branch as a credential-bearing preview database. Create an empty database, a schema-only branch or a branch from a dedicated synthetic-data parent; migrate it with `ADS_DEPLOYMENT_ENVIRONMENT=preview`.

Enabling a preview requires both `ADS_ENABLE_NON_PRODUCTION=1` and the matching environment marker. Give it its own exact HTTPS origin and registered callback/client. Keep Vercel Deployment Protection enabled and test only synthetic or specifically authorized reviewer accounts. A production database mistakenly supplied to a preview fails the marker check. A copied production database is still sensitive even if its encryption key is absent; do not copy it.

### Endpoint and limit verification

| Endpoint                                                               | Purpose                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `GET /health`                                                          | Process/version check; not an Ads-access or publication receipt          |
| `GET /.well-known/oauth-authorization-server`                          | Issuer, OAuth endpoints, scopes and S256 metadata                        |
| `GET /.well-known/oauth-protected-resource/mcp`                        | Protected-resource discovery; the root well-known variant is also served |
| `GET/POST /oauth/authorize`, `POST /oauth/token`, `POST /oauth/revoke` | Consent, exchange/rotation and revocation                                |
| `GET/POST /connections`                                                | Browser account-connection management                                    |
| `POST /mcp`                                                            | Authenticated Streamable HTTP MCP                                        |
| `GET/POST /credentials/{id}`                                           | Protected one-time credential download                                   |
| `GET /internal/prune`                                                  | Authenticated maintenance; no public state or counts                     |

Confirm issuer equals `ADS_PUBLIC_ORIGIN`, resource equals `ADS_PUBLIC_ORIGIN/mcp`, and an unauthenticated `/mcp` request returns `401` with resource discovery. Request bodies are capped at **3 MiB** and audience uploads at **2 MiB decoded**. The Vercel path bounds upstream responses and serialized tool results before the MCP SDK duplicates content. Use pagination and narrower report windows for oversized results; do not automatically retry an uncertain write.

Functions have a **120-second** hosting limit, with shorter application/operation deadlines. PostgreSQL leases outlive those deadlines and enforce per-grant and global concurrency across instances. Streaming cancellation does not immediately release a still-running upstream operation. A crashed instance's leases expire. The native listener uses the same bounds. Bulk jobs run at OpenAI; submit/poll them in separate calls rather than keeping a Function alive indefinitely.

## Local development and tests

Tests require a **disposable PostgreSQL database** supplied as `ADS_TEST_DATABASE_URL`. Every fixture creates and drops an isolated random schema. The test user therefore needs schema creation/drop privileges. Never point this variable at a production database; the tests intentionally modify and remove test state. Missing PostgreSQL causes failure, not skipped security tests.

For example, if Docker is available, start a loopback-only test database with synthetic credentials:

```bash
docker run --detach --rm --name stark-ai-ads-test \
  -e POSTGRES_USER=ads_test -e POSTGRES_PASSWORD=ads_test_only \
  -e POSTGRES_DB=ads_test -p 127.0.0.1:55432:5432 postgres:18
export ADS_TEST_DATABASE_URL='postgresql://ads_test:ads_test_only@127.0.0.1:55432/ads_test'
pnpm install --frozen-lockfile
pnpm run validate:ads-mcp
```

Wait for PostgreSQL to report ready before running tests; stop the disposable database with `docker stop stark-ai-ads-test`. An existing local PostgreSQL installation works equally well. CI supplies PostgreSQL in the existing Validate job.

To run the native service, configure a separate development database and protected service secrets. Set `ADS_DEPLOYMENT_ENVIRONMENT=development`, `ADS_PUBLIC_ORIGIN=http://127.0.0.1:8789`, `ADS_ALLOW_HTTP_LOCALHOST=1`, and registered loopback client callbacks. Run `db:migrate`, then `pnpm --filter @stark-ai/openai-ads-mcp start`. Local HTTP is not a public ChatGPT deployment.

## Optional Docker Compose self-hosting

Docker packages the Node runtime and dependencies. Compose runs that container with its ports, read-only secret mounts and environment configuration. Neither is required on Vercel. The Compose example uses the same external PostgreSQL backend; no SQLite file or application data volume remains.

Build from the repository root. Copy [deployment/config.env.example](deployment/config.env.example) to a protected path outside the checkout, replace all placeholders, and prepare encryption/OAuth files readable only by container UID/GID `1000:1000`. Keep the environment file private: it contains the database URL and cron secret.

```bash
docker compose --env-file /YOUR_PRIVATE_DIRECTORY/config.env -f packages/openai-ads-mcp/deployment/compose.yaml config --quiet
docker compose --env-file /YOUR_PRIVATE_DIRECTORY/config.env -f packages/openai-ads-mcp/deployment/compose.yaml build
docker compose --env-file /YOUR_PRIVATE_DIRECTORY/config.env -f packages/openai-ads-mcp/deployment/compose.yaml run --rm ads-mcp node packages/openai-ads-mcp/scripts/migrate.mjs
docker compose --env-file /YOUR_PRIVATE_DIRECTORY/config.env -f packages/openai-ads-mcp/deployment/compose.yaml up -d
```

Terminate HTTPS at a trusted reverse proxy, forward the full path and public Host to the container's loopback-bound port, disable response buffering and set request/body/timeout limits consistent with the application. Native address limits use the socket peer; behind a proxy this is a shared backstop, so apply per-client limits at the proxy. Vercel uses its platform-owned address header and strips caller-supplied address overrides.

Do not log authorization headers, OAuth queries, cookies, form bodies or Ads responses. Keep the native listener private. Schedule authenticated cleanup externally and monitor its result.

## Durable state, lifecycle and recovery

PostgreSQL stores encrypted Advertiser keys, encrypted pending OAuth forms and credential handoffs, account/client/scope metadata, hashed access/refresh tokens, browser bindings, rate counters and expiring concurrency leases. It stores no campaign/report archive for later analytics. Standard PostgreSQL transactions and locks coordinate all instances; no Redis dependency or server-memory session store is required.

Access tokens last **15 minutes**, authorization transactions **10 minutes**, codes **5 minutes**, browser sessions **1 hour** and generated-credential downloads at most **10 minutes**. Offline grants last at most **30 days** from consent. Refresh rotates tokens without extending that lifetime; reuse revokes the grant. Without offline access the grant lasts 15 minutes. Expiry is enforced on access independently of cleanup. Replay records survive until the grant expiry so cleanup cannot re-enable a spent token.

Disconnect through `/connections` to revoke a grant, remove its encrypted Ads key and invalidate its pending credential downloads. A valid browser session shows only its own grants; after it expires, the same Ads key can unlock matching connections. Revoking the upstream key in Ads Manager independently blocks further API access. In-flight upstream writes may already have reached OpenAI when a connection is revoked; reconcile their outcome before retrying.

Back up PostgreSQL using your provider's snapshots/PITR or consistent database backup tools. Back up the encryption key separately. Restore a matching database/key pair into the intended environment; wrong keys, schema history or environment markers fail closed. Restoring old database state can resurrect previously revoked grants, so revoke affected upstream keys if needed. Define backup retention/deletion, including old encrypted data, with the operator.

There is no in-place re-encryption or SQLite importer. For vault-key rotation or migration from an earlier experimental SQLite deployment, schedule a reconnect window: retain old backups according to policy, initialize a new isolated PostgreSQL database with a new key, run explicit migrations, cut over the service and have users reconnect. Never overwrite the key while retaining its old ciphertext. This PR does not migrate live customer state.

## Validation and evidence

`pnpm run validate:ads-mcp` owns transport, OAuth, account/scopes, SQL migration and multi-pool concurrency checks. The suite uses real PostgreSQL with synthetic keys and mocked Ads endpoints; it never requires or changes a live Ads account. `pnpm run validate:ads-plugin` separately owns reproducible packaging. Current validation receipts belong in [the skill evaluation record](../../skill-evals/openai-advertiser-api/README.md).

A successful local suite is not evidence of a real Vercel deployment, Neon provisioning, container build, browser/ChatGPT installation or publication. Qualify those selected environments before making the service public.

Primary contracts: [Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js), [pool lifecycle](https://vercel.com/kb/guide/connection-pooling-with-functions), [cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Neon pooling](https://neon.com/docs/connect/connection-pooling), [node-postgres transactions](https://node-postgres.com/features/transactions), [OpenAI Advertiser authentication](https://developers.openai.com/ads/api-reference/authentication), [MCP authentication](https://developers.openai.com/plugins/build/auth).
