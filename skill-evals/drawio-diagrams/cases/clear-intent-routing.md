# Clear Intent Routing

## Prompt

Edit the existing draw.io diagram, enable animation for runtime flows, and export PNG and SVG while preserving the source.

## Should Trigger

Yes

## Expected Behavior

- Expose `create`, `edit-repair`, `review`, and `export`, then select and announce `edit-repair` because the user requested source changes plus delivery outputs.
- State source/output paths, profile/theme/animation/icon and authoring routes, write scope, protected originals, expected artifacts, and later approval boundaries.
- Proceed without asking for a redundant workflow confirmation when the source and destinations are resolvable.
- Preserve separate approval for file-writing render/raster helpers and any hosted content transfer.

## Deterministic Assertions

- contains: create
- contains: edit-repair
- contains: review
- contains: export
- contains: selected
- contains: rationale
- contains: animation
- not_contains: confirm edit-repair
