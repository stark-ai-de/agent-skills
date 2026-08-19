# Verification checklist

## Deterministic lint must pass with no errors

Run the Python validator with the requested policy:

```bash
python3 scripts/validate_drawio.py diagram.drawio --animation on
python3 scripts/validate_drawio.py diagram.drawio --animation off
python3 scripts/validate_drawio.py existing.drawio --animation preserve
python3 scripts/validate_drawio.py icon-rich.drawio --animation on --require-self-contained-images --require-uncompressed
```

Use `on` for newly generated diagrams unless the user opted out, `off` for an explicit static request, and `preserve` for existing files whose animation decision should remain untouched. Add both self-contained flags when the diagram embeds selected SVG assets; they reject compressed pages, runtime image links, malformed embedded SVG/raster data, and files without an embedded SVG.

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
- directed semantic flow missing `flowAnimation=1` when `--animation on` is requested
- enabled connector animation when `--animation off` is requested
- invalid flow animation duration, timing function, or direction
- malformed embedded SVG/raster data
- remote or non-embedded image sources under `--require-self-contained-images`
- compressed pages under `--require-uncompressed`

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
- probable connector route crossing a text box, icon label, callout, section title, or component
- linked or remote icons in portable mode
- SVG data URIs whose `;base64` marker is split by draw.io style delimiters
- icon aspect-ratio or label-overlap risk
- `dataRole=component` without its own icon-like shape or a `dataRole=icon` child
- animated structural/decorative edge that contradicts its declared `dataRole`

Every validator error should identify the page or cell and include a fix hint. Warnings must be fixed or explicitly justified in the final task report.

## Visual inspection rubric

When rendered output exists, inspect:

- recognized brands use the official logo/service stencil when available, or an explicitly labelled per-node semantic fallback only when unresolved or intentionally generic/vendor-neutral
- logo variants do not mix color and monochrome without a source limitation
- original logo artwork, source variant, and brand colors are preserved; logos are not arbitrarily recolored, inverted, cropped, stretched, filtered, or unexpectedly simplified. Any explicit user-requested or necessary documented accessibility treatment is disclosed.
- icon-chip dimensions stay consistent inside one visual family

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
- every primary component has an official logo/service stencil when available or a relevant labelled semantic icon for generic/unresolved concepts
- unresolved brands use per-node semantic fallbacks without removing resolved peer logos
- logos are not stretched, cropped, recolored, inverted, or mixed between wordmarks and icon-only variants unless explicitly requested or a necessary documented accessibility exception is disclosed
- logo chips are consistent in size and contrast across a visual family
- dark SVG preserves contrast, including weak monochrome logos and connector labels
- fixed light/dark SVG exports declare the requested theme; adaptive SVGs are not relabelled as fixed light
- fixed light/dark PNG pairs are rasterized from their matching fixed-theme SVGs at the same dimensions and produce different canonical canvas-order RGBA pixels when the adaptive palette actually differs
- comparison galleries use static light/dark previews so both themes remain visible regardless of viewer preference
- every variant in a profile comparison preserves the same component names, groups, directed edge IDs/endpoints/roles, and embedded icon payloads; compare every profile pair in both themes so profile cues remain visibly distinct
- SVG and PNG compositions agree on bounds, routing, labels, and complete icon pixels
- line styles are explained when mixed
- whitespace is balanced, not crowded or sparse, and any empty area has a deliberate purpose
- external systems sit outside the runtime/deployment trust boundary they depend on
- current, target, blocked, optional, and development-only elements are distinguishable without color alone
- animated edges still communicate source, target, direction, intent, and protocol when motion is absent
- legends do not call animated flows "solid" or reserve dashed appearance as the only pending/dev cue; arrowhead shape and text remain authoritative
- light PNG/PDF remain complete, and animated SVG preserves motion when that export is requested
- emoji or platform glyphs do not render as tofu/missing boxes; use portable vector shapes or validated embedded icons instead

When a batch preview suggests clipping or another raster defect, inspect the encoded artifact at full resolution with an independent decoder and compare an isolated re-export. Change the source or renderer only when the defect reproduces in the encoded pixels.

Fix and re-render at most three cycles; then report remaining imperfections honestly. Inspect every relevant page, not only page 1.

## Three-pass self-review

### 1. Semantic architecture review

- Re-check accepted ADRs, specs, README/API contracts, manifests, and existing diagrams against the generated content.
- Confirm title, diagram type, scope, audience question, abstraction level, and current/target state.
- Confirm each primary element's type, responsibility, and relevant technology; confirm every relationship's direction and intent.
- Challenge every node and detail: keep, move to a detail page/layer, or omit.
- Check trust/deployment boundaries and status claims. Never place an external provider inside the owned runtime zone or present planned work as current.

### 2. Layout and routing review

- Check the connector, fan-out, label, hierarchy, whitespace, package/detail, and icon rules below.
- Prefer an Overview plus bounded detail pages when one page exceeds roughly 15 primary nodes or mixes runtime, deployment, delivery, and activation procedure.

### 3. Visual and accessibility review

- Inspect light and dark renders at normal zoom.
- Verify the selected design profile is consistent across the page. Check 12 px body/connector text where practical, contrast, color-independent meaning, static fallback, and the profile's effect limits; use the technical-geominimalist baseline when no expressive profile was selected.
- For a profile set, compare the semantic manifest across sources and inspect the complete light/dark gallery, not one representative profile.
- Compare generated exports with the editable source and refresh stale referenced images.

## Architecture readability review

For architecture diagrams with sections, lanes, external integrations, dashboards, or package rows, do this additional pass:

1. Check every section boundary. No edge label should sit directly on the boundary or be confused with a section title.
2. Check every multi-destination component. More than three outbound routes should use a junction or separated lanes.
3. Check top and bottom rails. Long labels need backgrounds and enough spacing above/below the rail.
4. Check the main runtime band. Either distribute core components across the width or reserve empty space for a named purpose.
5. Check package/detail boxes. They should be smaller, grouped under related services, linked with subtle dependencies, or moved to a second page/layer.
6. Check icon coverage and logo fidelity. No primary `dataRole=component` should be a bare text card; prefer changing a neutral chip/background over editing, inverting, or simplifying original logo artwork.

## Artifact hygiene

- Keep one canonical editable `.drawio` source for each maintained diagram and refresh the export actually referenced by docs.
- Do not deliver icon probes, scratch diagrams, duplicate obsolete overviews, or unreferenced test exports in the target repository; keep them in a temporary/output location.
- When a duplicate diagram exists, preserve it unless deletion is authorized, but name the canonical source and stop updating both.

Sources: original guidance informed by draw.io validation/export behavior, the C4 review checklist, Azure Well-Architected diagram practices, IBM technical-diagram guidance, WCAG, and audited architecture-diagram failure modes.
