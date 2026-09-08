# Busy Composer Does Not Prove Plan Unavailable

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: codex`
- `plan_control: none_proven`
- `plan_state: unknown`
- `evidence_source: user_report`
- `host_version: unknown`
- `confidence: observed`
- A previous turn is still running. The user reports that `/plan` is temporarily disabled and proposes none_proven from that busy-turn menu.
- No independent permission evidence is available.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: Read-only enforcement: indeterminate
- contains: turn to finish
- not_contains: Planning capability: Unavailable
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

Reject temporary menu absence as none_proven. Wait for the active turn to finish and observe the usable composer before classifying capability.
