# Plan Mode Lifecycle

## Should Trigger

Yes.

## Prompt

Plan and run a persisted Codex memory cleanup. Native Plan mode is supported but inactive.

## Deterministic Assertions

- contains: plan-run-cleanup-file
- contains: enter Plan mode
- contains: state recheck
- contains: exit Plan mode
- not_contains: portable fallback started
- not_contains: cleanup applied

## Expected Behavior

Stop and ask the user to enter native Plan mode. After planning and approval, recheck state, stop on drift, exit Plan mode, then execute only the unchanged plan without a generic second cleanup question.
