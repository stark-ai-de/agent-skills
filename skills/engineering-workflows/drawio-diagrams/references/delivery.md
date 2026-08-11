# Delivery

## Primary output

Always keep the editable `.drawio` file as the source of truth. Prefer uncompressed XML for git diffs and direct repair.

Naming:

```text
kebab-case-name.drawio
kebab-case-name.drawio.png
kebab-case-name.drawio.svg
kebab-case-name.drawio.pdf
kebab-case-name.light.svg
kebab-case-name.dark.svg
kebab-case-name.light.png
kebab-case-name.dark.png
kebab-case-name.validation.json
```

Use the `.light.*` and `.dark.*` pairs only when the user requests fixed-theme comparison exports. The standard renderer naming below remains unchanged.

Canonical names belong to the native route. If a fallback route produces a maintained artifact, keep the base name only for a verified native result and add an explicit route suffix such as `.fallback-windows-raw`, `.fallback-browser-preview`, `.fallback-illustrative-image`, `.raw-cli`, `.windows-bridge`, or `.fixed-theme-browser` to the fallback artifact. Never present a manual, cross-boundary, browser-preview, or image-generation result as a native export.

## Export commands

When draw.io Desktop CLI exists:

```bash
drawio -x -f png -s 2 -b 10 -o name.drawio.png name.drawio
drawio -x -f svg --svg-theme auto -e -b 10 -o name.drawio.svg name.drawio
drawio -x -f pdf -e -b 10 -o name.drawio.pdf name.drawio
drawio -x -f svg --svg-theme light -e -b 10 -o name.light.svg name.drawio
drawio -x -f svg --svg-theme dark -e -b 10 -o name.dark.svg name.drawio
```

The standard `name.drawio.svg` is adaptive; do not relabel it as fixed light. For a light/dark comparison set, pass `--svg-theme light` and `--svg-theme dark` explicitly for every source, then, after explicit user approval, rasterize each fixed SVG through the same pinned local Chromium-family browser executable:

```bash
BROWSER="/absolute/path/to/pinned/chromium"
node scripts/rasterize-themed-svg.mjs name.light.svg name.light.png --browser "$BROWSER"
node scripts/rasterize-themed-svg.mjs name.dark.svg name.dark.png --browser "$BROWSER"
```

The rasterizer reads the parsed root element, requires its `color-scheme` to be fixed to exactly `light` or `dark`, recursively inspects bounded embedded SVG image data, rejects active content and remotely loaded render assets, disables browser JavaScript, uses an isolated temporary browser profile, preserves the SVG dimensions, validates the PNG, and refuses to replace an existing output. A pinned absolute browser executable path is required so a comparison batch does not silently mix rendering engines; `SVG_RASTER_BROWSER` may provide the same explicit path. This SVG-to-PNG path is required for a true dark PNG because draw.io Desktop's theme option applies to SVG, not direct PNG export. Build comparison galleries from the static light/dark PNG previews and link the fixed-theme SVGs plus editable sources separately.

Export and validate every source/theme artifact, even when the CLI is invoked in a batch. If a preview appears to clip an embedded image, inspect a full-resolution crop with an independent decoder and make an isolated re-export before changing the source or renderer. Treat animated SVG byte hashes and live animation frames as nondeterministic; prove repeatability with source-graph, declared-theme, self-containment, and static-render checks.

Prefer `scripts/render-drawio.mjs name.drawio` for the standard light PNG + dark SVG verification export. It rejects exit-zero runs that create no fresh artifact and validates both formats before commit. Installation is no-clobber at each destination. Interrupted commits retain partial outputs plus staged files and backups instead of deleting concurrent data. A successful replacement also prints and retains its `.drawio-render-*` recovery directory; inspect the public outputs and `backup-*` files before removing it manually. Fresh installs without prior outputs clean their staging directory automatically. Treat raw CLI commands as format probes, not proof that an output was produced.

The transactional renderer intentionally requires Linux `/proc/self/fd` plus a Linux-native draw.io CLI. It holds directory descriptors and passes them to the child exporter so staging, commit, and cleanup cannot follow a raced lexical ancestor. It fails closed on macOS and Windows. On Linux hosts, including WSL distributions, use a native draw.io executable owned by the active user profile or a compatible package after checking package ownership and host compatibility. Do not use a Windows `draw.io.exe`, mutable draw.io configuration, or an AppImage for the transactional route: Windows binaries cannot consume the inherited Linux descriptor paths. On unsupported platforms, use the approved raw CLI/manual or cross-boundary Windows fallback below, run the validators against fresh artifacts, inspect both formats, and report that the transactional renderer's filesystem-race guarantees are unavailable.

The bounded PNG verifier intentionally accepts only the standard non-interlaced output produced by the supported draw.io export path. It rejects interlaced PNGs with a clear unsupported-mode error even though PNG itself defines an interlaced form.

Native `flowAnimation=1` is preserved in SVG exports when the viewer supports SVG animation. PNG and PDF are static by design, so arrowheads, labels, protocols, and line semantics must remain complete without motion. Do not promise step-by-step packet playback; native connector animation communicates continuous direction only.

## Capability-aware fallback routes

Run a non-mutating capability preflight after workflow and authority selection. Use the first route whose capability and independent approvals are evidenced:

1. `transactional-native`: `scripts/render-drawio.mjs` plus a Linux-native draw.io CLI. This is the only route that claims the renderer's descriptor-safe staging and no-clobber guarantees.
2. `approved-raw-cli-manual`: raw Desktop CLI or manual export after a format smoke test. A cross-boundary Windows bridge is allowed only with explicit cross-boundary approval and must use the Windows-bridge suffix; it does not claim transactional guarantees.
3. `fixed-theme-browser-raster`: validated fixed-theme SVG rasterized through one explicitly approved local browser executable. This route is only for viewer-independent fixed-theme PNG previews and does not replace the editable source.
4. `browser-url-preview` or `html-viewer-preview`: `scripts/open-drawio-url.mjs` or an HTML preview only when explicitly requested. Treat the URL/HTML as a preview transport, not a canonical artifact; warn that diagram data can appear in browser history, sync, screenshots, or logs.
5. `direct-xml`: the universal editable route when no optional renderer is available. It can deliver the `.drawio` source and validator evidence without claiming visual export.

Image generation is outside this ladder. Use it only when the user explicitly changes the desired outcome to a non-editable image, and state that the result is not a draw.io source.

### Cross-boundary Windows bridge

The bridge crosses the Linux/Windows boundary and therefore requires a separate approval from tool installation or browser/hosted approval. Convert paths before invoking a Windows binary and keep the output suffix explicit:

```bash
DRAWIO_EXE='/mnt/c/Program Files/draw.io/draw.io.exe'
INPUT_WIN="$(wslpath -w "$PWD/name.drawio")"
OUTPUT_WIN="$(wslpath -w "$PWD/name.windows-bridge.drawio.png")"
"$DRAWIO_EXE" -x -f png -s 2 -b 10 -o "$OUTPUT_WIN" "$INPUT_WIN"
```

Treat the command as an approved raw/manual route. It cannot be passed to `scripts/render-drawio.mjs`, cannot inherit Linux descriptor paths, and must report `Cross-boundary approval: granted` plus the corresponding limitation in the receipt.

## Browser URL delivery

Use `scripts/open-drawio-url.mjs` to build a `https://app.diagrams.net/#create=<payload>` URL from the `.drawio` file with Node built-ins. The script deflates `encodeURIComponent(xml)`, wraps it as `{ type: "xml", compressed: true, data }`, prints the URL, and can open it per platform.

```bash
node skills/engineering-workflows/drawio-diagrams/scripts/open-drawio-url.mjs name.drawio --print-only
node skills/engineering-workflows/drawio-diagrams/scripts/open-drawio-url.mjs name.drawio --open
```

Platform behavior:

| Environment | Opening behavior                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------- |
| macOS       | `open <url>`                                                                                    |
| Linux       | `xdg-open <url>`                                                                                |
| Windows     | writes a temporary `.url` shortcut and opens it with `cmd.exe /c start`                         |
| WSL2        | writes a temporary `.url`, converts it with `wslpath -w`, then opens through `cmd.exe /c start` |

Use the `.url` shortcut workaround on Windows and WSL2 because direct `cmd.exe /c start <url>` can strip the `#create=` fragment or split on `&`.

Warn about browser URL-length limits. Very large diagrams should be delivered as `.drawio` files instead of URL-only artifacts.

## Final response contract

Return:

- file paths
- chosen path and why
- toolset used
- lint result
- visual/dark verification status
- animation mode and whether the requested SVG retains native motion
- warnings left and why
- architecture view/scope and intentional detail-page or omission choices
- selected design profile and theme mode, including any readability-driven fallback
- icon/logo providers, styles/slugs, and any per-node semantic substitutions
- how to open/edit

For every `create`, `edit-repair`, or `export` receipt, include these exact fields (use `not-needed`, `pending`, `blocked`, or `unverified` explicitly when applicable):

```text
Capability status: ...
Renderer route: ...
Tool-install approval: ...
Cross-boundary approval: ...
Export status: ...
Visual verification: ...
Evidence scope: ...
Fallback (used/offered): ...
```

The receipt must state the limitation of every fallback used or offered. A successful local export does not prove CI, publication, hosted, deployment, production, or live-runtime behavior.

For icon/logo delivery, use the official organization, product, platform, model, or service asset whenever available. Generic semantic icons are fallback-only for named entities (but remain the normal notation for genuinely generic concepts). Preserve the source artwork, aspect ratio, and brand colors. Arbitrary recoloring, tinting, inversion, or dark-mode filtering is prohibited unless the user explicitly requests it or a necessary accessibility exception is documented; disclose the source variant, changed colors, reason, scope, and contrast evidence in the receipt. Change the surrounding chip/card first.

When any third-party logo or icon is used, including a native vendor stencil or generic third-party icon, include this once in the response, not inside the diagram:

```text
Rights notice: Third-party logos and icons may be protected by copyright, trademark, or source-specific terms. They are included for identification; you are responsible for confirming that your intended use and distribution are permitted in your jurisdiction.
```

Do not add a per-icon legal report or cleanup blocker unless the user explicitly asks for compliance review.

Keep one canonical editable `.drawio` source and refresh the export referenced by repository docs. Keep logo probes, temporary renders, and review screenshots outside the maintained diagram folder unless they are explicit deliverables.

Sources: integrated from draw.io CLI/plugin workflows and diagrams.net URL delivery patterns.
