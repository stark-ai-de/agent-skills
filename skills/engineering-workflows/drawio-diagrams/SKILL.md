---
name: drawio-diagrams
description: Create, draw, generate, edit, verify, and export draw.io/diagrams.net `.drawio` diagrams. Use when the user asks for editable diagrams, flowcharts, architecture, sequence, ER/UML/state, BPMN, SysML, ML/DL, swimlane, timeline, network, icon-rich technical diagrams, or PNG/SVG/PDF exports; do not use for charts/plots or artistic image generation.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.6.0"
---

# drawio-diagrams

## Goal

Produce, edit, verify, and deliver high-quality draw.io / diagrams.net diagrams as editable `.drawio` files. Prefer self-contained diagrams that work in both light and dark mode.

## When to use

Use this skill for requests to create, draw, generate, edit, repair, convert, verify, or export draw.io diagrams, including architecture diagrams, flowcharts, sequence diagrams, ER/UML/state diagrams, BPMN, SysML, ML/DL, swimlanes, timelines, network diagrams, C4-style diagrams, and icon-rich technical visuals.

## When not to use

Do not use for bar/line/pie charts, data analysis plots, photo editing, artistic images, or non-editable illustrations unless the user explicitly wants a draw.io diagram.

## Workflow selection

When invoked directly, always expose these finite workflows:

- `create`: create a new diagram or convert supplied semantics into editable draw.io.
- `edit-repair`: edit, repair, or intentionally restyle an existing `.drawio` file.
- `review`: read-only semantic, structural, validation, or visual assessment.
- `export`: export an already acceptable `.drawio` source without redesigning it.

There is no `auto` workflow. Infer only from task intent and authority:

- Creating or converting semantics into a new editable diagram selects `create`.
- Editing, repairing, or intentionally restyling an existing diagram selects `edit-repair`.
- A semantic, structural, validation, or visual assessment with no requested changes selects `review`.
- Exporting an already acceptable `.drawio` source without redesign selects `export`.

For clear direct intent, state all four workflows, the selected workflow and rationale, inputs, requested outputs, design profile, theme/animation/icon modes, recommended authoring route (`direct-xml | desktop-export | connected-tool | browser-url`), write scope, expected artifacts, protected files, and later approval boundaries, then proceed. A bare invocation, mixed outcomes with materially different scope, or unresolved source/destination requires showing the options and asking. Agent-initiated activation may select and announce `review` without confirmation; it may select a mutating workflow only when the user's existing request already authorizes that outcome and scope. Installation, hosted content transfer, file-writing render/raster helpers, destructive overwrite, paid/external actions, and scope expansion retain separate approval.

## Inputs to inspect

Inspect the user's prompt, architecture sources, existing `.drawio` files, requested outputs, audience, question, scope, current/target state, abstraction level, privacy constraints, icons, design profile/theme, text hierarchy, routing risks, and available tools. Icon-first presentation and animation for newly generated directed runtime/process/data flows default to `on`; the user may disable either. Detect draw.io Desktop CLI, `python3`, Node >= 18, available draw.io MCP tools, and explicitly configured local caches. Repository icon contracts are ignored unless requested.

## Workflow

1. Apply the intent-bound workflow selection, then read available source docs and detect the toolset. Stop only when workflow, source/destination, or material authority is ambiguous. For remaining semantic ambiguity, use a short discovery checkpoint—native plan/question facilities when available—and ask at most three questions that materially change audience, scope, view, state, privacy, or content. Tool installs, hosted services, bulk downloads, persistent cache creation, hosted content transfer, and file-writing render/raster helpers remain separately approval-gated.
2. If `review` is selected, use a strict read-only branch: inspect the supplied sources, existing diagram/XML, and already available renders; build only the semantic model needed for the assessment; and run only the read-only validators against the existing source. Do not create backups, author or patch XML, render, rasterize, export, open hosted services, or fix findings. Report findings, evidence limits, and the recommended follow-up workflow, then return; do not execute the remaining workflow steps.
3. Use the selected mutating or export workflow and build a compact semantic model: stakeholder question, audience, view/abstraction, current/target state, nodes, directed relationships, groups/zones, 3-6 relevant scenarios when useful, icon mode, `design_profile: technical|operator-grid|isometric-air|neon-hub|aurora-story|adapted-<short-name>`, `theme_mode: adaptive|light|dark`, `animation: on|off`, outputs, and density/fan-out hotspots. For architecture, apply the content gate in `references/diagram-type-playbook.md`; do not mix abstraction levels or inventory everything.
4. Choose one path:
   - Direct draw.io XML for standard diagrams, custom styling, precise placement, icons, containers, swimlanes, or no optional tooling.
   - Draw.io Desktop CLI only for export/render of completed `.drawio` files after a format smoke test succeeds; do not assume Mermaid import or a `--layout` option.
   - MCP live/preview or conversion tools only when already available, their requested capability is verified, and the user wants that path.
   - `.drawio` plus `app.diagrams.net/#create=` URL via `scripts/open-drawio-url.mjs` when the user wants browser opening without installation.
5. Plan layout gutters before authoring XML. Reserve empty corridors for connector rails, keep rails and edge labels off section borders, separate multi-destination fan-out into clear lanes or a small junction, and decide whether detail/package rows belong on the same page, a second page, or a detail layer.
6. Author or patch `.drawio` XML. Preserve unknown cells, IDs, pages, layers, and manual coordinates when editing; create a backup before overwriting an existing diagram.
7. Apply an explicit user-selected profile from `references/design-profiles.md`; otherwise use the technical-geominimalist default. Infer an expressive profile only when the requested audience/artifact clearly calls for it. When the user supplies a visual reference, abstract only reusable tokens and effects for this task—never copy its composition or assets, and never persist a learned profile without an explicit request. Keep one profile per page, the shared 8 px grid, portable type, accessible `light-dark(...)` pairs, `adaptiveColors="auto"`, semantic redundancy, and filled edge-label backgrounds from `references/theming-dark-mode.md`.
8. Use `icon-first` mode by default whenever the diagram notation supports it, especially for architecture and technical-system diagrams. Give every primary component a relevant visual symbol: a real logo/service stencil for a recognized product and a native semantic icon for a generic concept. If one logo cannot be resolved, keep the label and use the best per-node semantic icon; never downgrade the whole visual family or emit bare text cards. Preserve formal ER/UML/sequence notation where extra icons would reduce clarity. Keep logo color mode and neutral chips consistent, preserve aspect ratio, and never recolor or invert source artwork.
9. Route edges with concrete `source` and `target` ids. Treat text, annotations, and callouts as obstacles; use side ports, explicit waypoints, dedicated lanes, and branch points. Add `flowAnimation=1` to directed runtime, request, event, process, and data-flow edges when animation is on. Keep association, containment, ownership, dependency-only, annotation, and decorative edges static and mark their `dataRole`. Animation supplements arrowheads and labels; it never carries meaning alone.
10. Run `scripts/preflight-drawio-xml.mjs`, `scripts/validate_drawio.py <file> --animation on|off|preserve`, and `scripts/validate-drawio-diagram-rules.mjs` (dependency-free helpers allowed by ADR-0022). Add `--require-self-contained-images --require-uncompressed` when selected SVG assets are embedded. Use `on` for newly generated diagrams unless the user opted out, `off` for opt-out, and `preserve` for existing files whose animation policy should not change. Fix every ERROR and justify or fix every WARN.
11. Self-review in three passes: semantic architecture/content, layout/routing, then light/dark/accessibility. If draw.io Desktop CLI is available, run `scripts/render-drawio.mjs`, inspect every relevant page's light PNG and dark SVG, and fix targeted issues for at most three render cycles.
12. Deliver `.drawio`, optional exports, chosen path, design profile/theme mode, animation mode, validation and visual/dark status, remaining warnings, and a compact list of intentional omissions. Offer further user-led visual iteration when useful.

## Safety rules

Do not infer mutating authority from a bare or ambiguous invocation. `review` is strictly read-only; if findings suggest edits, report them and wait for an authorized mutating workflow.

Never install tools, write MCP config, download bulk icon packs/indexes, create persistent caches, or use hosted draw.io MCP without explicit approval. File-writing render and rasterization helpers also require explicit user approval before use. A selected public SVG may be retrieved as a read-only lookup when host policy allows; fetch only the chosen asset, validate it, and embed it so the final `.drawio` has no runtime dependency. Hosted `mcp.draw.io` receives diagram content; prefer local paths for sensitive work. Do not include secrets, customer data, private repo paths, or internal hostnames in examples or generated diagrams.

## References

- `references/xml-authoring.md`: use for direct XML generation and existing-file edits.
- `references/diagram-type-playbook.md`: use for semantic planning and path selection.
- `references/layout-readability.md`: use for architecture readability, connector-label gutters, fan-out lanes, spacing, hierarchy, and visual review.
- `references/icon-catalog.md`: use when diagrams need architecture, brand, cloud, or product icons.
- `references/routing-and-simplification.md`: use for edge routing, plus/minus collapse evaluation, and simplified/detailed views.
- `references/design-profiles.md`: use when the user requests a template/style or the artifact clearly needs an operator-grid, isometric, neon-hub, or aurora presentation treatment.
- `references/theming-dark-mode.md`: use for color choices and light/dark compatibility.
- `references/toolset-setup.md`: use when detecting or promoting optional tools.
- `references/verification-checklist.md`: use before delivery and when automated validation is unavailable.
- `references/delivery.md`: use for export commands and browser URL delivery.

## Scripts

- `scripts/preflight-drawio-xml.mjs`: read-only strict XML preflight for forbidden constructs before the Python lint.
- `scripts/validate_drawio.py`: read-only lint for `.drawio`/mxGraph XML.
- `scripts/validate-drawio-diagram-rules.mjs`: read-only checks for floating semantic edges, component icon coverage, fixed-aspect logos, and likely route crossings.
- `scripts/render-drawio.mjs`: stages and validates a light PNG plus dark SVG, then installs both with commit-time no-clobber checks; interrupted commits retain partial outputs and recovery backups, and successful replacements report a retained recovery directory for manual cleanup. It writes output files and requires explicit user approval before use.
- `scripts/rasterize-themed-svg.mjs`: writes one no-clobber PNG from a bounded, self-contained fixed-light or fixed-dark SVG through a user-selected absolute path to a pinned local Chrome, Chromium, or Edge executable; recursively checks bounded embedded SVG image data for active or remote content, validates the output, and preserves source dimensions. It requires explicit user approval before use.
- `scripts/open-drawio-url.mjs`: read-only browser URL builder/opener for `.drawio` files.
- `scripts/search-shapes.mjs`: searches a configured or standard-cache local shape index with strict and fuzzy fallback ranking.

## Output format

Return the selected workflow and rationale, inputs, outputs, write scope, protected files, authoring path, toolset, design profile, theme/animation/icon modes, icon sources and any per-node substitutions, lint summary, semantic/layout/light-dark review summary, and justified warnings. Explicitly name `validate_drawio.py` and `validate-drawio-diagram-rules.mjs`. For `review`, report inspected evidence, findings, limitations, and the recommended follow-up workflow without claiming or performing changes. For architecture, also report view/scope, intentional omissions, connector rails, label backgrounds, spacing, and icon coverage. When any third-party logo or icon appears, include the single responsibility notice from `references/delivery.md`; do not perform per-icon legal analysis unless requested.

## Completion criteria

A task is complete when the four workflows were exposed, the task-derived selection and rationale were stated or ambiguity was resolved, authority remained within the requested outcome/scope, and the selected workflow's outcome was delivered. A `review` completes after the read-only evidence and findings report returns without authoring, rendering, exporting, or fixes. Other workflows require a valid editable `.drawio` when applicable, deterministic lint and diagram rules without errors, fixed or justified warnings, the requested design profile and animation policy, relevant icon/logo coverage, requested exports when possible, and honest self-review reporting. Architecture completion also requires one clear question/view/abstraction level, explicit current/target status, intentional omissions, readable routing and hierarchy, and relevant icon/logo coverage for every primary component unless the user opted out.

## Failure modes

If the CLI is missing, skip visual export and say so. If MCP is unavailable, use direct XML. If a selected expressive profile conflicts with formal notation, density, print use, or accessibility, preserve semantics and fall back to the nearest readable profile treatment while explaining the adjustment. If a brand logo cannot be fetched or resolved, use a native semantic icon for that node and disclose the substitution; keep the rest of the logo set intact. If a browser URL is too long, deliver the `.drawio` file. If an existing page is compressed, inflate before editing. If XML generation becomes too large, split into pages.
