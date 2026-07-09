# Create Architecture Diagram

## Prompt

```text
Use $drawio-diagrams to create an editable draw.io architecture diagram for a client, API gateway, worker, PostgreSQL database, and Redis cache.
```

## Should Trigger

Yes

## Expected Behavior

- Build a semantic model before drawing.
- Choose direct XML or a CLI-assisted path based on available tools.
- Use editable `.drawio` XML with stable IDs and geometry.
- Prefer native stencils or generic labeled shapes.
- Validate the result and report export or dark-mode verification status.

## Deterministic Assertions

- contains: .drawio
- contains: validate_drawio.py
- contains: editable
