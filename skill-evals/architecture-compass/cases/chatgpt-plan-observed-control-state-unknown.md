# ChatGPT Observed Plan Control With Unknown State

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` on ChatGPT desktop Chat. `/plan` is visible in the current
controls, but the host does not expose whether Plan mode is active or inactive.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: ask whether Plan is active
- contains: wait
- not_contains: Planning capability: Unavailable
- not_contains: portable in-chat planning fallback
- not_contains: /plan Use

## Expected Behavior

An observed control with unknown current state is fail-closed. Ask for state
confirmation and wait; do not fall back or emit a transition handoff.
