# Motion Rubric

Use this reference to define deterministic, accessible logo motion before exporting it.

## Required specification

Record:

- canonical SVG path and named layer or group identifiers;
- canvas/viewBox and intended display size;
- total duration and loop behavior;
- each property, keyframe time/value, and easing;
- static first frame and exact loop point;
- static reduced-motion state;
- transparency requirement;
- intended export formats, frame rate when applicable, and capability status.
- the repository-owned `<slug>-logo-animation.mjs` recipe path and how its frame calculations implement each named keyframe.

Use explicit values rather than descriptions such as “subtle pulse.” The same source and specification should reproduce the same sequence.

## Good motion

- restrained stroke or shape reveal;
- a small highlight pass, accent pulse, orbital dot, or layer parallax tied to existing geometry;
- a tiny character detail when the mark already contains a character;
- an intentional calm loop with a useful static first frame.

## Avoid

- whole-logo wiggle, large pan/zoom/spin/bounce, rapid flash, or high-contrast flicker;
- motion that changes the identity, obscures a wordmark, or depends on a remote runtime;
- nondeterministic particle placement or timing;
- a proprietary-only editable source unless the user accepts the maintenance cost.

## Validation

- Confirm every referenced layer exists in the validated SVG.
- Confirm the last state returns cleanly to the first state.
- Verify the reduced-motion state preserves the same identity and information.
- Check the loop on light, dark, and checkerboard backgrounds.
- Keep the motion specification even when raster export capability is unavailable.
- Run the animation recipe through the bundled exporter with `--check`; a valid prose specification without a checked recipe is not `Motion readiness: ready`.
