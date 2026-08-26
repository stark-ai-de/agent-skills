# Codex Web Observed Slash Plan Handoff

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` on Codex web. The current composer visibly lists `/plan`,
and Plan mode is inactive.

## Runtime Context

- `surface: web`
- `experience: codex`
- `plan_control: slash_plan_command`
- `plan_state: inactive`
- `evidence_source: host_runtime_context`
- `host_version: unknown`
- `confidence: observed`
- The current surface is Codex web, not ChatGPT Chat or Work.
- The current composer visibly exposes `/plan` and reports Plan inactive.
- Architecture Compass is not already active in the current composer.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: /plan Use $architecture-compass to continue this request
- not_contains: Planning capability: Indeterminate
- not_contains: Planning capability: Unavailable
- not_contains: portable in-chat planning fallback
- not_contains: select the observed `/plan` item
- not_contains: Open the `@` menu and select Architecture Compass

## Expected Behavior

Use the Codex web copy-ready `$` handoff because this turn visibly exposed
`/plan`. Do not apply the ChatGPT web select-only rule.
