# Visual Compressed Page PNG Export

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Edit the provided compressed draw.io page by preserving the `client`, `api`, `worker`, and `database` cells, adding Queue with stable ID `queue` between API and Worker, and rerouting API -> Worker as API -> Queue -> Worker. Save the uncompressed editable source as `compressed-queue.drawio`, use `render-drawio.mjs` to export `compressed-queue.drawio.png` and `compressed-queue.dark.svg`, and inspect that the image is not blank or clipped.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/compressed-page-before.drawio

## Expected Behavior

- Detect and inflate the compressed diagram payload before editing.
- Preserve the original Client, API, Worker, and Database IDs plus Client-to-API and Worker-to-Database dependencies.
- Add editable Queue ID `queue` and replace API-to-Worker with API-to-Queue and Queue-to-Worker.
- Validate the resulting `.drawio` file before exporting.
- Run `render-drawio.mjs` to produce `compressed-queue.drawio.png` and `compressed-queue.dark.svg`; treat missing draw.io Desktop CLI as an eval-environment failure.
- Inspect those exact PNG and SVG artifacts and report nonblank status, dimensions, and any clipping or overlap.

## Deterministic Assertions

- contains: compressed
- contains: Queue
- contains: compressed-queue.drawio
- contains: compressed-queue.dark.svg
- contains: render-drawio.mjs
- contains: compressed-queue.drawio.png

## Visual Assertions

- artifact_exists: compressed-queue.drawio
- drawio_valid: compressed-queue.drawio uncompressed=1
- drawio_graph: compressed-queue.drawio ids=client,api,queue,worker,database edges=client>api,api>queue,queue>worker,worker>database not_edges=api>worker
- artifact_exists: compressed-queue.drawio.png
- png_nonblank: compressed-queue.drawio.png min_size=1000
- png_dimensions: compressed-queue.drawio.png min_width=400 min_height=200
- artifact_exists: compressed-queue.dark.svg
- svg_valid: compressed-queue.dark.svg
- svg_contains: compressed-queue.dark.svg Client
- svg_contains: compressed-queue.dark.svg API
- svg_contains: compressed-queue.dark.svg Worker
- svg_contains: compressed-queue.dark.svg Database
- svg_contains: compressed-queue.dark.svg Queue
