# Standalone SVG Logo Edit Negative

## Prompt

```text
Optimize this standalone SVG logo, preserve its viewBox, and reduce its file size. It is a brand asset, not a diagram.
```

## Should Trigger

No

## Expected Behavior

- Do not treat a standalone SVG asset as draw.io work merely because the skill can embed SVGs.
- Route to an SVG or brand-asset editing workflow.
- Preserve the requested SVG contract without creating diagram XML or invoking draw.io validators.

## Deterministic Assertions

- regex: SVG|brand asset
- not_contains: validate_drawio.py
- not_contains: render-drawio.mjs
- not_contains: mxGraphModel
