# ChatGPT Official Docs Alone Stay Indeterminate

## Should Trigger

Yes.

## Runtime Context

- The current surface is ChatGPT Work on the web.
- Official documentation says `/plan` can exist, but the current composer and
  Plan state were not observed.
- `evidence_source: official_docs_for_this_surface`
- `confidence: inferred`
- The user has not enumerated current controls or declined Plan.

## Prompt

Use Codex Spec Interviewer to define a safe migration from polling to webhook
delivery. Interview me before producing the spec.

## Deterministic Assertions

- contains: Planning capability: Indeterminate
- contains: ask whether Plan is available
- contains: wait
- not_contains: Planning capability: Available but inactive
- not_contains: Planning capability: Unavailable
- not_contains: Plan-mode fallback: unavailable
- not_contains: /plan Use $codex-spec-interviewer

## Expected Behavior

Official documentation alone cannot prove the current composer or Plan state.
Ask for current-composer evidence and wait without fallback or handoff.
