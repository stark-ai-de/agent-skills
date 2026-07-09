# Visual Crowded Routing Export

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Simplify the provided crowded architecture diagram, preserve the same systems and dependencies, export a PNG render, and visually inspect that connector routes no longer cross labels or callouts.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/crowded-routing-before.drawio

## Expected Behavior

- Preserve Client, Admin, API, Queue, Worker, Database, Object Storage, and Webhook systems.
- Preserve the request, dispatch, job, data, artifact, and webhook dependencies.
- Reduce connector crossings and avoid routing through labels or text boxes.
- Run `validate-drawio-diagram-rules.mjs` after simplification.
- Export and inspect a PNG render and treat missing draw.io Desktop CLI as an eval-environment failure.

## Deterministic Assertions

- contains: validate-drawio-diagram-rules.mjs
- contains: crossings
- contains: PNG

## Visual Assertions

- artifact_exists: *.png
- png_nonblank: *.png min_size=1000
- png_dimensions: *.png min_width=400 min_height=200
