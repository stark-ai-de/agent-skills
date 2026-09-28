# Testing Native Framework

## Should Trigger

Yes.

## Prompt

A Python repository already owns tests in unittest; evaluate the portable testing decisions.

## Deterministic Assertions

- contains: adapt
- contains: unittest
- contains: not-applicable
- not_contains: install Vitest

## Expected Behavior

Adapt applicable outcomes to unittest and repository-native ADR IDs. Defer sharding/cache where irrelevant. Do not install JavaScript tooling to satisfy an example profile.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
