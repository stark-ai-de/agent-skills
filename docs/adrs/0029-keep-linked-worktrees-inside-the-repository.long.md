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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-25
Gist: Give every writing agent one exclusive external worktree while keeping the canonical checkout read-only.

Variants: [Short](0029-keep-linked-worktrees-inside-the-repository.short.md) · **Long, canonical** · [Guide](0029-keep-linked-worktrees-inside-the-repository.guide.md)

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

## Why

- The rule works for manual sessions, lead/subagent setups, peer agents, CI workers, and ticket-driven orchestrators without making one topology authoritative.
- External repository-scoped worktree roots avoid nesting complete working copies below the canonical checkout.
- Exclusive write ownership prevents parallel agents from mutating the same filesystem tree while optional read visibility preserves cross-agent awareness.
- Branch/worktree identity survives agent restarts and handoffs better than agent-owned temporary directories.

## Options

- Chosen: `<root>/.worktrees/<repo>-worktrees/` with one exclusive worktree per writing work unit.
- Rejected: direct canonical-checkout writes by default, because they remove isolation.
- Rejected: `<repo>/.worktrees/`, because nested working copies increase recursive scanner, watcher, and tooling coupling.
- Rejected: ungrouped sibling worktrees, because they make a busy development root harder to inventory.
- Rejected: shared writable worktrees, because branch isolation does not prevent concurrent filesystem writes.

## Consequences

- Good: the same contract supports manual, delegated, peer, and Symphony execution.
- Good: parallel work is inspectable without granting cross-worktree mutation.
- Good: the canonical project root stays free of nested working copies.
- Tradeoff: launchers and IDEs must open the assigned external worktree.
- Tradeoff: host-specific sandbox configuration may be needed for linked-worktree Git metadata.
- Risk: broad writable-root configuration can defeat the isolation model.
