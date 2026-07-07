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
- likely high crossing/crowding
- probable edge centerline crossing a text box, icon label, callout, or component
- linked or remote icons in portable mode
- icon aspect-ratio or label-overlap risk
- recognized brand rendered as a generic placeholder while peers use real logos
- mixed color and monochrome logo variants without a source limitation

Every validator error should identify the page or cell and include a fix hint. Warnings must be fixed or explicitly justified in the final task report.

## Visual inspection rubric

When rendered output exists, inspect:

- readable text at normal zoom
- no clipped or hidden labels
- no unintended node overlap
- arrows do not pierce unrelated nodes, text boxes, callouts, or labels
- branches occur between elements, not on top of elements
- endpoints attach to the side that matches the reading direction
- start/end and reading direction are obvious
- group/container labels are readable
- icons render and align with labels
- all recognized brands in a visual family use real logos or all use simplified icons
- logos are not stretched, cropped, recolored, or mixed between wordmarks and icon-only variants unless intentional
- dark SVG preserves contrast
- line styles are explained when mixed
- whitespace is balanced, not crowded or sparse

Fix and re-render at most three cycles; then report remaining imperfections honestly.

Sources: integrated from draw.io validation, render-loop, export, icon verification, routing, and logo-consistency criteria.
