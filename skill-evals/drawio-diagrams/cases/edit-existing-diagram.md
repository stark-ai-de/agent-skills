# Edit Existing Diagram

## Prompt

```text
Use $drawio-diagrams to edit this existing Client -> API -> Database draw.io file and add Redis as a cache without disturbing the existing nodes.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/existing-edit-before.drawio

## Expected Behavior

- Read the existing file first.
- Preserve unknown cells, stable IDs, pages, layers, and existing geometry.
- Create a backup or alternate output before overwrite.
- Add the smallest safe Redis cache change.
- Validate the edited page and report any warnings.

## Deterministic Assertions

- contains: backup
- contains: preserve
- contains: validate_drawio.py
