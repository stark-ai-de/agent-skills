# Plan-mode Unavailable Fallback

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` on a host proven not to support native Plan mode.

## Deterministic Assertions

- contains: Planning capability: Unavailable
- contains: portable in-chat planning fallback
- contains: definitely unavailable
- contains: no write during planning

## Expected Behavior

Use the portable fallback with the same approval, no-write, and post-planning persistence boundaries. This case proves unavailability; separate inactive, declined, and indeterminate cases also permit safe no-write conversation without changing their capability classification.
