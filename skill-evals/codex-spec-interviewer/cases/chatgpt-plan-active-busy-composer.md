# Active Plan Survives a Busy Composer

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: codex`
- `plan_control: slash_plan_command`
- `plan_state: active`
- `evidence_source: host_runtime_context`
- `host_version: unknown`
- `confidence: observed`
- Current host mode context proves Plan active. The composer temporarily disables mode transitions while this turn is running.
- No independent permission evidence is available.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Expected Behavior

- Continue permissible repository discovery and the material requirements conversation without requiring a manual Plan switch or complete UI enumeration.
- Keep planning capability and read-only enforcement separate; no interview mutations or writes while native Plan is active or state/permissions are unknown.
- Prepare the complete draft before a single positive checkpoint; retain unchanged approval across any required host exit.
- Keep observed Plan active without toggling again; a busy composer does not invalidate active-mode evidence.
- Missing filesystem evidence remains indeterminate; do not probe enforcement with a write.
