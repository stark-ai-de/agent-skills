# Plan-and-run State Recheck

## Should Trigger

Yes.

## Prompt

The `plan-run-refactor` specification is approved and Plan mode has exited. Continue only if the repository still matches the approved state.

## Deterministic Assertions

- contains: recheck root, HEAD, index/worktree, dependencies, permissions, protected paths, and external state
- contains: material drift
- contains: unchanged approved plan
- not_contains: execute expanded scope

## Expected Behavior

Persist the approved specification and receipt, recheck all named state, stop on material drift, and execute only unchanged authorized slices.
