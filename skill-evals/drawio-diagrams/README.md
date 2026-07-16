# drawio-diagrams Eval Corpus

This folder contains the SkillOpt-ready eval corpus for `drawio-diagrams`.

See [comparison.md](comparison.md) for the audited capability tables that compare the
skill with an unassisted agent and current draw.io skill/tool alternatives.
Use [benchmark.md](benchmark.md) for the same-model, blind, paired protocol required
before publishing any competitor-outperformance claim.

## Promotion Rationale

- Clear routing: activates for editable draw.io / diagrams.net `.drawio` diagrams, technical flows, architecture diagrams, sequence/ER/class/state/network diagrams, repair, validation, and export.
- High utility: gives agents a deterministic XML path when draw.io Desktop, MCP tools, or network access are unavailable.
- Safe defaults: embeds selected public SVGs instead of runtime links, and requires approval for installs, MCP config writes, hosted previews, bulk downloads, external indexes, and persistent caches.
- Maintenance fit: public runtime payload is original guidance, deterministic helper scripts, and small regression fixtures; copied third-party reference packs and icon/index assets are not shipped in the public skill.

## Eval Set

Cases live under `cases/` and follow the SkillOpt markdown schema:

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
- `drawio_valid: <glob> [animation_on=1] [animation_off=1] [adaptive_colors=1] [min_pages=N] [min_native_stencils=N] [self_contained_svg=1] [uncompressed=1]`
- `drawio_embeds_svg_sha256: <glob> <sha256> [cell=stable-id]`
- `drawio_graph: <glob> [page=URL-encoded-name] [ids=id,...] [native_ids=id,...] [edges=source>target,...] [not_edges=source>target,...] [edge_roles=edge-id:role,...] [profile_styles=URL-encoded-cell-id:styleKey:styleValue,...] [links=https://...]`

`profile_styles` checks exact style properties on visible vertex cells marked with a nonempty `designProfile`; the cell and its ancestors must be visible and its finite width and height must be positive. Without `page=`, all requested profile mappings must occur together on at least one page rather than being combined across pages. URL-encode punctuation inside each cell ID, key, or value; for example, `profile-neon-hub:strokeColor:light-dark%28%234D7C0F%2C%23D7FF00%29`. IDs follow the normal `drawio_graph` rules; at most 128 mappings are allowed, and each decoded value is limited to 2048 control-free characters. Allowed keys are `designProfile`, `shape`, `dataRole`, `strokeColor`, `fillColor`, `gradientColor`, `gradientDirection`, `shadow`, `glass`, `arcSize`, `strokeWidth`, `fontColor`, `fontSize`, and `profileRole`.

- `png_dimensions: <glob> min_width=<px> min_height=<px>`
- `png_nonblank: <glob> [min_size=<bytes>]`
- `svg_valid: <glob>`
- `svg_has_flow_animation: <glob>`
- `svg_contains: <glob> <text>`
- `svg_not_contains: <glob> <text>`
- `svg_self_contained_images: <glob>`
- `drawio_self_contained_svg: <glob>`

`adaptive_colors=1` is artifact-wide and requires `adaptiveColors="auto"` on every page; it is not affected by `drawio_graph page=...` scoping.

These checks prove artifact existence, source structure, basic render validity, animation policy, and selected icon invariants. Composition quality such as connector crossings, logo recognizability, and nuanced contrast still requires manual inspection or a future vision-enabled evaluator; a response-only semantic judge cannot prove pixel-level quality.

The auto-discovered corpus deliberately spans:

- architecture context, deployment, dynamic, operations, current/target, C4, and evidence-conflict decisions
- flowchart, sequence, ER, UML class/state, BPMN, SysML, ML/DL, swimlane, timeline, network, comparison, and Kubernetes notation
- icon-first defaults, explicit full opt-out, repository contracts, mixed providers, offline and vendor-neutral fallback, logo fidelity, and rights messaging
- animation defaults, opt-out, semantic edge roles, static-export completeness, and existing-file preservation
- page, layer, ID, manual-layout, compressed-XML, linked-asset, backup, and surgical-edit safety
- light/dark accessibility, non-color state semantics, type floors, density, fan-out routing, the technical default plus four bounded design profiles, task-local reference-style adaptation, and visual review
- CLI, direct XML, MCP, hosted-preview, oversized browser-fragment fallback, and approval-gated setup paths
- Mermaid-to-draw.io conversion, mind maps, multi-page PDF, and near-boundary Mermaid, PlantUML, Graphviz, presentation, standalone SVG, image, chart, and text-only architecture requests

Case files are auto-discovered from `cases/*.md`; split preparation reports the current counts, so no second filename manifest is maintained.

Use `rubric.md` to grade outputs. `runs/` stores promotion review summaries and future run evidence.

Passing outputs must create or edit editable `.drawio` XML, run deterministic validation when `python3` is available, preserve existing diagram structure during edits, report visual/export limitations honestly, keep dense architecture diagrams readable in light and dark mode, embed selected external SVGs without runtime links, and approval-gate hosted services, installs, bulk downloads, and persistent caches.
