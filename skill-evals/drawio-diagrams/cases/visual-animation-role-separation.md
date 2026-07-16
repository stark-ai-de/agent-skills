# Visual Animation Role Separation

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create `mixed-edge-roles.drawio` and export `mixed-edge-roles.svg`. Use stable component IDs `client`, `api`, `queue`, `database`, and `team`; stable edge IDs `request-edge`, `event-edge`, `write-edge`, `ownership-edge`, and `dependency-edge`; plus `trust-boundary` and `legend` cells. Show Client -> API as an API request, API -> Queue as a queued event, Queue -> Database as a database write, Team -> API as team ownership, and API -> Database as a dependency. Animate only the request, event, and data flows.
```

## Should Trigger

Yes

## Split Family

animation-role-separation

## Expected Behavior

- Assign explicit semantic edge roles and enable native connector animation only on request, event, and data-flow edges.
- Keep ownership, boundary, dependency, containment, annotation, and legend relationships static.
- Preserve arrowheads and labels so motion is never the sole source of meaning.
- Validate with `--animation on`, export the named SVG, and inspect every relationship type.

## Deterministic Assertions

- contains: mixed-edge-roles.drawio
- contains: mixed-edge-roles.svg
- contains: dataRole
- contains: --animation on

## Visual Assertions

- artifact_exists: mixed-edge-roles.drawio
- drawio_valid: mixed-edge-roles.drawio animation_on=1
- drawio_graph: mixed-edge-roles.drawio ids=client,api,queue,database,team,trust-boundary,legend,request-edge,event-edge,write-edge,ownership-edge,dependency-edge edges=client>api,api>queue,queue>database,team>api,api>database edge_roles=request-edge:request,event-edge:event,write-edge:data-flow,ownership-edge:ownership,dependency-edge:dependency
- artifact_exists: mixed-edge-roles.svg
- svg_valid: mixed-edge-roles.svg
- svg_contains: mixed-edge-roles.svg API request
- svg_contains: mixed-edge-roles.svg queued event
- svg_contains: mixed-edge-roles.svg database write
- svg_contains: mixed-edge-roles.svg Team ownership
- svg_contains: mixed-edge-roles.svg Trust boundary
- svg_contains: mixed-edge-roles.svg Dependency
- svg_contains: mixed-edge-roles.svg Legend
