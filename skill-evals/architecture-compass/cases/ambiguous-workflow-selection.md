# Ambiguous Workflow Selection

## Should Trigger

Yes.

## Prompt

Use Architecture Compass on this repository.

## Deterministic Assertions

- contains: setup | audit | refactor | plan-refactor | plan-run-refactor
- contains: Which architecture outcome do you want
- contains: There is no auto workflow
- not_contains: Selected workflow:

## Expected Behavior

Expose the finite workflows and ask one outcome question because the bare activation provides no safe task-derived selection or mutation authority.
