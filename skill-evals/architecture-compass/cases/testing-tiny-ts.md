# Testing Tiny Ts

## Should Trigger

Yes.

## Prompt

A tiny TS repository has two contract tests and no CI bottleneck. Establish recommended testing governance.

## Deterministic Assertions

- contains: AC-ADR-059
- contains: N=1
- contains: unmeasured
- not_contains: four shards required

## Expected Behavior

AC-ADR-059; native framework ownership; N=1; no empty projects. Defer AC-ADR-061 until distribution is needed; no measured speedup is claimed.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
