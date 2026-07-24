# Fixed-Theme Comparison Export Plan

## Prompt

```text
I maintain several adaptive `.drawio` architecture sources and their normal adaptive SVGs. I now need to refresh those adaptive SVGs and build a viewer-independent comparison gallery with genuinely light and dark SVGs and PNGs for every source. This environment cannot render files, so give me the exact local export workflow and gallery composition without claiming that artifacts were produced.
```

## Should Trigger

Yes

## Split Family

profile-comparison-export

## Expected Behavior

- Keep each editable source adaptive and distinguish its normal adaptive SVG from fixed-theme comparison exports.
- Export fixed light and fixed dark SVGs with explicit draw.io Desktop theme options.
- Rasterize each fixed-theme SVG through the bounded local browser helper so the PNG inherits the declared theme; do not describe direct dark PNG export as a draw.io CLI capability.
- Use static PNGs for the gallery previews and link the fixed SVGs plus editable sources separately.
- State that rendering and visual verification remain pending in the text-only environment.

## Deterministic Assertions

- contains: --svg-theme auto
- contains: --svg-theme light
- contains: --svg-theme dark
- contains: rasterize-themed-svg.mjs
- contains: .light.png
- contains: .dark.png
- regex: static (light/dark )?PNG|PNG previews
- regex: not produced|not generated|pending|cannot render|unavailable
