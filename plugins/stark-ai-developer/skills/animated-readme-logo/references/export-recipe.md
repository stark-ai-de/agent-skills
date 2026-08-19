# Export Recipe Contract

Use the bundled exporter only after the canonical SVG and deterministic motion specification are ready. Persist the reviewed recipe as `<slug>-logo-animation.mjs`; it is one of the five required outputs for every successful mutating workflow.

## Boundary

The motion specification and recipe serve different readers:

- `<slug>-logo-motion.md` is the human-readable, renderer-independent design contract: named layers, keyframes, easing, duration, loop, transparency, and reduced-motion state.
- `<slug>-logo-animation.mjs` is trusted executable repository code that implements that contract for deterministic frame rendering.

Do not replace one with the other, and do not expose export as a public workflow.

- Keep brand geometry, named layers, palette, placement, easing, timing, and repository-specific limits in a root-relative `.mjs` recipe.
- Treat the recipe as trusted executable repository code. Read it before execution; never download or run a remote, dependency-provided, unreviewed generated, or unreviewed pull-request recipe. `--check` is not a sandbox: it prevents exporter-controlled writes, but imported recipe code can still have arbitrary side effects.
- Keep the reusable rasterization, encoding, staging, sanitization, and inspection mechanics in the skill.
- Do not point product scripts at an author-home or sibling-checkout skill path. Use the exporter as an agent tool, or deliberately install and pin the skill project-locally before making it a repository command dependency.

## Recipe

```js
export default {
  schemaVersion: 1,
  source: ".github/assets/example-logo.svg",
  staticOutput: ".github/assets/example-logo-static.png",
  animatedOutput: ".github/assets/example-logo-animated.gif",
  width: 800,
  height: 400,
  fps: 15,
  frameCount: 72,
  maxFileBytes: 5 * 1024 * 1024,
  gifMaxColors: 128,
  preserveTransparency: true,
  renderFrame({ sourceSvg, frameIndex, timeSeconds, width, height, fps, frameCount }) {
    // Return one complete, self-contained SVG with numeric width and height.
    // Extract or transform reviewed geometry from sourceSvg without changing identity.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- repository-specific frame ${frameIndex}/${frameCount} at ${timeSeconds}s and ${fps}fps -->
</svg>`;
  },
};
```

Required fields:

- `schemaVersion`: exactly `1`; unsupported recipe versions fail closed.
- `source`, `staticOutput`, and `animatedOutput`: distinct root-relative paths; source ends in `.svg`, outputs end in `.png` and `.gif`.
- `width`, `height`, `fps`, and `frameCount`: positive integers; animation requires at least two frames.
- `renderFrame(context)`: synchronous or asynchronous function returning one complete SVG string.

Optional fields:

- `maxTotalFrameBytes`: cumulative UTF-8 byte limit across all rendered SVG frames, default and maximum 32 MiB. Lower it when the repository needs a stricter render-work ceiling.
- `maxFileBytes`: GIF limit, default 5 MiB and maximum 20 MiB.
- `gifMaxColors`: palette size from 2 through 256, default 128. When `preserveTransparency` is `true`, use at least 3 so FFmpeg can reserve one transparent entry.
- `preserveTransparency`: default `true`; requires an alpha-capable static PNG and reserves GIF transparency. The reviewed recipe must still omit opaque background geometry when transparent pixels are required. Set `false` only when the approved design intentionally supplies an opaque background.

Every rendered frame must be well-formed, self-contained SVG, declare the configured numeric dimensions, and avoid scripts, `foreignObject`, external references, imports, and non-local CSS URLs. Literal resolved same-document fragments such as `<use href="#mark"/>` are allowed; encoded, relative, data, and remote references are not.

The exporter renders two complete validation passes and compares every frame at the same index. A mutating export rasterizes the exact first-pass SVG bytes that passed that comparison; it does not invoke `renderFrame` a third time. Keep `renderFrame` pure and independent of call order even when only `--check` is requested.

## Commands

Inspect help before using optional flags:

```bash
node scripts/export-readme-logo-animation.mjs --help
```

Validate the contract and every rendered frame without exporter-controlled writes or raster tools:

```bash
node scripts/export-readme-logo-animation.mjs \
  --root /path/to/repository \
  --recipe path/to/logo-recipe.mjs \
  --check
```

After tool capability and approval checks, export:

```bash
node scripts/export-readme-logo-animation.mjs \
  --root /path/to/repository \
  --recipe path/to/logo-recipe.mjs
```

Add `--replace` only when the reviewed destinations already exist and regeneration is intended. Without it, already-present outputs fail before tool execution, and each absent destination is claimed atomically without overwriting a path that appears during rendering. Missing output-parent components are created one at a time through a held POSIX directory descriptor; the same held parent and stage descriptors anchor commit and cleanup, so a raced symlink or renamed lexical ancestor cannot redirect a mutation. A mutating export fails closed on platforms without a descriptor-directory view; read-only `--check` remains available. If a later destination collides after an earlier output was linked, the exporter reports `OUTPUT_ROLLBACK_INCOMPLETE` and retains the partial public link plus both stage directories; this conservative recovery state avoids deleting data that another process may have changed through the shared inode.

The exporter uses `rsvg-convert` and FFmpeg and starts its final commit only after strict structure and GIF-timing validation. The commit binds each staged file, public hard link, replacement backup, stage-directory chain, and output-parent chain to content or filesystem identities. A same-inode content change or directory rebind fails closed. When `--replace` actually moves an existing output to backup, a successful export intentionally retains both `.readme-logo-*-stage-*` directories with their validated staged links and `backup-*` files; deleting a verified backup automatically would still race a writer holding an open descriptor. Inspect the public outputs and both retained generations, then remove those directories manually. Fresh exports with no prior outputs still clean their staged links automatically. It preserves existing outputs when generation fails before that commit. It does not install commands. Run the canonical SVG validator before export and keep the motion specification beside the derived assets.

If the exporter reports `OUTPUT_ROLLBACK_INCOMPLETE`, do not rerun it. Inspect the destinations and `.readme-logo-*-stage-*` directories directly inside the declared output parents. Depending on commit mode, these retain partial hard links or `backup-*` files for deliberate manual recovery. Remove the stage directories only after both destinations are verified.
