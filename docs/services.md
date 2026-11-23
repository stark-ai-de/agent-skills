# Services in this repository

The repository contains canonical skills, plugin packaging and independently deployable services. A service is a pnpm workspace package; a Vercel project selects that package as its Root Directory. Shared Git history keeps changes reviewable together without combining deployment credentials or release identities.

## Ownership and paths

| Component            | Canonical location                                                                                              | Purpose and entry guide                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Advertiser skill     | [`skills/engineering-workflows/openai-advertiser-api/`](../skills/engineering-workflows/openai-advertiser-api/) | Operational instructions, capability boundaries and API/MCP workflows.                         |
| Ads plugin           | [`plugins/stark-ai-ads.source.json`](../plugins/stark-ai-ads.source.json)                                       | Independent installable identity; [packaging and publication](listing/openai/stark-ai-ads.md). |
| Ads MCP service      | [`packages/openai-ads-mcp/`](../packages/openai-ads-mcp/README.md)                                              | HTTP, OAuth, account-bound tools, encrypted PostgreSQL state and deployment operations.        |
| Metadata MCP service | [`packages/skill-metadata-mcp/`](../packages/skill-metadata-mcp/README.md)                                      | Existing skill metadata/validation service with its own deployment.                            |
| Repository website   | [`site/`](../site/)                                                                                             | Public catalog and support pages; its release remains separate.                                |

The Vercel project is deployment configuration for the Ads package, not another source-code project. Its thin `api/index.mjs` entrypoint, `vercel.json`, SQL migrations, tests and operations guide live alongside the implementation. There is no separate web application or second copy of the skill. Extract a shared library only when a second real consumer requires it.

## Ads deployment boundary

| Setting                       | Selected structure                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| Git repository                | `stark-ai-de/agent-skills`                                                         |
| Dedicated Vercel project name | `stark-ai-ads-mcp`                                                                 |
| Root Directory                | `packages/openai-ads-mcp`                                                          |
| Runtime                       | Native Node.js 24 Vercel Functions; framework preset **Other**                     |
| Durable state                 | External PostgreSQL; Neon is the recommended managed provider                      |
| Preview state                 | Separate empty/test database, encryption key, origin, OAuth client and cron secret |
| Migrations                    | Explicit package command before rollout; never executed by a request or build      |
| Cleanup                       | Authenticated scheduled route; no background interval inside Functions             |
| Optional self-hosting         | Same Node application and PostgreSQL schema through Docker Compose                 |

Neon supplies the PostgreSQL database. It holds encrypted Ads keys and temporary credential deliveries, connection/token metadata, OAuth transaction state and shared rate/lease counters. It is not needed for the skill's text or a direct API call; it is needed for durable account connections and coordination across short-lived server instances. The service uses standard PostgreSQL SQL and `pg`, so another compatible provider can replace Neon without changing the tool API.

Use a pooled connection URL for runtime traffic and a direct connection for migrations. Keep both in the selected deployment environment's secrets. Do not share them with the metadata service. Do not create previews from production branches containing account credentials; use a separate empty database or a schema-only branch. A persisted environment marker prevents a preview runtime from accidentally opening the production schema, while distinct keys and database credentials provide the actual isolation.

## Where to change and verify things

- Tool behavior, authentication, persistence, limits or hosting: edit the Ads package and run `pnpm run validate:ads-mcp` with a disposable `ADS_TEST_DATABASE_URL`. The suite uses real PostgreSQL and synthetic Ads responses. The existing **Validate** workflow supplies PostgreSQL and owns this gate.
- Skill instructions: edit the canonical skill. Package validation checks that its bytes and `agents/openai.yaml` are copied unchanged.
- Installable package identity or MCP connection: edit the Ads source manifest/packager and run `pnpm run validate:ads-plugin`. Supply the selected deployed endpoint when producing a distribution ZIP.
- Deployment, backup, credentials and maintenance: follow the [Ads runtime guide](../packages/openai-ads-mcp/README.md). Keep procedural details there.
- Listing, public policies and portal qualification: follow the [Ads publication guide](listing/openai/stark-ai-ads.md). Deployment and publication have separate evidence.

Select unaffected-project skipping in Vercel for this pnpm workspace; keep the root lockfile available to builds. Source, lockfile and relevant workspace dependency changes must trigger a build. The metadata project and catalog do not gain the Ads service's credentials, code paths or runtime dependency merely because they share a repository.

The product boundary and monorepo decision are recorded in [ADR-0079](adrs/0079-package-ads-tools-as-an-independent-authenticated-plugin.short.md) ([Long, canonical](adrs/0079-package-ads-tools-as-an-independent-authenticated-plugin.long.md) · [Guide](adrs/0079-package-ads-tools-as-an-independent-authenticated-plugin.guide.md)).

## Primary deployment contracts

- [Vercel monorepos](https://vercel.com/docs/monorepos) and [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js).
- [PostgreSQL pooling on Vercel](https://vercel.com/kb/guide/connection-pooling-with-functions).
- [Neon integration with Vercel](https://neon.com/docs/guides/vercel-managed-integration).
