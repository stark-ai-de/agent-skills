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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Give linked worktrees one ignored, repository-local home.

Variants: [Short](0029-keep-linked-worktrees-inside-the-repository.short.md) · **Long, canonical** · [Guide](0029-keep-linked-worktrees-inside-the-repository.guide.md)

## Decision

We will create future linked Git worktrees only under `<repo>/.worktrees/<name>` and ignore `/.worktrees/` from repository content.

## Why

- A single local root makes active worktrees easier to inventory before releases.
- Repository-local placement avoids forgotten sibling and temporary-directory worktrees.
- Ignoring the root prevents linked checkout contents from entering the public catalog.

## Options

- Chosen: ignored repository-local `.worktrees/` root.
- Rejected: sibling or `/tmp` worktrees, because they are easier to overlook.

## Consequences

- Good: Cleanup and release audits have one predictable search boundary.
- Tradeoff: Existing external worktrees remain until explicitly retired.
- Risk: Tools must tolerate a worktree nested below the main checkout.

## Follow-up

- Move or recreate worktrees under `.worktrees/` only during an explicitly approved cleanup.
