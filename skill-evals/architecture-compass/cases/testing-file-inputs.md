# Testing File Inputs

## Should Trigger

Yes.

## Prompt

Tests read Markdown/schema directories with fs APIs. Edit, add, delete and rename files, then remove the required root or empty it.

## Deterministic Assertions

- contains: AC-ADR-059
- contains: watch
- contains: empty
- not_contains: import graph is sufficient

## Expected Behavior

Current sorted discovery and independent expected inventory detect every input change. Root watch mappings and conservative affected-suite selection cover non-imported data; missing/empty roots fail.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
