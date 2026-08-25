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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-25
Gist: Give every writing agent one exclusive external worktree while keeping the canonical checkout read-only.

Variants: [Short](0029-keep-linked-worktrees-inside-the-repository.short.md) · [Long, canonical](0029-keep-linked-worktrees-inside-the-repository.long.md) · **Guide**

This guide is non-normative. [Long](0029-keep-linked-worktrees-inside-the-repository.long.md) is authoritative.

## How to apply

```text
<root>/
├── agent-skills/
└── .worktrees/
    └── agent-skills-worktrees/
        ├── DEV-123/            # ticket/Symphony
        ├── DEV-124/            # sub-ticket
        └── feat/
            └── play-around/    # manual branch feat/play-around
```

- Start a writing agent with its assigned worktree as `cwd`; that worktree is its write scope.
- Keep `agent-skills/` and sibling worktrees read-only to that writer by default.
- Use `git worktree list --porcelain` as the authoritative branch/worktree mapping.
- Keep ticket/sub-ticket worktrees as siblings; hierarchy stays in the task system.
- For Codex, prefer `sandbox_mode = "workspace-write"` with the assigned worktree as `cwd`. Do not make the shared worktree root a common `writable_root`.
- If linked-worktree Git metadata needs extra host permissions, grant the minimum metadata access rather than widening source-tree writes.

## Enforcement

- `AGENTS.md` references this ADR and records the current enforcement state.
- Re-check host configuration only when that state is missing, stale, or the host changes.
- Apply fixed protections when authorized; otherwise provide exact setup instructions through the available user or orchestration surface.

## Verification

- One branch is checked out per linked worktree.
- A writer can modify only its assigned worktree by default.
- Concurrent writers use different worktrees.
- Manual branch paths and ticket identifiers map to the intended directories.
- Sub-ticket worktrees are not nested below parent worktrees.

## Revisit

Revisit if first-class agent workspace isolation makes linked Git worktrees unnecessary.
