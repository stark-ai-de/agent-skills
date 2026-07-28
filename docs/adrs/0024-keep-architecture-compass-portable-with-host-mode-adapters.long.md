# ADR-0024: Keep Architecture Compass portable with host mode adapters

ID: ADR-0024
Title: Keep Architecture Compass portable with host mode adapters
Status: Accepted
Date: 2026-07-11
Owner: stark-ai-de
Scope: repository
Category: agent-lifecycle
Tags: architecture-compass, portability, host-adapter
Applies when: Changing Architecture Compass behavior across agent hosts.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep one Architecture Compass workflow and adapt only host collaboration controls.

Variants: [Short](0024-keep-architecture-compass-portable-with-host-mode-adapters.short.md) · **Long, canonical** · [Guide](0024-keep-architecture-compass-portable-with-host-mode-adapters.guide.md)

## Decision

We will keep `architecture-compass` as one portable workflow skill, use capability-detected host adapters for planning, review, permissions, and agent-instruction conventions, and split runtime variants only when their evidence or output contracts materially diverge.

## Why

- [ADR-0021](0021-place-portable-skills-in-workflow-categories.short.md) ([Long, canonical](0021-place-portable-skills-in-workflow-categories.long.md) · [Guide](0021-place-portable-skills-in-workflow-categories.guide.md)) places portable workflows in workflow categories and rejects duplication that would drift.
- Architecture Compass uses the same ADR evidence, rule maps, implementation slices, and validation contract across agents.
- Codex, Cursor, and Claude expose different controls that fit a small adapter layer.

## Options

- Chosen: one portable core with host adapters and an explicit future split trigger.
- Rejected: three runtime copies, because they would duplicate references without different architecture outputs.
- Rejected: Codex-only planning, because it would narrow an otherwise portable workflow.

## Consequences

- Good: Architecture behavior stays consistent while native host controls remain usable.
- Tradeoff: Adapter guidance and runtime proof must be maintained as hosts evolve.
- Risk: Capability drift can make a transition instruction stale.

## Follow-up

- Add conditional routing, host-specific proof, and fallback behavior without making Plan mode mandatory for every invocation.
