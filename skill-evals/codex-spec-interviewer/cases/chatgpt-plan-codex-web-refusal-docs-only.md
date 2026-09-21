# Explicit Refusal Before Native Control Evidence

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: codex`
- `plan_control: unknown`
- `plan_state: unknown`
- `evidence_source: official_docs_for_this_surface`
- `host_version: unknown`
- `confidence: absent`
- After Plan was recommended, the user said: "Do not switch modes; continue the interview here."
- The refusal is evidence of a user decision, not evidence that a native control exists or is absent.
- No filesystem permission evidence is available.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Expected Behavior

- Continue permissible repository discovery and the material requirements conversation without requiring a manual Plan switch or complete UI enumeration.
- Keep planning capability and read-only enforcement separate; no interview mutations or writes while native Plan is active or state/permissions are unknown.
- Prepare the complete draft before a single positive checkpoint; retain unchanged approval across any required host exit.
- Honor the explicit Plan refusal even when surface/experience/control evidence is incomplete; do not request Plan again or label it technically unavailable.
- Missing filesystem evidence remains indeterminate; do not probe enforcement with a write.
