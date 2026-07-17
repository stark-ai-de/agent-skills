# Operator Grid Design Profile

## Prompt

```text
Use $drawio-diagrams in a render-capable eval environment with local draw.io Desktop CLI available. Create agent-run.drawio for an agent run that moves from intake through planner, tools, reviewer, and delivery. Use the operator-grid profile and built-in semantic icons without network lookup. Use stable ids profile-operator-grid, intake, planner, tools, reviewer, delivery, and edge-planner-tools; use profile-operator-grid for one self-contained SVG grid backdrop with designProfile=operator-grid, shape=image, dataRole=decorative, and fillColor=light-dark(#F5F7FB,#0B0F16), and mark the edge as runtime-flow. Make the current route visually active, keep inactive routes readable, and use render-drawio.mjs to export agent-run.drawio.png plus agent-run.dark.svg.
```

## Should Trigger

Yes

## Split Family

design-profile-operator-grid

## Expected Behavior

- Record `operator-grid` as the selected design profile and apply it consistently without copying the reference composition.
- Stamp the page title or background with the stable `profile-operator-grid` id and profile metadata.
- Use one self-contained background cell for the faint technical grid, plus outlined cards, compact status/number badges, one active route, and monospace only for short IDs, ports, or status values.
- Keep logos/icons, labels, arrowheads, and static route semantics complete; animate directed runtime/process edges by default.
- Use adaptive colors and validate the editable `.drawio` source.

## Deterministic Assertions

- contains: agent-run.drawio
- regex: design profile.*operator-grid|operator-grid.*design profile
- contains: validate_drawio.py
- contains: render-drawio.mjs

## Visual Assertions

- artifact_exists: agent-run.drawio
- drawio_valid: agent-run.drawio animation_on=1 adaptive_colors=1 self_contained_svg=1 uncompressed=1
- drawio_graph: agent-run.drawio ids=profile-operator-grid,intake,planner,tools,reviewer,delivery edges=planner>tools edge_roles=edge-planner-tools:runtime-flow profile_styles=profile-operator-grid:designProfile:operator-grid,profile-operator-grid:shape:image,profile-operator-grid:dataRole:decorative,profile-operator-grid:fillColor:light-dark%28%23F5F7FB%2C%230B0F16%29
- drawio_self_contained_svg: agent-run.drawio
- artifact_exists: agent-run.drawio.png
- png_nonblank: agent-run.drawio.png min_size=1000
- png_dimensions: agent-run.drawio.png min_width=800 min_height=400
- artifact_exists: agent-run.dark.svg
- svg_valid: agent-run.dark.svg
- svg_has_flow_animation: agent-run.dark.svg
- svg_contains: agent-run.dark.svg Planner
- svg_contains: agent-run.dark.svg Reviewer
