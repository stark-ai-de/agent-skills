# ChatGPT Plan Explicitly Declined

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: work`
- `plan_control: host_mode_toggle`
- `plan_state: inactive`
- `evidence_source: user_report`
- `host_version: unknown`
- `confidence: observed`
- After Plan is recommended, the user states: "Do not switch modes; continue
  the interview here."

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Expected Behavior

- Continue permissible repository discovery and the material requirements conversation without requiring a manual Plan switch or complete UI enumeration.
- Keep planning capability and read-only enforcement separate; no interview mutations or writes while native Plan is active or state/permissions are unknown.
- Prepare the complete draft before a single positive checkpoint; retain unchanged approval across any required host exit.
- Honor the explicit Plan refusal even when surface/experience/control evidence is incomplete; do not request Plan again or label it technically unavailable.
- Missing filesystem evidence remains indeterminate; do not probe enforcement with a write.
