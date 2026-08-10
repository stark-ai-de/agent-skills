# XML authoring reference

## Baseline structure

Generate uncompressed `.drawio` XML as the durable source:

```xml
<mxfile host="app.diagrams.net">
  <diagram name="Page-1">
    <mxGraphModel adaptiveColors="auto" dx="1000" dy="800" grid="1" gridSize="8" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
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
- Mark relationship intent in the style with `dataRole`, such as `runtime-flow`, `data-flow`, `dependency`, `association`, `containment`, `ownership`, `annotation`, `legend`, or `decorative`.
- Avoid `exitX`, `exitY`, `entryX`, `entryY`, and hand waypoints by default, but use them intentionally when needed to attach to the correct side or route around annotations.
- Preserve unknown cells and IDs when editing.

## Rigid grid

Technical-geominimalist starter grid:

- x = `col * 208 + 40`
- y = `row * 112 + 40`
- process/card = 160 x 64 minimum
- decision diamond = 144 x 80
- circle = 64 x 64
- cylinder/database = 112 x 72
- icon cell = 48 x 48 with label below; non-square logos use their source aspect ratio

Treat these as a readable starter, not a reason to waste space. Keep all coordinates, padding, and gaps on the 8 px grid where practical.

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
<mxCell id="label-read-pdfs" value="read PDFs" style="rounded=1;whiteSpace=wrap;html=1;fontSize=12;spacing=3;fillColor=light-dark(#f8fafc,#0f172a);strokeColor=light-dark(#cbd5e1,#475569);fontColor=light-dark(#0f172a,#f8fafc);" vertex="1" parent="1">
  <mxGeometry x="112" y="520" width="64" height="24" as="geometry"/>
</mxCell>
```

Do not place explicit label cells directly on top of connector strokes; give them a small gutter above or below the rail.

## Native connector animation

New directed runtime, request, event, process, and data-flow edges animate by default:

```text
edgeStyle=orthogonalEdgeStyle;html=1;endArrow=block;dataRole=runtime-flow;flowAnimation=1;
```

`flowAnimation=1` is sufficient. draw.io defaults to duration `500`, timing `linear`, and direction `normal`. Override only when the flow meaning requires it:

```text
flowAnimationDuration=750;flowAnimationTimingFunction=ease-in-out;flowAnimationDirection=normal;
```

Allowed timing values are `linear`, `ease`, `ease-in`, `ease-out`, and `ease-in-out`. Allowed directions are `normal`, `reverse`, `alternate`, and `alternate-reverse`. Do not add `dashed=1` merely to enable animation; draw.io supplies the moving dash pattern. Because animated exports therefore look dashed in motion and may be captured mid-pattern in static previews, never define solid-versus-dashed as the only status or relationship cue. Pair roles with distinct arrowheads plus labels, badges, or status text.

Keep these edges static unless the user explicitly asks otherwise:

- association and containment
- ownership and dependency-only relationships
- trust or deployment boundaries
- annotation, legend, and decorative lines

Mark them with a static `dataRole` and omit `flowAnimation`:

```text
edgeStyle=orthogonalEdgeStyle;html=1;endArrow=open;dataRole=dependency;
```

When the user disables animation, omit `flowAnimation` or set it to `0` consistently on semantic flow edges, then validate with `--animation off`. Arrowheads, intent labels, and protocols must still make the static diagram complete. SVG can preserve native connector animation; PNG and PDF remain static.

When editing an existing file, preserve its animation policy unless the user asks to rebaseline it. New edges follow the file's policy or the explicit request.

Source: draw.io's official [connector animation guide](https://www.drawio.com/docs/manual/connectors/connector-animate/) and [animation style reference](https://www.drawio.com/docs/manual/styles/connector-animation-styles/).

## Component cards

For rich service boxes, prefer a card built from child cells rather than one undifferentiated multiline label:

- parent card: `dataRole=component`, background, stroke, and optional semantic role color
- icon chip: `dataRole=icon`, consistent size and position, usually left or top-left
- title child: `dataRole=title`, stronger font weight or larger font size for the component name
- detail child: `dataRole=detail`, smaller or muted text for app paths, ports, queues, protocols, and descriptions
- badges: `dataRole=badge` for local-only, mock, external, or status metadata

Every `dataRole=component` cell must either be an icon-like native/service shape itself or contain a `dataRole=icon` child. A plain rounded component card without an icon is an incomplete icon-first component unless the user explicitly opted out of icons.

For a named organization, product, or service, make the official/native mark the `dataRole=icon` child whenever it is available. Preserve its embedded source bytes, brand colors, viewBox, and aspect ratio; generic semantic children are fallback-only for unresolved or intentionally generic/vendor-neutral nodes. Do not encode arbitrary recoloring or filters in the image/style cell. If an explicit user request or necessary documented accessibility exception changes the mark, record that exception in the delivery receipt.

Use `dataRole=annotation` or `dataRole=legend` on non-semantic note cells. These roles make intent clear to editors and prevent false orphan warnings.

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
