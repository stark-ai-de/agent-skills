# Invalid ADR ID Collision

## Should Trigger

Yes.

## Prompt

Validate an Architecture Compass fixture containing complete triplets for both
`ac-adr-012-config-ownership.*.md` and
`ac-adr-012-environment-loading.*.md`. Do not choose one automatically.

## Deterministic Assertions

- contains: validation failed
- contains: AC-ADR-012
- contains: ID collision
- contains: config-ownership
- contains: environment-loading

## Expected Behavior

- Fail because one stable AC-ADR ID maps to two stems.
- Report both stems and require an explicit renumbering or supersession choice.
- Do not infer identity from title similarity or file order.
