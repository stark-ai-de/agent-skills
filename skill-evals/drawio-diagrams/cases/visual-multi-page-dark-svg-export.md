# Visual Multi Page Dark SVG Export

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Edit only the Data Path page of the provided multi-page draw.io file by adding Audit Log with stable ID `audit-log` and a directed API-to-Audit-Log edge. Preserve the Runtime page's `runtime-client` -> `runtime-api` semantic graph, save the uncompressed source as `multi-page-audit.drawio`, and run `render-drawio.mjs multi-page-audit.drawio --page-index 2` to export `multi-page-audit.drawio.png` plus `multi-page-audit.dark.svg`. Verify that the Data Path labels remain readable.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/multi-page.drawio

## Expected Behavior

- Identify the Data Path page before editing.
- Preserve the Runtime page's Client, API, stable IDs, and directed relationship without requiring byte-identical formatting.
- Add an editable Audit Log node connected to API on the Data Path page.
- Keep API and Database visible and readable in the edited page.
- Validate all pages after the edit.
- Run `render-drawio.mjs` with `--page-index 2` to export the edited Data Path page as `multi-page-audit.drawio.png` and `multi-page-audit.dark.svg`; treat missing draw.io Desktop CLI as an eval-environment failure.
- Inspect `multi-page-audit.dark.svg` for label readability and theme-aware styling.

## Deterministic Assertions

- contains: Data Path
- contains: Runtime
- contains: Audit Log
- contains: multi-page-audit.dark.svg
- contains: render-drawio.mjs
- contains: --page-index 2

## Visual Assertions

- artifact_exists: multi-page-audit.drawio
- drawio_valid: multi-page-audit.drawio min_pages=2 uncompressed=1
- drawio_graph: multi-page-audit.drawio page=Runtime ids=runtime-client,runtime-api edges=runtime-client>runtime-api
- drawio_graph: multi-page-audit.drawio page=Data%20Path ids=data-api,data-db,audit-log edges=data-api>data-db,data-api>audit-log
- artifact_exists: multi-page-audit.dark.svg
- svg_valid: multi-page-audit.dark.svg
- svg_contains: multi-page-audit.dark.svg API
- svg_contains: multi-page-audit.dark.svg Database
- svg_contains: multi-page-audit.dark.svg Audit Log
