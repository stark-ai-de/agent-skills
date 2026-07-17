# Visual Animated And Static Export Completeness

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create `incident-request-path.drawio` for Client (`client`) -> API (`api`) -> Queue (`queue`) -> Worker (`worker`) -> Database (`database`). Export an animated `incident-request-path.svg` and a static `incident-request-path.png` suitable for a printed runbook. Keep HTTPS, publish, consume, and SQL labels visible.
```

## Should Trigger

Yes

## Expected Behavior

- Animate the directed request, event, and data flows in the source and SVG by default.
- Keep arrowheads, labels, protocols, and sequence understandable in the static PNG.
- Validate the source with animation enabled before exporting.
- Inspect both exact exports and report their paths and motion/static limitations.

## Deterministic Assertions

- contains: incident-request-path.drawio
- contains: incident-request-path.svg
- contains: incident-request-path.png
- contains: --animation on

## Visual Assertions

- artifact_exists: incident-request-path.drawio
- drawio_valid: incident-request-path.drawio animation_on=1
- drawio_graph: incident-request-path.drawio ids=client,api,queue,worker,database edges=client>api,api>queue,queue>worker,worker>database
- artifact_exists: incident-request-path.svg
- artifact_exists: incident-request-path.png
- svg_valid: incident-request-path.svg
- svg_has_flow_animation: incident-request-path.svg
- svg_contains: incident-request-path.svg HTTPS
- svg_contains: incident-request-path.svg publish
- svg_contains: incident-request-path.svg consume
- svg_contains: incident-request-path.svg SQL
- png_dimensions: incident-request-path.png min_width=900 min_height=300
- png_nonblank: incident-request-path.png min_size=2500
