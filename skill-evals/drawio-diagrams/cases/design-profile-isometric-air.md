# Isometric Air Design Profile

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create deployment-topology.drawio for an eight-node deployment topology with client, edge gateway, application tier, worker pool, queue, database, object store, and observability. Select the isometric-air profile and use only built-in editable shapes and semantic icons. Use profile-isometric-air for the orange Gateway focus cube with designProfile=isometric-air, shape=isoCube, and the documented focus stroke. Also use stable ids client, application, workers, queue, database, object-store, observability, edge-client-gateway, and edge-application-queue; mark the edges as request and event. Use render-drawio.mjs to export deployment-topology.drawio.png plus deployment-topology.dark.svg.
```

## Should Trigger

Yes

## Split Family

design-profile-isometric-air

## Expected Behavior

- Record `isometric-air` as the selected profile and use sparse editable cube/stack geometry rather than a rasterized scene.
- Stamp the Gateway focus cube with the stable `profile-isometric-air` id and profile metadata.
- Keep labels horizontal in separate cells away from face seams, maintain generous whitespace, and limit dotted connectors to labelled static dependency or telemetry roles.
- Give directed runtime/data paths stronger contrast, arrowheads, labels, and default animation; use labelled native service or semantic icons in this offline eval.
- Use adaptive colors and validate the editable `.drawio` source.

## Deterministic Assertions

- contains: deployment-topology.drawio
- regex: design profile.*isometric-air|isometric-air.*design profile
- contains: validate_drawio.py
- contains: render-drawio.mjs

## Visual Assertions

- artifact_exists: deployment-topology.drawio
- drawio_valid: deployment-topology.drawio animation_on=1 adaptive_colors=1 uncompressed=1
- drawio_graph: deployment-topology.drawio ids=profile-isometric-air,client,application,workers,queue,database,object-store,observability edges=client>profile-isometric-air,application>queue edge_roles=edge-client-gateway:request,edge-application-queue:event profile_styles=profile-isometric-air:designProfile:isometric-air,profile-isometric-air:shape:isoCube,profile-isometric-air:strokeColor:light-dark%28%23C2410C%2C%23FB923C%29
- artifact_exists: deployment-topology.drawio.png
- png_nonblank: deployment-topology.drawio.png min_size=1000
- png_dimensions: deployment-topology.drawio.png min_width=800 min_height=400
- artifact_exists: deployment-topology.dark.svg
- svg_valid: deployment-topology.dark.svg
- svg_has_flow_animation: deployment-topology.dark.svg
- svg_contains: deployment-topology.dark.svg Worker
- svg_contains: deployment-topology.dark.svg Database
