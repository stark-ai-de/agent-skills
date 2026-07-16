# Timeline Roadmap Diagram

## Prompt

```text
Create an editable draw.io roadmap timeline for Q1, Q2, Q3, and Q4 with milestones and dependency arrows.
```

## Should Trigger

Yes

## Expected Behavior

- Create an editable timeline layout, not a static image.
- Keep quarter labels and milestone text readable.
- Route dependency arrows without crossing milestone labels.
- Validate the generated diagram.

## Deterministic Assertions

- contains: timeline
- contains: editable
- contains: validate_drawio.py
