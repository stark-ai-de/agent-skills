# Export Visual Inspection

## Prompt

```text
Export a PNG from this draw.io diagram and inspect whether the output is blank, clipped, or unreadable.
```

## Should Trigger

Yes

## Split Family

basic-export

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/example-clean.drawio

## Expected Behavior

- Validate before exporting.
- Use the local draw.io Desktop CLI only if available.
- Inspect the exported PNG when generated.
- Report export status and any visual defects or skipped reason.

## Deterministic Assertions

- contains: render-drawio.mjs
- contains: PNG
- contains: validate_drawio.py
