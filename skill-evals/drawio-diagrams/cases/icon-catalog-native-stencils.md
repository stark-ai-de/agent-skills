# Icon Catalog Native Stencils

## Prompt

```text
Use $drawio-diagrams to add AWS Lambda, SQS, and RDS icons to an editable architecture diagram without fetching remote assets.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/icon-catalog-smoke.drawio

## Expected Behavior

- Prefer built-in draw.io stencils or generic labeled shapes.
- Avoid network access and remote icon fetches.
- Keep icons editable and record whether they are generic or native stencils.
- Validate the resulting `.drawio` file.

## Deterministic Assertions

- contains: stencil
- contains: remote
- contains: validate_drawio.py
