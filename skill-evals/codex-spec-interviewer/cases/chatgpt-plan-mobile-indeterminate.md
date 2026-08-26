# ChatGPT Mobile Incomplete Record Stays Indeterminate

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT mobile.
- `plan_control` is not observed.
- The user has not enumerated controls or declined Plan.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: ask whether Plan is available
- contains: wait
- not_contains: Plan-mode fallback: unavailable
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

Mobile stays in the ChatGPT lane. An incomplete record asks and waits; it does not fall back and does not use Codex Variant C.
