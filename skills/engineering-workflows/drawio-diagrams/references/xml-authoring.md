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

## Edge routing

Connectors must avoid labels, annotations, and text boxes. Route branches through empty corridors between elements, not through elements. Use side ports when the semantic direction is clear:

```text
exitX=1;exitY=0.5;entryX=0;entryY=0.5;
```

For horizontal flow into a store or platform component, enter on the left edge. For fan-out/fan-in patterns, place branch points midway between source and target columns.

## Containers and groups

Containers render behind children. Children must remain within parent inner bounds. Prefer parent-child containment over visual-only grouping when the semantics matter.

For collapsible groups, keep the overview title/icon on the parent and put details in child cells. Collapsed groups hide children; they do not dynamically trim text inside a single label.

## Layers and pages

Validate every page independently. Preserve hidden layers, metadata, and manual positions unless the user requested relayout.

Use a separate `Details` layer or `Detailed` page when the diagram needs a global simplified/expanded view. This is more reliable than expecting one plus/minus click to collapse all groups.

## Light/dark

Every `mxGraphModel` must include `adaptiveColors="auto"`. Use draw.io defaults when possible. For explicit colors, prefer `light-dark(lightHex,darkHex)` on fill, stroke, and font.

When editing an existing diagram, create a backup before overwriting unless the user chose a separate output path. Preserve unknown cells, metadata, page/layer structure, and manual coordinates unless the user requested relayout.

Sources: integrated from draw.io/mxGraph XML practice, layout/validation ideas, routing feedback, collapse behavior, and safe-edit rules.
