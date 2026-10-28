# ADR-0076: Publish selected OpenAI profiles in parallel

ID: ADR-0076
Title: Publish selected OpenAI profiles in parallel
Status: Accepted
Date: 2026-10-28
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: distribution, openai, profiles, mcp
Applies when: Changing OpenAI release profile membership or identities.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0071
Superseded by: None
Guide verified: 2026-10-28
Gist: One canonical source publishes two independently identified OpenAI profiles in each stable release.

Variants: [Short](0076-publish-selected-openai-profiles-in-parallel.short.md) · [Long, canonical](0076-publish-selected-openai-profiles-in-parallel.long.md) · **Guide**

This guide is non-normative. [Long](0076-publish-selected-openai-profiles-in-parallel.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Generate both selected profiles from the same source revision. Verify identical skill files and each profile identity, transport, version, archive digest and target listing.

## Verification

Run profile, projection, archive and release-subject validation. Validate each OpenAI handoff independently; no local check proves portal acceptance.

## Current references

- [Repository publishing process](../publishing.md).
- [OpenAI plugin submission](https://developers.openai.com/plugins/deploy/submission).

## Revisit

Create a new reciprocal successor ADR if this decision changes; preserve locked predecessor decision text.
