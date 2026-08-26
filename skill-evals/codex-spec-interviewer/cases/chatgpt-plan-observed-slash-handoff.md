# ChatGPT Observed Slash Plan Handoff

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT desktop Chat, not Codex in the ChatGPT desktop app.
- `/plan` is visible in the current controls and Plan mode is inactive.
- Codex Spec Interviewer is not yet selected in the composer.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: /plan
- contains: Open the `@` menu and select Codex Spec Interviewer
- not_contains: /plan Use $codex-spec-interviewer
- not_contains: @codex-spec-interviewer
- not_contains: Plan-mode fallback: unavailable

## Expected Behavior

Emit copy-ready `/plan` with optional inline continuation text, keep `@` selection as a separate UI instruction, and wait. Do not invent `/plan Use @codex-spec-interviewer` and do not emit the Codex `$` command.
