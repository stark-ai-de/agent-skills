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
- edge endpoints referencing edges
- missing edge geometry
- missing/invalid vertex geometry
- negative sizes
- filled non-container vertex overlaps
- child outside parent bounds
- z-order hiding children
- font size below 9
- explicit text/fill contrast below 4.5:1

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
- linked or remote icons in portable mode
- icon aspect-ratio or label-overlap risk

Every validator error should identify the page or cell and include a fix hint. Warnings must be fixed or explicitly justified in the final task report.

## Visual inspection rubric

When rendered output exists, inspect:

- readable text at normal zoom
- no clipped or hidden labels
- no unintended node overlap
- arrows do not pierce unrelated nodes
- start/end and reading direction are obvious
- group/container labels are readable
- icons render and align with labels
- dark SVG preserves contrast
- line styles are explained when mixed
- whitespace is balanced, not crowded or sparse

Fix and re-render at most three cycles; then report remaining imperfections honestly.

Sources: integrated from draw.io validation, render-loop, export, and icon verification criteria.
