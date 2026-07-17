# Full Icon Opt Out

## Prompt

```text
Use $drawio-diagrams to create `plain-runtime.drawio` for Client -> API -> Queue -> Worker -> Database. Use labelled shapes only: no logos, pictograms, emoji, or other icons anywhere in the diagram.
```

## Should Trigger

Yes

## Expected Behavior

- Honor the explicit full icon opt-out even though icon-first presentation is the default.
- Use consistent labelled shapes and hierarchy without substituting semantic icons or logos.
- Keep the directed runtime flow readable and animated by default.
- Validate the editable `.drawio` source and report the chosen no-icon mode.

## Deterministic Assertions

- contains: plain-runtime.drawio
- regex: no-icon|no icon|without icons|icons disabled
- contains: validate_drawio.py
