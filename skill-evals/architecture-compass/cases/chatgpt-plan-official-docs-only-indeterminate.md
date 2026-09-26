# ChatGPT Official Docs Alone Stay Indeterminate

## Should Trigger

Yes.

## Prompt

Run `plan-refactor` on ChatGPT Work on the web. Official documentation says
`/plan` can exist, but the current composer and Plan state were not observed.

## Runtime Context

- `surface: web`
- `experience: work`
- `plan_control: slash_plan_command`
- `plan_state: inactive`
- `evidence_source: official_docs_for_this_surface`
- `host_version: unknown`
- `confidence: inferred`
- No current-composer enumeration is available.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- not_contains: Planning capability: Available but inactive
- not_contains: Planning capability: Unavailable
- not_contains: select the observed `/plan` item
- not_contains: /plan Use $architecture-compass

- contains: no-write conversation
- contains: unknown state never authorizes writes

## Expected Behavior

Report the uncertain capability without inventing a control, mode transition, or positive absence. Continue permitted no-write conversation and proven non-mutating discovery. Unknown state never authorizes writes; obtain only the missing state needed for a requested transition or a later write. Product identity, missing slash commands, documentation alone, and a busy menu are not live control evidence.
