# Ambiguous Bug Report

## Should Trigger

Yes.

## Prompt

Users say saved reports sometimes disappear after refresh. I need a proper implementation spec before anyone changes the persistence code.

## Fixtures

- skill-evals/codex-spec-interviewer/fixtures/minimal-repo-layout.md

## Expected Artifacts

- skill-evals/codex-spec-interviewer/expected/standard-spec-sections.md

## Deterministic Assertions

- contains: implementation spec
- contains: validation
- contains: persistence
- not_contains: fixed

## Expected Behavior

- Inspect repo instructions and persistence-related files before assuming the cause.
- Ask only for missing reproduction details that cannot be discovered locally.
- Produce a spec with acceptance criteria, file areas, validation commands, rollback notes, and done-when criteria.
- Mark unresolved reproduction facts as assumptions or open questions instead of inventing them.
