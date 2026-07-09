# Visual Dark SVG Readability

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create a light/dark compatible editable architecture diagram with Client, API, Queue, Worker, and Database nodes. Export a dark SVG render and inspect it for readable labels and dark-mode contrast.
```

## Should Trigger

Yes

## Expected Behavior

- Use `adaptiveColors="auto"` and `light-dark(...)` colors in the source diagram.
- Run `render-drawio.mjs` to produce a dark SVG and treat missing draw.io Desktop CLI as an eval-environment failure.
- Inspect the generated SVG artifact for readable labels and contrast-sensitive styling.
- Keep Client, API, Queue, Worker, and Database labels visible in the rendered artifact.
- Report dark SVG verification and artifact path.

## Deterministic Assertions

- contains: dark SVG
- contains: light-dark(
- contains: render-drawio.mjs

## Visual Assertions

- artifact_exists: *.svg
- svg_valid: *.svg
- svg_contains: *.svg Client
- svg_contains: *.svg API
- svg_contains: *.svg Queue
- svg_contains: *.svg Worker
- svg_contains: *.svg Database
