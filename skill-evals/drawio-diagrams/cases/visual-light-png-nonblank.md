# Visual Light PNG Nonblank

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create an uncompressed editable `client-flow.drawio` for Client -> API -> Queue -> Worker using stable IDs `client`, `api`, `queue`, and `worker`, use `render-drawio.mjs` to export `client-flow.drawio.png` plus `client-flow.dark.svg`, and inspect the light PNG for blank output, clipped labels, unreadable text, and node overlap.
```

## Should Trigger

Yes

## Split Family

basic-export

## Expected Behavior

- Create valid editable `.drawio` XML before exporting.
- Run `render-drawio.mjs` to produce `client-flow.drawio.png` and `client-flow.dark.svg`; treat missing draw.io Desktop CLI as an eval-environment failure.
- Inspect `client-flow.drawio.png` rather than only reporting the source XML.
- Report artifact path, dimensions, and nonblank status.

## Deterministic Assertions

- contains: render-drawio.mjs
- contains: client-flow.drawio.png
- contains: visual

## Visual Assertions

- artifact_exists: client-flow.drawio
- drawio_valid: client-flow.drawio animation_on=1 uncompressed=1
- drawio_graph: client-flow.drawio ids=client,api,queue,worker edges=client>api,api>queue,queue>worker
- artifact_exists: client-flow.drawio.png
- png_nonblank: client-flow.drawio.png min_size=1000
- png_dimensions: client-flow.drawio.png min_width=400 min_height=200
