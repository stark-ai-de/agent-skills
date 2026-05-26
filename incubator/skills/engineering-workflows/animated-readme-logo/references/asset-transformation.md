# Asset Transformation

Use this reference when the user expects Codex to create or transform logo assets, not only recommend a pipeline.

## Operating rules

- Preserve originals. Write derived files with deterministic names unless the user approves an overwrite.
- Prefer `docs/assets/` for README logo assets unless the repo already uses another asset folder.
- Use the repository slug or product name for filenames, such as `<slug>-logo-static.png`.
- Record assumptions in the response when creating a logo without a complete brand brief.
- Ask only for identity facts that materially affect the logo, such as product name or required brand colors. Otherwise create a conservative starter asset.

## When there is no initial asset

Create a starter logo source from available repo context:

1. Read the README title, package metadata, repo folder name, and nearby brand copy.
2. Choose a simple mark that can survive small README sizes: wordmark, monogram, geometric symbol, or a restrained text+mark lockup.
3. Create a transparent static source asset first.
4. Create README delivery fallbacks from that source.
5. Propose animation only after the static source is legible and transparent.

Minimum starter output:

```text
docs/assets/<slug>-logo-static.png
docs/assets/<slug>-logo-static.webp
docs/assets/<slug>-logo-animated.webp   # when animation is requested and feasible
docs/assets/<slug>-logo-animated.gif    # conservative fallback when needed
```

Optional source/master output:

```text
docs/assets/<slug>-logo-static.svg
docs/assets/<slug>-logo.lottie.json
docs/assets/<slug>-logo-generation-notes.md
```

## When the input is a raster or screenshot

Do not treat a full-frame raster, poster, or screenshot as the canonical transparent logo master.

Transformation path:

1. Identify the actual logo mark and wordmark inside the image.
2. Crop or recreate only the logo-relevant portion.
3. Remove or avoid the background, especially black/white poster backgrounds.
4. Create a transparent static source.
5. Check edges on light, dark, and checkerboard backgrounds.
6. Export README-safe static and animated raster assets.

For black-background luminous marks, prefer recreating the mark on transparency over simple background removal when edge glow or particle noise would leave a dark matte.

## When the input is SVG

- Keep the SVG as a candidate source only when paths are grouped and understandable.
- Simplify path-heavy or AI-vectorized SVGs before animation.
- Remove accidental full-canvas backgrounds unless the user explicitly wants a banner/card.
- Keep a static PNG fallback even when SVG is the source.

## Mutation boundaries

Allowed when the user asked for creation/transformation:

- Create new files under the repo's asset folder.
- Generate README snippets that reference those new files.
- Add a small generation note when it helps reproducibility.

Ask first before:

- Overwriting existing brand files.
- Installing ImageMagick, ffmpeg, animation packages, or design-tool CLIs.
- Calling paid, account-bound, or non-local generation services.
- Publishing GitHub Pages or changing release/public catalog assets.
