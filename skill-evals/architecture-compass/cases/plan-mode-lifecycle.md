# Native Plan-mode Lifecycle

## Should Trigger

Yes.

## Prompt

Run `plan-run-refactor` on a host where native Plan mode is supported but currently inactive.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: transition to Plan mode
- contains: wait for confirmed Plan mode
- contains: exit Plan mode before persistence
- not_contains: portable fallback

## Expected Behavior

Use the host transition, keep repository/workspace artifacts read-only while planning, obtain approval, exit Plan mode, and only then persist or execute.
