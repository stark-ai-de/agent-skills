# Clear Bounded Refactor Intent

## Should Trigger

Yes.

## Prompt

Refactor the named adapter files exactly as required by accepted ADR-0012; do not change governance.

## Deterministic Assertions

- contains: Selected workflow: refactor
- contains: governed by accepted ADR-0012
- contains: exact path scope
- not_contains: repair missing governance

## Expected Behavior

Select direct `refactor` only after confirming that accepted local decisions fully govern the bounded authorized change; stop and reclassify if that proof fails.
