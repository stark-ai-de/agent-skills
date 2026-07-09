# Chart Request Negative

## Prompt

```text
Make me a bar chart showing monthly revenue by product.
```

## Should Trigger

No

## Expected Behavior

- Do not activate by default.
- Route to a charting or data visualization workflow unless the user explicitly asks for an editable draw.io diagram.

## Deterministic Assertions

- regex: chart|data visualization|visualization
- not_contains: validate_drawio.py
- not_contains: render-drawio.mjs
- not_contains: mxGraphModel
