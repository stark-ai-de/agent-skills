# Validation Command Discovery

## Should Trigger

Yes.

## Prompt

Before implementing the queue cleanup feature, create the spec and figure out the exact validation commands from the repo.

## Fixtures

- skill-evals/codex-spec-interviewer/fixtures/minimal-repo-layout.md

## Deterministic Assertions

- contains: validation commands
- contains: repo
- contains: acceptance criteria
- not_contains: unspecified validation

## Expected Behavior

- Inspect package scripts, test conventions, and repo docs before listing validation.
- Mark unavailable validation as an explicit blocker or open question.
- Include acceptance criteria and done-when criteria.
- Avoid generic validation placeholders when concrete commands are discoverable.
