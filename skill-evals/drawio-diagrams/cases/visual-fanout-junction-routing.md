# Visual Fan-Out Junction Routing

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create an uncompressed `event-fanout.drawio` using stable IDs `event`, `junction`, `billing`, `inventory`, `fulfillment`, `analytics`, and `notifications`; export `event-fanout.png` plus `event-fanout.svg`. Route `event` through the visible `junction` to all five consumers. Use orthogonal lanes and keep every consumer label clear.
```

## Should Trigger

Yes

## Expected Behavior

- Use one explicit fan-out junction instead of five overlapping source rails.
- Reserve separate orthogonal lanes and side ports for the five consumers.
- Animate the event-flow edges while preserving arrowheads and event labels.
- Validate, export, and inspect the named PNG and SVG for crossings, border collisions, and whitespace.

## Deterministic Assertions

- contains: event-fanout.drawio
- contains: event-fanout.png
- contains: event-fanout.svg
- contains: junction
- contains: orthogonal

## Visual Assertions

- artifact_exists: event-fanout.drawio
- drawio_valid: event-fanout.drawio animation_on=1 uncompressed=1
- drawio_graph: event-fanout.drawio ids=event,junction,billing,inventory,fulfillment,analytics,notifications edges=event>junction,junction>billing,junction>inventory,junction>fulfillment,junction>analytics,junction>notifications
- artifact_exists: event-fanout.png
- png_dimensions: event-fanout.png min_width=1000 min_height=600
- png_nonblank: event-fanout.png min_size=3500
- artifact_exists: event-fanout.svg
- svg_valid: event-fanout.svg
- svg_contains: event-fanout.svg Order placed
- svg_contains: event-fanout.svg Billing
- svg_contains: event-fanout.svg Inventory
- svg_contains: event-fanout.svg Fulfillment
- svg_contains: event-fanout.svg Analytics
- svg_contains: event-fanout.svg Notifications
