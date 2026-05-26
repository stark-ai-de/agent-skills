# Motion Rubric

Use this reference when proposing a motion concept for a logo that will later be exported to README-safe assets.

## Good motion

- Reveal or stroke draw that introduces the logo without changing its identity.
- Eye blink or tiny character detail when the logo already includes a character.
- Soft glow pulse on an existing accent.
- Scanline or small highlight pass that does not obscure text.
- Small particle spark or orbital dot tied to existing brand geometry.
- Subtle parallax between named layers.
- Loop point that feels intentional and calm.

## Avoid

- Whole-logo wiggle as the only motion.
- Large panning, zooming, spinning, or bouncing.
- Rapid flashes or high-contrast flicker.
- Motion that obscures text or changes the logo silhouette too much.
- Animation that depends on remote assets, runtime scripts, or hidden external services.
- Effects that require proprietary tools for every future edit unless the user accepts that maintenance cost.

## Deterministic timing checklist

- Use named layers or grouped SVG elements before animating.
- Define explicit keyframes, easing, duration, and loop point.
- Keep the static first frame useful as a fallback.
- Create a static reduced-motion equivalent.
- Record the source/master file and export command or tool settings when reproducibility matters.
- Test the loop on light, dark, and checkerboard backgrounds when transparency matters.
