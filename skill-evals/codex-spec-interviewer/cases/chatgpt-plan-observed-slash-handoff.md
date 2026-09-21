# ChatGPT Observed Slash Plan Handoff

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT desktop Chat, not Codex in the ChatGPT desktop app.
- `/plan` is visible in the current controls and Plan mode is inactive.
- Codex Spec Interviewer is not yet selected in the composer.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Expected Behavior

- Continue permissible repository discovery and the material requirements conversation without requiring a manual Plan switch or complete UI enumeration.
- Keep planning capability and read-only enforcement separate; no interview mutations or writes while native Plan is active or state/permissions are unknown.
- Prepare the complete draft before a single positive checkpoint; retain unchanged approval across any required host exit.
- For a requested or necessary transition, use only the observed control and real client syntax; this optional transition does not block independent reads or the interview.
- No inline parsing is proved: use a separate continuation if a mode command is needed. On ChatGPT web select the composer item instead of generating a CLI combined command.
- Missing filesystem evidence remains indeterminate; do not probe enforcement with a write.
