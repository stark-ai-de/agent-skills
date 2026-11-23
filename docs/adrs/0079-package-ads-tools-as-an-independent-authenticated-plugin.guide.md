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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-11-23
Gist: A dedicated Ads plugin reuses the canonical skill and connects to an account-bound authenticated MCP service with separate package and deployment evidence.

Variants: [Short](0079-package-ads-tools-as-an-independent-authenticated-plugin.short.md) · [Long, canonical](0079-package-ads-tools-as-an-independent-authenticated-plugin.long.md) · **Guide**

This guide is non-normative. [Long](0079-package-ads-tools-as-an-independent-authenticated-plugin.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Maintain the skill under skills/engineering-workflows/openai-advertiser-api. The independent source manifest is plugins/stark-ai-ads.source.json and its Node runtime is packages/openai-ads-mcp. Build the native archive using the selected deployed HTTPS /mcp URL and registered public OAuth client ID. Never put the Ads key or OAuth tokens into a package.

Follow the [runtime guide](../../packages/openai-ads-mcp/README.md) for configuration and the [listing guide](../listing/openai/stark-ai-ads.md) for package and public-submission work. Existing Developer release profiles retain their existing selected membership.

## Verification

Run pnpm run validate:ads-mcp and pnpm run validate:ads-plugin. The first owns mocked protocol/account/authentication behavior; the second owns source identity, canonical skill projection and reproducible archive fixtures. Qualify the actual deployment and installed ChatGPT flow separately before publication.

## Current references

- [OpenAI MCP tools](https://developers.openai.com/plugins/build/mcp-server), [authentication](https://developers.openai.com/plugins/build/auth) and [submission](https://developers.openai.com/plugins/deploy/submission), reviewed 2026-11-23.
- [Advertiser API overview](https://developers.openai.com/ads/api-overview) and the runtime's pinned request-contract snapshot.
- [ADR-0076](0076-publish-selected-openai-profiles-in-parallel.short.md) ([Long, canonical](0076-publish-selected-openai-profiles-in-parallel.long.md) · [Guide](0076-publish-selected-openai-profiles-in-parallel.guide.md)).

## Revisit

Create a reciprocal successor if the product identity boundary, shared skill ownership or separate deployment/publication evidence changes.
