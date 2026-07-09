# Routing and simplification

## Edge connection rules

Generated diagrams must not contain floating connector rails. Every semantic edge must reference a concrete `source` and `target` vertex id. Avoid mxPoint-only source/target endpoints except for deliberate decorative legend lines that are not part of the process or architecture flow.

Use explicit side attachment only when it improves routing around annotations or dense zones:

```text
exitX=1;exitY=0.5;entryX=0;entryY=0.5;
```

For left-to-right architecture flow, prefer right-side exit and left-side entry. For an edge from an ingestion worker to a knowledge store, attach to the store's left side instead of the bottom when the relationship is horizontal.

## Avoiding text and component overlap

Arrows must never overlap text boxes, annotations, risk callouts, titles, icon chips, connector labels, or section/container labels. Route connectors so they cross the fewest possible elements.

Rules:

- Put annotations and risk notes outside the main connector lane.
- Branch between elements, not on top of elements.
- Place a branch point midway between the source group and target group when one source fans out to multiple targets.
- Use orthogonal edges with short, intentional waypoints for obstacle avoidance when automatic routing would pass through text.
- Do not place edge labels over nodes, icons, callout boxes, connector strokes, or section/container borders.
- If a visual export shows a connector crossing a text box, label, section title, or icon chip, relayout or add side ports/waypoints and re-render.

Example pattern for a horizontal source-to-store connector:

```text
[Deterministic Ingestion] -- exits right --> branch point between groups -- enters left --> [Knowledge Store]
```

## Connector labels and route gutters

Dense architecture diagrams need deliberate label placement, not automatic edge-label defaults:

- Edge labels should sit in clear whitespace with at least a small visual gap from connector strokes and container boundaries.
- Do not put labels on the border between two sections; move the label into one section or into a dedicated inter-zone gutter.
- Give short edge labels a filled label background when they ride near a rail:

```text
labelBackgroundColor=light-dark(#f8fafc,#0f172a);labelBorderColor=light-dark(#cbd5e1,#475569);fontColor=light-dark(#0f172a,#f8fafc);
```

- Use explicit `edgeLabel` vertices or separate text cells when draw.io's automatic label midpoint lands on a boundary, rail crossing, or crowded junction.
- Keep top-route labels above/below their rails with enough spacing to distinguish label text from the connector line.

## Fan-out and lane separation

A component with several outbound routes should not share one crowded rail for unrelated destinations.

- When one source has more than three outbound edges, add a small junction such as `Outbound interactions` or reserve separated stems for each route family.
- Use separate lanes for external portal/API calls, lifecycle webhooks, storage reads/writes, browser lanes, mocks/dev endpoints, and observability/support links.
- Keep lane order stable and semantic: local/support routes downward, external routes upward or rightward, and feedback/webhooks on their own lane.
- Avoid long backward rails unless they are the clearest route; prefer side ports, a junction, or target-side grouping to make direction obvious.

## Logo and icon layout

Logo cells must preserve the source aspect ratio. Use `aspect=fixed` or an equivalent fixed-aspect image setting on image cells. For non-square marks such as SAP-style logos, do not force them into a square icon slot; size the cell to the source viewBox ratio and place the label outside the logo.

Icon chips should be consistent within a visual family. Use the same square chip size for peers unless the source logo genuinely requires a different viewBox ratio, and then repeat that non-square pattern for similar marks.

## Plus/minus toggle evaluation

The plus/minus control in draw.io is the native collapse/expand control for groups, swimlanes, and containers when folding is enabled. It hides or shows child cells of that group; it does not automatically remove a substring from a single label.

Feasible per element:

- Model each rich component as a group/container.
- Keep the title or main icon on the parent container.
- Put details, descriptions, secondary labels, and supporting badges in child cells.
- Collapsing the group hides the child cells and leaves the parent overview visible.

For text boxes, this can approximate "minus hides description, plus shows description" only if the description is a child cell, not part of the same text label. For icon elements, it can approximate "minus hides text/description, icon remains" only if the icon is the parent or a sibling that remains visible while text children collapse.

Limits:

- Native plus/minus is per group. A static `.drawio` file does not provide a reliable single diagram-wide toggle that collapses every component at once.
- Collapse state can make edge routing harder because hidden children and alternate bounds change the visible geometry.
- Many collapsible controls can add visual noise to architecture diagrams.

Recommended global simplification pattern:

1. Use two pages when the audience needs a clean one-click switch: `Overview` and `Detailed`.
2. Or use layers: keep core boxes/icons on a base layer and descriptions/callouts on a `Details` layer that can be hidden with one layer toggle.
3. Use per-element plus/minus only for genuinely expandable containers, and make the parent shape meaningful when collapsed.

## Verification expectations

Before delivery, inspect the light export and dark export for these failure modes:

- edge passes through a text box, note, icon label, callout, section title, or component
- edge label sits on top of a connector stroke, section border, rail crossing, or icon chip
- multiple outbound routes from one source visually compete on the same rail
- branch point sits on top of a node instead of between nodes
- endpoint attaches to the wrong side for the reading direction
- semantic edge has no source or target id
- logo appears stretched, cropped, recolored, inverted, or inconsistent with peer logo chips
- collapse controls make the diagram noisier than the simplified state they enable

Sources: integrated from draw.io/mxGraph edge attachment and group-collapse behavior, visual verification practice, connector-label readability feedback, fan-out lane review feedback, and diagram feedback examples.
