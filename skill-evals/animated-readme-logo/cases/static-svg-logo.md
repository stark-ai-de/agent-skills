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

- Report `Workflow: animate`, `Source route: existing-svg`, `Selection`, `Write scope and protected originals`, `Provider state: not-eligible`, `Approval state: not-required`, `Motion readiness`, and `Animation delivery` using contract-valid values.
- Inspect the current static SVG usage as the source candidate.
- Do not check or call Recraft; a clean existing SVG is not provider-eligible.
- Require the canonical SVG to pass strict validation, provide a deterministic motion specification, and check the animation recipe before reporting readiness.
- Complete only after the static PNG and animated GIF exist and pass their inspections.
- Recommend cleaning/grouping the SVG before animation if it is path-heavy.
- Default to README-safe `<picture>` or static fallback delivery, not animated SVG-only.
- Include reduced-motion static source guidance.
- Include `alt`, `width`, and `height` in recommended markup.
- Require manual GitHub preview after commit or push.
