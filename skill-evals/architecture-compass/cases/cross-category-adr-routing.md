# Cross-Category ADR Routing

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to plan a security-sensitive Next.js account deletion
flow. It uses a Server Action, changes retained personal data, needs automated
boundary tests, and must ship reversibly. Select the minimum cross-category ADR
set, identify unresolved durable decisions, and do not implement it.

## Deterministic Assertions

- contains: AC-ADR-010
- contains: AC-ADR-018
- contains: AC-ADR-019
- contains: AC-ADR-020
- contains: AC-ADR-022
- contains: Architecture decision status: pending
- contains: Execution status: not requested

## Expected Behavior

- Route through catalog `Applies when`, scope, category, and tag metadata rather
  than reading one category or the whole library.
- Use Long variants for mutation, validation, security/privacy, retention, test,
  and reversible-delivery constraints.
- Use Guides only where implementation-specific help is needed.
- Keep unresolved deletion, retention, authorization, and rollback choices in a
  read-only decision phase.
