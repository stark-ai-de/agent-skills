---
name: drawio-diagrams
description: Create, draw, generate, edit, verify, and export draw.io/diagrams.net `.drawio` diagrams. Use when the user asks for editable diagrams, flowcharts, architecture, sequence, ER/UML/state, BPMN, SysML, ML/DL, swimlane, timeline, network, icon-rich technical diagrams, or PNG/SVG/PDF exports; do not use for charts/plots or artistic image generation.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.7.3"
---

# drawio-diagrams

## Goal

Produce, edit, verify, and deliver high-quality draw.io / diagrams.net diagrams as editable `.drawio` files. Prefer self-contained diagrams that work in both light and dark mode.

## First response contract

For the first substantive response, expose the available presentation choices before authoring: `design_profile` (`technical`, `operator-grid`, `isometric-air`, `neon-hub`, `aurora-story`, or `adapted-<short-name>`), `theme_mode` (`adaptive`, `light`, or `dark`), `animation` (`on`, `off`, or `preserve`), and icon mode (`official-first` with semantic fallback for unresolved or generic nodes). State the selected profile and styling options, or ask only when the requested outcome is materially ambiguous; do not hide these choices until delivery.

## Official icon and logo policy

Use official organization/product/service artwork first when available and supported by the notation; use a semantic glyph only for generic, vendor-neutral, or unresolved nodes. Preserve source artwork, brand colors, proportions, viewBox, and variant. Do not arbitrarily tint, recolor, monochromatize, invert, filter, crop, stretch, or restyle official marks; solve contrast with surrounding neutral surfaces. Record per-node substitutions and disclose any explicitly requested or necessary accessibility recolor.

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

Inspect the prompt, requested outputs, audience, question, scope, abstraction, and privacy constraints needed to select workflow and authority. After selection, run the non-mutating capability preflight before inspecting architecture sources, existing `.drawio` files, current/target state, icons, profile/theme, text hierarchy, routing risks, or tool-specific inputs. New directed flows default to animation `on`. During the preflight, use the read-only `scripts/probe-drawio-toolset.mjs [--json]` helper to detect Node >= 18, Python, draw.io candidates, browser/MCP signals, and caches; capability evidence is not permission. Prefer a Linux-native draw.io candidate with `/proc/self/fd` guarantees; version-probe candidates with `probe-drawio-toolset.mjs`, and send stale/non-executable `DRAWIO_BIN` candidates to the raw/manual export fallback. Browser rasterization uses `rasterize-themed-svg.mjs` only with a pinned absolute executable. Installation/setup is approval-gated, and capability receipts must use sanitized paths.

## Workflow

Follow the detailed capability ladder and receipt procedure in [workflow-details.md](references/workflow-details.md).

1. State the selected workflow, authority, inputs, outputs, profile, theme/animation/icon modes, renderer route, write scope, protected files, and approval boundaries. Run a non-mutating capability preflight for mutating/export workflows; `review` skips it.
2. If `review` is selected, use a strict read-only branch: inspect supplied sources and existing renders, build only the needed semantic model, and run only read-only validators. Do not create backups, author or patch XML, render, rasterize, export, open hosted services, or fix findings. Report findings and evidence limits, then return; do not execute the remaining workflow steps.
3. Build a compact semantic model, choose a route from `transactional-native | approved-raw-cli-manual | fixed-theme-browser-raster | browser-url-preview | html-viewer-preview | direct-xml`, plan connector gutters, and preserve the editable source.
4. Author or patch `.drawio` XML only within the selected authority. Apply the selected profile, official-first icon policy, concrete edge routing, and animation policy. Adapt any user-supplied visual reference only into reusable tokens/effects; never copy its composition or assets or persist a learned profile without an explicit request.
5. Run `scripts/preflight-drawio-xml.mjs`, `scripts/validate_drawio.py <file> --animation on|off|preserve`, and `scripts/validate-drawio-diagram-rules.mjs`; fix every ERROR and fix or justify every WARN.
6. Self-review semantics, routing, and light/dark accessibility; render only through an approved route and deliver the source, requested exports, receipt, evidence limits, and intentional omissions.

## Safety rules

Do not infer mutating authority from a bare or ambiguous invocation. `review` is strictly read-only; report findings and wait for an authorized mutating workflow. Keep tool installation, WSL/Windows or other cross-boundary execution, browser use, hosted/MCP transfer, cache creation, paid/provider actions, destructive overwrite, and file-writing fallback helpers separately approval-gated. Explicit native PNG/SVG/PDF output requests authorize only those named native writes after preflight. Fetch only selected public SVG assets, validate and embed them, prefer local paths for sensitive work, and never include secrets, customer data, private repo paths, or internal hostnames.

## References

- `references/workflow-details.md`: use for the detailed workflow, capability ladder, icon fidelity, safety, and receipt contracts.
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
