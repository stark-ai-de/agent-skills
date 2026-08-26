# ChatGPT Unknown Plan Control Asks And Waits

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT Chat.
- The only Plan evidence is the product label ChatGPT.
- `/plan` is not listed in context.
- The user has not declined Plan mode.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: ask whether Plan is available
- contains: wait
- not_contains: Plan-mode fallback: unavailable
- not_contains: Planning capability: Unavailable
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

Treat missing observation fields as indeterminate on the ChatGPT lane. Ask how to enter Plan and wait. Do not apply Codex Variant C.
