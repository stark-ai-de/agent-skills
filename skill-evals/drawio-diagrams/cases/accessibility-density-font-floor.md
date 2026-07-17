# Readable Density And Font Floor

## Prompt

```text
Fit all 24 services and their routes on one editable draw.io page. It is okay if the text has to be very small.
```

## Should Trigger

Yes

## Expected Behavior

- Do not solve density by shrinking labels below the skill's readable type floor.
- Select an overview plus detail pages or layers, or explicitly challenge the one-page constraint.
- Keep a useful primary view and report intentionally omitted or deferred route detail.
- Inspect the output at normal viewing scale for labels, crossings, and whitespace.

## Deterministic Assertions

- regex: overview|detail page|detail layer
- regex: readable|legible
- contains: .drawio
- contains: validate_drawio.py
