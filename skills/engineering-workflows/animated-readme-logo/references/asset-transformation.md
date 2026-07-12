# Asset Transformation

Use this reference to create the canonical SVG or faithfully transform an existing mark.

## Authoring rules

- Preserve originals and write derived files with deterministic names.
- Prefer the repository's established asset directory, or `docs/assets/` when none exists.
- Infer only low-risk identity facts from public repository context. State assumptions.
- Author a compact, self-contained SVG directly. Use `drawio-diagrams` only when editable geometric construction materially helps.
- Do not embed raster data, scripts, `foreignObject`, external references, remote fonts, foreign namespaces, comments, editor metadata, or private metadata.
- Keep the canonical SVG at its static first-frame state. Put motion in the separate deterministic specification and in derived web/demo or raster artifacts; the strict validator rejects SMIL, `<style>` blocks, and CSS animation in the canonical master.
- Use allowlisted static SVG elements and attributes, explicit presentation values without CSS variables, and literal same-document `#id` references. Every paint, clip, filter, mask, marker, gradient, pattern, text-path, navigation, and `<use>` fragment must resolve to an appropriate in-document target; empty paint servers are not renderable content.
- Flatten clipping, masks, or filters into directly verifiable geometry before claiming readiness. Effect-bearing geometry is not accepted as the sole proof that a mark visibly renders.
- Use positive concrete `width` and `height`, a positive `viewBox`, meaningful groups or layer identifiers, transparent background by default, and geometry that remains legible at README sizes.
- Do not add a full-canvas background unless the user explicitly requests one.

## Source-specific routes

### No source or intentional redesign

Follow `provider-routing.md`, then turn the accepted concept into a local SVG. Provider output does not replace SVG validation.

### Raster, screenshot, or poster

Treat the input as a reference, not a canonical master. Identify the mark, preserve the original, and recreate it locally on transparency. Avoid simple background removal when glow, noise, or antialiasing would leave matte edges. This faithful route is not Recraft-eligible because it needs reference-media fidelity.

### Existing SVG

Keep a clean SVG as the source route. Simplify excessive paths, name animation layers, remove accidental backgrounds, and remove unsafe or external content without changing the identity. Do not route a clean or faithfully cleaned SVG through Recraft.

## Strict validation

Run:

```bash
python3 scripts/validate_logo_svg.py path/to/logo.svg
```

Treat a non-zero exit as blocking. `SVG readiness: ready` requires a real file and a successful strict validation result. If Python is unavailable, report `SVG readiness: blocked`; do not substitute visual confidence for validation.

Also inspect the rendered mark on light, dark, and checkerboard backgrounds. Visual inspection supplements, but never replaces, structural validation.

## Mutation boundaries

Ask before overwriting a brand file, installing a tool, spending provider credits, publishing, or changing remote state. Creating new derived files is allowed only when the user requested implementation rather than a review or plan.
