# Setup Adopts Target Guardrails Only

## Should Trigger

Yes.

## Prompt

Run Architecture Compass setup for an existing repository. Inventory the whole
catalog, then produce the target adoption matrix. Do not copy Architecture
Compass's own runtime workflow rules into the target repository's ADR set.

## Deterministic Assertions

- contains: Scope: target-repository
- contains: Adoptable: true
- contains: AC-ADR-005
- contains: AC-ADR-025
- not_contains: Adopt AC-ADR-001
- not_contains: Adopt AC-ADR-002
- not_contains: Adopt AC-ADR-003
- not_contains: Adopt AC-ADR-004

## Expected Behavior

- The catalog inventory may identify AC-ADR-001..004 as skill-runtime controls.
- Only ADRs with `Scope: target-repository` and `Adoptable: true` enter the
  `adopt`, `adapt`, `defer`, or `reject` matrix.
- Do not turn internal action, collaboration, or evidence workflow rules into
  target-repository architecture decisions.
- Preserve rationales and revisit triggers for every deferred or rejected
  adoptable guardrail.
