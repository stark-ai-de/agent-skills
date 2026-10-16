# ADR-0072: Share one metadata validation core across MCP transports

ID: ADR-0072
Title: Share one metadata validation core across MCP transports
Status: Accepted
Date: 2026-10-16
Owner: stark-ai-de
Scope: repository
Category: backend
Tags: mcp, metadata, validation, vercel, privacy
Applies when: Implementing or deploying the metadata validation MCP.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-16
Gist: One stateless repository-owned core serves metadata validation through HTTP and stdio.

Variants: [Short](0072-share-one-metadata-validation-core-across-mcp-transports.short.md) · [Long, canonical](0072-share-one-metadata-validation-core-across-mcp-transports.long.md) · **Guide**

This guide is non-normative. [Long](0072-share-one-metadata-validation-core-across-mcp-transports.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Regeln pinnen, Adaptervergleich ausführen, ausgewählten Transport qualifizieren und Betriebsangaben prüfen. Die Entscheidung wurde vom Maintainer ausdrücklich angenommen. Vorgesehener Source-Owner ist packages/skill-metadata-mcp; vorgesehen sind Node.js 24 auf Vercel und ein stdio-Adapter desselben Kerns. Das ist noch kein implementierter oder veröffentlichter Dienst.

## Verification

- Run `pnpm run validate:adrs`; once implemented, run the selected profile checks and `pnpm run validate:metadata-mcp`.
- A local validation pass does not establish deployment, portal acceptance or publication. Acceptance is recorded; implementation and deployment require their own evidence.

## Current references

- [OpenAI submission](https://developers.openai.com/plugins/deploy/submission): MCP in the initial ZIP, current restriction on skills-only migration.
- [Desktop submissions](https://developers.openai.com/plugins/deploy/desktop-only): partner allowlisting is required.
- [MCP handler](https://github.com/vercel-labs/mcp-handler): verify version-sensitive transport behavior before implementation.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
