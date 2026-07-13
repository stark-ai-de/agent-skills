---
name: drawio-diagrams
description: Create, draw, generate, edit, verify, and export draw.io/diagrams.net `.drawio` diagrams. Use when the user asks for editable diagrams, flowcharts, architecture, sequence, ER/class/state, swimlane, timeline, network, icon-rich technical diagrams, or PNG/SVG/PDF exports; do not use for charts/plots or artistic image generation.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.5"
---

# drawio-diagrams

## Goal

Produce, edit, verify, and deliver high-quality draw.io / diagrams.net diagrams as editable `.drawio` files. Prefer self-contained diagrams that work in both light and dark mode.

## When to use

Use this skill for requests to create, draw, generate, edit, repair, convert, verify, or export draw.io diagrams, including architecture diagrams, flowcharts, sequence diagrams, ER/class/state diagrams, swimlanes, timelines, network diagrams, C4-style diagrams, and icon-rich technical visuals.

## When not to use

Do not use for bar/line/pie charts, data analysis plots, photo editing, artistic images, or non-editable illustrations unless the user explicitly wants a draw.io diagram.

## Inputs to inspect

Inspect the user's prompt, existing `.drawio` files, requested output formats, target audience, language, privacy constraints, icon needs, simplification needs, theme needs, text hierarchy needs, label-density risks, fan-out/fan-in routing risks, and available tools. Detect draw.io Desktop CLI, `python3`, Node >= 18, available draw.io MCP tools, and any explicitly configured local shape index or icon cache. Repository icon contracts are ignored by default for diagrams unless the user asks to apply them.

## Workflow

1. Detect toolset and report available, missing, and degraded capabilities. For icon-rich diagrams, recommend real logos and ask once for missing-logo fetch/cache approval before layout work starts.
2. Classify diagram type and build a compact semantic model: nodes, edges, groups, zones, ordering, icon needs, simplification mode, theme needs, outputs, label-density hotspots, and source fan-out/fan-in hotspots.
3. Choose one path:
   - Mermaid then draw.io CLI for standard diagrams when the CLI is available.
   - Direct draw.io XML for custom styling, precise placement, icons, containers, swimlanes, or no CLI.
   - Structure XML plus CLI `--layout` for flow/tree/network layout when useful.
   - MCP live/preview tools when already available and the user wants live iteration.
   - `.drawio` plus `app.diagrams.net/#create=` URL via `scripts/open-drawio-url.mjs` when the user wants browser opening without installation.
4. Plan layout gutters before authoring XML. Reserve empty corridors for connector rails, keep rails and edge labels off section borders, separate multi-destination fan-out into clear lanes or a small junction, and decide whether detail/package rows belong on the same page, a second page, or a detail layer.
5. Author or patch `.drawio` XML. Preserve unknown cells, IDs, pages, layers, and manual coordinates when editing; create a backup before overwriting an existing diagram.
6. Apply light/dark-compatible styling with `adaptiveColors="auto"` and `light-dark(...)` where explicit colors are needed. Give dense edge labels small filled label backgrounds that work in both modes.
7. Resolve icons in `brand-logos` mode by default: use real logos for all recognized brands where approved sources allow it, preserve aspect ratio, keep logo color mode consistent, use consistent neutral chips, and fall back to `simplified-icons` only when the user chooses it or sources are unavailable/denied. Do not recolor or invert original logos; change the chip/background instead.
8. Route edges with concrete `source` and `target` ids. Treat intervening text, annotations, and callouts as obstacles; for orthogonal avoidance, store explicit waypoints under `<Array as="points">` in the edge's `<mxGeometry>` and route around them. Arrows must not overlap text boxes, callouts, labels, icon chips, or container borders; use side ports, label backgrounds, dedicated lanes, and branch points between elements when needed.
9. Run `scripts/preflight-drawio-xml.mjs`, `scripts/validate_drawio.py`, and `scripts/validate-drawio-diagram-rules.mjs` (dependency-free helpers allowed by ADR-0022). Fix every ERROR and justify or fix every WARN.
10. If draw.io Desktop CLI is available, run `scripts/render-drawio.mjs`, inspect the light PNG and dark SVG, and fix visual issues for at most three cycles. Inspect for label-on-border collisions, crowded rails, uneven whitespace, indistinct component title/detail text, icon-chip inconsistency, and dark-mode logo/label contrast.
11. Deliver `.drawio`, optional exports, chosen path, validation status, visual/dark verification status, and remaining warnings.

## Safety rules

Never install tools, write MCP config, download indexes, fetch remote icons, or use hosted draw.io MCP without explicit approval. Hosted `mcp.draw.io` receives diagram content; prefer local paths for sensitive work. Do not include secrets, customer data, private repo paths, or internal hostnames in examples or generated diagrams.

## References

- `references/xml-authoring.md`: use for direct XML generation and existing-file edits.
- `references/diagram-type-playbook.md`: use for semantic planning and path selection.
- `references/layout-readability.md`: use for architecture readability, connector-label gutters, fan-out lanes, spacing, hierarchy, and visual review.
- `references/icon-catalog.md`: use when diagrams need architecture, brand, cloud, or product icons.
- `references/routing-and-simplification.md`: use for edge routing, plus/minus collapse evaluation, and simplified/detailed views.
- `references/theming-dark-mode.md`: use for color choices and light/dark compatibility.
- `references/toolset-setup.md`: use when detecting or promoting optional tools.
- `references/verification-checklist.md`: use before delivery and when automated validation is unavailable.
- `references/delivery.md`: use for export commands and browser URL delivery.

## Scripts

- `scripts/preflight-drawio-xml.mjs`: read-only strict XML preflight for forbidden constructs before the Python lint.
- `scripts/validate_drawio.py`: read-only lint for `.drawio`/mxGraph XML.
- `scripts/validate-drawio-diagram-rules.mjs`: read-only checks for floating semantic edges, fixed-aspect logos, and likely route crossings.
- `scripts/render-drawio.mjs`: exports light PNG and dark SVG when draw.io Desktop CLI exists.
- `scripts/open-drawio-url.mjs`: read-only browser URL builder/opener for `.drawio` files.
- `scripts/search-shapes.mjs`: searches an explicitly configured local shape index or an approved local cache.

## Output format

Return paths to generated files, chosen authoring path, toolset used, icon mode and sources used, lint summary, visual verification summary, dark-mode verification summary, and any warnings left with justification. Explicitly name `validate_drawio.py` and `validate-drawio-diagram-rules.mjs` in the lint summary. For architecture or dense diagrams, report connector rails, label backgrounds, and how labels were spaced.

## Completion criteria

A task is complete when a valid editable `.drawio` file exists, deterministic lint has no errors, diagram-rule validation has no errors, warnings are fixed or justified, exports are generated when requested and possible, and visual/dark verification is reported honestly. For architecture diagrams, completion also requires a readability pass for connector-label placement, fan-out lanes, whitespace balance, title/detail hierarchy, package/detail row treatment, and icon/logo consistency.

## Failure modes

If the CLI is missing, skip visual export and say so. If MCP is unavailable, use direct XML. If logo fetch approval is denied, use simplified icons consistently. If a browser URL is too long, deliver the `.drawio` file. If an existing page is compressed, inflate before editing. If XML generation becomes too large, split into pages.
