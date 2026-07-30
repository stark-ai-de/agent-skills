# Clear Setup Intent

## Should Trigger

Yes.

## Prompt

Set up recommended ADR governance for this repository with Architecture Compass.

## Deterministic Assertions

- contains: setup | audit | refactor | plan-refactor | plan-run-refactor
- contains: Selected workflow: setup
- contains: Coverage: recommended
- contains: Selection rationale
- not_contains: wait for workflow confirmation

## Expected Behavior

Expose all five workflows, select `setup/recommended` from the explicit governance request, announce the rationale and bounded governance write scope, and proceed without inventing an `auto` route.
