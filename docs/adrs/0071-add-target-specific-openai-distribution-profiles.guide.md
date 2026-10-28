# ADR-0071: Add target-specific OpenAI distribution profiles

ID: ADR-0071
Title: Add target-specific OpenAI distribution profiles
Status: Superseded
Date: 2026-10-16
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: distribution, openai, profiles, mcp
Applies when: Changing OpenAI distribution identity, transport or release artifacts.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0070
Superseded by: ADR-0076
Guide verified: 2026-10-16
Gist: One canonical source selects an explicit OpenAI distribution profile for each immutable release.

Variants: [Short](0071-add-target-specific-openai-distribution-profiles.short.md) · [Long, canonical](0071-add-target-specific-openai-distribution-profiles.long.md) · **Guide**

This guide is non-normative. [Long](0071-add-target-specific-openai-distribution-profiles.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Profil wählen, Artefakt erzeugen, Identität und Digest prüfen, passenden Portalweg manuell durchführen. ADR-0071 supersedes ADR-0070; preserve the predecessor decision lock. Profile and runtime implementation still require qualification.

## Verification

- Run `pnpm run validate:adrs`; once implemented, run the selected profile checks and `pnpm run validate:metadata-mcp`.
- A local validation pass does not establish deployment, portal acceptance or publication. Acceptance is recorded; implementation and deployment require their own evidence.

## Current references

- [OpenAI submission](https://developers.openai.com/plugins/deploy/submission): MCP in the initial ZIP, current restriction on skills-only migration.
- [Desktop submissions](https://developers.openai.com/plugins/deploy/desktop-only): partner allowlisting is required.
- [MCP handler](https://github.com/vercel-labs/mcp-handler): verify version-sensitive transport behavior before implementation.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
