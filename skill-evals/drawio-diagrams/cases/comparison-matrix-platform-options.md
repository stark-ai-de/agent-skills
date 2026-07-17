# Editable Platform Comparison Matrix

## Prompt

```text
Use $drawio-diagrams to create an editable comparison of three workflow platforms across hosting, data residency, extensibility, operations effort, and cost predictability.
```

## Should Trigger

Yes

## Expected Behavior

- Use aligned rows and columns with one consistent set of criteria.
- Prefer concise qualitative states over invented numeric scores or chart data.
- Keep structural relationships static and make status understandable without color alone.
- Preserve enough space for readable labels and source notes.

## Deterministic Assertions

- regex: matrix|aligned rows|aligned columns
- contains: criteria
- regex: qualitative|no invented
- contains: editable
