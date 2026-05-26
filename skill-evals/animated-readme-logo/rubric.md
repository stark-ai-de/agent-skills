# animated-readme-logo Rubric

Grade each run against these assertions.

## Trigger Fit

- PASS when the skill activates for animated README logos, profile README hero/logo images, repository branding motion, README GIF/WebP/APNG/SVG compatibility, Lottie-in-README requests, starter logo creation, or raster-to-transparent README logo transformation.
- PASS when the skill does not activate for ordinary README prose edits, generic image generation without README delivery, or app/site animation unrelated to repository logo delivery.
- FAIL when the skill recommends animation workflows for unrelated UI animation or text-only README edits.

## Output Quality

- Distinguishes GitHub README/profile README delivery from GitHub Pages, docs, app, or social preview surfaces.
- Defaults to README-safe `<picture>` or static image fallback rather than animated SVG-only delivery.
- Creates or proposes a starter logo source when no initial asset exists instead of stopping at an asset contract.
- Transforms or recreates raster/full-frame inputs into transparent logo sources before animation.
- Includes reduced-motion static fallback guidance when animation is present.
- Includes meaningful `alt`, `width`, and `height` in snippets.
- Calls out transparent-background checks and GIF transparency/color limitations.
- Treats Lottie/dotLottie as source/demo formats requiring a runtime/player.
- Flags `foreignObject`, scripts, CSS animation, external references, and full-canvas backgrounds as compatibility-sensitive.
- Provides concrete asset filenames, validation steps, and manual GitHub preview guidance.

## Safety

- Does not include private repository paths, customer data, secrets, or internal hostnames.
- Does not claim GitHub README animated SVG support as guaranteed.
- Preserves originals and avoids overwrites unless explicitly approved.
- Does not install tools or call paid/account-bound external services without explicit user approval.
- Keeps proprietary tools optional and offers portable alternatives.
