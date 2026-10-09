# AC-ADR-067: Coordinate Product Planning Through Intent-Bound Skill Contracts

ID: AC-ADR-067
Title: Coordinate Product Planning Through Intent-Bound Skill Contracts
Status: Accepted
Date: 2026-10-09
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: product-planning, skill-routing, vertical-slices, handoffs, evidence
Applies when: A repository explicitly opts into coordinated incremental product or feature planning.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-10-09
Gist: Select the next missing planning outcome while preserving product closure, canonical context and authority.

Variants: [Short](ac-adr-067-coordinate-product-planning-through-intent-bound-skill-contracts.short.md) · **Long, canonical** · [Guide](ac-adr-067-coordinate-product-planning-through-intent-bound-skill-contracts.guide.md)

## Context

Independent planning skills need explicit ownership, authority and evidence boundaries to avoid fragmented products, repeated interviews and unsafe implied actions.

## Decision

The main agent coordinates product planning through state-dependent outcome contracts rather than an unconditional sequence of skills. Architecture Zoom owns the whole-product blueprint and complete delivery increments; Architecture Compass owns module-contract review and architecture governance; Codex Spec Interviewer owns the next bounded implementation specification. Each remains independently usable. No fourth mandatory orchestrator, new Compass workflow, or implicit implementation step is introduced.

### Entry and routing

An adopting repository records its own coordination ADR, actual product/work index, selected skill identities and an observed supported instruction entrypoint. Setup proposes this decision only when incremental product/feature planning is relevant; it is not added to the seven-decision evidence-empty foundation. Existing equivalent rules are mapped, not duplicated. Provider acceptance does not accept the target's ADR or authorize installing or invoking any skill.

The coordinator first checks the request's boundary, accepted local decisions, current artifacts and relevant revisions. Audit-only remains read-only Compass work. Brainstorming, options-only, tiny corrections and requests with a complete current spec do not force the full chain. Otherwise select Zoom when the product promise or complete delivery map is missing, Compass when a material module/architecture contract is unresolved, and the interviewer when only the selected slice needs specification. A current suitable result satisfies its gate without rerunning its skill. A new session resumes from the first genuinely missing result after checking relevant changes and current authority.

### Handoffs and ownership

One work item references the product goal, capability, release and slice; canonical artifacts and relevant revisions including uncommitted state; scope/non-goals; unchanged acceptance; known answers; assumptions; evidence and limits; genuine authorization; and the next missing result. The main agent alone integrates canonical changes. Specialists return an outcome or a criterion-linked gap, not another recursive orchestration request. Parallel independent review is optional and does not grant overlapping write scope or prove reviewer independence.

Changed contracts invalidate only affected conclusions and consumers when impact is known; unknown impact remains unresolved. Summaries never strengthen guarantees or hide decision-relevant assumptions. Reuse intact user decisions without repeated interviews, but do not infer approval from a status field, digest or an outdated artifact. Record actual authorization separately from artifact and evidence state.

### Product and architecture quality

Describe the complete agreed functional breadth without exhaustively detailing future internals. Keep architecture structure separate from delivery order. Each release closes its own bounded user promise with existing and current-release capabilities, never a future release. Tickets, technical enablers and POCs are not automatically MVPs; each enabler names its consuming outcome and stop condition. Complete missing core journeys before polishing working features unless an existential feasibility risk warrants a bounded investigation.

Modules expose coherent responsibilities and the assumptions, ownership, invariants, effects and error/recovery behavior needed for correct use. Internal details may be hidden, but composed behavior and cross-cutting constraints must remain assessable. Additional abstractions need a concrete present responsibility, risk or planned outcome. Interface size is not a substitute for cohesion, test coverage or data/security boundaries. Existing tests are not removed without adequate replacement evidence.

### Authority and termination

Use AC-ADR-068 for actual skill preselection and optional provisioning, AC-ADR-052 for supported host bindings, and existing Plan/write/approval rules for persistence. A planning request ends at its authorized planning deliverable. The interviewer never implements a feature; separately authorized outer work may continue. Setup is not permission for future code changes, publication or deployment.

A review names the criterion it finds unmet. Bound automatic corrections and targeted rechecks; after the agreed budget surface the exact unresolved decision rather than looping. Optional improvements do not reopen a complete slice or alter its acceptance. Completion means the named stage only: planned, specified, implemented, tested, deployed and actually available remain distinct. Real integration and end-to-end evidence are needed for real usability; mock-only tests or multiple LLM opinions cannot establish it.

## Invariants

- A handoff never expands the user request or host permissions.
- Local acceptance, skill selection, provisioning, persistence and implementation are separate.
- Current canonical artifacts and genuine approvals are reused without inventing evidence.
- Unknown prerequisites and incomplete user outcomes remain visible.

## Failure handling

Stop the affected action on conflict, unknown authority or failed validation; preserve independent permitted work and user state. Report exactly which outcome and proof remain missing.

## Consequences

Explicit contracts improve traceability and bounded continuation but require maintaining source/host compatibility and real evaluation evidence. Prompt instructions are not an enforcement runtime or a formal proof.
