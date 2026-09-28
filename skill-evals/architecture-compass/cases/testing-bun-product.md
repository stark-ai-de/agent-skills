# Testing Bun Product

## Should Trigger

Yes.

## Prompt

The accepted local tooling decision maps AC-ADR-058. Tests and a Bun-only product API must run in their representative runtimes.

## Deterministic Assertions

- contains: AC-ADR-060
- contains: AC-ADR-058
- contains: product runtime
- not_contains: launcher proves compatibility

## Expected Behavior

Probe supported Vitest configuration under Bun. Record launcher, CLI, worker and product identities separately, plus product-boundary behavior. Do not infer runtime from a script name.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
