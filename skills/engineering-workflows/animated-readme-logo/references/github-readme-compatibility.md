# GitHub README Compatibility

Use this reference when deciding whether logo motion belongs directly in a README or on a web/demo surface.

## Documented baseline

- GitHub documents PNG, JPG, GIF, PSD, and SVG as displayable repository image formats.
- GitHub documents support for the HTML `<picture>` element in Markdown and uses `<source media>` for light/dark variants.
- GitHub states that SVGs do not support inline scripting or animation in its repository image rendering.
- GitHub's documentation does not establish animated WebP, APNG, or `prefers-reduced-motion` selection as a universal README contract. Treat those as preview-gated enhancements.

Use the official [non-code image documentation](https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files) and [Markdown `<picture>` documentation](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#the-picture-element) as the baseline, then manually preview the actual repository README after commit or push.

## Delivery boundary

- README/profile README: use a documented static `<img>` fallback. GIF is the conservative documented image format to try first for animation, subject to repository preview. Use animated WebP or APNG only after the target GitHub surface renders the committed artifact correctly.
- GitHub Pages/docs/app: live animated SVG, Lottie, dotLottie, CSS, or JavaScript may be appropriate.
- Social preview/static target: use a static raster or validated SVG.

Keep animated SVG and Lottie playback on the web/demo surface. Do not present either as an animated README delivery path.

## `<picture>` contract

Use `<picture>` to add candidate sources while retaining a documented `<img>` fallback with meaningful `alt`, `width`, and `height`.

For an animated README candidate:

1. Put the static reduced-motion candidate first.
2. Add only animated sources that exist and pass local inspection.
3. Keep GIF as the conservative animated candidate drawn from GitHub's documented image formats.
4. Keep a static PNG or validated static SVG in `<img>`.

The `prefers-reduced-motion` source is an accessibility enhancement, not proof that every GitHub surface honors that media query. The static `<img>` fallback must remain useful when source selection differs.

## Fallback variants

Conservative:

1. Static reduced-motion PNG candidate.
2. Inspected animated GIF.
3. Static PNG in `<img>`.

Preview-gated quality-first:

1. Static reduced-motion PNG or WebP candidate.
2. Inspected animated WebP or APNG candidate.
3. Inspected animated GIF.
4. Static PNG in `<img>`.

Static-only:

1. Validated static SVG where repository preview succeeds.
2. Static PNG fallback when SVG rendering is uncertain.

## Compatibility risk flags

Flag source or markup that includes:

- `<script`, `<foreignObject`, `@keyframes`, or `animation:`;
- external `href` or `xlink:href`;
- likely full-canvas background rectangles or fills;
- missing `alt`, `width`, or `height`;
- an animated source without a useful static fallback;
- WebP/APNG or reduced-motion behavior described as guaranteed before target-surface preview.
