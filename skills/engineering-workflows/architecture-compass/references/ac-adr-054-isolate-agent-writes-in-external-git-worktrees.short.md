# AC-ADR-054: Use Worktrunk for Isolated Agent Worktrees

ID: AC-ADR-054
Title: Use Worktrunk for Isolated Agent Worktrees
Status: Accepted
Date: 2026-08-25
Owner: stark-ai-de
Scope: target-repository
Category: repository-architecture
Tags: agents, git, multi-agent, worktree, worktrunk, harness, workspace
Applies when: An agent may modify repository state, whether manually, through delegation, or through an orchestrator.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-10-20
Gist: Use Worktrunk for external agent worktrees and align the harness without broadening write authority.

Variants: **Short** · [Long, canonical](ac-adr-054-isolate-agent-writes-in-external-git-worktrees.long.md) · [Guide](ac-adr-054-isolate-agent-writes-in-external-git-worktrees.guide.md)

## Context and Problem Statement

Agents may work manually, sequentially, through delegation or through an orchestrator. Their topology does not change the need for exclusive filesystem ownership. External worktrees keep unrelated working copies out of repository scanners, watchers and build inputs.

A fixed directory convention duplicates a worktree manager's configuration and can reject otherwise suitable host-created worktrees. Worktrunk supplies a common management interface while Git remains the source of worktree identity. Neither a directory template nor an installed CLI enforces the harness's permissions: the actual working directory and effective write boundaries must agree with the adopted policy.

## Considered Options

- Chosen: Worktrunk's configured/default external layout with exclusive ownership and bounded harness alignment.
- Rejected: a mandatory repository-specific directory template. It adds setup work and conflicts with compatible existing layouts without enforcing permissions.
- Rejected: automatic installation or silently falling back when the tool is missing. The user chooses installation or continuation.
- Rejected: nested worktrees, a shared writable checkout or canonical-checkout writes by default. These undermine isolation or couple unrelated scans/builds.
- Rejected: an exhaustive configuration audit on every prompt. Reuse current evidence and inspect material changes.

## Decision Outcome

Chosen option: **Worktrunk-managed external Git worktrees with exclusive write ownership and an initial harness alignment check**.

## Decision summary

Use installed Worktrunk for authorized external worktree management and reuse suitable existing worktrees. If it is missing, pause, offer installation guidance and wait; never install automatically. Recheck after installation; explicit refusal resumes the existing compliant Git/host workflow without repeated offers for that task. Silence is not refusal. Report an unusable installation and agree on repair or fallback. Worktrunk path configuration, otherwise its default, replaces a fixed directory convention while external placement and one active writer per assigned worktree remain mandatory.

Before the first write in a new session/worktree context, compare actual workspace and effective harness boundaries with the adopted policy, separating stored, active and unverified settings. Matching setups proceed; optional improvements can be declined; concrete conflicts pause only dependent writes. Prepare minimal manual or authorized automated remedies and verify adoption after any restart. Do not probe by writing, move existing worktrees automatically, broaden shared write access or infer extra authority from tool availability. Reuse current evidence and recheck material changes.
