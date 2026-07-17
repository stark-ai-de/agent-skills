# Dark SVG Contrast

## Prompt

```text
Use $drawio-diagrams to review a dark SVG export for low-contrast text and fix the source .drawio if labels are hard to read.
```

## Should Trigger

Yes

## Split Family

dark-theme

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/example-contrast-broken.drawio

## Expected Behavior

- Inspect the source `.drawio`, not only the exported SVG.
- Fix contrast at the XML/source level.
- Prefer theme-aware colors when compatible.
- Re-run validation and report visual inspection status.

## Deterministic Assertions

- contains: contrast
- contains: light-dark(
- contains: validate_drawio.py
