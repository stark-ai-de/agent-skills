# Visual Dark SVG Readability

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create a light/dark compatible editable `dark-architecture.drawio` with Client, API, Queue, Worker, and Database nodes. Use `render-drawio.mjs` to export `dark-architecture.drawio.png` plus `dark-architecture.dark.svg`, and inspect the dark SVG for readable labels and contrast.
```

## Should Trigger

Yes

## Split Family

dark-theme

## Expected Behavior

- Use `adaptiveColors="auto"` and `light-dark(...)` colors in the source diagram.
- Run `render-drawio.mjs` to produce `dark-architecture.drawio.png` and `dark-architecture.dark.svg`; treat missing draw.io Desktop CLI as an eval-environment failure.
- Inspect `dark-architecture.dark.svg` for readable labels and contrast-sensitive styling.
- Keep Client, API, Queue, Worker, and Database labels visible in the rendered artifact.
- Report dark SVG verification and artifact path.

## Deterministic Assertions

- contains: dark-architecture.dark.svg
- contains: light-dark(
- contains: render-drawio.mjs

## Visual Assertions

- artifact_exists: dark-architecture.drawio
- drawio_valid: dark-architecture.drawio
- artifact_exists: dark-architecture.dark.svg
- svg_valid: dark-architecture.dark.svg
- svg_contains: dark-architecture.dark.svg Client
- svg_contains: dark-architecture.dark.svg API
- svg_contains: dark-architecture.dark.svg Queue
- svg_contains: dark-architecture.dark.svg Worker
- svg_contains: dark-architecture.dark.svg Database
