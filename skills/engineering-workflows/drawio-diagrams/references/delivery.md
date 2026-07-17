# Delivery

## Primary output

Always keep the editable `.drawio` file as the source of truth. Prefer uncompressed XML for git diffs and direct repair.

Naming:

```text
kebab-case-name.drawio
kebab-case-name.drawio.png
kebab-case-name.drawio.svg
kebab-case-name.drawio.pdf
kebab-case-name.dark.svg
kebab-case-name.validation.json
```

## Export commands

When draw.io Desktop CLI exists:

```bash
drawio -x -f png -s 2 -b 10 -o name.drawio.png name.drawio
drawio -x -f svg -e -b 10 -o name.drawio.svg name.drawio
drawio -x -f pdf -e -b 10 -o name.drawio.pdf name.drawio
drawio -x -f svg --svg-theme dark -e -b 10 -o name.dark.svg name.drawio
```

Prefer `scripts/render-drawio.mjs name.drawio` for the standard light PNG + dark SVG verification export. It rejects exit-zero runs that create no fresh artifact and validates both formats before commit. Installation is no-clobber at each destination. Interrupted commits retain partial outputs plus staged files and backups instead of deleting concurrent data. A successful replacement also prints and retains its `.drawio-render-*` recovery directory; inspect the public outputs and `backup-*` files before removing it manually. Fresh installs without prior outputs clean their staging directory automatically. Treat raw CLI commands as format probes, not proof that an output was produced.

The transactional renderer intentionally requires Linux `/proc/self/fd` plus a Linux-native draw.io CLI. It holds directory descriptors and passes them to the child exporter so staging, commit, and cleanup cannot follow a raced lexical ancestor. It fails closed on macOS and Windows. Under WSL, use a Linux-native draw.io package or AppImage; a Windows `draw.io.exe` cannot consume the inherited Linux descriptor paths. On unsupported platforms, use the raw CLI commands above or export manually, run the validators against the fresh artifacts, inspect both formats, and replace maintained outputs yourself; that fallback does not provide the transactional renderer's filesystem-race guarantees.

The bounded PNG verifier intentionally accepts only the standard non-interlaced output produced by the supported draw.io export path. It rejects interlaced PNGs with a clear unsupported-mode error even though PNG itself defines an interlaced form.

Native `flowAnimation=1` is preserved in SVG exports when the viewer supports SVG animation. PNG and PDF are static by design, so arrowheads, labels, protocols, and line semantics must remain complete without motion. Do not promise step-by-step packet playback; native connector animation communicates continuous direction only.

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

When any third-party logo or icon is used, including a native vendor stencil or generic third-party icon, include this once in the response, not inside the diagram:

```text
Rights notice: Third-party logos and icons may be protected by copyright, trademark, or source-specific terms. They are included for identification; you are responsible for confirming that your intended use and distribution are permitted in your jurisdiction.
```

Do not add a per-icon legal report or cleanup blocker unless the user explicitly asks for compliance review.

Keep one canonical editable `.drawio` source and refresh the export referenced by repository docs. Keep logo probes, temporary renders, and review screenshots outside the maintained diagram folder unless they are explicit deliverables.

Sources: integrated from draw.io CLI/plugin workflows and diagrams.net URL delivery patterns.
