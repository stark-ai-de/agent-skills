# Required Animation Stack

## Should Trigger

Yes.

## Prompt

Create and deliver a new animated README logo for Relay Grid using local tools.

## Deterministic Assertions

- contains: relay-grid-logo.svg
- contains: relay-grid-logo-motion.md
- contains: relay-grid-logo-animation.mjs
- contains: relay-grid-logo-static.png
- contains: relay-grid-logo-animated.gif
- contains: Animation delivery: completed

## Expected Behavior

Report `Workflow`, `Source route`, `Selection`, `Write scope and protected originals`, `Provider state`, `Approval state`, `Motion readiness`, and `Animation delivery`. A successful `create` route produces all five deterministic files, strictly validates the SVG, checks the recipe, verifies the static PNG and animated GIF, and reports exact paths and evidence. If required tooling cannot be used, retain verified intermediates and report incomplete delivery instead of success.
