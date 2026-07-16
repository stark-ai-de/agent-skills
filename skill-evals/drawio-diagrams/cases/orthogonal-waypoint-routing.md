# Orthogonal Waypoint Routing

## Prompt

```text
Use $drawio-diagrams to draw Service A -> Service B around a central annotation box using orthogonal routing and explicit waypoints.
```

## Should Trigger

Yes

## Split Family

routing-geometry

## Expected Behavior

- Treat the annotation box as an obstacle.
- Use side ports or waypoints instead of crossing through the annotation.
- Validate route crossing rules.
- Keep the connector editable as a draw.io edge.

## Deterministic Assertions

- contains: waypoint
- contains: obstacle
- contains: validate-drawio-diagram-rules.mjs
