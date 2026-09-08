# ChatGPT Non-Slash Native Plan Control

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT Work on the web.
- The user reports a native Plan toggle that is visible and inactive.
- No `/plan` slash is present.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: wait
- not_contains: ```text
- not_contains: /plan Use $codex-spec-interviewer
- not_contains: Plan-mode fallback: unavailable
- not_contains: Planning capability: Unavailable

## Expected Behavior

Hand off the observed non-slash Plan control and wait. Do not emit a slash Plan command and do not emit the Codex `/plan Use $codex-spec-interviewer` command.
