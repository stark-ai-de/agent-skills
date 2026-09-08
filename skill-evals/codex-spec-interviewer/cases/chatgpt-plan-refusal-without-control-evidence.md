# Explicit Refusal Before Native Control Evidence

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: work`
- `plan_control: unknown`
- `plan_state: unknown`
- `evidence_source: none`
- `host_version: unknown`
- `confidence: absent`
- After Plan was recommended, the user said: "Do not switch modes; continue the interview here."
- The refusal is evidence of a user decision, not evidence that a native control exists or is absent.
- No filesystem permission evidence is available.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Explicitly declined
- contains: Plan-mode fallback: explicitly declined
- contains: Read-only enforcement: indeterminate
- contains: continue conversationally
- not_contains: Planning capability: Indeterminate
- not_contains: Planning capability: Unavailable
- not_contains: ask whether Plan is available
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

Honor the refusal immediately after identifying surface/experience. Missing or documentation-only native-control evidence must not cause another Plan request. Keep behavioral no-write protection.
