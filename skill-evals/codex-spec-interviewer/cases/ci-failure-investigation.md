# CI Failure Investigation

## Should Trigger

Yes.

## Prompt

CI started failing after several unrelated changes. I need a source-backed investigation and implementation spec, not a blind fix.

## Deterministic Assertions

- contains: source challenge
- contains: validation
- contains: assumptions
- not_contains: just rerun CI

## Expected Behavior

- Inspect available CI commands, workflow files, and recent failure evidence.
- Separate known facts from hypotheses.
- Produce a repair spec with validation commands and regression hotspots.
- Avoid staging, reverting, or mutating user changes as part of spec creation.
