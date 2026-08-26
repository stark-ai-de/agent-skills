# ChatGPT Non-Slash Native Plan Control

## Should Trigger

Yes.

## Prompt

Run `plan-run-refactor` on ChatGPT Work on the web. The user reports a native Plan toggle that is visible and inactive. No `/plan` slash is present.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: wait for confirmed Plan mode
- not_contains: /plan Use
- not_contains: Planning capability: Unavailable
- not_contains: ask whether Plan is available

## Expected Behavior

Hand off the observed non-slash Plan control and wait. Do not emit a Codex or slash Plan command that was not observed, and do not run the Indeterminate ask script.
