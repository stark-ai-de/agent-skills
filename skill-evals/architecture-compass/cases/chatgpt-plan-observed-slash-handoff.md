# ChatGPT Observed Slash Plan Handoff

## Should Trigger

Yes.

## Prompt

Run `plan-run-refactor` on ChatGPT desktop Chat. `/plan` is visible in the current controls and Plan mode is inactive. Architecture Compass is not yet selected in the composer.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: wait for confirmed Plan mode
- contains: /plan
- contains: Open the `@` menu and select Architecture Compass
- not_contains: @architecture-compass
- not_contains: Use $architecture-compass
- not_contains: ask whether Plan is available

## Expected Behavior

Emit copy-ready `/plan` with optional inline continuation text, keep `@` selection as a separate UI instruction, and wait. Do not invent `/plan Use @architecture-compass`.
