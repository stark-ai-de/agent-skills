# Codex Web Enumerated None-Proven Plan Unavailable

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
- The current surface is Codex web.
- The user enumerated current composer controls and stated that no Plan control
  is present.
- The user has not declined a recommended Plan transition; Plan was proven
  absent by that enumeration.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Expected Behavior

- Continue permissible repository discovery and the material requirements conversation without requiring a manual Plan switch or complete UI enumeration.
- Keep planning capability and read-only enforcement separate; no interview mutations or writes while native Plan is active or state/permissions are unknown.
- Prepare the complete draft before a single positive checkpoint; retain unchanged approval across any required host exit.
- Record the positive enumeration as evidence of unavailable Plan; use ordinary conversation without claiming a native transition.
- Missing filesystem evidence remains indeterminate; do not probe enforcement with a write.
