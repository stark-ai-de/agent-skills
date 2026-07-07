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

## Logo color rules

Brand/logo color mode must be consistent across the diagram:

- If color logos are used, use color logos for all brands that provide color variants.
- If a brand only provides a black or white logo, use that source variant on a neutral background that preserves contrast in both light and dark mode.
- Do not recolor black/white logos to match a palette.
- Do not mix pure icon variants and text wordmarks in the same logo group unless the user requested wordmarks or no icon variant exists.
- Prefer neutral logo chips over applying diagram fill colors directly behind fixed-color logos.

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

Static lint checks `adaptiveColors`, explicit hex contrast, black/white without pairs, and both modes when `light-dark()` is present. Visual tier exports a dark SVG when draw.io Desktop CLI is available. Inspect dark-mode exports for invisible monochrome logos, over-tinted logos, and neutral-chip contrast.

Sources: integrated from draw.io adaptive color guidance, color-budget ideas, logo-color feedback, and light/dark verification criteria.
