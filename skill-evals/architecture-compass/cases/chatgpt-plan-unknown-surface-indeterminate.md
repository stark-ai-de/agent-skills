# ChatGPT Unknown Surface Is Indeterminate

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` with this complete observation record:

- `surface: unknown`
- `experience: chat`
- `plan_control: slash_plan_command`
- `plan_state: inactive`
- `evidence_source: user_report`
- `host_version: unknown`
- `confidence: observed`

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: distinguishable surface
- contains: wait
- not_contains: Planning capability: Active
- not_contains: Planning capability: Available but inactive
- not_contains: Planning capability: Unavailable
- not_contains: portable in-chat planning fallback
- not_contains: /plan Use

## Expected Behavior

An explicit unknown surface is not non-web evidence. Stop before every active,
web, non-web, fallback, or handoff branch, ask for a distinguishable surface,
and wait.
