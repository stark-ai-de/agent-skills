# drawio-diagrams Eval Corpus

This folder contains the SkillOpt-ready eval corpus for `drawio-diagrams`.

Use [benchmark.md](benchmark.md) for the candidate-neutral, same-model, blind,
paired protocol used to evaluate architecture quality. External candidate
identities, repositories, revisions, mappings, and identifying raw artifacts
remain maintainer-local under ADR-0030.

## Promotion Rationale

- Clear routing: activates for editable draw.io / diagrams.net `.drawio` diagrams, technical flows, architecture diagrams, sequence/ER/class/state/network diagrams, repair, validation, and export.
- Intent-bound routing: exposes four material workflows, proceeds on clear task authority, and asks only when workflow or scope is ambiguous.
- High utility: gives agents a deterministic XML path when draw.io Desktop, MCP tools, or network access are unavailable.
- Safe defaults: embeds selected public SVGs instead of runtime links, and requires approval for installs, MCP config writes, hosted previews, bulk downloads, external indexes, and persistent caches.
- Maintenance fit: public runtime payload is original guidance, deterministic helper scripts, and small regression fixtures; copied third-party reference packs and icon/index assets are not shipped in the public skill.

Brand fidelity is an explicit maintainer contract: named organizations,
products, platforms, models, and services prefer their official logo or native
service stencil; resolved artwork keeps its original bytes, viewBox, aspect
ratio, and brand colors; and an unresolved node receives only a labelled,
per-node semantic fallback. Recoloring is covered separately and must be
explicitly requested or documented as a necessary accessibility exception.

## Eval Set

Cases live under `cases/` and follow the SkillOpt markdown schema:

- `cases/clear-intent-routing.md`
- `cases/ambiguous-workflow-selection.md`
- `cases/agent-initiated-authority.md`
- `cases/review-read-only-early-return.md`

Toolset and safety coverage is deliberately explicit. The corpus includes
deterministic prompts for Linux-native versus Windows-wrapper draw.io
selection, direct `/mnt/c` and `DRAWIO_BIN` candidate fallback, native
`--version` plus PNG/SVG smoke checks, WSL raw-export limits, Python/Node and
browser present/missing/indeterminate states, fixed-theme browser rasterization
limits, install/setup approval and declined fallback, sanitized capability
receipts, and review/ambiguous branches that do not create preflight side
effects. These cases are response-level evals; the focused validator also
exercises fake local binaries and browsers so they do not require real draw.io
Desktop, Chrome, network access, or package installation.

Activation coverage intentionally mixes explicit skill requests with natural-language draw.io work. The corpus validator requires at least 20 positive prompts that do not name `$drawio-diagrams`, so routing quality cannot regress into invocation-only coverage.

- `## Prompt`
- `## Should Trigger`
- optional `## Split Family` for related text/visual variants that must stay in one split
- optional `## Fixtures`
- `## Expected Behavior`
- `## Deterministic Assertions`
- optional `## Visual Assertions`

`## Visual Assertions` is for SkillOpt or local post-run checks that inspect generated `.drawio`, PNG, and SVG artifacts. Cases with this section require a render-capable eval worker with local draw.io Desktop export available; no-CLI fallback behavior is covered by non-visual cases. Cases that mandate `render-drawio.mjs` use its fixed naming contract: `input.drawio` produces `input.drawio.png` plus `input.dark.svg`; `--page-index` selects the page without changing either output name.

Supported deterministic visual checks are:

- `artifact_exists: <glob>`
- `markdown_image: <glob> <relative-target>`
- `markdown_link: <glob> <relative-target>`
- `drawio_valid: <glob> [animation_on=1] [animation_off=1] [adaptive_colors=1] [min_pages=N] [min_native_stencils=N] [self_contained_svg=1] [uncompressed=1]`
- `drawio_embeds_svg_sha256: <glob> <sha256> [cell=stable-id]`
- `drawio_graph: <glob> [page=URL-encoded-name] [ids=id,...] [component_ids=id,...] [component_labels=URL-encoded-id:URL-encoded-label,...] [group_ids=id,...] [group_labels=URL-encoded-id:URL-encoded-label,...] [group_memberships=component-id@group-id,...] [exact_components=1] [exact_groups=1] [native_ids=id,...] [exact_native_ids=1] [edges=source>target,...] [edge_bindings=edge-id@source>target,...] [exact_edges=1] [not_edges=source>target,...] [edge_roles=edge-id:role,...] [profile_styles=URL-encoded-cell-id:styleKey:styleValue,...] [links=https://...]`
- `drawio_native_stencils_equal: <glob>`

`profile_styles` checks exact style properties on visible vertex cells marked with a nonempty `designProfile`; the cell and its ancestors must be visible and its finite width and height must be positive. Without `page=`, all requested profile mappings must occur together on at least one page rather than being combined across pages. URL-encode punctuation inside each cell ID, key, or value; for example, `profile-neon-hub:strokeColor:light-dark%28%234D7C0F%2C%23D7FF00%29`. IDs follow the normal `drawio_graph` rules; at most 128 mappings are allowed, and each decoded value is limited to 2048 control-free characters. Allowed keys are `designProfile`, `shape`, `dataRole`, `strokeColor`, `fillColor`, `gradientColor`, `gradientDirection`, `shadow`, `glass`, `arcSize`, `strokeWidth`, `fontColor`, `fontSize`, and `profileRole`.

- `component_ids` selects vertices tagged `dataRole=component`. `component_labels` binds those stable IDs to whitespace-normalized visible names. `edge_bindings` binds each stable edge ID to its directed endpoints; use it with `edge_roles` when identity must remain invariant across variants. URL-encode punctuation in each component ID or label. Add `exact_components=1` to reject unlisted semantic components and `exact_edges=1` to reject unlisted directed edge pairs, including duplicate pairs. Each exact option requires its corresponding expected list.
- `group_ids` selects visible container, swimlane, or `dataRole=group|boundary|zone|container` vertices. `group_labels` binds those stable IDs to whitespace-normalized visible names, and `group_memberships` binds component IDs to their containing group IDs. Add `exact_groups=1` to reject unlisted semantic groups and, when memberships are listed, any extra or duplicate component-to-group memberships; each exact option requires its corresponding expected list. URL-encode punctuation inside IDs or labels.
- `native_ids` selects built-in `mxgraph.*` stencil cells. Add `exact_native_ids=1` to reject extra or duplicate native stencil IDs. `drawio_native_stencils_equal` requires at least two matching valid sources and compares each native stencil's stable ID, parent ID, `shape`, and auxiliary `mxgraph.*` stencil selectors across the set.
- `png_dimensions: <glob> min_width=<px> min_height=<px>`
- `png_nonblank: <glob> [min_size=<bytes>]`
- `png_pixels_differ: <left-glob> <right-glob> [min_changed_basis_points=<1-10000>]`
- `svg_png_dimensions_match: <svg-glob> <png-glob>`
- `svg_valid: <glob>`
- `svg_theme: <glob> light|dark|adaptive`
- `svg_has_flow_animation: <glob>`
- `svg_contains: <glob> <text>`
- `svg_not_contains: <glob> <text>`
- `svg_self_contained_images: <glob>`
- `drawio_self_contained_svg: <glob>`

`adaptive_colors=1` is artifact-wide and requires `adaptiveColors="auto"` on every page; it is not affected by `drawio_graph page=...` scoping.

`svg_theme` checks the root SVG `color-scheme` declaration. `light` and `dark` require one fixed scheme; `adaptive` requires both tokens. Use it with `svg_valid` when a comparison gallery must remain independent of the viewer theme.

`markdown_image` and `markdown_link` check real inline Markdown references outside fenced, indented, inline, and raw-HTML code; relative references must resolve to an artifact in the evaluated package. `png_pixels_differ` requires one same-size PNG per glob and compares canonical canvas-order RGBA pixels rather than PNG encoding, interlace layout, hidden RGB, compression, or metadata. Add `min_changed_basis_points` when exact inequality is too weak, such as profile comparisons where a tiny marker-only change must fail (`25` means 0.25%). `svg_png_dimensions_match` requires one SVG and one PNG, requires explicit positive SVG pixel dimensions, and compares the SVG canvas after fractional dimensions are rounded up like the fixed-theme rasterizer. Wildcard assertions for PNG dimensions, nonblank pixels, SVG animation, and self-contained SVG images require every matched artifact to pass.

These checks prove artifact existence, source structure, basic render validity, animation policy, gallery references, theme-pair differences, and selected icon invariants. The icon/logo cases enforce the brand-fidelity contract through explicit coverage of official-logo preference, original source bytes and colors, recolor disclosure, and per-node fallback that leaves resolved peers unchanged. Composition quality such as connector crossings, logo recognizability, and nuanced contrast still requires manual inspection or a vision-enabled evaluator; a response-only semantic judge cannot prove those properties.

The auto-discovered corpus deliberately spans:

- clear-intent selection, ambiguous invocation, agent-initiated authority boundaries, and read-only review early return
- architecture context, deployment, dynamic, operations, current/target, C4, and evidence-conflict decisions
- flowchart, sequence, ER, UML class/state, BPMN, SysML, ML/DL, swimlane, timeline, network, comparison, and Kubernetes notation
- icon-first defaults, explicit full opt-out, repository contracts, mixed providers, offline and vendor-neutral fallback, official-logo preference, original-color/logo-byte fidelity, arbitrary-recolor prohibition, explicit-recolor disclosure, unresolved-brand peer invariance, and rights messaging
- animation defaults, opt-out, semantic edge roles, static-export completeness, and existing-file preservation
- page, layer, ID, manual-layout, compressed-XML, linked-asset, backup, and surgical-edit safety
- light/dark accessibility, non-color state semantics, type floors, density, fan-out routing, the technical default plus four bounded design profiles, task-local reference-style adaptation, and visual review
- CLI, direct XML, native/Windows candidate fallback, WSL raw export, capability preflight, MCP, hosted-preview, oversized browser-fragment fallback, fixed-theme browser limits, and approval-gated setup paths
- Mermaid-to-draw.io conversion, mind maps, multi-page PDF, and near-boundary Mermaid, PlantUML, Graphviz, presentation, standalone SVG, image, chart, and text-only architecture requests

Case files are auto-discovered from `cases/*.md`; split preparation reports the current counts, so no second filename manifest is maintained.

Use `rubric.md` to grade outputs. `runs/` stores promotion review summaries and future run evidence.

Cases other than the routing cases provide enough task intent to select a workflow directly or state the remaining material ambiguity. Passing outputs must create or edit editable `.drawio` XML when requested, run strict preflight and deterministic validation when the required runtimes are available, preserve existing diagram structure during edits, report capability, visual, and export limitations honestly, keep dense architecture diagrams readable in light and dark mode, embed selected external SVGs without runtime links, sanitize receipts so temporary/private paths do not escape, include every mandatory create/edit-repair/export receipt field, and approval-gate hosted services, installs, bulk downloads, persistent caches, cross-boundary execution, browser rasterization, and file-writing fallback helpers. Review and unresolved routing intentionally stop before optional tool preflight and mark those criteria not applicable. Explicit canonical PNG/SVG/PDF requests authorize those named native writes. Missing or indeterminate tools must select the safest documented fallback rather than fabricate an artifact or capability.
