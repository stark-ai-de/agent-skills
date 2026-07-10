# Infographic Poster Negative

## Prompt

```text
Design a polished infographic poster explaining Kubernetes pods and export it as a JPEG.
```

## Should Trigger

No

## Expected Behavior

- Do not activate by default.
- Route to a graphic design, presentation, or image export workflow unless the user explicitly asks for editable draw.io source.
- Do not substitute an editable `.drawio` diagram for the requested poster deliverable.

## Deterministic Assertions

- regex: infographic|poster|graphic design|presentation
- not_contains: validate_drawio.py
- not_contains: render-drawio.mjs
- not_contains: mxGraphModel
