# MCP Unavailable Fallback

## Prompt

```text
Use $drawio-diagrams to create an editable deployment diagram, but the draw.io MCP server is not configured in this environment.
```

## Should Trigger

Yes

## Expected Behavior

- Do not attempt to install or configure MCP automatically.
- Use direct XML instead; use a local Desktop CLI only to export or render the completed source when requested and verified.
- Validate the generated file.
- Report the unavailable MCP path as a limitation, not a failure.

## Deterministic Assertions

- contains: MCP
- contains: direct XML
- contains: validate_drawio.py
