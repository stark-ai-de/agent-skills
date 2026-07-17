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

- Use built-in draw.io service stencils for all three named AWS services and keep readable labels.
- Avoid network access and remote icon fetches.
- Keep icons editable and record their native stencil styles.
- Validate the resulting `.drawio` file.

## Deterministic Assertions

- contains: stencil
- contains: remote
- contains: validate_drawio.py
