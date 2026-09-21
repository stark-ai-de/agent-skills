# ChatGPT Non-Slash Native Plan Control

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT Work on the web.
- The user reports a native Plan toggle that is visible and inactive.
- No `/plan` slash is present.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook delivery. Interview me before producing the spec.

## Expected Behavior

- Continue permissible repository discovery and the material requirements conversation without requiring a manual Plan switch or complete UI enumeration.
- Keep planning capability and read-only enforcement separate; no interview mutations or writes while native Plan is active or state/permissions are unknown.
- Prepare the complete draft before a single positive checkpoint; retain unchanged approval across any required host exit.
- For a requested or necessary transition, use only the observed control and real client syntax; this optional transition does not block independent reads or the interview.
- No inline parsing is proved: use a separate continuation if a mode command is needed. On ChatGPT web select the composer item instead of generating a CLI combined command.
- Missing filesystem evidence remains indeterminate; do not probe enforcement with a write.
