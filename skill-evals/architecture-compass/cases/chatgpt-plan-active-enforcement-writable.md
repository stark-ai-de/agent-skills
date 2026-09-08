# Active Plan With Writable Filesystem Enforcement

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: work`
- `plan_control: host_mode_toggle`
- `plan_state: active`
- `evidence_source: host_runtime_context`
- `host_version: unknown`
- `confidence: observed`
- Current host permission evidence grants workspace writes, and a separate read-only permission control is visibly available but inactive.

## Prompt

Run `plan-refactor` with Architecture Compass for a polling-to-webhook migration.

## Deterministic Assertions

- contains: Planning capability: Active
- contains: Read-only enforcement: available but inactive
- not_contains: /plan Use $architecture-compass
- contains: behavioral no-write
- not_contains: Read-only enforcement: enforced

## Expected Behavior

Plan can be active while filesystem writes remain possible. Report the inactive read-only control; do not change it automatically, and retain the behavioral no-write gate.
