# Create Architecture Diagram

## Prompt

```text
Create an editable draw.io architecture diagram for a client, API gateway, worker, PostgreSQL database, and Redis cache.
```

## Should Trigger

Yes

## Split Family

architecture-default-quality

## Expected Behavior

- Build a semantic model before drawing.
- Choose direct XML or a verified MCP authoring path; use Desktop CLI only for a requested export whose smoke test succeeds.
- Use editable `.drawio` XML with stable IDs and geometry.
- Give every primary component a real product/service logo or a relevant labelled semantic icon; do not use bare text-only cards.
- Validate the result and report export or dark-mode verification status.

## Deterministic Assertions

- contains: .drawio
- contains: validate_drawio.py
- contains: editable
