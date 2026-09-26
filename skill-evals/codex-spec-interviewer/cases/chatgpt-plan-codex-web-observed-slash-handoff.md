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

## Expected Behavior

- Continue permissible repository discovery and the material requirements conversation without requiring a manual Plan switch or complete UI enumeration.
- Keep planning capability and read-only enforcement separate; no interview mutations or writes while native Plan is active or state/permissions are unknown.
- Prepare the complete draft before a single positive checkpoint; retain unchanged approval across any required host exit.
- For a requested or necessary transition, use only the observed control and real client syntax; this optional transition does not block independent reads or the interview.
- No inline parsing is proved: use a separate continuation if a mode command is needed. On ChatGPT web select the composer item instead of generating a CLI combined command.
- Missing filesystem evidence remains indeterminate; do not probe enforcement with a write.
