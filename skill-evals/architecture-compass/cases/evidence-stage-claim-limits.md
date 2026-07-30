# Evidence Stage Claim Limits

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to close out a refactor. Source inspection and local
validation passed. CI did not run, no package was published or installed from a
registry, no deployment was inspected, and no external platform was queried.
Report exactly what is proved.

## Deterministic Assertions

- contains: local: verified
- contains: CI: not run
- contains: publication/install: not run
- contains: deployed/production: not run
- contains: external/third-party: not run
- not_contains: CI is green
- not_contains: published successfully
- not_contains: production verified

## Expected Behavior

- Separate source/static, local, CI, publication/install,
  deployed/production, and external/third-party evidence.
- Use `verified`, `failed`, `not run`, `unavailable`, or `stale` per stage.
- Do not use an earlier evidence stage to claim any later stage.
- Report unavailable or unrun proof as a limit, not as success.
