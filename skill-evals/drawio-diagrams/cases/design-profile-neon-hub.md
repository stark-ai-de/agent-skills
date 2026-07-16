# Neon Hub Design Profile

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create developer-platform.drawio for one central orchestration hub, three product teams, identity, model APIs, and observability. Select the Template 3 neon-hub profile and use built-in semantic icons without network lookup. Use profile-neon-hub for the Orchestration Hub with designProfile=neon-hub and the documented acid-lime focus stroke. Also use stable ids team-a, team-b, team-c, identity, models, observability, edge-identity-hub, and edge-hub-observability; mark the edges as request and event. Use render-drawio.mjs to export developer-platform.drawio.png plus developer-platform.dark.svg.
```

## Should Trigger

Yes

## Split Family

design-profile-neon-hub

## Expected Behavior

- Record `neon-hub` as the selected profile and reserve acid-lime emphasis for the central hub and one primary route.
- Stamp the Orchestration Hub with the stable `profile-neon-hub` id and profile metadata.
- Use neutral modular cards, one dashed boundary hierarchy per level, labelled relationships, and junctions or separate rails for crowded hub connections.
- Keep native/product icons recognizable on neutral chips and avoid glow, hatching, or neon text shadows.
- Use adaptive colors, keep static semantics complete, animate qualifying directed flows by default, and validate the editable `.drawio` source.

## Deterministic Assertions

- contains: developer-platform.drawio
- regex: design profile.*neon-hub|neon-hub.*design profile
- contains: validate_drawio.py
- contains: render-drawio.mjs

## Visual Assertions

- artifact_exists: developer-platform.drawio
- drawio_valid: developer-platform.drawio animation_on=1 adaptive_colors=1 uncompressed=1
- drawio_graph: developer-platform.drawio ids=profile-neon-hub,team-a,team-b,team-c,identity,models,observability edges=identity>profile-neon-hub,profile-neon-hub>observability edge_roles=edge-identity-hub:request,edge-hub-observability:event profile_styles=profile-neon-hub:designProfile:neon-hub,profile-neon-hub:strokeColor:light-dark%28%234D7C0F%2C%23D7FF00%29,profile-neon-hub:shadow:0,profile-neon-hub:glass:0
- artifact_exists: developer-platform.drawio.png
- png_nonblank: developer-platform.drawio.png min_size=1000
- png_dimensions: developer-platform.drawio.png min_width=800 min_height=400
- artifact_exists: developer-platform.dark.svg
- svg_valid: developer-platform.dark.svg
- svg_has_flow_animation: developer-platform.dark.svg
- svg_contains: developer-platform.dark.svg Orchestration
- svg_contains: developer-platform.dark.svg Observability
