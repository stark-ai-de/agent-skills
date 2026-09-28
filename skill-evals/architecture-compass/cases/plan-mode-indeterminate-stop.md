# Indeterminate Plan State Blocks Writes Only

## Should Trigger

Yes.

## Prompt

Run `plan-run-refactor`, but available evidence cannot determine whether native Plan mode exists or is active. The user has not requested a native control.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: no-write conversation
- contains: unknown state never authorizes writes
- not_contains: execute the refactor
- not_contains: wait for confirmed Plan mode before planning

## Expected Behavior

Continue the same no-write conversation and proven non-mutating discovery. Do not invent a transition command or classify support as unavailable. Resolve actual mode and permission before any persistence or execution. Unknown state is a write boundary, not a reason to stop useful planning.
