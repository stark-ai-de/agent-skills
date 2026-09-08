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
- contains: ask whether Plan is available
- not_contains: Planning capability: Available but inactive
- not_contains: Planning capability: Unavailable
- not_contains: portable in-chat planning fallback
- not_contains: select the observed `/plan` item
- not_contains: /plan Use $architecture-compass

## Expected Behavior

Official documentation may describe a possible control but cannot prove this
turn's composer or Plan state. Ask for current-composer evidence and wait.
