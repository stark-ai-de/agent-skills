# Mermaid To Editable Drawio

## Prompt

```text
Use $drawio-diagrams to convert this standard Mermaid flow into editable `order-retry.drawio`, then use the installed draw.io Desktop CLI to export `order-retry.png`:

flowchart LR
  Client --> API
  API -->|accepted| Queue
  Queue --> Worker
  Worker -->|retry| Queue
  Worker --> Database
```

## Should Trigger

Yes

## Expected Behavior

- Activate because the requested final source is editable draw.io, not Mermaid-only output.
- Use a supported conversion path such as direct editable draw.io XML authoring, a configured editor/MCP, or a diagrams.net create descriptor; do not claim that the Desktop export CLI imports Mermaid source.
- Preserve labels and the retry cycle in editable diagram structure rather than embedding a flat image.
- Once the editable source exists, validate `order-retry.drawio`, use the Desktop CLI only for export, and inspect the PNG.

## Deterministic Assertions

- contains: order-retry.drawio
- contains: order-retry.png
- contains: validate_drawio.py
- regex: Mermaid|mermaid
- regex: direct (?:XML|draw\.io)|editor|MCP|create descriptor|import
- regex: inspect|visual review
