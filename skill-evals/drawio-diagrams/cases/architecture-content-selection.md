# Architecture Content Selection

## Prompt

```text
Create a one-page editable draw.io runtime architecture diagram for engineers from a repository that contains an API, worker, queue, database, test fixtures, build scripts, generated files, and local developer tooling.
```

## Should Trigger

Yes

## Split Family

architecture-default-quality

## Expected Behavior

- Show runtime components, external actors, system boundaries, and meaningful request, event, and data flows.
- Include trust or deployment boundaries only when they help this audience reason about runtime behavior.
- Omit generated files, routine build scripts, test fixtures, and implementation inventory from the overview.
- Move useful but secondary detail to a separate page or leave it for later expansion instead of crowding the overview.

## Deterministic Assertions

- contains: runtime
- contains: boundaries
- regex: omit|exclude|secondary detail
- contains: validate_drawio.py
