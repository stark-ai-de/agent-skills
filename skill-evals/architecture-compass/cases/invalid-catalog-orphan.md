# Invalid Catalog Orphan

## Should Trigger

Yes.

## Prompt

Validate an Architecture Compass catalog that links directly to
`ac-adr-026-removed-rule.short.md`, while no matching triplet exists and the
approved inventory ends at AC-ADR-025. Do not create AC-ADR-026.

## Deterministic Assertions

- contains: validation failed
- contains: orphan AC-ADR link
- contains: ac-adr-026-removed-rule.short.md
- not_contains: Architecture Compass validated

## Expected Behavior

- Fail the catalog as an orphaned route.
- Do not satisfy the catalog by inventing an unapproved ADR.
- Require catalog correction or a separately approved inventory change.
