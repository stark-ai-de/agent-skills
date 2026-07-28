# ADR-0004: Start with empty promoted-only catalog

ID: ADR-0004
Title: Start with empty promoted-only catalog
Status: Accepted
Date: 2026-05-20
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: catalog, promotion, incubation
Applies when: Deciding whether a candidate skill belongs in the public catalog.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Public installs should expose only promoted skills.

Variants: [Short](0004-keep-public-catalog-stable-and-portable.short.md) · [Long, canonical](0004-keep-public-catalog-stable-and-portable.long.md) · **Guide**

This guide is non-normative. [Long](0004-keep-public-catalog-stable-and-portable.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Promote one skill at a time after adding `skill-evals/` proof.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
