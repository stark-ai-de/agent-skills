# API Migration Plan

## Should Trigger

Yes.

## Prompt

We need to migrate the public client from the old REST endpoints to the new typed API layer without breaking existing consumers. Turn this into a Codex-ready plan.

## Fixtures

- skill-evals/codex-spec-interviewer/fixtures/service-boundary-notes.md

## Expected Artifacts

- skill-evals/codex-spec-interviewer/expected/standard-spec-sections.md
- skill-evals/codex-spec-interviewer/expected/adr-gate-expectations.md

## Deterministic Assertions

- contains: migration
- contains: backward compatibility
- contains: ADR
- contains: validation

## Expected Behavior

- Identify compatibility and rollout constraints.
- Include phased implementation tasks and validation gates.
- Run the ADR gate for any durable API contract or boundary change.
- Preserve non-goals such as unrelated endpoint rewrites.
