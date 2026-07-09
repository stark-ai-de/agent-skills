# Verification checklist

## Deterministic lint must pass with no errors

Fatal parse failures:

- unreadable input file
- XML comments (`<!-- ... -->`) anywhere in the file or compressed page payload
- `<!DOCTYPE ...>` declarations
- processing instructions other than an optional XML declaration
- unescaped ampersands or malformed XML entities
- unbalanced or malformed XML tags

Errors:

- invalid XML subset
- missing root cells
- duplicate IDs
- dangling parent/source/target
- semantic edge without concrete `source` and `target` vertex ids
- edge endpoints referencing edges
- missing edge geometry
- missing/invalid vertex geometry
- negative sizes
- filled non-container vertex overlaps
- child outside parent bounds
- z-order hiding children
- font size below 9
- explicit text/fill contrast below 4.5:1
- image/logo cell missing fixed-aspect handling

Warnings:

- text likely to overflow
- tiny vertices
- orphan vertices
- duplicate parallel edges
- mixed edge styles
- missing `adaptiveColors="auto"`
- explicit pure black/white without `light-dark()`
- long edge labels
- dense edge labels without label backgrounds or explicit label cells
- likely high crossing/crowding
- probable edge centerline crossing a text box, icon label, callout, section title, or component
- linked or remote icons in portable mode
- icon aspect-ratio or label-overlap risk
- recognized brand rendered as a generic placeholder while peers use real logos
- mixed color and monochrome logo variants without a source limitation
- recolored, inverted, cropped, stretched, or unexpectedly simplified logos
- inconsistent icon-chip dimensions inside the same visual family

Every validator error should identify the page or cell and include a fix hint. Warnings must be fixed or explicitly justified in the final task report.

## Visual inspection rubric

When rendered output exists, inspect:

- readable text at normal zoom
- no clipped or hidden labels
- no unintended node overlap
- arrows do not pierce unrelated nodes, text boxes, callouts, section titles, icon chips, or labels
- connector labels do not sit directly on connector strokes, section borders, route crossings, or icon chips
- dense connector labels have readable `light-dark(...)` label backgrounds or explicit label cells
- branches occur between elements, not on top of elements
- fan-out from one component uses separate stems/lanes or a clear junction instead of one crowded rail
- endpoints attach to the side that matches the reading direction
- start/end and reading direction are obvious
- group/container labels are readable and have title-safe whitespace
- component cards distinguish title, role, metadata, paths, and ports instead of giving every line the same emphasis
- package/detail rows are visually connected to related runtime services, explained by a legend, or moved to a detail page/layer
- icons render and align with labels
- all recognized brands in a visual family use real logos or all use simplified icons
- logos are not stretched, cropped, recolored, inverted, or mixed between wordmarks and icon-only variants unless intentional
- logo chips are consistent in size and contrast across a visual family
- dark SVG preserves contrast, including weak monochrome logos and connector labels
- line styles are explained when mixed
- whitespace is balanced, not crowded or sparse, and any empty area has a deliberate purpose

Fix and re-render at most three cycles; then report remaining imperfections honestly.

## Architecture readability review

For architecture diagrams with sections, lanes, external integrations, dashboards, or package rows, do this additional pass:

1. Check every section boundary. No edge label should sit directly on the boundary or be confused with a section title.
2. Check every multi-destination component. More than three outbound routes should use a junction or separated lanes.
3. Check top and bottom rails. Long labels need backgrounds and enough spacing above/below the rail.
4. Check the main runtime band. Either distribute core components across the width or reserve empty space for a named purpose.
5. Check package/detail boxes. They should be smaller, grouped under related services, linked with subtle dependencies, or moved to a second page/layer.
6. Check logo fidelity. Prefer changing a neutral chip/background over editing, inverting, or simplifying original logo artwork.

Sources: integrated from draw.io validation, render-loop, export, icon verification, routing, connector-label readability feedback, fan-out lane feedback, package-row feedback, text-hierarchy feedback, and logo-consistency criteria.
