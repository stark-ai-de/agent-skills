# AC-ADR-054: Isolate Agent Writes in External Git Worktrees

ID: AC-ADR-054
Title: Isolate Agent Writes in External Git Worktrees
Status: Accepted
Date: 2026-08-25
Owner: stark-ai-de
Scope: target-repository
Category: repository-architecture
Tags: agents, git, multi-agent, worktree, workspace
Applies when: An agent may modify repository state, whether manually, through delegation, or through an orchestrator.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-25
Gist: Give every writing agent one exclusive external worktree while keeping the canonical checkout read-only.

Variants: **Short** · [Long, canonical](ac-adr-054-isolate-agent-writes-in-external-git-worktrees.long.md) · [Guide](ac-adr-054-isolate-agent-writes-in-external-git-worktrees.guide.md)

## Context and Problem Statement

- Manual agents, delegated agents, and orchestrators may write concurrently.
- Lead-agent, peer-agent, and ticket-driven setups such as OpenAI Symphony need the same isolation model.
- The canonical checkout and parallel worktrees need clear write ownership.

## Considered Options

- Write directly in the canonical checkout.
- Keep worktrees inside the repository.
- Keep worktrees as ungrouped sibling directories.
- Group external worktrees under one repository-specific root.

## Decision Outcome

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

## Decision summary

Use one external, repository-scoped worktree per writing work unit; keep the canonical checkout and sibling worktrees read-only to that writer by default.
