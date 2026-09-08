# ChatGPT Web Observed Slash Plan Control

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` on ChatGPT Work on the web. The current composer visibly
lists `/plan`, and Plan mode is inactive.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: select the observed `/plan` item
- not_contains: Planning capability: Unavailable
- not_contains: portable in-chat planning fallback
- not_contains: Open the `@` menu and select Architecture Compass
- not_contains: /plan Use

## Expected Behavior

Use the observed web composer item and wait. Do not generate a copy-ready
`/plan` handoff for the web surface.
