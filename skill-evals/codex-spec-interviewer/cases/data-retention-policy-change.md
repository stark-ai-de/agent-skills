# Data Retention Policy Change

## Should Trigger

Yes.

## Prompt

We have to change how long generated exports are retained. I need the agent to spec this carefully before touching storage or cleanup jobs.

## Expected Artifacts

- skill-evals/codex-spec-interviewer/expected/adr-gate-expectations.md

## Deterministic Assertions

- contains: retention
- contains: migration
- contains: rollback
- contains: ADR

## Expected Behavior

- Treat retention, deletion, and storage ownership as durable policy-sensitive behavior.
- Include migration/backfill or cleanup considerations.
- Run the ADR gate and block implementation if policy ownership is unresolved.
- Avoid exposing customer data or private paths in examples.
