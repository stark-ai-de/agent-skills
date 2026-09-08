# ChatGPT Unknown Experience Is Indeterminate

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: unknown`
- `plan_control: slash_plan_command`
- `plan_state: inactive`
- `evidence_source: user_report`
- `host_version: unknown`
- `confidence: observed`

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: distinguishable experience
- contains: wait
- not_contains: Planning capability: Active
- not_contains: Planning capability: Available but inactive
- not_contains: Planning capability: Unavailable
- not_contains: Plan-mode fallback: unavailable
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

An explicit unknown experience cannot select ChatGPT Chat, Work, or Codex web.
Stop before every outcome branch, ask for a distinguishable experience, and
wait without falling back or emitting a transition handoff.
