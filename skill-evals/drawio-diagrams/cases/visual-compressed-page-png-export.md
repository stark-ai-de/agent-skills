# Visual Compressed Page PNG Export

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Edit the provided compressed draw.io page by adding a Queue node, preserve the original Client, API, and Database content, export a light PNG render, and inspect that the image is not blank or clipped.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/compressed-page-before.drawio

## Expected Behavior

- Detect and inflate the compressed diagram payload before editing.
- Preserve the original Client, API, and Database nodes and their dependencies.
- Add an editable Queue node as a minimal source-level change.
- Validate the resulting `.drawio` file before exporting.
- Run `render-drawio.mjs` and treat missing draw.io Desktop CLI as an eval-environment failure.
- Inspect the PNG artifact and report nonblank status, dimensions, and any clipping or overlap.

## Deterministic Assertions

- contains: compressed
- contains: Queue
- contains: render-drawio.mjs
- contains: PNG

## Visual Assertions

- artifact_exists: \*.png
- png_nonblank: \*.png min_size=1000
- png_dimensions: \*.png min_width=400 min_height=200
