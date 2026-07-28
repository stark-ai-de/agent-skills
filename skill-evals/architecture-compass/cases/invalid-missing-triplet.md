# Invalid Missing ADR Triplet

## Should Trigger

Yes.

## Prompt

Validate an Architecture Compass fixture whose catalog links
`ac-adr-009-example.short.md` and `ac-adr-009-example.long.md`, but the matching
Guide file is missing. Do not repair the fixture.

## Deterministic Assertions

- contains: validation failed
- contains: AC-ADR-009
- contains: exactly three variants
- contains: guide
- not_contains: Architecture Compass validated

## Expected Behavior

- Fail validation for the incomplete triplet.
- Identify the missing Guide without generating it or weakening the contract.
- Do not treat catalog presence or the canonical Long file as sufficient.
