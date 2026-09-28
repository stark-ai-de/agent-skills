# Explicit Options Request

## Should Trigger

Yes.

## Prompt

Show me every workflow offered by codegraph-ast-grep and explain when I should use each. Do not start work yet.

## Expected Behavior

- Show the complete finite workflow inventory in canonical order: `setup`, `update`, `doctor`. Preserve any documented recommendation. Explain each outcome and write boundary. Do not select a mutating workflow, inspect task data, create artifacts, launch tools or start implementation merely because options were requested. Ask only if the user subsequently requests work with an unresolved outcome or authority boundary.

## Deterministic Assertions

- contains: setup
- contains: update
- contains: doctor
- not_contains: implementation completed
- not_contains: backup created
