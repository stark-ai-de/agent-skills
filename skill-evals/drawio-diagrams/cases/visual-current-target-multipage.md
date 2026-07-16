# Visual Current And Target Multi-Page Architecture

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create a two-page `migration-architecture.drawio` with pages named Current and Target. Export `migration-current.svg` and `migration-target.svg`. The Current page shows Monolith and Shared DB; the Target page shows API, Worker, Queue, Orders DB, and a clearly labelled Planned badge.
```

## Should Trigger

Yes

## Split Family

architecture-current-target

## Expected Behavior

- Preserve current and target as separate editable pages with explicit state labels.
- Avoid showing planned target components as live current-state systems.
- Encode target status with a text badge in addition to color.
- Validate both pages, export the two exact SVGs, and inspect them separately.

## Deterministic Assertions

- contains: migration-architecture.drawio
- contains: migration-current.svg
- contains: migration-target.svg
- contains: Planned

## Visual Assertions

- artifact_exists: migration-architecture.drawio
- drawio_valid: migration-architecture.drawio min_pages=2
- artifact_exists: migration-current.svg
- artifact_exists: migration-target.svg
- svg_valid: migration-current.svg
- svg_valid: migration-target.svg
- svg_contains: migration-current.svg Current
- svg_contains: migration-current.svg Monolith
- svg_contains: migration-current.svg Shared DB
- svg_contains: migration-target.svg Target
- svg_contains: migration-target.svg Planned
- svg_contains: migration-target.svg API
- svg_contains: migration-target.svg Worker
- svg_contains: migration-target.svg Queue
- svg_contains: migration-target.svg Orders DB
