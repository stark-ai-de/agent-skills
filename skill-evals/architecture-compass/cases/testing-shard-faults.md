# Testing Shard Faults

## Should Trigger

Yes.

## Prompt

Aggregate native reports with foreign subject/config, duplicate partition, missing file/case/report, failed case, and skipped/cancelled/failed required predecessor variants.

## Deterministic Assertions

- contains: AC-ADR-061
- contains: identity
- contains: predecessor
- not_contains: report count proves completeness

## Expected Behavior

Select AC-ADR-061. Every adversarial variant prevents a successful required aggregate. Match full execution identity, exact file/case union and disjointness against an independent plan; blob count alone is insufficient.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
