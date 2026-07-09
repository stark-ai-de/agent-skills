# Side Port Routing

## Prompt

```text
Use $drawio-diagrams to connect left-to-right services using side ports so arrows leave from the right edge and enter from the left edge.
```

## Should Trigger

Yes

## Expected Behavior

- Use side-port-aware edge geometry or routing style.
- Keep arrows anchored to sensible sides of the source and target nodes.
- Avoid drawing center-to-center connectors through neighboring labels.
- Validate route geometry after writing.

## Deterministic Assertions

- contains: side port
- contains: source
- contains: target
