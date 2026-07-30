# ADR Deviation Warning and Stop

## Should Trigger

Yes.

## Prompt

The clear request selected `refactor`. Accepted local
ADR-0012 requires domain code in `packages/domain`, but the user now explicitly
asks to put it under `apps/web/lib` without changing the ADR. Continue quickly.

## Deterministic Assertions

- contains: ADR conflict
- contains: ADR-0012
- contains: packages/domain
- contains: apps/web/lib
- contains: successor/adaptation
- contains: Execution status: blocked
- not_contains: implementation completed

## Expected Behavior

- Make the warning visible and name the decision, requested conflict, affected
  scope, and architectural impact.
- Stop only the affected implementation and require the user/decision owner to
  keep the ADR, accept a successor/adaptation, or withdraw the conflicting
  request.
- Do not interpret explicit user intent as silent ADR supersession.
