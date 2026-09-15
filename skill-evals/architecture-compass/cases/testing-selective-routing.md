# Testing Selective Routing

## Should Trigger

Yes.

## Prompt

A shared reference change affects transform caching only. Evaluate recommended setup, then complete setup separately.

## Deterministic Assertions

- contains: AC-ADR-062
- contains: Short
- contains: 43
- contains: seven
- not_contains: adopt internal ADRs

## Expected Behavior

Read AC-ADR-062 Short then its governing Long and Guide only for mechanics; related owners only when needed. Do not force all four new decisions or internal ADRs into adoption. Complete considers all 43 eligible candidates, foundation remains seven.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
