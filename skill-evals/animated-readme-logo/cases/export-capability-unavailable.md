# Export Capability Unavailable

## Should Trigger

Yes.

## Prompt

`docs/assets/relay-logo.svg` already passes the strict SVG validator, and `docs/assets/relay-logo-motion.md` specifies named layers, exact keyframes, easing, a four-second loop, and a static reduced-motion state. Export the requested animated WebP, but this environment has no compatible raster exporter or animated-image inspector. Do not install tools.

## Expected Behavior

- Report `Task mode: animate-export`, `Source route: existing-svg`, `Provider state: not-eligible`, `Approval state: not-required`, `SVG readiness: ready`, and `Export status: capability-unavailable`.
- Do not check or call Recraft; an acceptable source already exists.
- Preserve the validated SVG and deterministic motion specification.
- Create no placeholder WebP and do not claim export success.
- Report the missing capability and an exact non-destructive next step.
