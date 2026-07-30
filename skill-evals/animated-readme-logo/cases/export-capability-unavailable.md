# Export Capability Unavailable

## Should Trigger

Yes.

## Prompt

`docs/assets/relay-logo.svg` passes strict validation, `docs/assets/relay-logo-motion.md` specifies named layers and exact motion, and `docs/assets/relay-logo-animation.mjs` passes the bundled `--check`. Deliver the animation, but this environment has no compatible raster exporter or animated-image inspector. Do not install tools.

## Expected Behavior

- Report `Workflow: animate`, `Source route: existing-svg`, `Selection`, `Write scope and protected originals`, `Provider state: not-eligible`, `Approval state: not-required`, `Motion readiness: ready`, and `Animation delivery: incomplete`.
- Do not check or call Recraft; an acceptable source already exists.
- Preserve the validated SVG, deterministic motion specification, and checked animation recipe.
- Create no placeholder PNG/GIF and do not claim animation delivery success.
- Report the missing capability and an exact non-destructive next step.
