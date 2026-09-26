# Testing Monorepo Cost

## Should Trigger

Yes.

## Prompt

A three-package TS monorepo wants faster validation. Compare 1/2/4 shards with one worker per process and complete equivalent inventories.

## Deterministic Assertions

- contains: AC-ADR-061
- contains: runner seconds
- contains: unmeasured
- not_contains: four shards required

## Expected Behavior

Select AC-ADR-061 with AC-ADR-025/049. Declare budgets before measurement, include setup/report/merge and summed runner allocation. Choose only an observed configuration within cost/memory budgets. Local timing is not hosted CI economics.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
