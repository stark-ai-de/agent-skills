# drawio-diagrams workflow details

Read this reference from `SKILL.md` when authoring, repairing, reviewing, or exporting a diagram. The main skill file is the concise contract; this file contains detailed capability, routing, icon, safety, and receipt guidance.

## First response contract

For the first substantive response, expose the available presentation choices before authoring:

- `design_profile`: `technical`, `operator-grid`, `isometric-air`, `neon-hub`, `aurora-story`, or `adapted-<short-name>`
- `theme_mode`: `adaptive`, `light`, or `dark`
- `animation`: `on`, `off`, or `preserve`
- icon mode: `official-first` with semantic fallback for unresolved or generic nodes

State the selected profile and styling options, or ask only when the requested outcome is materially ambiguous; do not hide these choices until delivery.

## Official icon and logo policy

Official organization, product, and service icons/logos are the primary visual choice whenever the named asset is available and the notation supports it. Resolve the narrowest official or provider-backed asset before choosing a generic semantic glyph; use a semantic icon only for an intentionally generic/vendor-neutral concept or when the official asset cannot be resolved. A missing asset is a per-node fallback, not a reason to remove or recolor other resolved logos.

Preserve the selected source artwork, brand colors, proportions, viewBox, and source variant by default. Do not arbitrarily tint, recolor, replace with a monochrome version, invert, filter, crop, stretch, or otherwise restyle an official mark to match a diagram profile. Use the chip, card, border, or surrounding background to solve contrast instead. A user-requested recolor is allowed only when explicitly requested; a readability/accessibility exception must be necessary, documented in the receipt, and disclose which asset treatment changed. Record every per-node semantic substitution and keep the original colors of all unaffected official marks.

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

Before workflow and authority selection, inspect the user's prompt, requested outputs, audience, question, scope, abstraction level, and privacy constraints. After selection, run the non-mutating capability preflight before inspecting architecture sources, existing `.drawio` files, current/target state, icons, design profile/theme, text hierarchy, routing risks, or tool-specific inputs. Icon-first presentation and animation for newly generated directed runtime/process/data flows default to `on`; the user may disable either. During the preflight, detect draw.io Desktop CLI, `python3`, Node >= 18, available draw.io MCP tools, and explicitly configured local caches. For a repeatable capability receipt, use the read-only `../scripts/probe-drawio-toolset.mjs [--json]` helper. Capability detection is evidence, not permission: installation, cross-boundary execution, browser, hosted/MCP, cache, and paid/provider approvals remain independent. Repository icon contracts are ignored unless requested.

## Workflow

1. Apply intent-bound workflow selection and state existing authority. For `create`, `edit-repair`, and `export`, run a non-mutating capability preflight before source reads, authoring, rendering, or export: classify required capabilities, candidate renderer route, approval state, and evidence limits. Record the fallback ladder. `review` skips mutating preflight and enters the strict read-only branch. Stop only when workflow, source/destination, or material authority is ambiguous. For remaining semantic ambiguity, use a short discovery checkpoint and ask at most three questions that materially change audience, scope, view, state, privacy, or content. Tool installs, hosted services, bulk downloads, persistent caches, hosted content transfer, browser execution, cross-boundary execution, and file-writing fallback helpers remain separately approval-gated.
2. If `review` is selected, use a strict read-only branch: inspect supplied sources, existing diagram/XML, and already available renders; build only the semantic model needed for the assessment; and run only read-only validators against the existing source. Do not create backups, author or patch XML, render, rasterize, export, open hosted services, or fix findings. Report findings, evidence limits, and the recommended follow-up workflow, then return; do not execute the remaining workflow steps.
3. Use the selected mutating or export workflow and build a compact semantic model: stakeholder question, audience, view/abstraction, current/target state, nodes, directed relationships, groups/zones, 3-6 relevant scenarios when useful, icon mode, profile, theme, animation, outputs, and density/fan-out hotspots. For architecture, apply the content gate in `diagram-type-playbook.md`; do not mix abstraction levels or inventory everything.
4. Choose one path from the capability-aware ladder, keeping direct XML available as the universal editable route:
   - `transactional-native`: `../scripts/render-drawio.mjs` with a Linux-native draw.io CLI and required `/proc/self/fd` guarantees; preferred for maintained light-PNG/dark-SVG verification exports.
   - `approved-raw-cli-manual`: explicitly approved native Desktop CLI, manual export, or WSL/Windows bridge after a format smoke test. It does not provide transactional renderer guarantees and must say so in the receipt.
   - `fixed-theme-browser-raster`: explicitly approved local browser rasterization of validated fixed-theme SVGs for viewer-independent light/dark PNGs, never a replacement for the editable source.
   - `browser-url-preview` or `html-viewer-preview`: only when explicitly requested; neither is a canonical editable artifact and either may expose diagram data through browser history, sync, screenshots, or logs.
   - `direct-xml`: universal authoring and no-optional-tool route for editable `.drawio` output.
   - Do not substitute image generation for a diagram request. Use image generation only when the user explicitly changes the requested outcome to a non-editable image.
   - Draw.io Desktop CLI is an export/render tool, not an assumed Mermaid importer or `--layout` engine. MCP live/preview or conversion tools are allowed only when already available, their capability is verified, and the user wants that route.
5. Plan layout gutters before authoring XML. Reserve empty corridors for connector rails, keep rails and edge labels off section borders, separate multi-destination fan-out into clear lanes or a small junction, and decide whether detail/package rows belong on the same page, a second page, or a detail layer.
6. Author or patch `.drawio` XML. Preserve unknown cells, IDs, pages, layers, and manual coordinates when editing; create a backup before overwriting an existing diagram.
7. Apply an explicit user-selected profile from `design-profiles.md`; otherwise use the technical-geominimalist default. Infer an expressive profile only when the requested audience/artifact clearly calls for it. When a user supplies a visual reference, extract only reusable visual tokens/effects for this task, map them to the closest profile, and reapply readability/accessibility guardrails. Do not copy the reference's composition or assets or persist a learned profile without an explicit request. Keep one profile per page, the shared 8 px grid, portable type, accessible `light-dark(...)` pairs, `adaptiveColors="auto"`, semantic redundancy, and filled edge-label backgrounds from `theming-dark-mode.md`.
8. Use `icon-first` mode by default whenever the notation supports it. Prefer the official organization/product/service logo or native service stencil for every recognized named product before a generic semantic icon. Give every primary component a relevant visual symbol, disclose per-node substitutions, and preserve source artwork, brand colors, source variant, aspect ratio, and viewBox. Never arbitrarily recolor, tint, monochromatize, invert, filter, crop, stretch, or otherwise restyle an official mark; change the neutral chip/background for contrast. Only an explicit user request permits recoloring, and any exception must be disclosed.
9. Route edges with concrete `source` and `target` ids. Treat text, annotations, and callouts as obstacles; use side ports, explicit waypoints, dedicated lanes, and branch points. Add `flowAnimation=1` to directed runtime, request, event, process, and data-flow edges when animation is on. Keep association, containment, ownership, dependency-only, annotation, and decorative edges static and mark their `dataRole`. Animation supplements arrowheads and labels; it never carries meaning alone.
10. Run `../scripts/preflight-drawio-xml.mjs`, `../scripts/validate_drawio.py <file> --animation on|off|preserve`, and `../scripts/validate-drawio-diagram-rules.mjs`. Add `--require-self-contained-images --require-uncompressed` when selected SVG assets are embedded. Use `on` for new diagrams unless opted out, `off` for opt-out, and `preserve` for existing files whose animation policy should not change. Fix every ERROR and justify or fix every WARN.
11. Self-review semantic architecture/content, layout/routing, then light/dark/accessibility. If draw.io Desktop CLI is available, run `../scripts/render-drawio.mjs`, inspect every relevant page's light PNG and dark SVG, and fix targeted issues for at most three render cycles.
12. Deliver `.drawio`, optional exports, chosen route, design profile/theme/animation modes, validation and visual/dark status, remaining warnings, and intentional omissions. Use canonical native names for canonical artifacts; add a route suffix such as `.raw-cli`, `.browser-url`, or `.fixed-theme-browser` to fallback artifacts rather than presenting them as native outputs.

## Safety rules

Do not infer mutating authority from a bare or ambiguous invocation. `review` is strictly read-only; if findings suggest edits, report them and wait for an authorized mutating workflow. Never install tools, write MCP config, download bulk icon packs/indexes, create persistent caches, or use hosted draw.io MCP without explicit approval. Treat installation, WSL/Windows or other cross-boundary execution, browser use, hosted/MCP transfer, cache creation, and paid/provider actions as separate decisions. An explicit request for canonical native PNG/SVG/PDF outputs authorizes those named native writes after preflight; browser rasterization and other file-writing fallback helpers still require separate approval. Fetch only selected public SVG assets, validate them, and embed them so the final `.drawio` has no runtime dependency. Hosted `mcp.draw.io` receives diagram content; prefer local paths for sensitive work. Do not include secrets, customer data, private repo paths, or internal hostnames.

## Output format

Return the selected workflow and rationale, inputs, outputs, write scope, protected files, authoring path, toolset, design profile, theme/animation/icon modes, icon sources and per-node substitutions, lint summary, semantic/layout/light-dark review summary, and justified warnings. Every create/edit-repair/export receipt includes:

- `Capability status`
- `Renderer route`
- `Tool-install approval`
- `Cross-boundary approval`
- `Export status`
- `Visual verification`
- `Evidence scope`
- `Fallback (used/offered)`

State route limitations, name `validate_drawio.py` and `validate-drawio-diagram-rules.mjs`, and for review report inspected evidence, findings, limitations, and recommended follow-up without claiming or performing changes. For architecture, also report view/scope, intentional omissions, connector rails, label backgrounds, spacing, and icon coverage. When a third-party logo or icon appears, include the single responsibility notice from `delivery.md`.

## Completion criteria

The four workflows were exposed, the task-derived selection and rationale were stated or ambiguity was resolved, authority remained within the requested outcome/scope, capability preflight and receipt fields were completed, and the selected workflow's outcome was delivered. A review completes after read-only evidence and findings without authoring, rendering, exporting, or fixes. Other workflows require a valid editable `.drawio` when applicable, deterministic lint and diagram rules without errors, fixed or justified warnings, requested profile and animation policy, relevant icon/logo coverage, and requested exports when possible.

## Failure modes

If the CLI is missing, skip visual export and say so. If MCP is unavailable, use direct XML. If a selected expressive profile conflicts with formal notation, density, print use, or accessibility, preserve semantics and fall back to the nearest readable treatment. If a brand logo cannot be fetched or resolved, use a native semantic icon for that node and disclose the substitution; keep the rest of the logo set intact. If a browser URL is too long, deliver the `.drawio` file. If an existing page is compressed, inflate before editing. If XML generation becomes too large, split into pages.
