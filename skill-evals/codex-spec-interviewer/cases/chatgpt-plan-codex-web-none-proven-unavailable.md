# Codex Web Enumerated None-Proven Plan Unavailable

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
- The current surface is Codex web.
- The user enumerated current composer controls and stated that no Plan control
  is present.
- The user has not declined a recommended Plan transition; Plan was proven
  absent by that enumeration.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Unavailable
- contains: Plan-mode fallback: unavailable
- not_contains: Planning capability: Indeterminate
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

`none_proven` from a positive enumeration permits Unavailable conversational
fallback. Do not use the Codex web `$` handoff.
