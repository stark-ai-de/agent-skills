# Artistic Image Request Negative

## Prompt

```text
Create a photorealistic hero image of a cloud operations team in a futuristic control room with dramatic lighting.
```

## Should Trigger

No

## Expected Behavior

- Do not activate by default.
- Route to an image generation or visual design workflow unless the user explicitly asks for an editable draw.io diagram.
- Do not create a `.drawio` file or present draw.io validation as relevant.

## Deterministic Assertions

- regex: image|visual design|photorealistic
- not_contains: validate_drawio.py
- not_contains: render-drawio.mjs
- not_contains: mxGraphModel
