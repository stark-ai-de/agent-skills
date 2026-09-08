# ChatGPT Proven Absence With Unknown Plan State

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: work`
- `plan_control: none_proven`
- `plan_state: unknown`
- `evidence_source: user_report`
- `host_version: unknown`
- `confidence: observed`
- The user enumerated every currently usable composer control and explicitly confirmed no native Plan control exists.
- The composer is idle; the user has not refused Plan.
- No filesystem permission evidence is available.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Unavailable
- contains: Read-only enforcement: indeterminate
- contains: behavioral no-write
- not_contains: Planning capability: Indeterminate
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

Positive current enumeration permits conversational fallback despite an unknown state for a nonexistent control. Report enforcement independently and do not write.
