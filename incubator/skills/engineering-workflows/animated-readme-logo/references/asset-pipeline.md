# Asset Pipeline

Use this reference when choosing source files, export formats, and transparent-background checks for animated README logos.

## Source/master decision tree

- Clean SVG logo: best canonical vector source when paths are grouped, named, and reasonably small. Clean up AI-vectorized or path-heavy SVGs before animating.
- Lottie JSON or dotLottie: useful as editable motion masters or web/demo playback formats. They need a runtime/player, so do not use them as the only README embed.
- SVGator, Figma, Illustrator, Inkscape, or similar tools: acceptable deterministic authoring paths, but never mandatory.
- Animated WebP/APNG/GIF: README delivery formats. Prefer WebP or APNG when transparency and quality matter, then keep GIF as a conservative fallback.
- GitHub Pages or docs/app surface: use this for live animated SVG, Lottie, dotLottie, CSS, or JavaScript playback.

## Creation and transformation path

- No initial asset: create a transparent static source first, then derive README static and animated assets from it.
- Raster or screenshot input: crop or recreate the actual mark, remove poster/background pixels, and create a transparent source before animation.
- Black-background luminous input: recreate the glow/particle mark on alpha when simple background removal would leave matte edges.
- SVG input: clean grouping and remove accidental backgrounds before using it as an animation master.
- Always preserve the original and write derived files with new deterministic names unless the user approves overwrites.

## Default README asset stack

```text
docs/assets/<slug>-logo-static.svg       # canonical transparent vector source, only if clean
docs/assets/<slug>-logo-source.png       # optional transparent raster source when generated/recreated
docs/assets/<slug>-logo-static.png       # static fallback, transparent
docs/assets/<slug>-logo-static.webp      # static reduced-motion asset, transparent
docs/assets/<slug>-logo-animated.webp    # preferred animated raster where verified
docs/assets/<slug>-logo-animated.apng    # optional quality-first animated fallback
docs/assets/<slug>-logo-animated.gif     # conservative animated fallback when needed
docs/assets/<slug>-logo.animated.svg     # optional web/GitHub Pages demo asset
docs/assets/<slug>-logo.lottie.json      # optional editable motion master
docs/assets/<slug>-logo.lottie           # optional compressed dotLottie master
docs/logo/index.html                     # optional GitHub Pages demo
```

## Transparency checklist

- Confirm the user wants a transparent logo, not a full hero card or banner.
- Do not include a background rectangle unless explicitly requested.
- Preserve alpha through source, animation, and export.
- Test final assets on light, dark, and checkerboard backgrounds.
- Check for matte edges around antialiased shapes.
- Treat GIF as a compatibility fallback when transparent edges and color quality are important.
- Keep an unanimated static PNG/SVG fallback even when the animated asset is transparent.

## Export checklist

- Set fixed displayed dimensions for README markup.
- Keep the static first frame useful on its own.
- Target loop duration between 2.5 and 8 seconds unless brand requirements say otherwise.
- Avoid rapid flashes, large panning, large zooming, or motion that obscures text.
- Keep file-size targets repo/user-specific unless the repository defines explicit limits.
- Record which tool produced each artifact when the pipeline must be reproducible.
