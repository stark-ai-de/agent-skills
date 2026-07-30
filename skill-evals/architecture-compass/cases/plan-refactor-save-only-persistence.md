# Plan-refactor Save-only Persistence

## Should Trigger

Yes.

## Prompt

The bounded `plan-refactor` specification and required architecture decision
were approved in native Plan mode. Plan mode has exited, write permission is
active only for the named specification, ADR triplet, and ADR index, and the
protected Git index is unchanged. Persist and validate those planning artifacts,
then emit the bounded handoff and stop without source implementation or executing
that handoff.

## Deterministic Assertions

- contains: Selected workflow: plan-refactor
- contains: Architecture decision status: approved
- contains: Persistence status: completed
- contains: Execution status: not requested
- contains: approved specification
- contains: required ADR triplet and index
- contains: protected Git index
- contains: bounded execution handoff
- contains: stop without source implementation
- not_contains: Execution status: completed

## Expected Behavior

- Treat this as the save-only continuation of the already approved
  `plan-refactor`, not as direct refactor or `plan-run-refactor`.
- Recheck the named paths and protected index, persist only the approved
  specification and required ADR/index artifacts, and validate those artifacts.
- Report persistence separately from source execution, leave implementation and
  external state unchanged, emit a bounded copy-ready execution handoff, and
  stop without implementing that handoff.
