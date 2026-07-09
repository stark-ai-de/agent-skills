# Architecture Readability Review

Prompt:

```text
Use $drawio-diagrams to create or revise an editable draw.io architecture diagram with external clients, API, Redis/BullMQ, a worker, browser lanes, storage, local mocks, queue dashboards, external webhooks, and a bottom row of shared package boundaries. Export light and dark renders if the local draw.io CLI is available.
```

Expected: activate. The skill should model the architecture before XML authoring, reserve gutters for connector rails and labels, keep edge labels off section borders, use label backgrounds or explicit label cells for dense routes, split worker fan-out into separate lanes or a clear outbound junction, balance whitespace in the core runtime band, treat package boundaries as grouped dependencies or a detail page/layer, preserve real logo artwork with consistent neutral chips, distinguish component titles from descriptions/ports/metadata, validate the `.drawio` file, and report visual/dark-mode verification honestly.
