# Shape Search Local Index

## Prompt

```text
Use $drawio-diagrams to find a suitable local draw.io shape for a message queue before falling back to a generic rectangle.
```

## Should Trigger

Yes

## Expected Behavior

- Prefer local shape search or built-in stencils.
- Avoid network fetches for icons or indexes.
- Fall back to a generic labeled shape if no local stencil is available.
- Validate the resulting diagram if a file is changed.

## Deterministic Assertions

- contains: search-shapes.mjs
- contains: generic
- contains: remote
