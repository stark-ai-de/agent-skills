# ChatGPT Unknown Experience Is Indeterminate

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` with this complete observation record:

- `surface: web`
- `experience: unknown`
- `plan_control: slash_plan_command`
- `plan_state: inactive`
- `evidence_source: user_report`
- `host_version: unknown`
- `confidence: observed`

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- not_contains: Planning capability: Active
- not_contains: Planning capability: Available but inactive
- not_contains: Planning capability: Unavailable
- not_contains: /plan Use

- contains: no-write conversation
- contains: unknown state never authorizes writes

## Expected Behavior

Report the uncertain capability without inventing a control, mode transition, or positive absence. Continue permitted no-write conversation and proven non-mutating discovery. Unknown state never authorizes writes; obtain only the missing state needed for a requested transition or a later write. Product identity, missing slash commands, documentation alone, and a busy menu are not live control evidence.
