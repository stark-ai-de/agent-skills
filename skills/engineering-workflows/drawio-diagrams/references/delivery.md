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

Use `scripts/render-drawio.mjs name.drawio` for the standard light PNG + dark SVG verification export.

## Browser URL delivery

Use `scripts/open-drawio-url.mjs` to build a `https://app.diagrams.net/#create=<payload>` URL from the `.drawio` file with Node built-ins. The script deflates `encodeURIComponent(xml)`, wraps it as `{ type: "xml", compressed: true, data }`, prints the URL, and can open it per platform.

```bash
node skills/engineering-workflows/drawio-diagrams/scripts/open-drawio-url.mjs name.drawio --print-only
node skills/engineering-workflows/drawio-diagrams/scripts/open-drawio-url.mjs name.drawio --open
```

Platform behavior:

| Environment | Opening behavior |
| --- | --- |
| macOS | `open <url>` |
| Linux | `xdg-open <url>` |
| Windows | writes a temporary `.url` shortcut and opens it with `cmd.exe /c start` |
| WSL2 | writes a temporary `.url`, converts it with `wslpath -w`, then opens through `cmd.exe /c start` |

Use the `.url` shortcut workaround on Windows and WSL2 because direct `cmd.exe /c start <url>` can strip the `#create=` fragment or split on `&`.

Warn about browser URL-length limits. Very large diagrams should be delivered as `.drawio` files instead of URL-only artifacts.

## Final response contract

Return:

- file paths
- chosen path and why
- toolset used
- lint result
- visual/dark verification status
- warnings left and why
- how to open/edit
- public cleanup blockers if external assets were used

Sources: integrated from draw.io CLI/plugin workflows and diagrams.net URL delivery patterns.
