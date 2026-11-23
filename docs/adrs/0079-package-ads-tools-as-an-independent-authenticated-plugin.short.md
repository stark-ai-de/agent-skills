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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-11-23
Gist: A dedicated Ads plugin reuses the canonical skill and connects to an account-bound authenticated MCP service with separate package and deployment evidence.

Variants: **Short** · [Long, canonical](0079-package-ads-tools-as-an-independent-authenticated-plugin.long.md) · [Guide](0079-package-ads-tools-as-an-independent-authenticated-plugin.guide.md)

## Decision

The independent stark AI Ads product reuses the canonical openai-advertiser-api skill and is packaged from its own source manifest with an authenticated remote MCP connection in the initial archive. Its account-bound API service uses reviewed typed operations, fixed Ads API origins, enforced read/write scopes, protected credential delivery and encrypted durable grants. Its package identity, endpoint configuration, deployment, release qualification and public submission evidence are separate from the existing Developer products. ADR-0076 continues to govern the existing Developer profile membership and identities. Canonical skill bytes remain shared; generated native adapters, credentials and deployment state are never canonical skill sources.

## Context

The maintainer requested the complete independent Ads plugin and API runtime after reviewing the standalone skill. Easier installation needs an installable identity; reliable ChatGPT API execution also needs authenticated tools.

## Consequences

- Good: The same skill serves direct API users and the authenticated plugin without duplicated instructions.
- Tradeoff: The independent service needs hosting, credential operations and its own public qualification.
- Risk: Offline tests and a reproducible package do not prove live Ads eligibility, a deployed endpoint or portal approval.
