# ChatGPT Live-Incident Plan Replay

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT Chat, not Codex CLI, Codex IDE, or Codex in the ChatGPT desktop app.
- There is no Codex Plan-mode state, no Plan banner, and no slash-menu dump showing `/plan`.
- The user has not declined Plan mode.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: ask whether Plan is available
- contains: wait
- not_contains: Planning capability: Unavailable
- not_contains: Plan-mode fallback: unavailable
- not_contains: no native Codex Plan-mode
- not_contains: /plan Use $codex-spec-interviewer
- not_contains: conversational fallback

## Expected Behavior

Switch, wait, or ask. Do not take Unavailable conversational fallback from ChatGPT identity or missing Codex Plan state. Do not emit the Codex `/plan Use $codex-spec-interviewer` command.
