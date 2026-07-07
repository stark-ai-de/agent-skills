---
name: drawio-diagrams
description: Create, draw, generate, edit, verify, and export draw.io/diagrams.net `.drawio` diagrams. Use when the user asks for editable diagrams, flowcharts, architecture, sequence, ER/class/state, swimlane, timeline, network, icon-rich technical diagrams, or PNG/SVG/PDF exports; do not use for charts/plots or artistic image generation.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.0"
---

# drawio-diagrams

## Goal

Produce, edit, verify, and deliver high-quality draw.io / diagrams.net diagrams as editable `.drawio` files. Prefer self-contained diagrams that work in both light and dark mode.

## When to use

Use this skill for requests to create, draw, generate, edit, repair, convert, verify, or export draw.io diagrams, including architecture diagrams, flowcharts, sequence diagrams, ER/class/state diagrams, swimlanes, timelines, network diagrams, C4-style diagrams, and icon-rich technical visuals.

## When not to use

Do not use for bar/line/pie charts, data analysis plots, photo editing, artistic images, or non-editable illustrations unless the user explicitly wants a draw.io diagram.

## Inputs to inspect

Inspect the user's prompt, existing `.drawio` files, requested output formats, target audience, language, privacy constraints, icon needs, and available tools. Detect draw.io Desktop CLI, `python3`, Node >= 18, available draw.io MCP tools, and any explicitly configured local shape index or icon cache.

## Workflow

1. Detect toolset and report available, missing, and degraded capabilities.
2. Classify diagram type and build a compact semantic model: nodes, edges, groups, zones, ordering, icon needs, theme needs, and outputs.
3. Choose one path:
   - Mermaid then draw.io CLI for standard diagrams when the CLI is available.
   - Direct draw.io XML for custom styling, precise placement, icons, containers, swimlanes, or no CLI.
   - Structure XML plus CLI `--layout` for flow/tree/network layout when useful.
   - MCP live/preview tools when already available and the user wants live iteration.
   - `.drawio` plus `app.diagrams.net/#create=` URL when the user wants browser opening without installation.
4. Author or patch `.drawio` XML. Preserve unknown cells, IDs, pages, layers, and manual coordinates when editing; create a backup before overwriting an existing diagram.
5. Apply light/dark-compatible styling with `adaptiveColors="auto"` and `light-dark(...)` where explicit colors are needed.
6. Resolve icons: native stencils first, approved local shape search second, approved local SVG/icon cache third, then generic draw.io shapes.
7. Run `scripts/validate_drawio.py`. Fix every ERROR and justify or fix every WARN.
8. If draw.io Desktop CLI is available, run `scripts/render-drawio.mjs`, inspect the light PNG and dark SVG, and fix visual issues for at most three cycles.
9. Deliver `.drawio`, optional exports, chosen path, validation status, visual/dark verification status, and remaining warnings.

## Safety rules

Never install tools, write MCP config, download indexes, fetch remote icons, or use hosted draw.io MCP without explicit approval. Hosted `mcp.draw.io` receives diagram content; prefer local paths for sensitive work. Do not include secrets, customer data, private repo paths, or internal hostnames in examples or generated diagrams.

## References

- `references/xml-authoring.md`: use for direct XML generation and existing-file edits.
- `references/diagram-type-playbook.md`: use for semantic planning and path selection.
- `references/icon-catalog.md`: use when diagrams need architecture, brand, cloud, or product icons.
- `references/theming-dark-mode.md`: use for color choices and light/dark compatibility.
- `references/toolset-setup.md`: use when detecting or promoting optional tools.
- `references/verification-checklist.md`: use before delivery and when automated validation is unavailable.
- `references/delivery.md`: use for export commands and browser URL delivery.

## Scripts

- `scripts/validate_drawio.py`: read-only lint for `.drawio`/mxGraph XML.
- `scripts/render-drawio.mjs`: exports light PNG and dark SVG when draw.io Desktop CLI exists.
- `scripts/search-shapes.mjs`: searches an explicitly configured local shape index or an approved local cache.

## Output format

Return paths to generated files, chosen authoring path, toolset used, lint summary, visual verification summary, dark-mode verification summary, and any warnings left with justification.

## Completion criteria

A task is complete when a valid editable `.drawio` file exists, deterministic lint has no errors, warnings are fixed or justified, exports are generated when requested and possible, and visual/dark verification is reported honestly.

## Failure modes

If the CLI is missing, skip visual export and say so. If MCP is unavailable, use direct XML. If a browser URL is too long, deliver the `.drawio` file. If an existing page is compressed, inflate before editing. If XML generation becomes too large, split into pages.
