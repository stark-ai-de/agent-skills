# Agent Skills Logo Motion Specification

## Source

- Original artwork: `stark-ai-de-agent-skills-logo.svg` (preserved unchanged)
- Canonical static master: `stark-ai-de-agent-skills-logo-static.svg`
- Named layers: `logo-mark`, `highlight-sweep`
- Canvas and viewBox: `2172 × 724` / `0 0 2172 724`
- README display size: `720 × 240`
- Transparency: required; no canvas background

The canonical master keeps all original paths in their original order inside
`logo-mark`. Its static render is pixel-identical to the original at `900 × 300`.
`highlight-sweep` is present but hidden in the static and reduced-motion state.

## Timeline

- Duration: `4000 ms`
- Source sampling: `10 fps`, `40` frames, `100 ms` per frame
- Loop: infinite; `4000 ms` returns exactly to the `0 ms` state
- Translation easing: linear
- Opacity easing: `ease-in-out-sine`, where
  `ease(u) = 0.5 - 0.5 × cos(πu)` for `u` in `[0, 1]`

| Layer             | Property           | Keyframes                                                                                       |
| ----------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| `logo-mark`       | transform, opacity | Static for the full loop: translate `(0, 0)`, opacity `1`                                       |
| `highlight-sweep` | center x           | `0 ms`: `-700`; `400 ms`: `-700`; `2400 ms`: `2872`; `4000 ms`: `-700`                          |
| `highlight-sweep` | opacity            | `0 ms`: `0`; `400 ms`: `0`; `600 ms`: `0.18`; `2200 ms`: `0.18`; `2400 ms`: `0`; `4000 ms`: `0` |

The sweep is a `220`-unit diagonal band tinted `#D9FBFF`. Its center shifts by
`0.22 × (y - 362)` viewBox units, and its cosine profile is clipped to pixels
where `logo-mark` has non-zero alpha. The artwork itself never moves, scales,
rotates, flashes, or changes identity. The loop includes a calm `1600 ms` rest.

## Reduced motion

Render the canonical SVG with `logo-mark` unchanged and `highlight-sweep` at
opacity `0`. This is also the exact first and final state.

## Export record

- Delivery artifact: `stark-ai-de-agent-skills-logo-animated.gif`
- Renderer: Sharp `0.34.5`, using the repository's existing installed dependency
- GIF settings: `720 × 240`, infinite loop, `256` colors, effort `10`, dither
  `0.35`, inter-frame error `0`, inter-palette error `3`
- Export command shape: `node --input-type=module` with a deterministic RGBA
  compositor implementing the keyframes and formula above, followed by
  `sharp(...).gif(...)`
- Optimized result: `15` stored frames; duplicate static frames were combined
  into delays while preserving the `4000 ms` timeline
- Inspection command:
  `node skills/engineering-workflows/animated-readme-logo/scripts/inspect-animated-image.mjs docs/assets/stark-ai-de-agent-skills-logo-animated.gif`
- Inspection result: valid animated GIF, `720 × 240`, infinite loop,
  transparency retained, no rejected metadata

The README uses the GIF as the animated candidate, the canonical SVG for
`prefers-reduced-motion`, and the same SVG as the final `<img>` fallback.
