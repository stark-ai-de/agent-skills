# Sequence Diagram Editable

## Prompt

```text
Create an editable draw.io sequence diagram for Browser, API, Auth Service, Database, and Queue.
```

## Should Trigger

Yes

## Expected Behavior

- Use editable draw.io shapes for participants, lifelines, and messages.
- Keep message order legible from top to bottom.
- Avoid depending on a non-editable screenshot or Mermaid-only output.
- Validate the generated `.drawio` XML.

## Deterministic Assertions

- contains: editable
- contains: sequence
- contains: validate_drawio.py
