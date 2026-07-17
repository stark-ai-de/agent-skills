# Logo Fidelity Across Light And Dark Modes

## Prompt

```text
Use $drawio-diagrams to create a light- and dark-compatible editable integration diagram featuring SAP, Bun, Redis, and BullMQ. The selected brand marks should remain prominent and recognizable.
```

## Should Trigger

Yes

## Expected Behavior

- Preserve supplied logo artwork, native colors, fixed aspect ratios, and non-square proportions.
- Place marks on consistent neutral chips rather than recoloring or inverting brand artwork.
- Use a per-node labelled fallback only when an exact mark cannot be resolved.
- Inspect both light and dark renders for contrast, clipping, and recognizability.

## Deterministic Assertions

- contains: aspect=fixed
- regex: neutral chip|neutral background
- contains: dark
- regex: preserve.{0,}color|do not recolor|without recoloring
