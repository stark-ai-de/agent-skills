# ADR draft: Coordinate product planning through intent-bound skill contracts

ID: Unallocated provider draft
Title: Coordinate product planning through intent-bound skill contracts
Status: Proposed
Date: 2026-10-09
Owner: stark-ai-de maintainers
Scope: target-repository
Category: engineering-workflow
Tags: product-planning, skill-routing, vertical-slices, autonomy, evidence
Applies when: A repository opts into coordinated incremental product or feature planning.
Adoptable: true
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: Not qualified by host behavior tests
Gist: The main agent selects the next missing planning capability, reuses current artifacts, and stops at an authorized, verifiable product-planning outcome.
Variant: Short

Variants: **Short** · [Long](intent-bound-product-planning.long.md) · [Guide](intent-bound-product-planning.guide.md)

## Decision

Architecture Zoom owns product goals, readable architecture and complete increments. Architecture Compass owns module contracts and architecture governance. Codex Spec Interviewer owns the next bounded implementation specification. The active main agent coordinates their input/output contracts; there is no fourth required skill or unconditional three-step chain.

## Invariants

- Preserve complete agreed functional breadth while refining only decision-relevant details.
- Separate architecture structure from delivery order. Each release closes its own user promise without a future release.
- Reuse current artifacts, answers and actual approvals; enter at the first missing result.
- Keep one coordinator and one authoritative definition per contract. Specialists return scoped results rather than recursively starting the whole workflow.
- Keep adoption, availability, loading, qualification and enforced permissions distinct.
- Explicit skill preselection may support later routing only where governing runtime policy and the actual approval allow it. Installation, writes, implementation and external effects retain separate gates.
- Propagate material changes to affected decisions/evidence; do not silently reuse stale conclusions or restart unrelated work.
- Planned tests and model reviews are not runtime proof. Self-written approval fields grant no rights.
- Bounded review and satisfied completion criteria end the task; optional improvements stay outside scope.

## Proposal boundary

This is not an active provider or target-repository decision. It does not override AC-ADR-039, accept a local ADR, install skills, add an Architecture Compass mode, or authorize implementation. Allocate identity and reconcile policy before library integration; see the [integration spec](../architecture-zoom-orchestration-spec.md).
