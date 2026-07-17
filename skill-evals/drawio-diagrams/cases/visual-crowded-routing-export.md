# Visual Crowded Routing Export

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Simplify the provided crowded architecture diagram, preserve its existing stable system IDs and dependencies, save the uncompressed source as `crowded-routing-fixed.drawio`, export `crowded-routing-fixed.png` and `crowded-routing-fixed.svg`, and visually inspect that connector routes no longer cross labels or callouts.
```

## Should Trigger

Yes

## Split Family

routing-geometry

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/crowded-routing-before.drawio

## Expected Behavior

- Preserve Client, Admin, API, Queue, Worker, Database, Object Storage, and Webhook systems.
- Preserve the request, dispatch, job, data, artifact, and webhook dependencies.
- Reduce connector crossings and avoid routing through labels or text boxes.
- Run `validate-drawio-diagram-rules.mjs` after simplification.
- Export and inspect the PNG and SVG renders and treat missing draw.io Desktop CLI as an eval-environment failure.

## Deterministic Assertions

- contains: validate-drawio-diagram-rules.mjs
- contains: crowded-routing-fixed.drawio
- contains: crowded-routing-fixed.svg
- contains: crossings
- contains: PNG

## Visual Assertions

- artifact_exists: crowded-routing-fixed.drawio
- drawio_valid: crowded-routing-fixed.drawio uncompressed=1
- drawio_graph: crowded-routing-fixed.drawio ids=client,admin,api,queue,worker,database,storage,webhook edges=client>api,admin>api,api>queue,api>database,queue>worker,worker>database,worker>storage,webhook>api
- artifact_exists: crowded-routing-fixed.png
- png_nonblank: crowded-routing-fixed.png min_size=1000
- png_dimensions: crowded-routing-fixed.png min_width=400 min_height=200
- artifact_exists: crowded-routing-fixed.svg
- svg_valid: crowded-routing-fixed.svg
- svg_contains: crowded-routing-fixed.svg Client
- svg_contains: crowded-routing-fixed.svg Admin
- svg_contains: crowded-routing-fixed.svg API
- svg_contains: crowded-routing-fixed.svg Queue
- svg_contains: crowded-routing-fixed.svg Worker
- svg_contains: crowded-routing-fixed.svg Database
- svg_contains: crowded-routing-fixed.svg Object Storage
- svg_contains: crowded-routing-fixed.svg Webhook
- svg_contains: crowded-routing-fixed.svg request
- svg_contains: crowded-routing-fixed.svg dispatch
- svg_contains: crowded-routing-fixed.svg job
- svg_contains: crowded-routing-fixed.svg data
- svg_contains: crowded-routing-fixed.svg artifact
- svg_contains: crowded-routing-fixed.svg webhook
