# AC-ADR-002: Select Actions, Resolve Authority, and Record Guardrail Adoption

ID: AC-ADR-002
Title: Select Actions, Resolve Authority, and Record Guardrail Adoption
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, authority, adoption, conflict-resolution
Applies when: Architecture Compass classifies a request, combines repository evidence, or proposes bundled guardrails.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Separate operational authority from architecture authority and record every applicable guardrail disposition.

Variants: [Short](ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.short.md) · **Long, canonical** · [Guide](ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.guide.md)

## Context

Architecture work fails when an agent treats repository architecture, task authorization, host permissions, current code, and bundled recommendations as one precedence list. A higher-ranked architecture source cannot grant a write, while an instruction that permits a write does not make a conflicting architecture correct. Setup also becomes incomplete when incompatible or currently irrelevant guardrails disappear without an explicit disposition.

## Decision

Architecture Compass exposes two user-facing actions:

- `setup` installs or refreshes ADR governance and agent-facing decision routing.
- `refactor` audits, reviews, places, implements, or aligns code under applicable decisions.

Normalize `setup` to exactly one internal mode: `setup-existing-repo` or `setup-new-repo`. Normalize `refactor` to exactly one internal mode: `audit`, `refactor`, `new-implementation`, `pr-review`, `docs-sync`, or `stack-deviation`. `new-repo-bootstrap` is accepted only as a deprecated compatibility alias for `setup-new-repo` and is normalized before reporting.

Before mutation, the skill classifies the work as one of four execution routes:

- a decision route for unresolved durable choices, broad multi-boundary changes, or disputed adoption;
- direct execution for a fully specified, approved, bounded slice;
- a read-only audit that reports drift without implementing fixes;
- a read-only review that prefers the host review surface and reports findings without changing the reviewed state.

Authority is resolved on two independent axes:

1. Operational authority determines what actions are allowed. System and host constraints, current user authorization, repository agent instructions, permissions, read-only boundaries, approved paths, and the requested evidence contract constrain execution.
2. Architecture authority determines what outcome is correct. Applicable accepted and superseding target-repository ADRs lead, followed by canonical architecture and stack documentation, ADR-linked approved examples, consistent current implementation, adoptable bundled guardrails, and general framework defaults.

A user request to change an accepted decision authorizes evaluating or superseding it; it does not silently erase the existing ADR before the new decision is accepted. Safety and permission restrictions remain effective regardless of architecture authority.

During `setup`, the skill evaluates every catalog entry with `Scope: target-repository` and `Adoptable: true`. Each receives exactly one disposition:

- `adopt`: accept the canonical decision without semantic change;
- `adapt`: accept an explicitly described target-specific variant and persist that variant in the target repository's governing decision surface;
- `defer`: keep the guardrail inactive until a named owner condition or future trigger occurs;
- `reject`: decline it with explicit maintainer-confirmed rationale.

Sparse evidence or current non-applicability is not a reason to omit a candidate. Record it as `defer` with the named condition that would make the guardrail applicable; do not add a fifth disposition or silently drop it.

## Invariants

- Route classification occurs before the first mutation and is revalidated after initial repository inspection.
- Planning capability and read-only enforcement are separate observations; neither is inferred from the other.
- An audit or review does not become an implementation request because a fix appears obvious.
- Current code that contradicts an accepted ADR is drift, not a replacement decision.
- Bundled guardrails never override accepted target decisions without an explicit adoption or supersession decision.
- Every `adapt`, `defer`, and `reject` records evidence and the changed rule, trigger, or rationale respectively.
- The final report identifies applicable ADRs and unresolved conflicts.

## Conflict resolution

An operational restriction always limits execution. Within architecture evidence, the most specific applicable accepted or superseding target ADR governs. If operational instructions require an outcome that conflicts with accepted architecture, or two applicable accepted decisions conflict, stop the affected implementation, identify both sources and impact, and request a bounded decision or successor ADR. Do not invent a compromise or interpret permission to edit as permission to violate the decision.

## Failure handling

If route, permission, repository identity, governing ADR, target paths, or adoption scope is indeterminate, remain non-mutating for the affected work and report the missing evidence. If repository inspection changes the preliminary route, resolve the newly required host controls before continuing. If an adoption record cannot distinguish `adapt` from `reject`, treat it as unresolved rather than guessing.

## Acceptance criteria

- Every run reports one user-facing action and one normalized internal mode.
- The selected execution route matches the request and current repository evidence.
- Operational permission and architecture correctness are reported separately.
- Setup evaluates every applicable adoptable target-repository guardrail exactly once.
- Each disposition has the required evidence, target rule, trigger, or confirmed rationale.
- Conflicts stop only the affected implementation and are not hidden by precedence wording.

## Consequences

This model requires explicit classification and adoption records. It prevents bundled preferences from masquerading as repository decisions, prevents ADRs from granting unauthorized writes, and makes omissions and conflicts reviewable.
