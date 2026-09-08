# ChatGPT Missing Slash Does Not Prove Unavailable

## Should Trigger

Yes.

## Prompt

Run `plan-run-refactor` on ChatGPT Work on the web. The visible tool list does not include `/plan`. No positive enumeration of all controls has been given, and the user has not said Plan is absent.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: wait for confirmed Plan mode
- not_contains: Planning capability: Unavailable
- not_contains: none_proven

## Expected Behavior

A missing `/plan` slash is not `none_proven`. Ask or wait; do not fall back.
