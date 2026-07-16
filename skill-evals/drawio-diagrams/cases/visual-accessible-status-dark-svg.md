# Visual Accessible Status In Dark Mode

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create `service-status.drawio` and export a dark `service-status.svg`. Show Gateway as Current, Worker as Target, Queue as Blocked, Cache as Optional, and Debug UI as Development only. Every status must use a visible text badge or equivalent non-color cue.
```

## Should Trigger

Yes

## Split Family

accessibility-status

## Expected Behavior

- Combine restrained color with explicit status badges, borders, or shapes.
- Preserve readable contrast and status meaning in dark mode and without color.
- Keep badges clear of connector rails and component labels.
- Validate, export, and inspect the exact SVG and all five status labels.

## Deterministic Assertions

- contains: service-status.drawio
- contains: service-status.svg
- regex: badge|non-color
- contains: dark

## Visual Assertions

- artifact_exists: service-status.drawio
- drawio_valid: service-status.drawio
- artifact_exists: service-status.svg
- svg_valid: service-status.svg
- svg_contains: service-status.svg Gateway
- svg_contains: service-status.svg Worker
- svg_contains: service-status.svg Queue
- svg_contains: service-status.svg Cache
- svg_contains: service-status.svg Debug UI
- svg_contains: service-status.svg Current
- svg_contains: service-status.svg Target
- svg_contains: service-status.svg Blocked
- svg_contains: service-status.svg Optional
- svg_contains: service-status.svg Development only
