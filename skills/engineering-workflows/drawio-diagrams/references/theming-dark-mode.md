# Theming and dark mode

## Default foundation: technical geominimalism

Use this modern, portable foundation when the user does not select another profile. It combines geometric minimalism with restrained bento-style grouping: flat neutral surfaces, simple rounded cards, disciplined whitespace, orthogonal connectors, and color only for hierarchy or semantics. Four bounded options in `design-profiles.md` reuse the same accessibility and portability rules for operator-grid, isometric-air, neon-hub, and aurora-story use cases.

Do not use glassmorphism, 3D/isometric perspective, neo-brutalist heavy borders, maximalism, textures, glow, or mixed trend styles in the default profile. Optional profiles define narrow exceptions for isometric geometry, gradients, or one shadow tier. Use effects only within the explicit limits of one selected profile; never mix exceptions from different profiles or trade away readability.

### Geometry and typography

- Use an 8 px grid; snap positions, padding, and major gaps to it.
- Rounded cards: `arcSize=8` by default (a draw.io percentage, not pixels); card padding: 16 px; peer gap: 24-32 px; zone gap: at least 48 px.
- Card height: at least 48 px, usually 64-96 px for title plus metadata.
- Use 1-1.5 px neutral outlines, 2 px for the primary flow, and at most 1.5 px for secondary relationships.
- Use a portable sans-serif such as draw.io's Helvetica/Arial fallback. Do not require web fonts.
- Diagram title: 20-24 px bold; zone title: 16 px bold; node title: 14 px bold; body and connector labels: 12 px. Avoid text below 11 px at normal zoom.
- Left-align rich card text. Center only short icon nodes or single-line labels.

### Surface and color tokens

Use neutral surfaces plus one dominant color family. Add semantic success, warning, danger, or external accents only where they carry a labelled meaning.

| Role           | Light/dark pair               |
| -------------- | ----------------------------- |
| Canvas         | `light-dark(#F8FAFC,#0F172A)` |
| Surface        | `light-dark(#FFFFFF,#111827)` |
| Primary text   | `light-dark(#0F172A,#F8FAFC)` |
| Secondary text | `light-dark(#475569,#CBD5E1)` |
| Neutral stroke | `light-dark(#64748B,#94A3B8)` |
| Primary fill   | `light-dark(#EFF6FF,#172554)` |
| Primary stroke | `light-dark(#2563EB,#60A5FA)` |

Do not use color alone: pair it with a label, icon, shape, border, or line pattern. Keep gradients and shadows off in the default profile. Use only the bounded effect allowance of a selected profile; never shadow text or connectors.

## Requirements

- Every generated `mxGraphModel` must use `adaptiveColors="auto"`.
- Prefer draw.io default colors where possible.
- When explicit colors are needed, use `light-dark(lightHex,darkHex)`.
- Text contrast should be at least 4.5:1 against fill/background.
- Meaningful non-text strokes and boundaries should reach 3:1 against adjacent colors when practical.
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

- For every named organization, product, platform, model, or service, use the official logo, service stencil, or official provider asset whenever available. A generic semantic icon is fallback-only for a named entity; semantic icons remain primary for genuinely generic concepts.
- If color logos are used, use color logos for all brands that provide color variants.
- If a brand only provides a black or white logo, use that source variant on a neutral background that preserves contrast in both light and dark mode.
- Do not arbitrarily recolor any official artwork, including black/white logos, to match a palette. Only an explicit user request or a necessary, documented accessibility exception may authorize recoloring; disclose the source variant, changed colors, reason, scope, and contrast evidence in the delivery receipt.
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

Static lint checks `adaptiveColors`, explicit hex contrast, black/white without pairs, and both modes when `light-dark()` is present. Visual tier exports a dark SVG when draw.io Desktop CLI is available. Inspect dark-mode exports for invisible monochrome logos, over-tinted logos, logo inversion/recoloring, washed-out marks, inconsistent chip sizes, connector labels without backgrounds, labels on borders, neutral-chip contrast, mixed profile cues, and excessive profile effects. If an explicit or accessibility-exception recoloring was authorized, verify that the receipt discloses the source variant, changed colors, reason, scope, and contrast evidence.

Sources: original guidance informed by [IBM's technical-diagram system](https://www.ibm.com/design/language/infographics/technical-diagrams/design/), WCAG [text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), and [use-of-color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) criteria, draw.io adaptive-color and consistency guidance, and minimalist/geometric design analysis.
