# Presentation Slide Diagram Negative

## Prompt

```text
Create a single polished presentation slide with a simplified architecture illustration, speaker notes, and our quarterly-review title. The editable deliverable must be a slide deck, not a draw.io file.
```

## Should Trigger

No

## Expected Behavior

- Do not activate when the required editable source is a presentation deck.
- Route to a presentation or slide-design workflow.
- Do not substitute `.drawio` XML or draw.io export helpers for the requested slide artifact.

## Deterministic Assertions

- regex: presentation|slide deck|slides
- not_contains: validate_drawio.py
- not_contains: render-drawio.mjs
- not_contains: mxGraphModel
