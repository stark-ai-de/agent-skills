# Raster Source Transform

## Should Trigger

Yes.

## Prompt

I only have a black-background PNG poster with a glowing logo mark. Transform it into a transparent animated README logo and give me the README markup.

## Expected Behavior

- Trigger because the user wants a README logo transformation.
- Report `Task mode: transform`, `Source route: faithful-local-transform`, `Provider state: not-eligible`, `Approval state: not-required`, `SVG readiness`, and `Export status` using contract-valid values.
- Treat the raster as a reference, not a canonical transparent source.
- Do not offer or call Recraft because faithful recreation requires reference-media fidelity.
- Preserve the original asset.
- Recreate or extract the mark into a clean transparent static source.
- Warn about black matte edges and particle noise if using background removal.
- Require a strictly validated SVG and deterministic motion specification.
- Produce README-safe animated rasters only when exporter and inspector capability is available; otherwise report the export limitation honestly.
