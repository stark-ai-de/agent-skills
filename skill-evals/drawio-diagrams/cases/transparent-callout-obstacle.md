# Transparent Callout Obstacle

## Prompt

```text
Use $drawio-diagrams to create a service flow where a transparent callout explains a risk, and make sure no arrow crosses through the callout text.
```

## Should Trigger

Yes

## Split Family

routing-geometry

## Expected Behavior

- Treat transparent text, labels, and callouts as routing obstacles.
- Route edges around the callout using waypoints or side ports.
- Validate route-crossing rules.
- Keep the callout editable as a draw.io cell.

## Deterministic Assertions

- contains: transparent
- contains: callout
- contains: validate-drawio-diagram-rules.mjs
