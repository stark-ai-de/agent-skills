# Testing Public Validator

## Should Trigger

Yes.

## Prompt

Migrate repository contract checks into framework tests. A public schema parser also validates production input.

## Deterministic Assertions

- contains: AC-ADR-059
- contains: production
- contains: rule
- not_contains: delete public validator

## Expected Behavior

Inventory rules/call sites and preserve schema/domain APIs, warnings, negative behavior and production guards. Remove retired repository scheduling/exit/reporting; wrapping the old CLI is not completion.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
