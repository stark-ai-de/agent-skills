# Codex Web Indeterminate Plan Evidence

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` on Codex web. The current composer and Plan state are not
observable; no slash-menu or mode-control evidence is available.

## Runtime Context

- `surface: web`
- `experience: codex`
- `plan_control: unknown`
- `plan_state: unknown`
- `evidence_source: none`
- `host_version: unknown`
- `confidence: absent`
- The current surface is Codex web.
- The current composer has not been enumerated.
- No Plan banner, control, or active-state evidence is visible.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- not_contains: Planning capability: Unavailable
- not_contains: /plan Use $architecture-compass

- contains: no-write conversation
- contains: unknown state never authorizes writes

## Expected Behavior

Report the uncertain capability without inventing a control, mode transition, or positive absence. Continue permitted no-write conversation and proven non-mutating discovery. Unknown state never authorizes writes; obtain only the missing state needed for a requested transition or a later write. Product identity, missing slash commands, documentation alone, and a busy menu are not live control evidence.
