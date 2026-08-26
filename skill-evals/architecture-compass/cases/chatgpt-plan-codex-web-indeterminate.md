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
- contains: wait
- not_contains: Planning capability: Unavailable
- not_contains: portable in-chat planning fallback
- not_contains: /plan Use $architecture-compass

## Expected Behavior

Stop and request current-composer or host confirmation. Do not fall back and do
not emit a Codex web handoff from missing evidence.
