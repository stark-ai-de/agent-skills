# ADR-0029: Keep linked worktrees inside the repository

ID: ADR-0029
Title: Keep linked worktrees inside the repository
Status: Accepted
Date: 2026-07-16
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: git, worktree, workspace
Applies when: Creating or relocating a linked Git worktree.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Give linked worktrees one ignored, repository-local home.

Variants: [Short](0029-keep-linked-worktrees-inside-the-repository.short.md) · [Long, canonical](0029-keep-linked-worktrees-inside-the-repository.long.md) · **Guide**

This guide is non-normative. [Long](0029-keep-linked-worktrees-inside-the-repository.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Move or recreate worktrees under `.worktrees/` only during an explicitly approved cleanup.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
