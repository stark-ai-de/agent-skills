# Shape Search Local Index

## Prompt

```text
Use $drawio-diagrams to find a suitable local draw.io shape for a message queue before choosing a fallback.
```

## Should Trigger

Yes

## Expected Behavior

- Prefer local shape search or built-in stencils.
- Avoid network fetches for icons or indexes.
- Fall back to a labelled native queue/message icon if no exact local stencil is available; do not emit a bare rectangle.
- Validate the resulting diagram if a file is changed.

## Deterministic Assertions

- contains: search-shapes.mjs
- contains: semantic icon
- contains: remote
