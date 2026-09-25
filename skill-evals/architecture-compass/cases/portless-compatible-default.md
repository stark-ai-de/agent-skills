# Compatible Local Endpoint Default

## Should Trigger

Yes.

## Prompt

Use Architecture Compass setup for a repository with one local HTTP app and an HTTP API written in another language. The existing toolchain is managed and the user requests governance only.

## Deterministic Assertions

- contains: AC-ADR-065
- contains: HTTPS
- contains: direct
- contains: governance

## Expected Behavior

Select AC-ADR-065 even for a single app, assess each actual endpoint and map it into local governance. Prefer Portless and HTTPS for qualified development entrypoints, with a documented direct path. Preserve package/runtime ownership and distinguish adoption from installation or source migration; governance setup alone performs neither.

## Evidence Stage

source/static: this scenario is an evaluation contract, not a recorded agent
run or a Portless runtime qualification. Keyword assertions complement semantic
review; structural success alone does not establish behavior.
