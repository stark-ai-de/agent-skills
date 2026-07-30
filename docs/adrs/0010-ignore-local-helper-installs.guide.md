# ADR-0010: Ignore local helper installs

ID: ADR-0010
Title: Ignore local helper installs
Status: Accepted
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: local-state, helpers, gitignore
Applies when: Installing or recording maintainer-local helper skills.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Local helper skills should not become repository state.

Variants: [Short](0010-ignore-local-helper-installs.short.md) · [Long, canonical](0010-ignore-local-helper-installs.long.md) · **Guide**

This guide is non-normative. [Long](0010-ignore-local-helper-installs.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Document any truly required helper as public docs, not a committed lockfile.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
