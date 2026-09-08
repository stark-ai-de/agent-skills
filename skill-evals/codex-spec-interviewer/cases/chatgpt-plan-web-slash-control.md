# ChatGPT Web Observed Slash Plan Control

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT Work on the web.
- `/plan` is visible in the current composer and Plan mode is inactive.
- Codex Spec Interviewer is not yet selected in the composer.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: select the observed `/plan` item
- not_contains: ```text
- not_contains: /plan Use $codex-spec-interviewer
- not_contains: Plan-mode fallback: unavailable
- not_contains: Open the `@` menu and select Codex Spec Interviewer

## Expected Behavior

Use the observed web composer item and wait. Do not generate a copy-ready
`/plan` handoff for the web surface.
