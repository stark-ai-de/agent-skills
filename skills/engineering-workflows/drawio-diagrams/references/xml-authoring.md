# XML authoring reference

## Baseline structure

Generate uncompressed `.drawio` XML as the durable source:

```xml
<mxfile host="app.diagrams.net">
  <diagram name="Page-1">
    <mxGraphModel adaptiveColors="auto" dx="1000" dy="800" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

## Hard rules

- Use `id="0"` and `id="1"` root cells.
- Use unique stable IDs.
- Add `vertex="1"` to vertices and `edge="1"` to edges.
- Every vertex needs `<mxGeometry x="..." y="..." width="..." height="..." as="geometry"/>`.
- Every semantic edge needs `source="..."` and `target="..."` vertex ids plus `<mxGeometry relative="1" as="geometry"/>`.
- Floating mxPoint-only edges are forbidden for generated architecture/process flow. Use them only for deliberate decorative legend lines, and mark those as decorative in the label or id.
- Escape XML-sensitive characters in attributes.
- Do not emit XML comments, DOCTYPE, or processing instructions.
- Use one consistent edge style family per diagram.
- Avoid `exitX`, `exitY`, `entryX`, `entryY`, and hand waypoints by default, but use them intentionally when needed to attach to the correct side or route around annotations.
- Preserve unknown cells and IDs when editing.

## Rigid grid

Default grid:

- x = `col * 180 + 40`
- y = `row * 120 + 40`
- process rectangle = 140 x 60
- decision diamond = 140 x 80
- circle = 60 x 60
- cylinder/database = 100 x 70
- icon cell = 48 x 48 or 60 x 60 with label below; non-square logos use their source aspect ratio

For sectioned architecture pages, add explicit gutters:

- reserve 18-30 px inside every section header for titles with no connectors crossing through them
- reserve at least 20 px between a horizontal connector rail and a section border when that rail needs labels
- reserve separate vertical stems or a junction cell when one source fans out to more than three targets

## Edge routing

Connectors must avoid labels, annotations, section titles, icon chips, connector labels, and text boxes. Route branches through empty corridors between elements, not through elements. Use side ports when the semantic direction is clear:

```text
exitX=1;exitY=0.5;entryX=0;entryY=0.5;
```

For horizontal flow into a store or platform component, enter on the left edge. For fan-out/fan-in patterns, place branch points midway between source and target columns.

Give dense edge labels a readable background when they sit near rails, top routes, section boundaries, or route junctions:

```text
edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;strokeColor=light-dark(#334155,#cbd5e1);fontColor=light-dark(#0f172a,#f8fafc);labelBackgroundColor=light-dark(#f8fafc,#0f172a);labelBorderColor=light-dark(#cbd5e1,#475569);
```

When draw.io's automatic edge midpoint would put a label on a border or crossing, create a separate label cell instead of relying on automatic placement:

```xml
<mxCell id="edge-read-pdfs" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;strokeColor=light-dark(#334155,#cbd5e1);" edge="1" parent="1" source="api" target="storage">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
<mxCell id="label-read-pdfs" value="read PDFs" style="rounded=1;whiteSpace=wrap;html=1;fontSize=10;spacing=3;fillColor=light-dark(#f8fafc,#0f172a);strokeColor=light-dark(#cbd5e1,#475569);fontColor=light-dark(#0f172a,#f8fafc);" vertex="1" parent="1">
  <mxGeometry x="110" y="520" width="58" height="18" as="geometry"/>
</mxCell>
```

Do not place explicit label cells directly on top of connector strokes; give them a small gutter above or below the rail.

## Component cards

For rich service boxes, prefer a card built from child cells rather than one undifferentiated multiline label:

- parent card: background, stroke, and optional semantic role color
- icon chip: consistent size and position, usually left or top-left
- title child: stronger font weight or larger font size for the component name
- detail child: smaller or muted text for app paths, ports, queues, protocols, and descriptions
- badges: small children for local-only, mock, external, or status metadata

This structure improves editing, makes collapse/detail layers easier, and avoids every line looking equally important.

## Containers and groups

Containers render behind children. Children must remain within parent inner bounds. Prefer parent-child containment over visual-only grouping when the semantics matter.

For collapsible groups, keep the overview title/icon on the parent and put details in child cells. Collapsed groups hide children; they do not dynamically trim text inside a single label.

## Layers and pages

Validate every page independently. Preserve hidden layers, metadata, and manual positions unless the user requested relayout.

Use a separate `Details` layer or `Detailed` page when the diagram needs a global simplified/expanded view. This is more reliable than expecting one plus/minus click to collapse all groups.

For package/dependency rows, prefer either:

- a `Packages / internals` layer with subtle dashed dependency lines from packages to related runtime services, or
- a second `Package details` page when the row would consume more visual weight than the runtime flow.

## Light/dark

Every `mxGraphModel` must include `adaptiveColors="auto"`. Use draw.io defaults when possible. For explicit colors, prefer `light-dark(lightHex,darkHex)` on fill, stroke, font, and label backgrounds.

When editing an existing diagram, create a backup before overwriting unless the user chose a separate output path. Preserve unknown cells, metadata, page/layer structure, and manual coordinates unless the user requested relayout.

Sources: integrated from draw.io/mxGraph XML practice, layout/validation ideas, routing feedback, edge-label readability feedback, component-card hierarchy feedback, collapse behavior, and safe-edit rules.
