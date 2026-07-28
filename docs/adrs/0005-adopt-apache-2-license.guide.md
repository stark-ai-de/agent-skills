# ADR-0005: Adopt Apache 2.0 license

ID: ADR-0005
Title: Adopt Apache 2.0 license
Status: Accepted
Date: 2026-05-21
Owner: Servrox
Scope: repository
Category: governance
Tags: license, apache-2-0, distribution
Applies when: Licensing repository content or public skill material.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: License the public catalog under Apache-2.0.

Variants: [Short](0005-adopt-apache-2-license.short.md) · [Long, canonical](0005-adopt-apache-2-license.long.md) · **Guide**

This guide is non-normative. [Long](0005-adopt-apache-2-license.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Locate the policy, catalog, metadata, or repository surfaces governed by the canonical record.
- Compare the current state with the Long decision and with any later accepted or superseding ADR before proposing a change.
- Keep one authoritative policy surface; treat templates, reports, and checklists as derived material.

## Verification

- Check the affected policy and generated or derived surfaces for semantic agreement.
- Run the narrow validator for the governed artifact, then the repository aggregate validation when the change is implementation-ready.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Update license metadata and public docs to Apache-2.0.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
