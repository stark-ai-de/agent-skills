# Layout readability

Use this pass for architecture diagrams, dense flow diagrams, and edits where rendered output shows crowded rails, weak text hierarchy, inconsistent icons, or poor light/dark readability.

## Connector label gutters

Connector labels must remain readable in light and dark exports:

- Keep connector labels away from section/container borders. A label should not sit on, or visually touch, a swimlane or section boundary.
- Keep labels offset from the connector stroke. When the label is drawn directly on a rail, add a filled label background or move it to an explicit `edgeLabel` vertex in a clear gutter.
- Prefer short labels. If a label needs more than a few words, use a callout near the target node instead of a long edge label.
- For dense orthogonal routes, reserve a label gutter above or below the rail instead of placing labels at rail intersections.

Recommended edge-label style additions:

```text
labelBackgroundColor=light-dark(#f8fafc,#0f172a);labelBorderColor=light-dark(#cbd5e1,#475569);fontColor=light-dark(#0f172a,#f8fafc);
```

Use equivalent explicit label cells when draw.io's automatic edge labels would land on a border or line.

## Fan-out and outbound lanes

When one node sends traffic to many targets, model the fan-out before drawing edges:

- For more than three outbound routes from one component, add a small labelled junction such as `Outbound interactions` or use clearly separated vertical stems.
- Do not stack unrelated destinations on the same horizontal rail. Separate portal/webhook/storage/browser/mock routes into distinct lanes with visible spacing.
- Order lanes by target zone and direction: local infrastructure downward, external integrations upward/rightward, observability/support outward.
- Avoid long backward rails when a junction or side port would make direction clearer. Add waypoints so the first bend leaves the source cleanly and the arrowhead lands on the target side that matches reading direction.

## Section and whitespace balance

Zones should clarify the architecture rather than create large empty bands:

- Spread the main flow across the available section width, or intentionally reserve the unused side for outbound integrations, notes, or detail nodes.
- Keep connector rails inside a zone or inside a deliberate inter-zone gutter. Avoid routing a rail exactly along a section boundary because it reads like a border.
- Keep section titles clear of incoming/outgoing connectors. If an edge crosses a section boundary, keep the edge label well inside one section or in a dedicated gutter.
- Prefer a compact, balanced page over a single very wide diagram with one empty half.
- Keep external providers and actors outside the owned runtime/deployment boundary. Development-only substitutes belong in a separately labelled zone and use a second static cue such as a dashed border or connector.
- Use zones only for real scope, trust, deployment, environment, or responsibility boundaries. Do not use a large colored panel merely to fill the canvas.

## Detail and package rows

Source/package/dependency rows should either help explain the runtime diagram or move out of the way:

- If package boxes remain on the same page, group them under related runtime services and add subtle dashed dependency lines or a small legend explaining the relationship.
- If the package row is large and not directly used for runtime comprehension, move it to a `Details` page or a hideable `Packages / internals` layer.
- Do not let a bottom detail row consume more visual weight than the runtime flow unless the user explicitly asked for package boundaries as the primary content.

## Component-card hierarchy

Avoid formatting every line of a component card identically:

- Use a stronger first line for the component name and smaller or muted detail text for paths, ports, queues, protocols, and descriptions.
- When feasible, build cards from child cells: title, icon well, role text, and metadata. This makes future edits and collapsible detail layers easier.
- Keep icon chips in a consistent location and reserve text padding so centered labels do not visually collide with the icon well.
- Use badges or muted secondary lines for ports and local-only notes instead of giving them the same emphasis as service names.
- Follow the technical-geominimalist scale: 14 px card titles and 12 px detail/connector text where space allows. If the page only works with 9-10 px text, split or simplify it before shrinking further.

## Icon and logo consistency

Logo handling is part of layout quality:

- Prefer the official organization, product, or service mark whenever the named asset is available; a generic semantic glyph is a per-node fallback for unresolved or intentionally generic/vendor-neutral concepts.
- Use one chip dimension per visual family, commonly 44x44 or 48x48. Use a non-square chip only when the logo's source viewBox needs it, and then apply that pattern consistently to similar logos.
- Preserve the original logo artwork, source variant, and brand colors. Do not arbitrarily recolor, invert, crop, stretch, filter, or replace a detailed source logo with a simplified monochrome glyph when a recognizable official/product icon is available. Change the neutral chip/background for contrast; only an explicit user request or a necessary documented accessibility exception may change the mark, and the receipt must disclose it.
- When a black, white, or low-contrast logo does not work in dark mode, change the neutral chip/background rather than changing the logo artwork.
- Verify that every logo remains visible after dark export and that weak marks do not look washed out.

## Final visual review questions

Before delivery, inspect the rendered light and dark exports and answer these questions:

1. Are all connector labels readable without touching section borders or connector strokes?
2. Does each high-fan-out component have separate lanes or a clear junction?
3. Is the main flow balanced across the page, with deliberate use of any empty space?
4. Are detail/package boxes visually connected to the runtime diagram or moved to a detail page/layer?
5. Can the reader distinguish component names from descriptions, ports, and metadata at a glance?
6. Are logo chips, logo sources, and dark-mode behavior consistent?
7. Are external, development-only, optional, blocked, current, and target elements in the correct zones and understandable without color or motion?
8. Does the page answer one stakeholder question at one abstraction level, or should secondary content move to a detail page?

Sources: integrated from architecture-diagram visual review feedback for connector label placement, fan-out lane separation, section whitespace, package row treatment, text hierarchy, and logo consistency.
