# ADR-0032: Adopt Short, Long, and Guide ADR triplets

ID: ADR-0032
Title: Adopt Short, Long, and Guide ADR triplets
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: adr, triplet, progressive-disclosure
Applies when: Creating, linking, validating, or superseding a repository ADR.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0003, ADR-0013
Superseded by: None
Guide verified: 2026-07-28
Gist: Every ADR exposes a short overview, one canonical decision, and implementation guidance.

Variants: [Short](0032-adopt-short-long-guide-adr-triplets.short.md) · [Long, canonical](0032-adopt-short-long-guide-adr-triplets.long.md) · **Guide**

This guide is non-normative. [Long](0032-adopt-short-long-guide-adr-triplets.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Supersede [ADR-0003](0003-keep-adrs-short.short.md) ([Long, canonical](0003-keep-adrs-short.long.md) · [Guide](0003-keep-adrs-short.guide.md)) and migrate every repository ADR atomically.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
