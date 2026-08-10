# Brand Color Preservation

## Prompt

```text
Use $drawio-diagrams to create a light- and dark-compatible editable diagram with the supplied original Orbit mark, plus GitHub and PostgreSQL. Keep every resolved logo recognizable: preserve each source SVG's bytes, viewBox, aspect ratio, and original brand colors. Adjust only the surrounding neutral chip when contrast needs help; do not recolor, invert, filter, or tint the marks.
```

## Should Trigger

Yes

## Fixtures

- skill-evals/drawio-diagrams/fixtures/eval-orbit-mark.svg

## Expected Behavior

- Embed the supplied Orbit SVG unchanged, including its original color values and viewBox, with a fixed aspect ratio.
- Prefer the resolved GitHub and PostgreSQL marks over generic placeholders and keep their original artwork and colors in both themes.
- Use neutral chip/background and text contrast changes to support dark mode; do not apply an automatic inversion, filter, tint, or arbitrary recoloring to logo cells.
- Validate the self-contained editable `.drawio` source and inspect both themes for clipping and recognizability.

## Deterministic Assertions

- contains: eval-orbit-mark.svg
- regex: original.{0,}(bytes|colors|artwork)|preserve.{0,}(colors|artwork)
- regex: do not.{0,}(recolor|invert|filter|tint)|arbitrary.{0,}recolor
- regex: neutral.{0,}(chip|background)
- contains: aspect=fixed
- contains: validate_drawio.py
