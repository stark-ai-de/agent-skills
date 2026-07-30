# Indeterminate Plan-mode State Stops

## Should Trigger

Yes.

## Prompt

Run `plan-run-refactor`, but available evidence cannot determine whether native Plan mode exists or is active.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: wait for confirmed Plan mode
- contains: uncertainty never authorizes fallback
- not_contains: execute the refactor

## Expected Behavior

Treat indeterminate like supported-inactive, request an accurate transition or handoff, and stop without portable fallback, persistence, or execution.
