# Unknown Experience Still Blocks Refusal Routing

## Should Trigger

Yes.

## Runtime Context

- `surface: web`
- `experience: unknown`
- `plan_control: unknown`
- `plan_state: unknown`
- `evidence_source: none`
- `host_version: unknown`
- `confidence: absent`
- The user explicitly declined a previously recommended Plan transition.
- The host cannot distinguish the required routing field.

## Prompt

Use Codex Spec Interviewer to define a safe polling-to-webhook migration. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: Read-only enforcement: indeterminate
- not_contains: Planning capability: Explicitly declined
- not_contains: continue conversationally
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

Keep the early routing gate before refusal; ask only for the missing surface/experience and wait without asking for Plan again.
