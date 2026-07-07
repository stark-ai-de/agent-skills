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

## Browser URL delivery

Build `https://app.diagrams.net/#create=<payload>` from Node built-ins using raw deflate over `encodeURIComponent(xml)` inside the JSON payload. Print URL and warn about URL-length limits. Use `.drawio` file fallback for large diagrams.

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
