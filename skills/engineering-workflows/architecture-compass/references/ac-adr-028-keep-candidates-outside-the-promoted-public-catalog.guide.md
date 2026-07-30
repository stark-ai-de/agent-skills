# AC-ADR-028: Keep Candidates Outside the Promoted Public Catalog

ID: AC-ADR-028
Title: Keep Candidates Outside the Promoted Public Catalog
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: catalog, incubation, discovery, promotion
Applies when: Creating a skill candidate or deciding whether it belongs in the public install surface.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Keep unpromoted candidates outside normal public discovery and installation.

Variants: [Short](ac-adr-028-keep-candidates-outside-the-promoted-public-catalog.short.md) · [Long, canonical](ac-adr-028-keep-candidates-outside-the-promoted-public-catalog.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls the public boundary.

## Candidate layout

For strict Agent Skills compliance, keep candidates in a root that public discovery and publication exclude, or publish a filtered artifact containing only promoted skills. The open `skills` CLI currently also recognizes `metadata.internal: true`, but that boolean field is a CLI-specific extension and is not specification-conforming Agent Skills metadata; treat it only as an optional, verified compatibility mechanism and never as the default candidate boundary. If any installer or publisher scans all nested packages, use the excluded non-published root or filtered artifact instead.

## Promotion checklist

1. Confirm the candidate passes the repository's quality and maintenance gate.
2. Move the complete package into the promoted root and remove candidate-only metadata.
3. Update catalog, docs, eval links, versions, changelog, and release intent together.
4. Test the promoted root, repository root, and public source from a clean copy.
5. Assert exact promoted names and assert that remaining candidates are absent.

## Decision lineage

- `consolidates`: [ADR-0004](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0004-keep-public-catalog-stable-and-portable.long.md), [ADR-0006](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0006-use-incubator-outside-public-catalog.long.md), [ADR-0009](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0009-mark-incubator-skills-internal.long.md).

## Current references

- [Open skills CLI discovery and internal-skill metadata](https://github.com/vercel-labs/skills)
- [Agent Skills specification](https://agentskills.io/specification)

## Revisit

Create a successor if candidates become a separately published support tier. Update discovery mechanics here when installer behavior changes.
