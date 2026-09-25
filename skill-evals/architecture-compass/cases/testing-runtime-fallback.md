# Testing Runtime Fallback

## Should Trigger

Yes.

## Prompt

One optional Vitest native-loader command fails on Bun; the equivalent supported Node command passes. Other Bun commands work.

## Deterministic Assertions

- contains: AC-ADR-058
- contains: fallback
- contains: revisit
- not_contains: all Vitest requires Node

## Expected Behavior

Record the exact command, versions, observed failure and revisit trigger; scope Node fallback to that configuration. Preserve Bun-first execution and product probes elsewhere.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
