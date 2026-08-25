# ADR-0029: Isolate Agent Writes in External Git Worktrees

ID: ADR-0029
Title: Isolate Agent Writes in External Git Worktrees
Status: Accepted
Date: 2026-08-25
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: agents, git, multi-agent, worktree, workspace
Applies when: An agent may modify repository state, whether manually, through delegation, or through an orchestrator.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-25
Gist: Give every writing agent one exclusive external worktree while keeping the canonical checkout read-only.

Variants: **Short** · [Long, canonical](0029-keep-linked-worktrees-inside-the-repository.long.md) · [Guide](0029-keep-linked-worktrees-inside-the-repository.guide.md)

## Decision

Chosen option: **isolated external Git worktrees under a repository-specific worktree root**.

- Repository: `<root>/<repo>/`; worktrees: `<root>/.worktrees/<repo>-worktrees/`.
- Any agent that writes repository state MUST use one assigned worktree as its working directory and write scope.
- The canonical checkout is read-only for agents by default.
- One worktree maps to one branch and has at most one active writer; concurrent writers use different worktrees.
- Other worktrees MAY be visible read-only for cross-agent awareness; visibility never grants write ownership.
- Manual worktrees use the branch name as their relative path, for example `feat/play-around/`.
- Ticket-driven worktrees use the ticket identifier, for example `DEV-123/`; their branches SHOULD include that identifier.
- Sub-tickets use separate sibling worktrees, never nested worktrees. A coordination-only parent ticket needs no worktree.
- Direct writes to the canonical checkout require an explicit override.
- The setup SHOULD enforce these rules through host configuration where possible and record the enforced state in the repository's agent instructions. If an agent cannot apply required settings, it MUST provide concrete setup guidance through the available user or orchestration surface.

## Context

- Manual, delegated, peer, and Symphony agents need one topology-neutral isolation model.
- Nested repository worktrees increase scanner, watcher, and tooling coupling.
- Read visibility across worktrees can aid coordination without granting write ownership.

## Consequences

- Good: writers are isolated while parallel WIP can remain inspectable read-only.
- Good: the canonical project root stays free of nested working copies.
- Tradeoff: launchers and IDEs must open the assigned external worktree.
- Risk: broad writable-root configuration can defeat the isolation model.
