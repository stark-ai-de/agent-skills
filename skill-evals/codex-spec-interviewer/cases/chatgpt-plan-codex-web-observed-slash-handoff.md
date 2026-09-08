# Codex Web Slash Control Without Inline Parsing Evidence

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
- The idle Codex web composer visibly lists `/plan`, but its inline argument support is unknown.
- The individual skill is not loaded; no read-only permission evidence is available.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: Read-only enforcement: indeterminate
- contains: /plan
- contains: Use $codex-spec-interviewer to continue this request
- not_contains: /plan Use $codex-spec-interviewer
- not_contains: Planning capability: Unavailable
- not_contains: Open the `@` menu and select Codex Spec Interviewer

## Expected Behavior

Select the observed native control or provide standalone `/plan`, wait for active mode, then send the separate `$` continuation. Do not assume CLI inline parsing from a visible command.
