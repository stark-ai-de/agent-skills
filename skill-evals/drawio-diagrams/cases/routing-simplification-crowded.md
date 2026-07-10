# Routing Simplification Crowded

## Prompt

```text
Use $drawio-diagrams to simplify the provided crowded architecture diagram with tangled arrows while preserving the same systems and dependencies.
```

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/crowded-routing-before.drawio

## Expected Behavior

- Preserve the semantic systems and dependencies.
- Keep Client, Admin, API, Queue, Worker, Database, Object Storage, and Webhook systems present.
- Preserve the existing request, dispatch, job, data, artifact, and webhook dependencies.
- Reduce unnecessary crossings and visual clutter.
- Avoid arrows through labels, callouts, and text boxes.
- Validate routing warnings after the simplification.

## Deterministic Assertions

- contains: crossings
- contains: labels
- contains: validate-drawio-diagram-rules.mjs
