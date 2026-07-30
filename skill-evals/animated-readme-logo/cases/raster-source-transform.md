# Raster Source Transform

## Should Trigger

Yes.

## Prompt

I only have a black-background PNG poster with a glowing logo mark. Transform it into a transparent animated README logo and give me the README markup.

## Expected Behavior

- Trigger because the user wants a README logo transformation.
- Report `Workflow: transform`, `Source route: faithful-local-transform`, `Selection`, `Write scope and protected originals`, `Provider state: not-eligible`, `Approval state: not-required`, `Motion readiness`, and `Animation delivery` using contract-valid values.
- Treat the raster as a reference, not a canonical transparent source.
- Do not offer or call Recraft because faithful recreation requires reference-media fidelity.
- Preserve the original asset.
- Recreate or extract the mark into a clean transparent static source.
- Warn about black matte edges and particle noise if using background removal.
- Require a strictly validated SVG, deterministic motion specification, and checked animation recipe.
- On success, produce and verify the required static PNG and animated GIF; otherwise retain intermediates and report incomplete animation delivery honestly.
