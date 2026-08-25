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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-25
Gist: Give every writing agent one exclusive external worktree while keeping the canonical checkout read-only.

Variants: [Short](ac-adr-054-isolate-agent-writes-in-external-git-worktrees.short.md) · **Long, canonical** · [Guide](ac-adr-054-isolate-agent-writes-in-external-git-worktrees.guide.md)

## Context

Agent-driven repositories may be changed through a single manual session, a lead delegating to subagents, peer agents, CI workers, or ticket-driven orchestrators such as OpenAI Symphony. The topology may change, but concurrent writers need the same filesystem and Git isolation. Putting linked worktrees below the canonical checkout also makes repository scanners, IDE watchers, build inputs, and recursive agent searches more likely to traverse unrelated working copies.

A worktree therefore represents a writable work unit, not an agent identity. Agent processes may restart or hand off while the branch/worktree remains stable. Read visibility into other worktrees can help coordination, but it must not imply write ownership.

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

## Invariants

- Worktree location and ownership do not depend on lead/worker, peer, or orchestrator topology.
- A writable worktree has one active writer at a time.
- Read access to the canonical checkout or sibling worktrees does not grant write access.
- Parent/sub-ticket relationships live in the task system, not as nested Git worktrees.
- `git worktree list --porcelain` is authoritative for worktree/branch association.
- Host configuration must not make the shared worktree root writable merely to enable one worker.

## Enforcement

Repository agent instructions reference the adopted ADR and record which protections are already enforced. On first adoption or when that recorded state becomes stale, an agent checks host capabilities and applies fixed protections it is authorized to change. It then updates the instruction surface with the resulting state so later agents do not repeat the full enforcement pass.

A worker is launched with its assigned worktree as the working directory. Host-specific sandbox or workspace-write controls should grant repository writes only there. The canonical checkout and sibling worktrees may be exposed read-only when cross-agent awareness is useful. If Git requires access to shared linked-worktree metadata, grant only the minimum host-specific metadata access needed rather than widening source-tree write scope.

If the agent cannot apply required settings, it provides exact user-facing setup steps. An orchestrator may surface those steps through its task or ticket integration when that capability exists.

## Consequences

- Benefit: Manual sessions, lead/subagent systems, peer agents, and Symphony can share one isolation contract.
- Benefit: The project root stays free of nested linked checkouts and their scanner/watcher side effects.
- Benefit: Parallel work is inspectable without allowing cross-worktree mutation.
- Tradeoff: Launchers and IDEs must open the assigned external worktree rather than assuming the canonical checkout is writable.
- Tradeoff: Host-specific sandbox configuration may be needed for linked-worktree Git metadata.
- Risk: Broad writable-root configuration can defeat isolation; shared roots therefore remain read-only to workers.

## Alternatives

- Rejected: write in the canonical checkout by default. Concurrent and autonomous writes lose isolation.
- Rejected: `<repo>/.worktrees/`. Nested working copies increase recursive scanner, watcher, and tooling coupling.
- Rejected: ungrouped sibling worktrees. They are valid Git worktrees but make a busy development root harder to inventory.
- Rejected: one shared writable worktree for several agents. Branch isolation does not protect simultaneous writers inside one filesystem tree.
