# Motion Specification And Recipe Are Distinct

## Should Trigger

Yes.

## Prompt

Animate the validated layered SVG at `docs/assets/orbit-logo.svg` and explain the durable source artifacts.

## Deterministic Assertions

- contains: Workflow: animate
- contains: orbit-logo-motion.md
- contains: human-readable
- contains: orbit-logo-animation.mjs
- contains: executable
- contains: --check

## Expected Behavior

Report `Workflow`, `Source route`, `Selection`, `Write scope and protected originals`, `Provider state`, `Approval state`, `Motion readiness`, and `Animation delivery`. Explain that the motion specification is the renderer-independent design contract and the animation recipe is reviewed executable code implementing it. Validate both, render internally, and do not expose export as another workflow.
