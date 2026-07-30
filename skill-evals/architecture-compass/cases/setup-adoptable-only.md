# Setup Adopts Target Guardrails Only

## Should Trigger

Yes.

## Prompt

The user explicitly requested exhaustive `setup/complete` coverage for an
existing repository. Inventory the catalog, then produce the target adoption
matrix. Do not copy Architecture Compass's own runtime workflow rules into the
target repository's ADR set.

## Deterministic Assertions

- contains: Scope: target-repository
- contains: Adoptable: true
- contains: Setup coverage: complete
- contains: Catalog candidates: 35
- contains: Selected + not selected: 35
- contains: one row per candidate
- contains: adopt
- contains: adapt
- contains: defer
- contains: reject
- contains: AC-ADR-005
- contains: AC-ADR-025
- contains: AC-ADR-027
- contains: AC-ADR-041
- contains: AC-ADR-049
- contains: Skill-runtime rows: excluded
- contains: AC-ADR-046: excluded from target matrix
- not_contains: Adopt AC-ADR-001
- not_contains: Adopt AC-ADR-002
- not_contains: Adopt AC-ADR-003
- not_contains: Adopt AC-ADR-004
- not_contains: Adopt AC-ADR-036
- not_contains: Adopt AC-ADR-039
- not_contains: Adopt AC-ADR-044
- not_contains: Adopt AC-ADR-045
- not_contains: Adopt AC-ADR-046
- not_contains: Adopt AC-ADR-047
- not_contains: Adopt AC-ADR-048

## Expected Behavior

- Select `setup/complete` because the user explicitly requested exhaustive
  coverage.
- Identify the current skill-runtime controls, including AC-ADR-046, as excluded
  from the target adoption matrix.
- Put exactly one row for each of the 35 current ADRs with
  `Scope: target-repository` and `Adoptable: true` into the `adopt`, `adapt`,
  `defer`, or `reject` matrix.
- Reconcile the matrix totals: selected (`adopt` plus `adapt`) and not selected
  (`defer` plus `reject`) must sum to `Catalog candidates: 35`, with no duplicate
  or unclassified candidate.
- Do not turn internal action, collaboration, or evidence workflow rules into
  target-repository architecture decisions.
- Preserve rationales and revisit triggers for every deferred or rejected
  adoptable guardrail.
