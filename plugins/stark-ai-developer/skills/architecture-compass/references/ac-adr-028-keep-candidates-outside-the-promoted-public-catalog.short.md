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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Keep unpromoted candidates outside normal public discovery and installation.

Variants: **Short** · [Long, canonical](ac-adr-028-keep-candidates-outside-the-promoted-public-catalog.long.md) · [Guide](ac-adr-028-keep-candidates-outside-the-promoted-public-catalog.guide.md)

## Decision summary

Only promoted skills belong in the repository's normal public catalog and install surface. New or unproven candidates start in a distinct incubation boundary, remain hidden from default discovery with a supported exclusion or internal marker, and move into the public catalog only through an explicit promotion change whose clean-install validation proves that candidates do not leak.

## Context

Folder presence can imply support and may be recursively discovered even when documentation calls a skill experimental.

## Invariants

- Candidate state is structural and machine-checkable.
- Public discovery exposes promoted skills only.
- Promotion changes both location and discovery metadata coherently.

## Consequences

The public catalog stays conservative and trustworthy, at the cost of maintaining a separate candidate workflow and leakage tests.
