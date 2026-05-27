# Persistence Layer Change

## Should Trigger

Yes.

## Prompt

Move audit events from local files into the database. I want a spec with migration, validation, and rollback before code changes.

## Expected Artifacts

- skill-evals/codex-spec-interviewer/expected/adr-gate-expectations.md

## Deterministic Assertions

- contains: migration
- contains: rollback
- contains: data
- contains: ADR

## Expected Behavior

- Treat persistence ownership and migration as ADR-gated if repo policy requires it.
- Include data migration or backfill assumptions.
- Define validation for old and new storage behavior.
- Mark destructive or irreversible steps explicitly.
