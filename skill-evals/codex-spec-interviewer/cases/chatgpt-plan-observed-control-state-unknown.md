# ChatGPT Observed Plan Control With Unknown State

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT desktop Chat, not Codex in the ChatGPT desktop app.
- `/plan` is visible in the current controls.
- The host does not expose whether Plan mode is active or inactive.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: ask whether Plan is active
- contains: wait
- not_contains: Plan-mode fallback: unavailable
- not_contains: Planning capability: Unavailable
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

An observed control with unknown current state is fail-closed. Ask for state
confirmation and wait; do not fall back or emit a transition handoff.
