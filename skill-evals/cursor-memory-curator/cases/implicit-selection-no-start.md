# Clear Cleanup Intent Selects Recommended Route

## Should Trigger

Yes.

## Prompt

Clean up stale Cursor rules and persistent context in this repository. Use the safest recommended delivery.

## Deterministic Assertions

- contains: plan-run-cleanup-file
- contains: Selected
- contains: explicit cleanup
- contains: Plan mode
- contains: backup
- not_contains: generic second cleanup question

## Expected Behavior

Show all eight workflows, announce `plan-run-cleanup-file` from the explicit cleanup request and unspecified delivery, then proceed to the Plan-mode preflight. Do not require a redundant workflow confirmation. Execute only after plan approval, state recheck, Plan-mode exit, exact-file backup, and successful record persistence.
