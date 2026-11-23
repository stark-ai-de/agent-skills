# ADR-0079: Package Ads tools as an independent authenticated plugin

ID: ADR-0079
Title: Package Ads tools as an independent authenticated plugin
Status: Proposed
Date: 2026-11-23
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: plugins, ads, mcp, oauth, credentials
Applies when: Building or publishing the independent stark AI Ads plugin and its API runtime.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-11-23
Gist: A dedicated Ads plugin reuses the canonical skill and connects to an account-bound authenticated MCP service with separate package and deployment evidence.

Variants: [Short](0079-package-ads-tools-as-an-independent-authenticated-plugin.short.md) · **Long, canonical** · [Guide](0079-package-ads-tools-as-an-independent-authenticated-plugin.guide.md)

## Decision

The independent stark AI Ads product reuses the canonical openai-advertiser-api skill and is packaged from its own source manifest with an authenticated remote MCP connection in the initial archive. Its account-bound API service uses reviewed typed operations, fixed Ads API origins, enforced read/write scopes, protected credential delivery and encrypted durable grants. Its package identity, endpoint configuration, deployment, release qualification and public submission evidence are separate from the existing Developer products. ADR-0076 continues to govern the existing Developer profile membership and identities. Canonical skill bytes remain shared; generated native adapters, credentials and deployment state are never canonical skill sources.

## Why

The reviewed skill supplies operational instructions but cannot itself create HTTP execution or a persistent account connection in every host. An independent Ads plugin makes this workflow discoverable without changing the scope of the existing developer products. Enforced account and scope boundaries are required when a publisher-operated service holds account credentials.

## Options

- Chosen: Keep one canonical skill and add a separately packaged authenticated Ads MCP service with its own operator and publication evidence.
- Rejected: Reuse the metadata-validation service or Developer listing identity for an unrelated account-changing product.
- Rejected: Publish a skill-only product with the assumption that MCP can always be added to that same listing later; the current OpenAI submission flow does not support that migration.

## Consequences

- Good: Standalone direct HTTPS remains available; the plugin adds authenticated execution and typed API functionality.
- Tradeoff: Operators must deploy one persistent service instance behind HTTPS, provision encryption material and exact OAuth callbacks, and maintain backups and revocation.
- Risk: Missing live API, ChatGPT installation, container or portal evidence must remain explicit; package validation cannot imply those results.

## Follow-up

- Review this additive product boundary with the implementation PR. It does not rewrite accepted Developer release decisions.
- Qualify the selected HTTPS deployment, OAuth callback, isolated reviewer Ads account and public policies before actual submission.
- Keep runtime, account-isolation, credential, request serialization and reproducible-package checks in the repository validation aggregate.
