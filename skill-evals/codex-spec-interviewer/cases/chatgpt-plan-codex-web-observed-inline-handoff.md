# Codex Web Confirmed Inline Plan Handoff

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
- The idle composer exposes `/plan` and explicitly demonstrates that it accepts an inline prompt in the same submission.
- Permission evidence is unavailable.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Expected Behavior

- Continue permissible repository discovery and the material requirements conversation without requiring a manual Plan switch or complete UI enumeration.
- Keep planning capability and read-only enforcement separate; no interview mutations or writes while native Plan is active or state/permissions are unknown.
- Prepare the complete draft before a single positive checkpoint; retain unchanged approval across any required host exit.
- For a requested or necessary transition, use only the observed control and real client syntax; this optional transition does not block independent reads or the interview.
- An inline mode-command continuation is permitted only because this same Codex web composer demonstrates argument support.
- Missing filesystem evidence remains indeterminate; do not probe enforcement with a write.
