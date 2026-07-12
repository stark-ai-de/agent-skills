# README Snippets

Use these snippets as starting points. Replace paths, dimensions, and alt text with project-specific values. Use the quality-first variant only after the committed GitHub README renders every candidate source correctly; otherwise use the conservative or static-only variant.

## Quality-first `<picture>`

```html
<p align="center">
  <picture>
    <source
      srcset="docs/assets/example-logo-static.webp"
      type="image/webp"
      media="(prefers-reduced-motion: reduce)"
    />
    <source srcset="docs/assets/example-logo-animated.webp" type="image/webp" />
    <source srcset="docs/assets/example-logo-animated.apng" type="image/apng" />
    <source srcset="docs/assets/example-logo-animated.gif" type="image/gif" />
    <img
      src="docs/assets/example-logo-static.png"
      alt="Example project logo"
      width="360"
      height="360"
    />
  </picture>
</p>
```

## Conservative GIF fallback

```html
<p align="center">
  <picture>
    <source srcset="docs/assets/example-logo-static.png" media="(prefers-reduced-motion: reduce)" />
    <source srcset="docs/assets/example-logo-animated.gif" type="image/gif" />
    <img
      src="docs/assets/example-logo-static.png"
      alt="Example project logo"
      width="360"
      height="360"
    />
  </picture>
</p>
```

## Static SVG or PNG fallback

```html
<p align="center">
  <img
    src="docs/assets/example-logo-static.png"
    alt="Example project logo"
    width="360"
    height="360"
  />
</p>
```

## GitHub Pages demo link

```html
<p align="center">
  <a href="https://OWNER.github.io/REPOSITORY/logo/">View animated logo demo</a>
</p>
```

## Light and dark variants

```html
<picture>
  <source srcset="docs/assets/example-logo-dark.png" media="(prefers-color-scheme: dark)" />
  <source srcset="docs/assets/example-logo-light.png" media="(prefers-color-scheme: light)" />
  <img
    src="docs/assets/example-logo-light.png"
    alt="Example project logo"
    width="360"
    height="360"
  />
</picture>
```

## Alt text rules

- Use meaningful alt text for a logo that carries brand identity, such as `Example project logo`.
- Use empty alt text only when the same name is already adjacent in text and the image is decorative.
- Do not put animation instructions or file-format details in alt text.
- Always include `width` and `height` to keep README layout stable.
