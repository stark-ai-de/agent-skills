# Batch Job Refactor

## Should Trigger

Yes.

## Prompt

Our nightly import job is too fragile. I want a refactor spec that reduces retry bugs and makes failures easier to diagnose.

## Fixtures

- skill-evals/codex-spec-interviewer/fixtures/service-boundary-notes.md

## Deterministic Assertions

- contains: retry
- contains: observability
- contains: validation
- contains: rollback

## Expected Behavior

- Inspect existing job, retry, logging, and validation patterns.
- Define reliability requirements and failure handling.
- Include focused tests or smoke checks for retries and diagnostics.
- Avoid rewriting unrelated job infrastructure unless source evidence requires it.
