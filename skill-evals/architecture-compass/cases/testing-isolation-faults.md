# Testing Isolation Faults

## Should Trigger

Yes.

## Prompt

Qualify shared-state leaks, failed cleanup, a hanging child and an unexpected network request under sequential and concurrent execution.

## Deterministic Assertions

- contains: AC-ADR-060
- contains: cleanup
- contains: unobservable
- not_contains: forks are a security sandbox

## Expected Behavior

Select AC-ADR-060. Use unique disposable namespaces, bounded children and cleanup-on-failure. Fail attributable injected faults and distinguish instrumented restrictions from enforced OS egress controls.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
