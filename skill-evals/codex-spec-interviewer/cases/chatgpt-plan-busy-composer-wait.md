# Busy Composer Does Not Prove Plan Unavailable

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
- A previous turn is still running. The user reports that `/plan` is temporarily disabled and proposes none_proven from that busy-turn menu.
- No independent permission evidence is available.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Expected Behavior

- Continue permissible repository discovery and the material requirements conversation without requiring a manual Plan switch or complete UI enumeration.
- Keep planning capability and read-only enforcement separate; no interview mutations or writes while native Plan is active or state/permissions are unknown.
- Prepare the complete draft before a single positive checkpoint; retain unchanged approval across any required host exit.
- Keep unsupported or missing evidence indeterminate; do not infer a native control or technical absence. Resolve a capability question only when the next required action depends on it.
- Missing filesystem evidence remains indeterminate; do not probe enforcement with a write.
