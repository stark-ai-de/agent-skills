# ADR-0029: Keep linked worktrees inside the repository

Status: Accepted
Date: 2026-07-16
Owner: stark-ai-de
Gist: Give linked worktrees one ignored, repository-local home.

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
