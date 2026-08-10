---
name: drawio-diagrams
description: Create, draw, generate, edit, verify, and export draw.io/diagrams.net `.drawio` diagrams. Use when the user asks for editable diagrams, flowcharts, architecture, sequence, ER/UML/state, BPMN, SysML, ML/DL, swimlane, timeline, network, icon-rich technical diagrams, or PNG/SVG/PDF exports; do not use for charts/plots or artistic image generation.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.7.1"
---

# drawio-diagrams

## Goal

Produce, edit, verify, and deliver high-quality draw.io / diagrams.net diagrams as editable `.drawio` files. Prefer self-contained diagrams that work in both light and dark mode.

## Official icon and logo policy

Official organization, product, and service icons/logos are the primary visual choice whenever the named asset is available and the notation supports it. Resolve the narrowest official or provider-backed asset before choosing a generic semantic glyph; use a semantic icon only for an intentionally generic/vendor-neutral concept or when the official asset cannot be resolved. A missing asset is a per-node fallback, not a reason to remove or recolor the other resolved logos.

Preserve the selected source artwork, brand colors, proportions, viewBox, and source variant by default. Do not arbitrarily tint, recolor, replace with a monochrome version, invert, filter, crop, stretch, or otherwise restyle an official mark to match a diagram profile. Use the chip, card, border, or surrounding background to solve contrast instead. A user-requested recolor is allowed only when explicitly requested; a readability/accessibility exception must be necessary, documented in the receipt, and disclose which asset treatment changed. Record every per-node semantic substitution and keep the original colors of all unaffected official marks.

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

For clear direct intent, state all four workflows, the selected workflow and rationale, inputs, requested outputs, design profile, theme/animation/icon modes, recommended authoring/render route (`direct-xml | transactional-native | approved-raw-cli-manual | fixed-theme-browser-raster | browser-url-preview | html-viewer-preview`), write scope, expected artifacts, protected files, and later approval boundaries, then proceed. A bare invocation, mixed outcomes with materially different scope, or unresolved source/destination requires showing the options and asking. Agent-initiated activation may select and announce `review` without confirmation; it may select a mutating workflow only when the user's existing request already authorizes that outcome and scope. Installation, hosted content transfer, browser rasterization, file-writing fallback helpers, destructive overwrite, paid/external actions, and scope expansion retain separate approval.

## Inputs to inspect

Inspect the user's prompt, architecture sources, existing `.drawio` files, requested outputs, audience, question, scope, current/target state, abstraction level, privacy constraints, icons, design profile/theme, text hierarchy, routing risks, and available tools. Icon-first presentation and animation for newly generated directed runtime/process/data flows default to `on`; the user may disable either. Detect draw.io Desktop CLI, `python3`, Node >= 18, available draw.io MCP tools, and explicitly configured local caches. For a repeatable capability receipt, use the read-only `scripts/probe-drawio-toolset.mjs [--json]` helper. Repository icon contracts are ignored unless requested. Capability detection is evidence, not permission: installation, cross-boundary execution, browser, hosted/MCP, cache, and paid/provider approvals remain independent.

## Workflow

1. Apply the intent-bound workflow selection and state the existing authority. For `create`, `edit-repair`, and `export`, immediately run a non-mutating capability preflight before source reads, authoring, rendering, or export: classify required capabilities, candidate renderer route, approval state, and evidence limits. Record the fallback ladder that will be used if a capability is unavailable. `review` skips mutating preflight and enters the strict read-only branch below. Stop only when workflow, source/destination, or material authority is ambiguous. For remaining semantic ambiguity, use a short discovery checkpoint—native plan/question facilities when available—and ask at most three questions that materially change audience, scope, view, state, privacy, or content. Tool installs, hosted services, bulk downloads, persistent cache creation, hosted content transfer, browser execution, cross-boundary execution, and file-writing fallback helpers remain separately approval-gated.
2. If `review` is selected, use a strict read-only branch: inspect the supplied sources, existing diagram/XML, and already available renders; build only the semantic model needed for the assessment; and run only the read-only validators against the existing source. Do not create backups, author or patch XML, render, rasterize, export, open hosted services, or fix findings. Report findings, evidence limits, and the recommended follow-up workflow, then return; do not execute the remaining workflow steps.
3. Use the selected mutating or export workflow and build a compact semantic model: stakeholder question, audience, view/abstraction, current/target state, nodes, directed relationships, groups/zones, 3-6 relevant scenarios when useful, icon mode, `design_profile: technical|operator-grid|isometric-air|neon-hub|aurora-story|adapted-<short-name>`, `theme_mode: adaptive|light|dark`, `animation: on|off`, outputs, and density/fan-out hotspots. For architecture, apply the content gate in `references/diagram-type-playbook.md`; do not mix abstraction levels or inventory everything.
4. Choose one path from the capability-aware ladder, keeping direct XML available as the universal editable route:
   - `transactional-native`: `scripts/render-drawio.mjs` with a Linux-native draw.io CLI and the required `/proc/self/fd` guarantees. This is preferred for maintained light-PNG/dark-SVG verification exports.
   - `approved-raw-cli-manual`: an explicitly approved native Desktop CLI, manual export, or WSL Windows bridge after a format smoke test. It does not provide transactional renderer guarantees and must say so in the receipt.
   - `fixed-theme-browser-raster`: an explicitly approved local browser rasterization of validated fixed-theme SVGs. This is an export sub-route for viewer-independent light/dark PNGs, not a replacement for the editable source.
   - `browser-url-preview` or `html-viewer-preview`: a browser URL or HTML preview only when explicitly requested. It is not a canonical editable artifact and may expose diagram data through browser history, sync, screenshots, or logs.
   - `direct-xml`: the universal authoring and no-optional-tool route for editable `.drawio` output.
   - Do not substitute image generation for a diagram request. Use an image-generation route only when the user explicitly changes the requested outcome to a non-editable image.
   - Draw.io Desktop CLI is an export/render tool, not an assumed Mermaid importer or `--layout` engine. MCP live/preview or conversion tools are allowed only when already available, their requested capability is verified, and the user wants that route.
5. Plan layout gutters before authoring XML. Reserve empty corridors for connector rails, keep rails and edge labels off section borders, separate multi-destination fan-out into clear lanes or a small junction, and decide whether detail/package rows belong on the same page, a second page, or a detail layer.
6. Author or patch `.drawio` XML. Preserve unknown cells, IDs, pages, layers, and manual coordinates when editing; create a backup before overwriting an existing diagram.
7. Apply an explicit user-selected profile from `references/design-profiles.md`; otherwise use the technical-geominimalist default. Infer an expressive profile only when the requested audience/artifact clearly calls for it. When the user supplies a visual reference, abstract only reusable tokens and effects for this task—never copy its composition or assets, and never persist a learned profile without an explicit request. Keep one profile per page, the shared 8 px grid, portable type, accessible `light-dark(...)` pairs, `adaptiveColors="auto"`, semantic redundancy, and filled edge-label backgrounds from `references/theming-dark-mode.md`.
8. Use `icon-first` mode by default whenever the diagram notation supports it, especially for architecture and technical-system diagrams. Prefer the official organization/product/service logo or native service stencil for every recognized named product before considering a generic semantic icon. Give every primary component a relevant visual symbol: an official mark for a resolved brand and a labelled semantic icon only for a generic concept, an explicitly vendor-neutral request, or an unresolved brand. If one logo cannot be resolved, keep the label, disclose the per-node substitution, and leave resolved peer logos unchanged; never downgrade the whole visual family or emit bare text cards. Preserve formal ER/UML/sequence notation where extra icons would reduce clarity. Preserve source artwork, brand colors, source variant, aspect ratio, and viewBox. Never arbitrarily recolor, tint, monochromatize, invert, filter, crop, stretch, or otherwise restyle an official mark; change the neutral chip/background for contrast. Only an explicit user request permits recoloring, and any accessibility/legibility exception must be necessary and disclosed.
9. Route edges with concrete `source` and `target` ids. Treat text, annotations, and callouts as obstacles; use side ports, explicit waypoints, dedicated lanes, and branch points. Add `flowAnimation=1` to directed runtime, request, event, process, and data-flow edges when animation is on. Keep association, containment, ownership, dependency-only, annotation, and decorative edges static and mark their `dataRole`. Animation supplements arrowheads and labels; it never carries meaning alone.
10. Run `scripts/preflight-drawio-xml.mjs`, `scripts/validate_drawio.py <file> --animation on|off|preserve`, and `scripts/validate-drawio-diagram-rules.mjs` (dependency-free helpers allowed by ADR-0022). Add `--require-self-contained-images --require-uncompressed` when selected SVG assets are embedded. Use `on` for newly generated diagrams unless the user opted out, `off` for opt-out, and `preserve` for existing files whose animation policy should not change. Fix every ERROR and justify or fix every WARN.
11. Self-review in three passes: semantic architecture/content, layout/routing, then light/dark/accessibility. If draw.io Desktop CLI is available, run `scripts/render-drawio.mjs`, inspect every relevant page's light PNG and dark SVG, and fix targeted issues for at most three render cycles.
12. Deliver `.drawio`, optional exports, chosen path, design profile/theme mode, animation mode, validation and visual/dark status, remaining warnings, and a compact list of intentional omissions. Use canonical native names for canonical artifacts; add an explicit route suffix (for example `.raw-cli`, `.browser-url`, or `.fixed-theme-browser`) to fallback artifacts rather than presenting them as native outputs. Offer further user-led visual iteration when useful.

## Safety rules

Do not infer mutating authority from a bare or ambiguous invocation. `review` is strictly read-only; if findings suggest edits, report them and wait for an authorized mutating workflow.

Never install tools, write MCP config, download bulk icon packs/indexes, create persistent caches, or use hosted draw.io MCP without explicit approval. Treat approval for tool installation, WSL/Windows or other cross-boundary execution, browser use, hosted/MCP transfer, cache creation, and paid/provider actions as separate decisions; one approval never implies another. An explicit request for canonical native PNG/SVG/PDF outputs authorizes those named native writes after capability preflight; browser rasterization and other file-writing fallback helpers still require separate approval. A selected public SVG may be retrieved as a read-only lookup when host policy allows; fetch only the chosen asset, validate it, and embed it so the final `.drawio` has no runtime dependency. Hosted `mcp.draw.io` receives diagram content; prefer local paths for sensitive work. Do not include secrets, customer data, private repo paths, or internal hostnames in examples or generated diagrams.

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
- `scripts/render-drawio.mjs`: stages and validates a light PNG plus dark SVG, then installs both with commit-time no-clobber checks; interrupted commits retain partial outputs and recovery backups, and successful replacements report a retained recovery directory for manual cleanup. A clear request for canonical native PNG/SVG outputs authorizes these named writes after preflight.
- `scripts/probe-drawio-toolset.mjs [--json]`: read-only capability/provenance probe for Python, Node, draw.io candidates, format support, browser/agent-browser, MCP/hosted-preview signals, package managers, and the environment-specific native-install proposal. It never installs packages or writes configuration; its bounded PNG/SVG smoke exports are temporary, validated, and removed before the probe returns, so it leaves no render artifacts.
- `scripts/rasterize-themed-svg.mjs`: writes one no-clobber PNG from a bounded, self-contained fixed-light or fixed-dark SVG through a user-selected absolute path to a pinned local Chrome, Chromium, or Edge executable; recursively checks bounded embedded SVG image data for active or remote content, validates the output, and preserves source dimensions. It requires explicit user approval before use.
- `scripts/open-drawio-url.mjs`: read-only browser URL builder/opener for `.drawio` files.
- `scripts/search-shapes.mjs`: searches a configured or standard-cache local shape index with strict and fuzzy fallback ranking.

## Output format

Return the selected workflow and rationale, inputs, outputs, write scope, protected files, authoring path, toolset, design profile, theme/animation/icon modes, icon sources and any per-node substitutions, lint summary, semantic/layout/light-dark review summary, and justified warnings. Every create/edit-repair/export receipt also includes these exact fields:

- `Capability status`
- `Renderer route`
- `Tool-install approval`
- `Cross-boundary approval`
- `Export status`
- `Visual verification`
- `Evidence scope`
- `Fallback (used/offered)`

State route limitations (including the lack of transactional guarantees for raw CLI/manual/Windows bridges and the non-canonical nature of browser previews) in the receipt. Explicitly name `validate_drawio.py` and `validate-drawio-diagram-rules.mjs`. For `review`, report inspected evidence, findings, limitations, and the recommended follow-up workflow without claiming or performing changes. For architecture, also report view/scope, intentional omissions, connector rails, label backgrounds, spacing, and icon coverage. When any third-party logo or icon appears, include the single responsibility notice from `references/delivery.md`; do not perform per-icon legal analysis unless requested.

## Completion criteria

A task is complete when the four workflows were exposed, the task-derived selection and rationale were stated or ambiguity was resolved, authority remained within the requested outcome/scope, the capability preflight and receipt fields were completed, and the selected workflow's outcome was delivered. A `review` completes after the read-only evidence and findings report returns without authoring, rendering, exporting, or fixes. Other workflows require a valid editable `.drawio` when applicable, deterministic lint and diagram rules without errors, fixed or justified warnings, the requested design profile and animation policy, relevant icon/logo coverage, requested exports when possible, and honest self-review reporting. Architecture completion also requires one clear question/view/abstraction level, explicit current/target status, intentional omissions, readable routing and hierarchy, and relevant icon/logo coverage for every primary component unless the user opted out.

## Failure modes

If the CLI is missing, skip visual export and say so. If MCP is unavailable, use direct XML. If a selected expressive profile conflicts with formal notation, density, print use, or accessibility, preserve semantics and fall back to the nearest readable profile treatment while explaining the adjustment. If a brand logo cannot be fetched or resolved, use a native semantic icon for that node and disclose the substitution; keep the rest of the logo set intact. If a browser URL is too long, deliver the `.drawio` file. If an existing page is compressed, inflate before editing. If XML generation becomes too large, split into pages.
