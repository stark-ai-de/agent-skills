# Transparent Logo Requirement

## Should Trigger

Yes.

## Prompt

Create an animated README logo from a simple local geometric mark. The background must stay transparent and the edges need to look clean on dark and light GitHub themes. There is no external image-generation capability in this session.

## Expected Behavior

- Trigger because this is an animated README logo request.
- Report `Workflow: create`, `Source route: direct-local-svg`, `Selection`, `Write scope and protected originals`, `Provider state: unavailable`, `Approval state: not-required`, `Motion readiness`, and `Animation delivery` using contract-valid values.
- Author and strictly validate a self-contained SVG locally; use draw.io only if editable geometric construction materially helps.
- Prioritize alpha preservation and checkerboard/light/dark validation.
- Warn that GIF can create poor transparent edges.
- Recommend static PNG/SVG fallback plus animated WebP/APNG where verified.
- Provide a deterministic motion specification and checked animation recipe; never fabricate the required static PNG or animated GIF.
- Include reduced-motion and manual GitHub preview checks.
