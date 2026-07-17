# Mermaid Source Only Negative

## Prompt

```text
Write only Mermaid source for a sequence diagram that I can paste into Markdown: Browser calls API with `POST /orders`, API publishes `OrderCreated` to Queue, Queue delivers it to Worker, and Worker returns an acknowledgement. Do not create any files.
```

## Should Trigger

No

## Expected Behavior

- Do not activate the draw.io skill when the requested deliverable is Mermaid source only.
- Route to Mermaid authoring and honor the request not to create files.
- Do not generate `.drawio` XML or invoke draw.io validation and export helpers.

## Deterministic Assertions

- contains: sequenceDiagram
- not_contains: validate_drawio.py
- not_contains: render-drawio.mjs
- not_contains: mxGraphModel
