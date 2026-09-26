# No Applicable Local Endpoint

## Should Trigger

Yes.

## Prompt

Use Architecture Compass complete setup for a native CLI library repository. It has no HTTP server, docs preview or WebSocket endpoint. Must it acquire Node, a package.json and Portless?

## Deterministic Assertions

- contains: AC-ADR-065
- contains: not applicable
- contains: endpoint

## Expected Behavior

Evaluate AC-ADR-065 in complete coverage and record not applicable with the absent-endpoint evidence, using the existing adoption matrix dispositions. Do not add a package manifest, runtime or Portless installation merely to satisfy coverage. A future local web preview is a reason to reassess applicability.

## Evidence Stage

source/static: this scenario is an evaluation contract, not a recorded agent
run or a Portless runtime qualification. Keyword assertions complement semantic
review; structural success alone does not establish behavior.
