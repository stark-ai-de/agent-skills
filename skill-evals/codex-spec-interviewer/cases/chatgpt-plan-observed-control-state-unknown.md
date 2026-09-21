# ChatGPT Observed Plan Control With Unknown State

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT desktop Chat, not Codex in the ChatGPT desktop app.
- `/plan` is visible in the current controls.
- The host does not expose whether Plan mode is active or inactive.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Expected Behavior

- Continue permissible repository discovery and the material requirements conversation without requiring a manual Plan switch or complete UI enumeration.
- Keep planning capability and read-only enforcement separate; no interview mutations or writes while native Plan is active or state/permissions are unknown.
- Prepare the complete draft before a single positive checkpoint; retain unchanged approval across any required host exit.
- Keep unsupported or missing evidence indeterminate; do not infer a native control or technical absence. Resolve a capability question only when the next required action depends on it.
- Missing filesystem evidence remains indeterminate; do not probe enforcement with a write.
