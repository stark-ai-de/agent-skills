# Visual State Machine PNG

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create an uncompressed `order-lifecycle.drawio` with stable IDs `initial`, `draft`, `submitted`, `authorized`, `fulfilled`, `cancelled`, `refunded`, and `final`; export `order-lifecycle.png` plus `order-lifecycle.svg`. Include initial -> Draft -> Submitted -> Authorized -> Fulfilled, Submitted -> Cancelled, Fulfilled -> Refunded, and Cancelled/Refunded -> final. Show guards `[payment approved]`, `[cancel requested]`, and `[refund approved]`, and route the refund connector as a clear loop around the state row.
```

## Should Trigger

Yes

## Split Family

state-machine

## Expected Behavior

- Use formal state-machine symbols, labelled transitions, and visible guards.
- Keep the refund and cancellation routes away from state labels and borders.
- Keep formal notation legible without unnecessary product-logo decoration.
- Validate, export, and visually inspect the exact PNG and SVG.

## Deterministic Assertions

- contains: order-lifecycle.drawio
- contains: order-lifecycle.png
- contains: order-lifecycle.svg
- contains: guard
- contains: validate_drawio.py

## Visual Assertions

- artifact_exists: order-lifecycle.drawio
- drawio_valid: order-lifecycle.drawio animation_on=1 uncompressed=1
- drawio_graph: order-lifecycle.drawio ids=initial,draft,submitted,authorized,fulfilled,cancelled,refunded,final edges=initial>draft,draft>submitted,submitted>authorized,authorized>fulfilled,submitted>cancelled,fulfilled>refunded,cancelled>final,refunded>final
- artifact_exists: order-lifecycle.png
- png_dimensions: order-lifecycle.png min_width=900 min_height=500
- png_nonblank: order-lifecycle.png min_size=3000
- artifact_exists: order-lifecycle.svg
- svg_valid: order-lifecycle.svg
- svg_contains: order-lifecycle.svg Draft
- svg_contains: order-lifecycle.svg Submitted
- svg_contains: order-lifecycle.svg Authorized
- svg_contains: order-lifecycle.svg Fulfilled
- svg_contains: order-lifecycle.svg Cancelled
- svg_contains: order-lifecycle.svg Refunded
- svg_contains: order-lifecycle.svg payment approved
- svg_contains: order-lifecycle.svg cancel requested
- svg_contains: order-lifecycle.svg refund approved
