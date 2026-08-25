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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-25
Gist: Give every writing agent one exclusive external worktree while keeping the canonical checkout read-only.

Variants: [Short](ac-adr-054-isolate-agent-writes-in-external-git-worktrees.short.md) · [Long, canonical](ac-adr-054-isolate-agent-writes-in-external-git-worktrees.long.md) · **Guide**

This guide is non-normative. The Long variant is authoritative.

## Layout

```text
<root>/
├── <repo>/
└── .worktrees/
    └── <repo>-worktrees/
        ├── DEV-123/            # ticket/Symphony
        ├── DEV-124/            # sub-ticket; sibling, not nested
        └── feat/
            └── play-around/    # manual branch feat/play-around
```

Example mappings:

```text
DEV-123/         -> feat/DEV-123-auth
DEV-124/         -> test/DEV-124-auth-tests
feat/play-around -> feat/play-around
```

A coordination-only parent ticket does not need a worktree. Each writing sub-ticket gets its own sibling worktree.

## Agent access

- Start each writing agent with its assigned worktree as `cwd`.
- Treat that worktree as the agent's repository write scope.
- Keep the canonical checkout and sibling worktrees read-only to that agent by default.
- Expose sibling worktrees read-only only when cross-agent WIP inspection is useful.
- Use `git worktree list --porcelain` instead of inferring branch ownership from paths.

## Codex example

Prefer a per-session working directory over a broad writable worktree root:

```toml
sandbox_mode = "workspace-write"
```

Launch the worker from its assigned worktree. Do **not** configure the shared `<root>/.worktrees/<repo>-worktrees/` directory as a writable root for every worker; that would allow cross-worktree writes. If the host sandbox blocks Git's linked-worktree metadata, add only the minimum metadata permission supported by that host.

## Enforcement workflow

1. Reference the adopted ADR from the repository's agent instruction file (`AGENTS.md`, `CONTEXT.md`, or equivalent).
2. Check once which rules the current host can enforce through fixed configuration.
3. Apply permitted settings and record the resulting enforcement state in the instruction file.
4. Re-check only when the recorded state is absent, stale, or the host changes.
5. If settings cannot be changed, provide exact setup steps through the available user surface; an orchestrator may post them to its ticket when supported.

## Verification

- `git worktree list --porcelain` shows one branch per linked worktree.
- A writing worker can modify its own worktree but not the canonical checkout or sibling worktrees.
- Two concurrent writers use different worktrees.
- Manual branch paths and ticket identifiers resolve to the intended directories.
- Sub-ticket worktrees are siblings rather than nested below a parent worktree.

## Decision lineage

- `generalizes`: [ADR-0029](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0029-keep-linked-worktrees-inside-the-repository.long.md).

## Current sources

- [Git worktree documentation](https://git-scm.com/docs/git-worktree)
- [OpenAI Codex configuration reference](https://developers.openai.com/codex/config-reference/)
- [OpenAI Symphony specification](https://github.com/openai/symphony/blob/main/SPEC.md)

## Revisit

Revisit when a supported host provides first-class multi-agent workspace ownership that can enforce equivalent isolation without linked Git worktrees.
