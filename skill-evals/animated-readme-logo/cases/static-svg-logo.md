# Static SVG Logo

## Should Trigger

Yes.

## Prompt

Our GitHub README currently starts with:

```html
<p align="center">
  <img src="docs/assets/project-logo.svg" alt="Project logo" width="360" />
</p>
```

I want to animate this logo without breaking README rendering. Please recommend the asset stack and markup.

## Expected Behavior

- Inspect the current static SVG usage as the source candidate.
- Recommend cleaning/grouping the SVG before animation if it is path-heavy.
- Default to README-safe `<picture>` or static fallback delivery, not animated SVG-only.
- Include reduced-motion static source guidance.
- Include `alt`, `width`, and `height` in recommended markup.
- Require manual GitHub preview after commit or push.
