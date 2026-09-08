# ChatGPT Desktop Standalone Plan Transition

## Should Trigger

Yes.

## Runtime Context

- `surface: desktop`
- `experience: work`
- `plan_control: slash_plan_command`
- `plan_state: inactive`
- `evidence_source: host_runtime_context`
- `host_version: unknown`
- `confidence: observed`
- The idle ChatGPT Work composer exposes `/plan` but has not demonstrated inline argument support.
- The skill is not loaded and filesystem enforcement is unknown.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: Read-only enforcement: indeterminate
- contains: /plan
- contains: Open the `@` menu and select Codex Spec Interviewer
- not_contains: /plan Use $codex-spec-interviewer
- not_contains: /plan Use @

## Expected Behavior

Use standalone `/plan` or select the observed control, request separate skill selection, then wait for active mode before the original request is continued.
