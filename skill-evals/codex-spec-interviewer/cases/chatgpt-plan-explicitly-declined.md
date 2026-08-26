# ChatGPT Plan Explicitly Declined

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: work`
- `plan_control: host_mode_toggle`
- `plan_state: inactive`
- `evidence_source: user_report`
- `host_version: unknown`
- `confidence: observed`
- After Plan is recommended, the user states: "Do not switch modes; continue
  the interview here."

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Explicitly declined
- contains: Plan-mode fallback: explicitly declined
- contains: Do not switch modes; continue the interview here.
- contains: continue conversationally
- not_contains: Planning capability: Unavailable
- not_contains: Plan-mode fallback: unavailable
- not_contains: ask whether Plan is available
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

Preserve the explicit refusal as evidence, continue the interview
conversationally, and do not request Plan again. A refusal is not proof that the
capability is unavailable and must never receive that label or an unavailable
fallback record.
