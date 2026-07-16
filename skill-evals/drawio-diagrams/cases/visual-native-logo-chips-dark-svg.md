# Visual Native Logo Chips In Dark Mode

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Starting from the supplied architecture icon fixture, create `aws-runtime-dark.drawio` and export a dark `aws-runtime-dark.svg`. Preserve the native AWS Lambda, RDS, and ElastiCache marks on consistent neutral chips with readable labels.
```

## Should Trigger

Yes

## Split Family

native-icon-architecture

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/architecture-icons.drawio

## Expected Behavior

- Preserve the recognizable native stencil artwork and fixed proportions.
- Use consistent chip size, padding, border, and neutral contrast without recoloring marks.
- Apply adaptive light/dark colors to text, surfaces, connectors, and boundaries.
- Export the exact dark SVG and inspect logo recognizability, clipping, and label contrast.

## Deterministic Assertions

- contains: aws-runtime-dark.drawio
- contains: aws-runtime-dark.svg
- contains: adaptiveColors
- regex: neutral chip|neutral background

## Visual Assertions

- artifact_exists: aws-runtime-dark.drawio
- drawio_valid: aws-runtime-dark.drawio uncompressed=1 min_native_stencils=3
- drawio_graph: aws-runtime-dark.drawio native_ids=lambda,postgres,redis
- artifact_exists: aws-runtime-dark.svg
- svg_valid: aws-runtime-dark.svg
- svg_contains: aws-runtime-dark.svg Lambda
- svg_contains: aws-runtime-dark.svg RDS
- svg_contains: aws-runtime-dark.svg ElastiCache
