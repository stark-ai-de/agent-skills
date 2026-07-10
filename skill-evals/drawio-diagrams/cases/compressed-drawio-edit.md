# Compressed Drawio Edit

## Prompt

```text
Use $drawio-diagrams to edit a .drawio file whose diagram page stores a compressed payload. Add a Queue node without losing the original page content.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/compressed-page-before.drawio

## Expected Behavior

- Detect and inflate compressed diagram payloads before editing.
- Preserve the original page structure and IDs where possible.
- Add the Queue node as a minimal editable change.
- Re-validate the resulting file after writing.

## Deterministic Assertions

- contains: compressed
- contains: preserve
- contains: validate_drawio.py
