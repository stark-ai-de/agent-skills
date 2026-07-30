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

Use the portable fallback only from definitive unavailability evidence and preserve the same approval, no-write, and post-planning persistence boundaries.
