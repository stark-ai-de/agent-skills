# Codex Web Observed Slash Plan Handoff

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: codex`
- `plan_control: slash_plan_command`
- `plan_state: inactive`
- `evidence_source: host_runtime_context`
- `host_version: unknown`
- `confidence: observed`
- The current surface is Codex web.
- `/plan` is visible in the current composer and Plan mode is inactive.
- Codex Spec Interviewer is not already active in the current composer.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: /plan Use $codex-spec-interviewer to continue this request
- not_contains: Planning capability: Indeterminate
- not_contains: Planning capability: Unavailable
- not_contains: Plan-mode fallback: unavailable
- not_contains: select the observed `/plan` item
- not_contains: Open the `@` menu and select Codex Spec Interviewer

## Expected Behavior

Use the Codex web copy-ready `$` handoff because this turn visibly exposed
`/plan`. Do not apply the ChatGPT web select-only rule.
