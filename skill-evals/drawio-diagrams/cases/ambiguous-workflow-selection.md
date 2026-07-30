# Ambiguous Workflow Selection

## Prompt

Use Draw.io Diagrams for this architecture artifact.

## Should Trigger

Yes

## Expected Behavior

- Show `create`, `edit-repair`, `review`, and `export` with concise outcomes and material write/approval boundaries.
- State that the task does not reveal whether to create, change, review, or merely export an artifact, then ask the user to choose or provide the missing outcome.
- Do not inspect source/diagram files, detect tools, open hosted services, render, export, or mutate before resolution.

## Deterministic Assertions

- contains: create
- contains: edit-repair
- contains: review
- contains: export
- contains: ambiguous
- not_contains: validation completed
