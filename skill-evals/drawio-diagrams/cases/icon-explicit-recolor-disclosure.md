# Explicit Logo Recolor Disclosure

## Prompt

```text
Use $drawio-diagrams to create `printable-brand-map.drawio`. I explicitly request a monochrome white treatment for the supplied GitHub, PostgreSQL, and Redis marks so the diagram can print on a dark background. Apply that recoloring only to this requested output and disclose the source variant, changed color, reason, scope, and contrast evidence in the delivery receipt.
```

## Should Trigger

Yes

## Split Family

icon-policy

## Expected Behavior

- Treat recoloring as allowed only because the prompt explicitly requests it; do not generalize the change to other diagrams or silently alter the source assets.
- State that the source logos were changed to a monochrome white variant and name the affected marks and output scope.
- Disclose the source variant, changed color, reason (dark-background printing), scope, and contrast evidence in the receipt, while keeping logo aspect ratios and the editable source valid.
- Keep the user-requested treatment distinct from the default rule that arbitrary recoloring, inversion, filters, and tints are prohibited.

## Deterministic Assertions

- contains: printable-brand-map.drawio
- regex: explicit.{0,}recolor|user.{0,}request.{0,}(recolor|monochrome)
- regex: source.{0,}variant
- regex: changed.{0,}color
- regex: reason.{0,}(dark|print)
- regex: scope
- regex: contrast.{0,}evidence
- contains: validate_drawio.py
