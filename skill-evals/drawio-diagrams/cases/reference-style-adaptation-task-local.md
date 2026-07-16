# Task-local Reference Style Adaptation

## Prompt

```text
Use $drawio-diagrams to create an editable architecture diagram from my source notes. Match the visual character of the supplied reference image: graphite canvas, thin cyan routes, compact square cards, and one soft shadow tier. Do not copy its layout or artwork, and do not save a global preset.
```

## Fixtures

- skill-evals/drawio-diagrams/fixtures/reference-style-board.svg

## Should Trigger

Yes

## Expected Behavior

- Extract a bounded token set from the reference and start from the closest built-in design profile.
- Create original layout and editable draw.io styles instead of tracing the reference composition or reusing its assets.
- Convert colors to accessible adaptive pairs, limit shadows, and preserve icon, animation, routing, and static-semantics guardrails.
- Record a task-local `adapted-<short-name>` profile, report adapted tokens and readability-driven substitutions, and create no persistent cache or preset.

## Deterministic Assertions

- regex: adapted-[a-z0-9-]+
- regex: token|palette|spacing|radius|connector
- regex: adaptive|light-dark
- regex: no (persistent|global) (preset|cache)|task-local
- contains: validate_drawio.py
