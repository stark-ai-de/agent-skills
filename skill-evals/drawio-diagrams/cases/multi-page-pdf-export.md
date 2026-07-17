# Multi Page PDF Export

## Prompt

```text
Use $drawio-diagrams to create `platform-review.drawio` with three pages named Context, Runtime, and Deployment. Export all three pages, in that order, to one `platform-review.pdf` for an architecture review.
```

## Should Trigger

Yes

## Expected Behavior

- Create one editable multi-page source with the exact requested page names and order.
- Keep repeated systems consistently named across page boundaries.
- Validate every page before export and use the local CLI to export one multi-page PDF.
- Verify that the PDF exists and report any renderer limitation without claiming success prematurely.

## Deterministic Assertions

- contains: platform-review.drawio
- contains: platform-review.pdf
- contains: Context
- contains: Runtime
- contains: Deployment
- contains: validate_drawio.py
