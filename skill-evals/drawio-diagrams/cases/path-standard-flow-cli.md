# Standard CLI-Assisted Flow Path

## Prompt

```text
Use $drawio-diagrams. This workstation has draw.io Desktop installed. Create an editable order-approval flow with two decisions and export a PNG.
```

## Should Trigger

Yes

## Expected Behavior

- Use the normal editable XML and local CLI-assisted render path.
- Preserve the `.drawio` file as the source of truth.
- Validate the source before export and inspect the generated PNG rather than inferring success from exit status alone.
- Report the exact source and export paths.

## Deterministic Assertions

- contains: .drawio
- contains: .png
- contains: validate_drawio.py
- regex: inspect|visual review
