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

I explicitly request native Plan mode and a handoff through the observed control.

Run `plan-refactor` with Architecture Compass for a polling-to-webhook migration.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: Read-only enforcement: indeterminate
- contains: /plan
- contains: Use $architecture-compass to continue this request
- not_contains: /plan Use $architecture-compass
- not_contains: Planning capability: Unavailable
- not_contains: Open the `@` menu and select Architecture Compass

## Expected Behavior

Respect this explicit native-mode request. Only its transition waits for observed activation; independent safe discovery and conversation may continue.

Select the observed native control or provide standalone `/plan`, wait for active mode, then send the separate `$` continuation. Do not assume CLI inline parsing from a visible command.
