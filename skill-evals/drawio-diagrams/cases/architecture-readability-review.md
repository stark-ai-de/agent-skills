# Architecture Readability Review

## Prompt

```text
Use $drawio-diagrams to create or revise an editable draw.io architecture diagram with these relationships: external clients and external webhooks call the API; the API publishes through Redis/BullMQ to a worker; the worker fans out to browser lanes, storage, and local mocks; queue dashboards observe Redis/BullMQ; shared packages are dependencies of API and worker. Keep package boundaries in a bottom row or detail view. Export light and dark renders if the local draw.io CLI is available.
```

## Should Trigger

Yes

## Expected Behavior

- Model the architecture before XML authoring.
- Reserve gutters for connector rails and labels.
- Keep edge labels off section borders.
- Use label backgrounds or explicit label cells for dense routes.
- Split worker fan-out into separate lanes or a clear outbound junction.
- Balance whitespace in the core runtime band.
- Treat package boundaries as grouped dependencies or a detail page/layer.
- Preserve real logo artwork with consistent neutral chips.
- Distinguish component titles from descriptions, ports, and metadata.
- Validate the `.drawio` file and report visual and dark-mode verification honestly.

## Deterministic Assertions

- contains: connector rails
- contains: label backgrounds
- contains: validate_drawio.py
