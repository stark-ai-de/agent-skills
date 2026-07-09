# Theming and dark mode

## Requirements

- Every generated `mxGraphModel` must use `adaptiveColors="auto"`.
- Prefer draw.io default colors where possible.
- When explicit colors are needed, use `light-dark(lightHex,darkHex)`.
- Text contrast should be at least 4.5:1 against fill/background.
- Lines and arrows should be visibly distinct in both modes.
- Connector labels in dense diagrams should use filled label backgrounds or explicit label cells so dark-mode rails do not run through the text.

## Color budget

- 3-5 nodes: up to 3 colors.
- 6-8 nodes: up to 4 colors.
- 9+ nodes: up to 5 colors.

Use one dominant family and reserve accent colors for semantic turning points: start/end, decision, storage, external dependency, error/risk, security boundary.

## Label background rules

Use label backgrounds for short connector labels that sit near rails, borders, or other labels. The background should be subtle but opaque enough to separate text from the connector line in both modes.

Recommended style fragment:

```text
labelBackgroundColor=light-dark(#f8fafc,#0f172a);labelBorderColor=light-dark(#cbd5e1,#475569);fontColor=light-dark(#0f172a,#f8fafc);
```

Avoid pure transparent edge labels on top-route rails, zone boundaries, or horizontal/vertical fan-out junctions.

## Logo color rules

Brand/logo color mode must be consistent across the diagram:

- If color logos are used, use color logos for all brands that provide color variants.
- If a brand only provides a black or white logo, use that source variant on a neutral background that preserves contrast in both light and dark mode.
- Do not recolor black/white logos to match a palette.
- Do not rely on dark-mode inversion to make a logo visible. Preserve the original artwork and change the chip/background instead.
- Do not use a simplified monochrome glyph when a detailed official/product icon is available and materially improves recognition.
- Do not mix pure icon variants and text wordmarks in the same logo group unless the user requested wordmarks or no icon variant exists.
- Prefer neutral logo chips over applying diagram fill colors directly behind fixed-color logos.
- Keep logo chip dimensions consistent within a family unless a source viewBox requires a non-square chip.

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

Static lint checks `adaptiveColors`, explicit hex contrast, black/white without pairs, and both modes when `light-dark()` is present. Visual tier exports a dark SVG when draw.io Desktop CLI is available. Inspect dark-mode exports for invisible monochrome logos, over-tinted logos, logo inversion/recoloring, washed-out marks, inconsistent chip sizes, connector labels without backgrounds, labels on borders, and neutral-chip contrast.

Sources: integrated from draw.io adaptive color guidance, color-budget ideas, logo-color feedback, edge-label readability feedback, and light/dark verification criteria.
