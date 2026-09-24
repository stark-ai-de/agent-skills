# ADR-0056: Assess cleanup after verified merges

ID: ADR-0056
Title: Assess cleanup after verified merges
Status: Proposed
Date: 2026-09-24
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: merge, cleanup, tests, lifecycle, architecture-compass
Applies when: An agent observes a verified merge during repository work.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-24
Gist: Assess cleanup after verified merges and promote the policy through Architecture Compass after acceptance.

Variants: [Short](0056-assess-cleanup-after-verified-merges.short.md) · [Long, canonical](0056-assess-cleanup-after-verified-merges.long.md) · **Guide**

This guide is non-normative. [Long](0056-assess-cleanup-after-verified-merges.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

This is implementation guidance for a proposed policy, not a command to change active repositories today. Use the [proposal specification](../specs/architecture-compass-post-merge-cleanup-spec.md) for the original request and acceptance scenarios.

After acceptance and delivery:

1. When a merge is reported or observed during an authorized task, verify its repository, target and actual integrated identity through the available authoritative source. A merge-queue entry, approval or closed-but-unmerged PR is insufficient. If verification is unavailable, report that limit.
2. Inspect the current target state and the change's immediate dependencies. Look for completed temporary code, exclusively obsolete tests and fixtures, unneeded helper scripts, feature flags, configuration, generated artifacts and stale instructions. Avoid expanding into unrelated refactoring.
3. Check each material candidate's callers, operating contracts and remaining protection. Keep uncertain cases unresolved, and defer cases that depend on deployment, consumer migration or rollback closure.
4. Put a concise result in an existing task or review surface. For a real finding, record the candidate, ended purpose, evidence checked, remaining protection and disposition. Here `remove` means justified for removal within authorized scope; the assessment alone does not authorize execution. `defer` identifies a concrete recheck condition.
5. Execute only already-authorized bounded cleanup in an assigned worktree and validate the affected contracts. Reuse an existing relevant follow-up instead of opening duplicates. References to important historical decisions or costly evidence can remain pinned in Git while obsolete executable fixtures are removed.
6. Reuse the assessment for the same merged subject and materially unchanged relevant state. Reassess invalidated findings, a revert or a satisfied deferral condition. A cleanup PR's own merge receives the same bounded check; a no-finding result ends the chain.

## Verification

Future qualification should exercise the acceptance scenarios in the proposal specification with fixtures and agent-behavior evaluation. Structural checks alone cannot establish that an agent notices an observed merge or follows the local instruction.

Test preservation of retained adapters, rerunnable cleanup jobs, active security invariants and rollback requirements; also test unavailable evidence, duplicate notifications and no-finding completion. Select proof from changed contracts under ADR-0041 rather than adding a permanent generic cleanup harness by default.

Keep proposal validation, implemented provider behavior, published skill contents, effective target adoption and actual post-merge execution as separate evidence stages. This proposal PR demonstrates only that the idea is documented consistently and reviewably.

## Current references

- [Proposal specification](../specs/architecture-compass-post-merge-cleanup-spec.md): scope, evaluation, delivery and acceptance.
- [ADR-0029](0029-keep-linked-worktrees-inside-the-repository.short.md) ([Long, canonical](0029-keep-linked-worktrees-inside-the-repository.long.md) · [Guide](0029-keep-linked-worktrees-inside-the-repository.guide.md)): isolated writes and protected concurrent work.
- [ADR-0039](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.short.md) ([Long, canonical](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.long.md) · [Guide](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.guide.md)): deliberate public policy promotion.
- [ADR-0041](0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)): owning-boundary validation and evidence reuse.
- [Architecture Compass](../../skills/engineering-workflows/architecture-compass/SKILL.md): existing setup, audit and execution boundaries.

## Revisit

While this record is Proposed, revise it through review. If an accepted decision later changes, use a successor ADR and reciprocal supersession metadata; do not rewrite accepted history. Revisit if measured assessment cost, missed cleanup, incorrect removals or host limitations call for a different trigger or evidence model.
