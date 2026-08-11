# ADR-0003: Keep ADRs short

ID: ADR-0003
Title: Keep ADRs short
Status: Superseded
Date: 2026-05-19
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: adr, documentation, superseded
Applies when: Reviewing the repository's former compact ADR policy.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0032
Guide verified: 2026-07-28
Gist: Decision records should not become documentation bloat.

Variants: [Short](0003-keep-adrs-short.short.md) · [Long, canonical](0003-keep-adrs-short.long.md) · **Guide**

This guide is non-normative. [Long](0003-keep-adrs-short.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Locate the policy, catalog, metadata, or repository surfaces governed by the canonical record.
- Compare the current state with the Long decision and with any later accepted or superseding ADR before proposing a change.
- Keep one authoritative policy surface; treat templates, reports, and checklists as derived material.

## Verification

- Check the affected policy and generated or derived surfaces for semantic agreement.
- Select focused checks from the changed contract and owning boundary. Run the repository aggregate only when a mandatory gate or distinct proof obligation requires it.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Add ADR validation script.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
