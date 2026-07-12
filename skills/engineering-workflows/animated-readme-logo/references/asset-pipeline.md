# Asset Pipeline

Use this reference after the canonical SVG and motion specification are ready.

## Canonical minimum

```text
docs/assets/<slug>-logo.svg              # validated, self-contained source
docs/assets/<slug>-logo-motion.md        # deterministic motion specification
```

Add only verified delivery artifacts:

```text
docs/assets/<slug>-logo-static.png
docs/assets/<slug>-logo-static.webp
docs/assets/<slug>-logo-animated.webp
docs/assets/<slug>-logo-animated.apng
docs/assets/<slug>-logo-animated.gif
docs/logo/index.html                     # optional web demo
```

Use the repository's established asset folder instead of `docs/assets/` when one exists.

## Capability-gated export

1. Detect the available local exporter and animation inspector.
2. Record the exact source, settings, and command before export.
3. Export only formats the tool actually supports.
4. Inspect every animated raster with the bundled inspector. It rejects non-regular inputs, malformed animation structure, hidden text/comment/application/EXIF/XMP/ICC metadata, and unsupported ancillary chunks.
5. Claim `Export status: completed` only when requested outputs exist and pass inspection.

When an exporter or inspector is missing, keep the validated SVG and motion spec, set `Export status: capability-unavailable`, and provide an exact next step. Do not create placeholder files or claim an export succeeded.

## Transparency and delivery checks

- Preserve alpha through every export.
- Keep the static first frame useful.
- Test light, dark, and checkerboard backgrounds for matte edges.
- Treat GIF as a conservative compatibility fallback with limited color and alpha quality.
- Include a static reduced-motion source and an `<img>` fallback.
- Use explicit display dimensions and meaningful alt text.
- Keep file-size targets repository-specific unless the repository defines a limit.
