# Live MCP Editing Path

## Prompt

```text
Use $drawio-diagrams in this text-only eval to describe the exact bounded workflow you would use when a draw.io document is already open through a configured live editor/MCP. The intended edit adds Queue between API and Worker, labels the two edges `publish` and `consume`, previews it, and saves `queue-live-edit.drawio`. Do not claim that this text-only run accessed the editor, previewed, or saved anything.
```

## Should Trigger

Yes

## Expected Behavior

- Describe the already configured live MCP/editor path without installing tools or rewriting configuration.
- Bound the planned Queue edit, preview, save, and local validation steps precisely.
- Do not fabricate live-preview, save, or validation success in the text-only environment.
- Explain that an artifact-capable run would save `queue-live-edit.drawio` without a duplicate approval gate and then validate it locally.

## Deterministic Assertions

- contains: MCP
- contains: queue-live-edit.drawio
- contains: validate_drawio.py
- contains: local
- regex: text-only|cannot (?:access|claim)|would (?:preview|save|validate)
