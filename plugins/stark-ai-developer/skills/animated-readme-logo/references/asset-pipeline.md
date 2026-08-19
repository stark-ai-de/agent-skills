# Asset Pipeline

Use this reference after the canonical SVG and motion specification are ready.

## Required mutating-workflow stack

```text
docs/assets/<slug>-logo.svg              # validated, self-contained source
docs/assets/<slug>-logo-motion.md        # deterministic motion specification
docs/assets/<slug>-logo-animation.mjs     # reviewed deterministic render recipe
docs/assets/<slug>-logo-static.png
docs/assets/<slug>-logo-animated.gif
```

Use the repository's established asset folder instead of `docs/assets/` when one exists.

Successful `create`, `transform`, and `animate` routes produce all five files. Optional WebP, APNG, or web-demo derivatives may be added only after the required stack succeeds and those extras are independently verified. `audit` writes none of them.

## Capability-gated export

1. Detect the available local exporter and animation inspector. Read `local-tooling.md` when a requested capability is missing.
2. For static PNG plus animated GIF delivery, read `export-recipe.md`, review the trusted root-relative recipe, and run the bundled exporter with `--check` before the mutating export. The check prevents exporter-controlled writes; it does not sandbox recipe code.
3. Keep brand-specific rendering in the repository recipe; do not copy rasterization, FFmpeg encoding, output staging, PNG sanitization, or animated inspection into the product repository.
4. Record the exact source, settings, recipe, and command before export.
5. Export only formats the tool actually supports.
6. Inspect every animated raster with the bundled inspector. It rejects non-regular inputs, malformed animation structure, hidden text/comment/application/EXIF/XMP/ICC metadata, and unsupported ancillary chunks.
7. Claim `Animation delivery: completed` only when the required PNG and GIF exist and pass inspection alongside the validated SVG, motion specification, and checked recipe.

When a required exporter or inspector command is missing, present the minimal installation preflight from `local-tooling.md` and ask for explicit approval immediately. Use `Animation delivery: blocked` while approval is pending. If installation is declined, forbidden, or unavailable, keep the validated SVG, motion specification, and checked recipe when available, set `Animation delivery: incomplete`, and provide an exact next step. Do not create placeholder files or claim delivery succeeded.

## Transparency and delivery checks

- Preserve alpha through every export.
- Keep the static first frame useful.
- Test light, dark, and checkerboard backgrounds for matte edges.
- Treat GIF as a conservative compatibility fallback with limited color and alpha quality.
- Include a static reduced-motion source and an `<img>` fallback.
- Use explicit display dimensions and meaningful alt text.
- Keep file-size targets repository-specific unless the repository defines a limit.
