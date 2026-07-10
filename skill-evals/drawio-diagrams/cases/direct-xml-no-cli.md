# Direct XML No CLI

## Prompt

```text
Use $drawio-diagrams to create a simple editable dependency graph even though draw.io Desktop and MCP tools are unavailable.
```

## Should Trigger

Yes

## Expected Behavior

- Fall back to direct XML authoring.
- Use valid editable `.drawio` XML with root/layer cells, vertices, edges, and geometry.
- Run script-based validation when Python is available.
- Disclose that CLI export was skipped.

## Deterministic Assertions

- contains: direct XML
- contains: validate_drawio.py
- contains: skipped
