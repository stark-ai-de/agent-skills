# Invalid Triplet Metadata Drift

## Should Trigger

Yes.

## Prompt

Validate an Architecture Compass triplet whose Short and Long variants use
`Category: frontend`, while its Guide uses `Category: quality-delivery`. All
other fields and filenames are valid. Do not normalize it silently.

## Deterministic Assertions

- contains: validation failed
- contains: Category metadata drifts
- contains: only Variant may differ
- not_contains: Architecture Compass validated

## Expected Behavior

- Fail byte-level shared-metadata identity across the triplet.
- Explain that only `Variant` may differ.
- Require the author to correct metadata or create a different ADR decision.
