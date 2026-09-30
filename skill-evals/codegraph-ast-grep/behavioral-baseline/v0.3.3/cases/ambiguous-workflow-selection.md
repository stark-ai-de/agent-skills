# Ambiguous Workflow Selection

## Should Trigger

Yes.

## Prompt

Use the CodeGraph and ast-grep skill for this repository.

## Expected Behavior

- Show exactly `setup`, `update`, and `doctor` with concise outcomes and relevant write/authority boundaries.
- State that the intent is ambiguous and ask the user to choose; do not invent an `auto` mode.
- Do not inspect tool or repository state, open a graph, query remote metadata, or mutate files before the choice.
