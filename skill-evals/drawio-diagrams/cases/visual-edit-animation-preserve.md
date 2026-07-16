# Visual Preserve Existing Animation Policy

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Starting from the supplied existing diagram, preserve `service` -> `library`, add Worker ID `worker` and Audit Store ID `audit-store` with a labelled `worker` -> `audit-store` write relationship. Save the uncompressed source as `animation-preserved.drawio` and export `animation-preserved.svg`. Do not otherwise rebaseline motion in the file.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/animation-static-dependency.drawio

## Expected Behavior

- Detect and preserve the existing file's animation policy instead of applying creation defaults globally.
- Keep the pre-existing static dependency unchanged and make the new write edge consistent with the file.
- Preserve unknown cells and IDs, and validate with `--animation preserve`.
- Export and inspect the exact SVG for the old and new relationships.

## Deterministic Assertions

- contains: animation-preserved.drawio
- contains: animation-preserved.svg
- contains: --animation preserve
- contains: imports

## Visual Assertions

- artifact_exists: animation-preserved.drawio
- drawio_valid: animation-preserved.drawio animation_off=1 uncompressed=1
- drawio_graph: animation-preserved.drawio ids=service,library,worker,audit-store edges=service>library,worker>audit-store
- artifact_exists: animation-preserved.svg
- svg_valid: animation-preserved.svg
- svg_contains: animation-preserved.svg Service
- svg_contains: animation-preserved.svg Library
- svg_contains: animation-preserved.svg imports
- svg_contains: animation-preserved.svg Worker
- svg_contains: animation-preserved.svg Audit Store
- svg_contains: animation-preserved.svg write
