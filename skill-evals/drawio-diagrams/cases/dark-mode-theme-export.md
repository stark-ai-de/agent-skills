# Dark Mode Theme Export

## Prompt

```text
Use $drawio-diagrams to create a light/dark compatible architecture diagram and export a dark SVG only if the local draw.io CLI works.
```

## Should Trigger

Yes

## Expected Behavior

- Use draw.io-compatible dark-mode theming instead of separate hard-coded files when possible.
- Prefer `light-dark(...)` colors and `adaptiveColors`.
- Validate the XML before exporting.
- Export dark SVG only when `render-drawio.mjs` can find a local draw.io Desktop CLI.

## Deterministic Assertions

- contains: light-dark(
- contains: adaptiveColors
- contains: render-drawio.mjs
