# Visual Existing Edit PNG Export

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Edit the provided existing architecture diagram by adding a Cache node between API and Database, preserve Client, API, and Database, export a light PNG render, and inspect the image for blank output, clipped labels, and node overlap.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/existing-edit-before.drawio

## Expected Behavior

- Preserve the existing Client, API, and Database nodes and stable IDs where possible.
- Add an editable Cache node between API and Database.
- Reroute API-to-Database flow through Cache or clearly preserve the original dependency while showing the cache relationship.
- Validate the edited `.drawio` file before exporting.
- Run `render-drawio.mjs` and treat missing draw.io Desktop CLI as an eval-environment failure.
- Inspect the PNG artifact and report nonblank status, dimensions, and any visual defects.

## Deterministic Assertions

- contains: Cache
- contains: validate_drawio.py
- contains: render-drawio.mjs
- contains: PNG

## Visual Assertions

- artifact_exists: \*.png
- png_nonblank: \*.png min_size=1000
- png_dimensions: \*.png min_width=400 min_height=200
