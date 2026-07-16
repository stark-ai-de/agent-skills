# Modern Readable Design

## Prompt

```text
Create a modern, editable draw.io architecture diagram with eight components, two system boundaries, labelled request and event flows, and light/dark compatibility. Prioritize readability over decoration.
```

## Should Trigger

Yes

## Split Family

architecture-default-quality

## Expected Behavior

- Use a restrained semantic palette, consistent shapes, spacing, typography, and corner treatment.
- Establish clear title, boundary, component, detail, and connector-label hierarchy.
- Keep gradients and shadows off by default; use flat surfaces and restrained semantic accents.
- Use relevant logos or semantic icons for all primary components without sacrificing the text hierarchy.
- Keep labels readable, routes separated, and colors compatible with light and dark mode.

## Deterministic Assertions

- contains: adaptiveColors
- contains: light-dark(
- contains: hierarchy
- contains: validate_drawio.py
