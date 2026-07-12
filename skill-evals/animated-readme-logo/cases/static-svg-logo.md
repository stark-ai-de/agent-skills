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

- Report `Task mode: animate-export`, `Source route: existing-svg`, `Provider state: not-eligible`, `Approval state: not-required`, `SVG readiness`, and `Export status` using contract-valid values.
- Inspect the current static SVG usage as the source candidate.
- Do not check or call Recraft; a clean existing SVG is not provider-eligible.
- Require the canonical SVG to pass strict validation and provide a deterministic motion specification before reporting readiness.
- Recommend cleaning/grouping the SVG before animation if it is path-heavy.
- Default to README-safe `<picture>` or static fallback delivery, not animated SVG-only.
- Include reduced-motion static source guidance.
- Include `alt`, `width`, and `height` in recommended markup.
- Require manual GitHub preview after commit or push.
