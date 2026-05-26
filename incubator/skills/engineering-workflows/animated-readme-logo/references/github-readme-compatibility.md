# GitHub README Compatibility

Use this reference when deciding whether a logo animation belongs directly in a README or on a web/demo surface.

## GitHub renderer constraints

- GitHub can display common image formats including PNG, GIF, and SVG as repository images.
- GitHub repository SVG rendering does not support inline scripting or animation when viewed as an image.
- GitHub Markdown and HTML rendering can change; always manually preview the README on GitHub after commit or push.
- Do not use scripts, custom web components, iframes, or external players directly inside README content.

## Why animated SVG is not the default

Animated SVG can be useful on a website or GitHub Pages demo, but it is compatibility-sensitive in README image contexts. CSS animation, `foreignObject`, script tags, and external references may be stripped, ignored, or behave differently across GitHub surfaces and browsers.

Use animated SVG only as an optional web/demo artifact unless the user explicitly accepts the risk and verifies the rendered README.

## Why `<picture>` is the default

`<picture>` lets the browser select the first matching supported source and fall back to `<img>`. Use it for README targets that support HTML image elements because it can express:

- reduced-motion static source;
- quality-first animated WebP/APNG source;
- conservative GIF fallback;
- static fallback image with `alt`, `width`, and `height`.

If the target renderer does not preserve `<picture>`, provide a static `<img>` or markdown image fallback.

## Reduced motion

When animation is present, include a static source with:

```html
media="(prefers-reduced-motion: reduce)"
```

The static source should communicate the same brand/logo identity without motion.

## Fallback order variants

Quality-first:

1. Static reduced-motion WebP or PNG.
2. Animated WebP or APNG.
3. Animated GIF fallback.
4. Static PNG fallback in `<img>`.

Conservative:

1. Static reduced-motion PNG or WebP.
2. Animated GIF.
3. Static PNG fallback in `<img>`.

Static-only:

1. Static SVG when clean and renderer-safe.
2. Static PNG fallback when SVG behavior or transparency is uncertain.

## Compatibility risk flags

Flag the source or markup when it includes:

- `<script`
- `<foreignObject`
- `@keyframes`
- `animation:`
- external `href` or `xlink:href`
- likely full-canvas background rectangles or fills
- missing `alt`, `width`, or `height`
- animated source without a reduced-motion static source
