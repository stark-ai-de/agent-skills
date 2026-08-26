# ChatGPT Live-Incident Plan Replay

## Should Trigger

Yes.

## Prompt

Run `plan-run-refactor` on ChatGPT Chat. Host identity is ChatGPT. There is no Codex Plan-mode state, no Plan banner, and no slash-menu dump showing `/plan`. The user has not declined Plan mode.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: ask whether Plan is available
- contains: wait for confirmed Plan mode
- not_contains: Planning capability: Unavailable
- not_contains: no native Codex Plan-mode
- not_contains: conversational fallback

## Expected Behavior

Switch, wait, or ask. Do not take Unavailable conversational fallback from ChatGPT identity or missing Codex Plan state.
