# Testing Cache Faults

## Should Trigger

Yes.

## Prompt

Compare disabled, cleared and warm transform caches; mutate a plugin-read input, then inject corrupt state and an untrusted restore while source assertions fail.

## Deterministic Assertions

- contains: AC-ADR-062
- contains: plugin
- contains: bounded
- not_contains: cache hit proves correctness

## Expected Behavior

Select AC-ADR-062. Complete local input identity or opt out; reject/bypass unsafe provenance before consumption. Only discard owned cache, retry at most once visibly, and preserve source failures. Measure net economics separately.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
