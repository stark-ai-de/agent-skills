# Visual Multi Page Dark SVG Export

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Edit only the Data Path page of the provided multi-page draw.io file by adding an Audit Log node connected to API, preserve the Runtime page unchanged, export a dark SVG render for inspection, and verify that labels remain readable.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/multi-page.drawio

## Expected Behavior

- Identify the Data Path page before editing.
- Preserve the Runtime page and unknown cells unchanged.
- Add an editable Audit Log node connected to API on the Data Path page.
- Keep API and Database visible and readable in the edited page.
- Validate all pages after the edit.
- Run `render-drawio.mjs` with `--page-index 2` to export the edited Data Path page as a dark SVG artifact and treat missing draw.io Desktop CLI as an eval-environment failure.
- Inspect the dark SVG artifact for label readability and theme-aware styling.

## Deterministic Assertions

- contains: Data Path
- contains: Runtime
- contains: Audit Log
- contains: dark SVG
- contains: render-drawio.mjs
- contains: --page-index 2

## Visual Assertions

- artifact_exists: \*.svg
- svg_valid: \*.svg
- svg_contains: \*.svg API
- svg_contains: \*.svg Database
- svg_contains: \*.svg Audit Log
