# Visual Profile Comparison Set

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create one icon-first, names-only architecture comparison from the same synthetic fourteen-component runtime: Client, Edge Gateway, Orbit Controller, Scheduler, Worker A, Worker B, Message Buffer, Database, Object Store, Audit Log, Telemetry, Secret Store, Webhook, and External API.

Use stable component ids client, edge-gateway, orbit-controller, scheduler, worker-a, worker-b, message-buffer, database, object-store, audit-log, telemetry, secret-store, webhook, and external-api. The relationships are: Client to Edge Gateway; Edge Gateway to Orbit Controller; Orbit Controller to Scheduler, Audit Log, and Secret Store; Scheduler to Worker A and Worker B; each worker to Message Buffer and Telemetry; Message Buffer to Database and Object Store; External API to Webhook; and Webhook to Orbit Controller. Use stable edge ids edge-client-gateway, edge-gateway-controller, edge-controller-scheduler, edge-scheduler-worker-a, edge-scheduler-worker-b, edge-worker-a-buffer, edge-worker-b-buffer, edge-buffer-database, edge-buffer-object-store, edge-controller-audit, edge-worker-a-telemetry, edge-worker-b-telemetry, edge-controller-secrets, edge-external-webhook, and edge-webhook-controller. Classify the first two as request; the controller-to-scheduler and scheduler-to-worker flows as runtime-flow; both worker-to-buffer flows, External API to Webhook, and Webhook to Orbit Controller as event; and all remaining flows as data-flow.

Embed the supplied eval-orbit-mark.svg bytes in the Orbit Controller cell with aspect=fixed. Give Message Buffer a built-in native queue stencil and every other component a labelled built-in semantic icon. Use stable built-in icon child IDs `client-icon`, `edge-gateway-icon`, `scheduler-icon`, `worker-a-icon`, `worker-b-icon`, `database-icon`, `object-store-icon`, `audit-log-icon`, `telemetry-icon`, `secret-store-icon`, `webhook-icon`, and `external-api-icon` for the corresponding semantic icons. Use stable boundary group IDs `owned-runtime` and `external-systems` with visible names `Owned Runtime` and `External Systems`; place Edge Gateway, Orbit Controller, Scheduler, Worker A, Worker B, Message Buffer, Database, Object Store, Audit Log, Telemetry, and Secret Store in `owned-runtime`, and Client, External API, and Webhook in `external-systems`. Keep component and boundary names, but add no explanatory prose, descriptions, metadata rows, or edge-label text.

Create five uncompressed adaptive sources named comparison.technical.drawio, comparison.operator-grid.drawio, comparison.isometric-air.drawio, comparison.neon-hub.drawio, and comparison.aurora-story.drawio. Apply the five supported profiles while preserving the same architecture and use one consistent canvas size so the variants compare directly.

For every source, export fixed light and fixed dark SVGs named comparison.<profile>.light.svg and comparison.<profile>.dark.svg. Preserve native connector animation in both SVGs. Use the same explicitly selected local browser executable for every fixed-theme rasterization. Produce matching static, nonblank light and dark PNGs at least 1200x675. Create comparison-gallery.md with the static PNGs as side-by-side Light/Dark previews and separate links to each fixed-theme SVG and editable source. Validate every source and artifact.
```

## Should Trigger

Yes

## Split Family

visual-profile-comparison-set

## Fixtures

- skill-evals/drawio-diagrams/fixtures/eval-orbit-mark.svg

## Expected Behavior

- Freeze and reuse one semantic manifest before applying the five presentation profiles.
- Preserve all component names, stable graph identities, edge roles, native fallback choice, and the exact embedded Orbit bytes across the set.
- Keep each profile visibly distinct without deleting dense content; reduce isometric depth instead of expanding every icon into a cube.
- Export explicitly fixed light/dark SVGs, complete static PNGs, and a viewer-theme-independent comparison gallery.
- Validate and visually inspect every source/theme artifact rather than accepting a batch result by filename.

## Deterministic Assertions

- contains: comparison.technical.drawio
- contains: comparison.aurora-story.dark.svg
- contains: comparison-gallery.md

## Visual Assertions

- artifact_exists: comparison-gallery.md
- drawio_valid: comparison.\*.drawio animation_on=1 adaptive_colors=1 self_contained_svg=1 uncompressed=1
- drawio_graph: comparison.\*.drawio component_ids=client,edge-gateway,orbit-controller,scheduler,worker-a,worker-b,message-buffer,database,object-store,audit-log,telemetry,secret-store,webhook,external-api component_labels=client:Client,edge-gateway:Edge%20Gateway,orbit-controller:Orbit%20Controller,scheduler:Scheduler,worker-a:Worker%20A,worker-b:Worker%20B,message-buffer:Message%20Buffer,database:Database,object-store:Object%20Store,audit-log:Audit%20Log,telemetry:Telemetry,secret-store:Secret%20Store,webhook:Webhook,external-api:External%20API exact_components=1 group_ids=owned-runtime,external-systems group_labels=owned-runtime:Owned%20Runtime,external-systems:External%20Systems group_memberships=edge-gateway@owned-runtime,orbit-controller@owned-runtime,scheduler@owned-runtime,worker-a@owned-runtime,worker-b@owned-runtime,message-buffer@owned-runtime,database@owned-runtime,object-store@owned-runtime,audit-log@owned-runtime,telemetry@owned-runtime,secret-store@owned-runtime,client@external-systems,external-api@external-systems,webhook@external-systems exact_groups=1 native_ids=message-buffer,client-icon,edge-gateway-icon,scheduler-icon,worker-a-icon,worker-b-icon,database-icon,object-store-icon,audit-log-icon,telemetry-icon,secret-store-icon,webhook-icon,external-api-icon edges=client>edge-gateway,edge-gateway>orbit-controller,orbit-controller>scheduler,scheduler>worker-a,scheduler>worker-b,worker-a>message-buffer,worker-b>message-buffer,message-buffer>database,message-buffer>object-store,orbit-controller>audit-log,worker-a>telemetry,worker-b>telemetry,orbit-controller>secret-store,external-api>webhook,webhook>orbit-controller edge_bindings=edge-client-gateway@client>edge-gateway,edge-gateway-controller@edge-gateway>orbit-controller,edge-controller-scheduler@orbit-controller>scheduler,edge-scheduler-worker-a@scheduler>worker-a,edge-scheduler-worker-b@scheduler>worker-b,edge-worker-a-buffer@worker-a>message-buffer,edge-worker-b-buffer@worker-b>message-buffer,edge-buffer-database@message-buffer>database,edge-buffer-object-store@message-buffer>object-store,edge-controller-audit@orbit-controller>audit-log,edge-worker-a-telemetry@worker-a>telemetry,edge-worker-b-telemetry@worker-b>telemetry,edge-controller-secrets@orbit-controller>secret-store,edge-external-webhook@external-api>webhook,edge-webhook-controller@webhook>orbit-controller exact_edges=1 edge_roles=edge-client-gateway:request,edge-gateway-controller:request,edge-controller-scheduler:runtime-flow,edge-scheduler-worker-a:runtime-flow,edge-scheduler-worker-b:runtime-flow,edge-worker-a-buffer:event,edge-worker-b-buffer:event,edge-buffer-database:data-flow,edge-buffer-object-store:data-flow,edge-controller-audit:data-flow,edge-worker-a-telemetry:data-flow,edge-worker-b-telemetry:data-flow,edge-controller-secrets:data-flow,edge-external-webhook:event,edge-webhook-controller:event
- drawio_embeds_svg_sha256: comparison.\*.drawio 7a6f5242510a949786c36e67b9d85809851ddaf5b6e01982ae1df037c82a3d40 cell=orbit-controller
- drawio_graph: comparison.technical.drawio profile_styles=profile-technical:designProfile:technical
- drawio_graph: comparison.operator-grid.drawio profile_styles=profile-operator-grid:designProfile:operator-grid
- drawio_graph: comparison.isometric-air.drawio profile_styles=profile-isometric-air:designProfile:isometric-air
- drawio_graph: comparison.neon-hub.drawio profile_styles=profile-neon-hub:designProfile:neon-hub
- drawio_graph: comparison.aurora-story.drawio profile_styles=profile-aurora-story:designProfile:aurora-story
- svg_valid: comparison.\*.light.svg
- svg_valid: comparison.\*.dark.svg
- svg_theme: comparison.\*.light.svg light
- svg_theme: comparison.\*.dark.svg dark
- svg_has_flow_animation: comparison.\*.light.svg
- svg_has_flow_animation: comparison.\*.dark.svg
- png_nonblank: comparison.\*.light.png min_size=1000
- png_nonblank: comparison.\*.dark.png min_size=1000
- png_dimensions: comparison.\*.light.png min_width=1200 min_height=675
- png_dimensions: comparison.\*.dark.png min_width=1200 min_height=675
- svg_png_dimensions_match: comparison.technical.light.svg comparison.technical.light.png
- svg_png_dimensions_match: comparison.technical.dark.svg comparison.technical.dark.png
- svg_png_dimensions_match: comparison.operator-grid.light.svg comparison.operator-grid.light.png
- svg_png_dimensions_match: comparison.operator-grid.dark.svg comparison.operator-grid.dark.png
- svg_png_dimensions_match: comparison.isometric-air.light.svg comparison.isometric-air.light.png
- svg_png_dimensions_match: comparison.isometric-air.dark.svg comparison.isometric-air.dark.png
- svg_png_dimensions_match: comparison.neon-hub.light.svg comparison.neon-hub.light.png
- svg_png_dimensions_match: comparison.neon-hub.dark.svg comparison.neon-hub.dark.png
- svg_png_dimensions_match: comparison.aurora-story.light.svg comparison.aurora-story.light.png
- svg_png_dimensions_match: comparison.aurora-story.dark.svg comparison.aurora-story.dark.png
- png_pixels_differ: comparison.technical.light.png comparison.technical.dark.png
- png_pixels_differ: comparison.operator-grid.light.png comparison.operator-grid.dark.png
- png_pixels_differ: comparison.isometric-air.light.png comparison.isometric-air.dark.png
- png_pixels_differ: comparison.neon-hub.light.png comparison.neon-hub.dark.png
- png_pixels_differ: comparison.aurora-story.light.png comparison.aurora-story.dark.png
- png_pixels_differ: comparison.technical.light.png comparison.operator-grid.light.png min_changed_basis_points=25
- png_pixels_differ: comparison.technical.light.png comparison.isometric-air.light.png min_changed_basis_points=25
- png_pixels_differ: comparison.technical.light.png comparison.neon-hub.light.png min_changed_basis_points=25
- png_pixels_differ: comparison.technical.light.png comparison.aurora-story.light.png min_changed_basis_points=25
- png_pixels_differ: comparison.operator-grid.light.png comparison.isometric-air.light.png min_changed_basis_points=25
- png_pixels_differ: comparison.operator-grid.light.png comparison.neon-hub.light.png min_changed_basis_points=25
- png_pixels_differ: comparison.operator-grid.light.png comparison.aurora-story.light.png min_changed_basis_points=25
- png_pixels_differ: comparison.isometric-air.light.png comparison.neon-hub.light.png min_changed_basis_points=25
- png_pixels_differ: comparison.isometric-air.light.png comparison.aurora-story.light.png min_changed_basis_points=25
- png_pixels_differ: comparison.neon-hub.light.png comparison.aurora-story.light.png min_changed_basis_points=25
- png_pixels_differ: comparison.technical.dark.png comparison.operator-grid.dark.png min_changed_basis_points=25
- png_pixels_differ: comparison.technical.dark.png comparison.isometric-air.dark.png min_changed_basis_points=25
- png_pixels_differ: comparison.technical.dark.png comparison.neon-hub.dark.png min_changed_basis_points=25
- png_pixels_differ: comparison.technical.dark.png comparison.aurora-story.dark.png min_changed_basis_points=25
- png_pixels_differ: comparison.operator-grid.dark.png comparison.isometric-air.dark.png min_changed_basis_points=25
- png_pixels_differ: comparison.operator-grid.dark.png comparison.neon-hub.dark.png min_changed_basis_points=25
- png_pixels_differ: comparison.operator-grid.dark.png comparison.aurora-story.dark.png min_changed_basis_points=25
- png_pixels_differ: comparison.isometric-air.dark.png comparison.neon-hub.dark.png min_changed_basis_points=25
- png_pixels_differ: comparison.isometric-air.dark.png comparison.aurora-story.dark.png min_changed_basis_points=25
- png_pixels_differ: comparison.neon-hub.dark.png comparison.aurora-story.dark.png min_changed_basis_points=25
- markdown_image: comparison-gallery.md comparison.technical.light.png
- markdown_image: comparison-gallery.md comparison.technical.dark.png
- markdown_image: comparison-gallery.md comparison.operator-grid.light.png
- markdown_image: comparison-gallery.md comparison.operator-grid.dark.png
- markdown_image: comparison-gallery.md comparison.isometric-air.light.png
- markdown_image: comparison-gallery.md comparison.isometric-air.dark.png
- markdown_image: comparison-gallery.md comparison.neon-hub.light.png
- markdown_image: comparison-gallery.md comparison.neon-hub.dark.png
- markdown_image: comparison-gallery.md comparison.aurora-story.light.png
- markdown_image: comparison-gallery.md comparison.aurora-story.dark.png
- markdown_link: comparison-gallery.md comparison.technical.light.svg
- markdown_link: comparison-gallery.md comparison.technical.dark.svg
- markdown_link: comparison-gallery.md comparison.technical.drawio
- markdown_link: comparison-gallery.md comparison.operator-grid.light.svg
- markdown_link: comparison-gallery.md comparison.operator-grid.dark.svg
- markdown_link: comparison-gallery.md comparison.operator-grid.drawio
- markdown_link: comparison-gallery.md comparison.isometric-air.light.svg
- markdown_link: comparison-gallery.md comparison.isometric-air.dark.svg
- markdown_link: comparison-gallery.md comparison.isometric-air.drawio
- markdown_link: comparison-gallery.md comparison.neon-hub.light.svg
- markdown_link: comparison-gallery.md comparison.neon-hub.dark.svg
- markdown_link: comparison-gallery.md comparison.neon-hub.drawio
- markdown_link: comparison-gallery.md comparison.aurora-story.light.svg
- markdown_link: comparison-gallery.md comparison.aurora-story.dark.svg
- markdown_link: comparison-gallery.md comparison.aurora-story.drawio
