# ADR-0021: Place portable skills in workflow categories

ID: ADR-0021
Title: Place portable skills in workflow categories
Status: Accepted
Date: 2026-07-06
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: catalog, portability, categories
Applies when: Choosing the public catalog category or runtime specialization for a skill.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Portable skills belong in workflow categories, not runtime operation categories.

Variants: [Short](0021-place-portable-skills-in-workflow-categories.short.md) · [Long, canonical](0021-place-portable-skills-in-workflow-categories.long.md) · **Guide**

This guide is non-normative. [Long](0021-place-portable-skills-in-workflow-categories.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Move `codegraph-ast-grep` to Engineering Workflows and keep spec interviewers runtime-specific.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
