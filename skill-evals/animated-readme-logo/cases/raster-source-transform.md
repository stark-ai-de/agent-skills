# Raster Source Transform

## Should Trigger

Yes.

## Prompt

I only have a black-background PNG poster with a glowing logo mark. Transform it into a transparent animated README logo and give me the README markup.

## Expected Behavior

- Trigger because the user wants a README logo transformation.
- Treat the raster as a reference, not a canonical transparent source.
- Preserve the original asset.
- Recreate or extract the mark into a clean transparent static source.
- Warn about black matte edges and particle noise if using background removal.
- Produce README-safe animated raster assets, static reduced-motion fallback, and validation checks.
