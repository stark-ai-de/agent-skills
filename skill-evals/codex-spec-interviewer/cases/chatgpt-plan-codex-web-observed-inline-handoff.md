# Codex Web Confirmed Inline Plan Handoff

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
- The idle composer exposes `/plan` and explicitly demonstrates that it accepts an inline prompt in the same submission.
- Permission evidence is unavailable.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: Read-only enforcement: indeterminate
- contains: /plan Use $codex-spec-interviewer to continue this request
- not_contains: Planning capability: Active

## Expected Behavior

A combined command is allowed only with evidence for both the native control and its inline parser; wait for the next turn to confirm activation.
