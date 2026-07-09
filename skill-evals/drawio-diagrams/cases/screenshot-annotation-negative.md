# Screenshot Annotation Negative

## Prompt

```text
Take a screenshot of the login page and add red arrows to the PNG showing where the user should click.
```

## Should Trigger

No

## Expected Behavior

- Do not activate by default.
- Route to a browser, screenshot, or image-editing workflow unless the user explicitly asks for an editable draw.io diagram.
- Do not create a `.drawio` file for a screenshot annotation task.

## Deterministic Assertions

- regex: screenshot|image-editing|image editing|browser
- not_contains: validate_drawio.py
- not_contains: render-drawio.mjs
- not_contains: mxGraphModel
