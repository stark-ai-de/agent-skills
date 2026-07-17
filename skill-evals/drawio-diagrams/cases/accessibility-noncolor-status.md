# Non-Color Status Semantics

## Prompt

```text
Use $drawio-diagrams to show current, target, blocked, optional, and development-only components in one editable architecture view. Red and green are fine if useful.
```

## Should Trigger

Yes

## Split Family

accessibility-status

## Expected Behavior

- Combine color with labels, badges, border patterns, shapes, or line semantics.
- Keep every state understandable in grayscale, static output, and light or dark mode.
- Include a compact legend for non-obvious state semantics.
- Avoid red-versus-green as the only distinction.

## Deterministic Assertions

- contains: grayscale
- regex: label|badge|border|shape
- contains: legend
- regex: non-color|grayscale|color.{0,}(badge|label|border|shape|pattern)
