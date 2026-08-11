# ADR-0009: Mark incubator skills internal

ID: ADR-0009
Title: Mark incubator skills internal
Status: Accepted
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: incubator, metadata, discovery
Applies when: Creating or validating an incubator skill.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Hide incubator skills from normal CLI discovery.

Variants: [Short](0009-mark-incubator-skills-internal.short.md) · [Long, canonical](0009-mark-incubator-skills-internal.long.md) · **Guide**

This guide is non-normative. [Long](0009-mark-incubator-skills-internal.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Keep smoke install checks that fail if incubator skills leak.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
