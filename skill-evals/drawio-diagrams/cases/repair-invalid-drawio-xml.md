# Repair Invalid Drawio XML

## Prompt

```text
Use $drawio-diagrams to repair a .drawio file that has duplicate IDs, a missing root layer, and an edge without relative geometry.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/example-broken.drawio

## Expected Behavior

- Parse and diagnose validation errors before changing the file.
- Repair duplicate IDs, base root/layer cells, and edge geometry.
- Preserve recoverable content.
- Re-run validation and report remaining warnings.

## Deterministic Assertions

- contains: duplicate
- contains: relative
- contains: validate_drawio.py
