# Direct XML No CLI

## Prompt

```text
Create a simple editable draw.io dependency graph even though draw.io Desktop and MCP tools are unavailable.
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
- contains: preflight-drawio-xml.mjs
- contains: validate_drawio.py
- regex: skipped|unavailable|fallback
- not_contains: install completed
- not_contains: export completed
