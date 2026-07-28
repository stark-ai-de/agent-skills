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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep one Architecture Compass workflow and adapt only host collaboration controls.

Variants: **Short** · [Long, canonical](0024-keep-architecture-compass-portable-with-host-mode-adapters.long.md) · [Guide](0024-keep-architecture-compass-portable-with-host-mode-adapters.guide.md)

## Decision

We will keep `architecture-compass` as one portable workflow skill, use capability-detected host adapters for planning, review, permissions, and agent-instruction conventions, and split runtime variants only when their evidence or output contracts materially diverge.

## Context

- [ADR-0021](0021-place-portable-skills-in-workflow-categories.short.md) ([Long, canonical](0021-place-portable-skills-in-workflow-categories.long.md) · [Guide](0021-place-portable-skills-in-workflow-categories.guide.md)) places portable workflows in workflow categories and rejects duplication that would drift.
- Architecture Compass uses the same ADR evidence, rule maps, implementation slices, and validation contract across agents.

## Consequences

- Good: Architecture behavior stays consistent while native host controls remain usable.
- Tradeoff: Adapter guidance and runtime proof must be maintained as hosts evolve.
- Risk: Capability drift can make a transition instruction stale.
