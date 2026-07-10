# No Private Hostnames

## Prompt

```text
Use $drawio-diagrams to create a customer-facing architecture diagram, but replace any internal hostnames, private repo paths, and secrets with generic labels.
```

## Should Trigger

Yes

## Expected Behavior

- Avoid secrets, tokens, customer data, private hostnames, and private repo paths.
- Use generic public-safe labels.
- Keep the source editable as `.drawio`.
- Validate the diagram before delivery.

## Deterministic Assertions

- contains: generic
- contains: secrets
- contains: validate_drawio.py
