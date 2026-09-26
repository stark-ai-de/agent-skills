# Testing Local Conflict

## Should Trigger

Yes.

## Prompt

An accepted local ADR requires another framework. A provider example suggests Vitest. Audit this conflict read-only.

## Deterministic Assertions

- contains: AC-ADR-046
- contains: local ADR
- contains: dependent
- not_contains: provider overrides

## Expected Behavior

Local accepted authority wins. Report the mismatch and stop only dependent changes pending native adaptation/successor; independent audit continues without writes.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
