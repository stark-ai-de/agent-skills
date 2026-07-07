# Routing and simplification

## Edge connection rules

Generated diagrams must not contain floating connector rails. Every semantic edge must reference a concrete `source` and `target` vertex id. Avoid mxPoint-only source/target endpoints except for deliberate decorative legend lines that are not part of the process or architecture flow.

Use explicit side attachment only when it improves routing around annotations or dense zones:

```text
exitX=1;exitY=0.5;entryX=0;entryY=0.5;
```

For left-to-right architecture flow, prefer right-side exit and left-side entry. For an edge from an ingestion worker to a knowledge store, attach to the store's left side instead of the bottom when the relationship is horizontal.

## Avoiding text and component overlap

Arrows must never overlap text boxes, annotations, risk callouts, titles, or icon labels. Route connectors so they cross the fewest possible elements.

Rules:

- Put annotations and risk notes outside the main connector lane.
- Branch between elements, not on top of elements.
- Place a branch point midway between the source group and target group when one source fans out to multiple targets.
- Use orthogonal edges with short, intentional waypoints for obstacle avoidance when automatic routing would pass through text.
- Do not place edge labels over nodes, icons, or callout boxes.
- If a visual export shows a connector crossing a text box, relayout or add side ports/waypoints and re-render.

Example pattern for a horizontal source-to-store connector:

```text
[Deterministic Ingestion] -- exits right --> branch point between groups -- enters left --> [Knowledge Store]
```

## Logo and icon layout

Logo cells must preserve the source aspect ratio. Use `aspect=fixed` or an equivalent fixed-aspect image setting on image cells. For non-square marks such as SAP-style logos, do not force them into a square icon slot; size the cell to the source viewBox ratio and place the label outside the logo.

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

- edge passes through a text box, note, icon label, or callout
- branch point sits on top of a node instead of between nodes
- endpoint attaches to the wrong side for the reading direction
- semantic edge has no source or target id
- logo appears stretched or cropped
- collapse controls make the diagram noisier than the simplified state they enable

Sources: integrated from draw.io/mxGraph edge attachment and group-collapse behavior, visual verification practice, and diagram feedback examples.
