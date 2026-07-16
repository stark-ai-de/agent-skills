# Visual Existing Edit PNG Export

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Edit the provided existing architecture diagram by preserving the `client`, `api`, and `database` cells, adding a Cache node with stable ID `cache`, and rerouting the existing API-to-Database flow as API -> Cache -> Database. Save the uncompressed editable source as `cache-edit.drawio`, use `render-drawio.mjs` to export `cache-edit.drawio.png` and `cache-edit.dark.svg`, and inspect the image for blank output, clipped labels, and node overlap.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/existing-edit-before.drawio

## Expected Behavior

- Preserve the existing `client`, `api`, and `database` cell IDs.
- Add an editable Cache node with stable ID `cache` between API and Database.
- Replace the direct API-to-Database flow with API-to-Cache and Cache-to-Database edges while preserving Client-to-API.
- Validate the edited `.drawio` file before exporting.
- Run `render-drawio.mjs` to produce `cache-edit.drawio.png` and `cache-edit.dark.svg`; treat missing draw.io Desktop CLI as an eval-environment failure.
- Inspect those exact PNG and SVG artifacts and report nonblank status, dimensions, and any visual defects.

## Deterministic Assertions

- contains: Cache
- contains: cache-edit.drawio
- contains: cache-edit.dark.svg
- contains: validate_drawio.py
- contains: render-drawio.mjs
- contains: cache-edit.drawio.png

## Visual Assertions

- artifact_exists: cache-edit.drawio
- drawio_valid: cache-edit.drawio uncompressed=1
- drawio_graph: cache-edit.drawio ids=client,api,database,cache edges=client>api,api>cache,cache>database not_edges=api>database
- artifact_exists: cache-edit.drawio.png
- png_nonblank: cache-edit.drawio.png min_size=1000
- png_dimensions: cache-edit.drawio.png min_width=400 min_height=200
- artifact_exists: cache-edit.dark.svg
- svg_valid: cache-edit.dark.svg
- svg_contains: cache-edit.dark.svg Client
- svg_contains: cache-edit.dark.svg API
- svg_contains: cache-edit.dark.svg Database
- svg_contains: cache-edit.dark.svg Cache
