# Aurora Story Design Profile

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create integration-story.drawio as a 16:9 executive view with Source, Gateway, Processor, Store, and Consumer services, built-in semantic icons, one main data path, and control labels Step 1, Step 2, and Step 3. Select the aurora-story profile and do not use network lookup. Use profile-aurora-story for the Source primary card with designProfile=aurora-story, the documented gradient, shadow=1, and glass=0. Also use stable ids gateway, processor, store, consumer, edge-source-gateway, and edge-processor-store; mark the edges as data-flow. Use render-drawio.mjs to export integration-story.drawio.png plus integration-story.dark.svg.
```

## Should Trigger

Yes

## Split Family

design-profile-aurora-story

## Expected Behavior

- Record `aurora-story` as the selected profile and build a presentation-oriented composition without copying the reference layout.
- Stamp the Source primary card with the stable `profile-aurora-story` id and profile metadata.
- Use large service cards, clear step numbers, no more than three accent families, and recognizable semantic icons on neutral chips.
- Permit only one subtle same-hue gradient and one shadow tier on primary cards; keep text and connectors unshadowed and `glass=0`.
- Keep the main route solid and labelled, animate qualifying directed flows by default, use adaptive colors, and validate the editable `.drawio` source.

## Deterministic Assertions

- contains: integration-story.drawio
- regex: design profile.*aurora-story|aurora-story.*design profile
- contains: validate_drawio.py
- contains: render-drawio.mjs

## Visual Assertions

- artifact_exists: integration-story.drawio
- drawio_valid: integration-story.drawio animation_on=1 adaptive_colors=1 uncompressed=1
- drawio_graph: integration-story.drawio ids=profile-aurora-story,gateway,processor,store,consumer edges=profile-aurora-story>gateway,processor>store edge_roles=edge-source-gateway:data-flow,edge-processor-store:data-flow profile_styles=profile-aurora-story:designProfile:aurora-story,profile-aurora-story:gradientColor:light-dark%28%23F3E8FF%2C%23312E81%29,profile-aurora-story:shadow:1,profile-aurora-story:glass:0
- artifact_exists: integration-story.drawio.png
- png_nonblank: integration-story.drawio.png min_size=1000
- png_dimensions: integration-story.drawio.png min_width=1000 min_height=500
- artifact_exists: integration-story.dark.svg
- svg_valid: integration-story.dark.svg
- svg_has_flow_animation: integration-story.dark.svg
- svg_contains: integration-story.dark.svg Step 1
- svg_contains: integration-story.dark.svg Step 2
- svg_contains: integration-story.dark.svg Step 3
