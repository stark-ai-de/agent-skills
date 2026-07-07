# Theming and dark mode

## Requirements

- Every generated `mxGraphModel` must use `adaptiveColors="auto"`.
- Prefer draw.io default colors where possible.
- When explicit colors are needed, use `light-dark(lightHex,darkHex)`.
- Text contrast should be at least 4.5:1 against fill/background.
- Lines and arrows should be visibly distinct in both modes.

## Color budget

- 3-5 nodes: up to 3 colors.
- 6-8 nodes: up to 4 colors.
- 9+ nodes: up to 5 colors.

Use one dominant family and reserve accent colors for semantic turning points: start/end, decision, storage, external dependency, error/risk, security boundary.

## Suggested semantic roles

| Role       | Style guidance                              |
| ---------- | ------------------------------------------- |
| Process    | neutral surface, readable text              |
| Decision   | accent stroke, light fill                   |
| Storage    | cylinder/database shape, storage accent     |
| External   | dashed border or muted fill                 |
| Error/risk | warning/danger accent only where meaningful |
| Security   | lock icon or boundary stroke                |

## Verification

Static lint checks `adaptiveColors`, explicit hex contrast, black/white without pairs, and both modes when `light-dark()` is present. Visual tier exports a dark SVG when draw.io Desktop CLI is available.

Sources: integrated from draw.io adaptive color guidance, color-budget ideas, and light/dark verification criteria.
