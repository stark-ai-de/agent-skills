# Codex Web Indeterminate Plan Evidence

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: codex`
- `plan_control: unknown`
- `plan_state: unknown`
- `evidence_source: none`
- `host_version: unknown`
- `confidence: absent`
- The current surface is Codex web.
- The current composer has not been enumerated.
- No Plan banner, control, or active-state evidence is visible.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: wait
- not_contains: Planning capability: Unavailable
- not_contains: Plan-mode fallback: unavailable
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

Stop and request current-composer or host confirmation. Do not fall back and do
not emit a Codex web handoff from missing evidence.
