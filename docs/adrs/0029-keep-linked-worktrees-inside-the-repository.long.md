# ADR-0029: Use Worktrunk for Isolated Agent Worktrees

ID: ADR-0029
Title: Use Worktrunk for Isolated Agent Worktrees
Status: Accepted
Date: 2026-08-25
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: agents, git, multi-agent, worktree, worktrunk, harness, workspace
Applies when: An agent may modify repository state, whether manually, through delegation, or through an orchestrator.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-20
Gist: Use Worktrunk for external agent worktrees and align the harness without broadening write authority.

Variants: [Short](0029-keep-linked-worktrees-inside-the-repository.short.md) · **Long, canonical** · [Guide](0029-keep-linked-worktrees-inside-the-repository.guide.md)

## Decision

Chosen option: **Worktrunk-managed external Git worktrees with exclusive write ownership and an initial harness alignment check**.

- Any agent that writes repository state MUST use one assigned external worktree as its working directory and write scope. The canonical checkout and other worktrees are read-only to that writer by default; direct canonical-checkout writes require an explicit override. Each worktree has at most one active writer.
- When a usable Worktrunk CLI is installed, agents MUST use it for authorized worktree management without another tool-selection question. Reuse suitable existing worktrees, including host-created ones; ordinary Git inspection remains valid identity evidence.
- If Worktrunk is missing, briefly pause the task, explain its benefit and offer installation guidance, then await the user's answer. Never install automatically. After installation, recheck availability. On explicit refusal, resume with existing Git or host tools under the same isolation rules and do not repeat the offer during that task. Silence is not refusal. An unusable installation requires reporting the concrete failure and agreeing on repair or fallback.
- New Worktrunk worktrees follow the existing path configuration, otherwise Worktrunk's default. Paths MUST remain outside the canonical checkout and other worktrees. The Git/host fallback retains an existing compliant external layout. No fixed shared directory name is required; do not automatically move or recreate existing worktrees. Resolve conflicting path settings before the affected write.
- Determine worktree identity from Git metadata, including its branch or detached HEAD, rather than its directory name. Ticket-driven branches SHOULD include the ticket identifier. Writing sub-tickets use separate, non-nested worktrees; a coordination-only parent needs no checkout.
- Before the first write in a new session/worktree context, perform a bounded read-only comparison of the assigned worktree, actual working directory, Worktrunk path settings and the harness's effective workspace/write boundaries. Distinguish stored configuration, active settings and unverified enforcement; never probe permissions by attempting a write.
- A matching setup proceeds without another prompt. Optional improvements may be declined without blocking work. An actual policy conflict pauses only dependent writes. Unknown technical enforcement is neither proof of compliance nor an automatic task-wide stop; an action whose required permission is unresolved remains paused.
- For necessary or useful harness changes, prepare the current state, target state and smallest concrete change, including its scope and restart needs. Offer manual steps or supported automation within existing or explicit authorization. Respect the configuration owner and authoritative source, back up user configuration before replacement, preserve unrelated settings and verify effective adoption after any required restart. Never broaden shared source-tree write access merely to make a worktree operation succeed.
- Reuse current alignment evidence; repeat full inspection only after relevant host, worktree, configuration or policy changes, or when evidence is stale. Record generic enforcement status in repository instructions while keeping private paths and settings in local evidence. Worktrunk usage grants no additional hook trust, configuration, Git-index, commit, merge, deletion or publication authority.

## Why

Agents may work manually, sequentially, through delegation or through an orchestrator. Their topology does not change the need for exclusive filesystem ownership. External worktrees keep unrelated working copies out of repository scanners, watchers and build inputs.

A fixed directory convention duplicates a worktree manager's configuration and can reject otherwise suitable host-created worktrees. Worktrunk supplies a common management interface while Git remains the source of worktree identity. Neither a directory template nor an installed CLI enforces the harness's permissions: the actual working directory and effective write boundaries must agree with the adopted policy.

## Options

- Chosen: Worktrunk's configured/default external layout with exclusive ownership and bounded harness alignment.
- Rejected: a mandatory repository-specific directory template. It adds setup work and conflicts with compatible existing layouts without enforcing permissions.
- Rejected: automatic installation or silently falling back when the tool is missing. The user chooses installation or continuation.
- Rejected: nested worktrees, a shared writable checkout or canonical-checkout writes by default. These undermine isolation or couple unrelated scans/builds.
- Rejected: an exhaustive configuration audit on every prompt. Reuse current evidence and inspect material changes.

## Consequences

- Benefit: Existing Worktrunk preferences and suitable host-created worktrees remain usable without a layout migration.
- Benefit: One management interface and a concrete harness comparison reduce conflicting agent instructions.
- Benefit: Installation refusal preserves a usable Git/host path with the same ownership rules.
- Tradeoff: Availability, hook trust and configuration adoption remain separate from tool installation.
- Tradeoff: Hosts that cannot expose or enforce narrow boundaries require truthful limitations and concrete setup guidance.
- Risk: Treating configuration files as active permissions or granting a shared writable root can defeat isolation.
