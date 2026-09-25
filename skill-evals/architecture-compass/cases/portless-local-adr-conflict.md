# Accepted Local Routing Conflict

## Should Trigger

Yes.

## Prompt

Audit a web repository whose accepted local ADR requires its existing proxy. The user mentions that Architecture Compass now prefers Portless and asks whether the audit should replace that proxy.

## Deterministic Assertions

- contains: AC-ADR-065
- contains: conflict
- contains: successor
- contains: read-only

## Expected Behavior

Keep the audit read-only. Name the accepted local decision and conflict; provider defaults cannot overwrite target authority. Recommend a local adaptation or successor and a bounded future migration, but stop dependent implementation until accepted and authorized. Do not edit scripts, install Portless, change certificates or represent a planned migration as completed.

## Evidence Stage

source/static: this scenario is an evaluation contract, not a recorded agent
run or a Portless runtime qualification. Keyword assertions complement semantic
review; structural success alone does not establish behavior.
