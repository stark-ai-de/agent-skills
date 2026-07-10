# Multi Page Preserve Edit

## Prompt

```text
Use $drawio-diagrams to edit only the Data Path page of a multi-page .drawio file and leave the Runtime page untouched.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/multi-page.drawio

## Expected Behavior

- Identify the target page before editing.
- Preserve non-target pages and unknown cells.
- Make the smallest safe edit to the Data Path page.
- Validate all pages after the edit.

## Deterministic Assertions

- contains: Data Path
- contains: preserve
- contains: validate_drawio.py
