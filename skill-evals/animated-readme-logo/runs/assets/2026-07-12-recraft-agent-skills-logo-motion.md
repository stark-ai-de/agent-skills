# Recraft Agent Skills Logo Motion Specification

## Source

- Canonical SVG: `2026-07-12-recraft-agent-skills-logo.svg`
- Canvas: `1024 × 1024`
- ViewBox: `0 0 2048 2048`
- Intended README display: `64–256 px` square
- Transparency: required; no canvas background

## Timeline

- Duration: `2400 ms`
- Loop: infinite, with the state at `2400 ms` exactly equal to `0 ms`
- Easing for every changing interval: `cubic-bezier(0.4, 0, 0.2, 1)`
- Transform values are in viewBox units.

| Layer ID           | Keyframes                                                                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arm-coral`        | `0 ms`: opacity `1`, translate `(0, 0)`; `480 ms`: opacity `0.88`, translate `(-8, 8)`; `960 ms`: opacity `1`, translate `(0, 0)`; `2400 ms`: opacity `1`, translate `(0, 0)`                                              |
| `arm-cyan`         | `0 ms`: opacity `1`, translate `(0, 0)`; `960 ms`: opacity `1`, translate `(0, 0)`; `1440 ms`: opacity `0.88`, translate `(8, -8)`; `1920 ms`: opacity `1`, translate `(0, 0)`; `2400 ms`: opacity `1`, translate `(0, 0)` |
| `arm-indigo-lower` | Static for the full loop: opacity `1`, translate `(0, 0)`                                                                                                                                                                  |
| `arm-indigo-upper` | Static for the full loop: opacity `1`, translate `(0, 0)`                                                                                                                                                                  |

The static first frame is the canonical SVG exactly as stored. The two accent arms take turns making one restrained inward pulse; the indigo structure stays fixed so the identity does not rotate, bounce, or wobble.

## Reduced motion

Render the canonical SVG with every layer at opacity `1` and translate `(0, 0)`. Do not start or substitute another animation.

## Export intent

- Preferred optional animation exports: APNG or animated WebP at `30 fps`, only when an available exporter and the bundled inspector can verify the result.
- GIF is a compatibility fallback only when specifically needed and inspectable.
- No animated raster was requested or produced for this release proof.
