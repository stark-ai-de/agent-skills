# Validate And Export

## Prompt

```text
Validate this `.drawio` file and export PNG and dark SVG if the local draw.io CLI is available.
```

## Should Trigger

Yes

## Split Family

basic-export

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/example-clean.drawio

## Expected Behavior

- Run `scripts/validate_drawio.py`.
- Fix or report validation errors.
- Run `scripts/render-drawio.mjs` only when draw.io Desktop CLI exists.
- Inspect exported visuals when available.
- Clearly report skipped export reasons.

## Deterministic Assertions

- contains: validate_drawio.py
- contains: render-drawio.mjs
- regex: export|skipped|unavailable
