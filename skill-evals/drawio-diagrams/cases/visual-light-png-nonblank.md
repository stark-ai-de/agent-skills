# Visual Light PNG Nonblank

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create an editable draw.io diagram for Client -> API -> Queue -> Worker, export a light PNG render, and inspect the generated image for blank output, clipped labels, unreadable text, and node overlap.
```

## Should Trigger

Yes

## Expected Behavior

- Create valid editable `.drawio` XML before exporting.
- Run `render-drawio.mjs` and treat missing draw.io Desktop CLI as an eval-environment failure.
- Inspect the generated light PNG artifact rather than only reporting the source XML.
- Report artifact path, dimensions, and nonblank status.

## Deterministic Assertions

- contains: render-drawio.mjs
- contains: PNG
- contains: visual

## Visual Assertions

- artifact_exists: \*.png
- png_nonblank: \*.png min_size=1000
- png_dimensions: \*.png min_width=400 min_height=200
