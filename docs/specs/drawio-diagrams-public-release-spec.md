---
title: "drawio-diagrams public release spec"
slug: "drawio-diagrams-public-release-spec"
artifact_path: "docs/specs/drawio-diagrams-public-release-spec.md"
status: "final-public-release"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-07-07"
updated: "2026-08-10"
---

# drawio-diagrams Public Release Spec

## Scope

Release `drawio-diagrams` as a public Engineering Workflows skill for creating, editing, verifying, and exporting editable draw.io / diagrams.net `.drawio` diagrams.

## Final Decisions

- Public skill path: `skills/engineering-workflows/drawio-diagrams/`.
- Category: Engineering Workflows, per ADR-0021.
- Do not implement a separate `drawio_agent` Python package or MCP server.
- Keep `.drawio` XML as the source of truth; exports are optional deliverables.
- Keep eval proof under `skill-evals/drawio-diagrams/`, outside the runtime payload.
- Ship no copied third-party reference packs, bundled shape index, or bundled icon pack.
- Default to icon-first diagrams wherever the notation supports it: real logos/service stencils for named products and labelled semantic icons for generic concepts or unresolved brands.
- Route official organization/product/service assets first, including native vendor stencils and official provider assets; use Lobe Icons for AI/LLM brands, Simple Icons for broad technology brands, then theSVG/domain packs for gaps. Do not maintain a static slug catalog or bundle SVG assets.
- Keep the dependency-free Python validator as a public helper under ADR-0022.
- Keep repository-specific provenance and named third-party comparison or inspiration analysis outside tracked public artifacts under [ADR-0030](../adrs/0030-separate-public-contracts-from-private-provenance.short.md) ([Long, canonical](../adrs/0030-separate-public-contracts-from-private-provenance.long.md) · [Guide](../adrs/0030-separate-public-contracts-from-private-provenance.guide.md)).
- For every named organization, product, platform, model, or service, make the official logo, service stencil, or official provider asset primary whenever available. Generic semantic icons are fallback-only for named entities; they remain the normal primary notation for genuinely generic concepts.
- Preserve official artwork, aspect ratio, and supplied brand colors. Arbitrary recoloring, tinting, inversion, or dark-mode filtering is prohibited unless the user explicitly requests it or a necessary accessibility exception is documented; disclose the source variant, changed colors, reason, scope, and contrast evidence, and change the surrounding chip/card first.
- Run a non-mutating capability preflight immediately after workflow and authority selection for `create`, `edit-repair`, and `export`; keep `review` strictly read-only and do not let capability discovery imply mutation or installation authority.
- Prefer the capability ladder `transactional-native` → `approved-raw-cli-manual` → `fixed-theme-browser-raster` → `browser-url-preview` or `html-viewer-preview` only when explicitly requested → `direct-xml` as the universal editable route. Image generation is allowed only after the user explicitly changes the outcome to a non-editable image and never satisfies `.drawio`, PNG, or SVG completion.
- Keep approvals independent for tool installation, WSL/Windows or other cross-boundary execution, browser use, hosted/MCP transfer, cache creation, and paid/provider actions. A WSL Windows bridge is an approved raw/manual route and never claims transactional renderer guarantees.
- Preserve canonical native artifact names. Any maintained fallback artifact carries an explicit route suffix such as `.fallback-windows-raw`, `.fallback-browser-preview`, `.fallback-illustrative-image`, `.raw-cli`, `.windows-bridge`, or `.fixed-theme-browser`, and every fallback receipt states its limitation.

## Skill Contract

The skill must:

- Trigger on editable draw.io / diagrams.net diagram creation, editing, repair, validation, and export.
- Exclude charts, data plots, artistic images, photo edits, and non-editable illustrations unless the user explicitly asks for draw.io output.
- Detect `python3`, Node >= 18, draw.io Desktop CLI, available draw.io MCP tools, and configured or standard-cache local indexes/assets.
- Never install tools, write MCP config, use hosted draw.io MCP, download bulk packs/indexes, or create persistent caches without explicit approval. Selected public SVG retrieval is a read-only lookup when host policy allows.
- Embed selected SVGs, record provider/slug/variant and semantic substitutions, and emit one user-responsibility notice when any third-party logo or icon appears. Do not claim legal clearance or perform per-icon legal analysis unless requested.
- Preserve existing pages, IDs, cells, layers, metadata, and manual coordinates during edits.
- Create a backup or alternate output before overwriting an existing `.drawio` file.
- Validate every generated or edited diagram with `scripts/validate_drawio.py` when `python3` is available.
- Report visual and dark-mode verification honestly, including skipped checks.
- Require every mutating/export receipt to include `Capability status`, `Renderer route`, `Tool-install approval`, `Cross-boundary approval`, `Export status`, `Visual verification`, `Evidence scope`, and `Fallback (used/offered)`.
- On NixOS/WSL, use a Linux-native draw.io executable owned by the active NixOS user profile or a compatible native `nixpkgs#drawio` package only after package-ownership and compatibility checks plus explicit installation approval; do not recommend mutable draw.io configuration or AppImage installation.
- For named organizations, products, platforms, models, and services, resolve an official logo/service stencil or official provider asset before considering a generic semantic icon. Preserve the original artwork, aspect ratio, and brand colors; disclose any explicitly requested or accessibility-exception recoloring in the receipt.

## 2026-07-14 Optimization Contract

### Scope

- Improve the existing public skill without adding a separate diagram engine, HTML player, MCP server, or unbounded style/theme marketplace.
- Use independently authored guidance informed by public diagramming practices without copying third-party skill text, scripts, assets, or templates.

### Defaults

- Use a flat **technical geominimalist** visual system: 8 px grid, restrained bento-style zones, portable sans-serif type, neutral surfaces, one dominant color family, semantic accents, orthogonal connectors, and no gradients or shadows by default.
- Keep normal text at 12 px or larger when practical, component titles at 14 px or larger, and text contrast at 4.5:1 or better. Do not rely on color, icon, line style, or animation alone to communicate meaning.
- Add `flowAnimation=1` to newly generated directed runtime, process, and data-flow edges by default. Keep containment, association, annotation, dependency-only, and decorative lines static. If the user disables animation, omit it or set `flowAnimation=0` consistently on semantic edges.
- Treat animation as progressive enhancement. Arrowheads, labels, and line semantics must remain understandable in static `.drawio`, PNG, PDF, and reduced-motion contexts; animated SVG is an optional export behavior.
- Use icon-first presentation for architecture and technical-system diagrams. Every primary component gets a logo/service stencil or relevant labelled semantic icon. A missing logo falls back per node and never removes resolved peer logos or produces a bare text card.

### Design profiles

- Keep `technical` as the readable engineering default and add four bounded presentation options: `operator-grid`, `isometric-air`, `neon-hub`, and `aurora-story`.
- An explicit user choice wins. Otherwise infer an expressive profile only when audience and artifact clearly call for it; never mix profile vocabularies on one page.
- Profiles change presentation, not content rules. All profiles retain adaptive light/dark colors, icon-first coverage, static flow semantics, animation policy, contrast floors, and deterministic validation.
- A comparison set for one architecture freezes stable component, group, edge, and icon identities before styling. Fixed-theme SVGs and static PNG previews must make its light/dark gallery independent of the viewer theme.
- Implement the profiles as original token, layout, and effect recipes. Do not store or reproduce the reference images, their exact compositions, text, proprietary artwork, or brand groupings.

### Architecture content gate

- Define the stakeholder question, audience, diagram type, scope, current/target state, and one abstraction level before selecting content.
- Include only elements and relationships that answer that question. Use title, type/scope, directional relationships, concise responsibilities, relevant technologies/protocols, trust or deployment boundaries, and a compact legend when visual semantics are not self-evident.
- Move secondary packages, long inventories, activation procedures, and implementation detail to another page or layer when they compete with the primary story. Omit secrets, exhaustive source trees, speculative components presented as current, and decorative infrastructure that does not affect the view.
- For current-versus-target diagrams, label status explicitly and keep implemented, planned, optional, and blocked paths visually distinct without using color alone.

### Discovery and review

- For simple, well-specified requests, proceed with documented assumptions and do not force a wizard.
- For ambiguous or expensive architecture work, use a short discovery checkpoint before authoring. Prefer native plan/question facilities when available; otherwise ask only questions whose answers materially change scope, audience, view, animation, branding, privacy, or outputs. Tool detection is automatic; installs, hosted services, bulk downloads, persistent caches, and host-required network consent remain approval-gated.
- Self-review every generated or materially edited diagram in three bounded passes: semantic architecture review, layout/routing review, and light/dark/accessibility review. When rendering is available, fix and re-render for at most three targeted cycles. Offer additional user-led visual iteration without making it a completion blocker.

### Non-goals

- Do not copy upstream skill text, templates, scripts, icon packs, provider manifests, shape indexes, or interactive HTML runtimes. Improve the existing Node shape-search helper instead of adding a second Python implementation.
- Do not add copied reference images, a mandatory multi-step wizard, an unbounded theme marketplace, bespoke animation JavaScript, or a general architecture modelling framework.
- Do not animate every line indiscriminately or trade static clarity for motion.

### 2026-07-15 quality benchmark additions

- Allow bounded, task-local adaptation from a user-supplied style reference: extract reusable visual tokens, map them to the closest profile and adaptive draw.io styles, then reapply readability and accessibility guardrails. Do not copy composition/assets or persist a learned profile without an explicit request.
- Add compact operational recipes for ERD, UML class/state, C4, BPMN, SysML, and ML/DL notation. Formal notation takes priority over icon-card decoration.
- Publish a same-model, same-tool, blind paired architecture-quality benchmark protocol under `skill-evals/`; do not publish named comparative outperformance claims.
- Keep the official shape index optional and approval-gated. The current quality-focused release does not reverse the public payload decision against bundled third-party indexes.

### 2026-08-10 capability-aware delivery contract

- The preflight runs after workflow and authority selection and before source inspection, authoring, rendering, or export for `create`, `edit-repair`, and `export`. A `review` route performs only read-only inspection and validation.
- `transactional-native` uses the Linux-native draw.io CLI with `scripts/render-drawio.mjs`; `approved-raw-cli-manual` covers raw Desktop CLI/manual export and the explicitly approved WSL Windows bridge; `fixed-theme-browser-raster` is limited to validated fixed-theme SVG-to-PNG previews; `browser-url-preview` and `html-viewer-preview` are explicit preview transports only; `direct-xml` remains the universal editable route.
- Each route reports capability, approval, renderer, export, visual, evidence, and fallback status. Raw/manual and cross-boundary routes state that transactional staging/no-clobber guarantees were not proven. Browser URL/HTML previews are not canonical editable artifacts and carry their data-exposure warning.
- Native artifacts retain canonical names. Fallback outputs use explicit route suffixes and are never relabelled as native exports. Image-generation output is never silently substituted for editable draw.io output.
- NixOS/WSL setup checks active user-profile ownership and package compatibility before a separately approved `nix profile install nixpkgs#drawio`; mutable configuration and AppImage installation are outside the supported setup path.

### Icon and logo fidelity contract

- Official organization/product/service assets are the primary icon source whenever available, including official native vendor stencils. Generic semantic icons may stand in for a named entity only when its official asset is unavailable, unresolved, or explicitly declined; keep the original label and disclose the per-node fallback.
- Profiles and themes may adjust the surrounding chip, card, spacing, or neutral background for contrast, but must not arbitrarily recolor, tint, invert, crop, stretch, skew, or dark-mode-filter official artwork. An explicit user request or necessary documented accessibility exception is the only permitted recoloring path; record source variant, changed colors, reason, scope, and contrast evidence.
- Formal ER/UML/sequence/BPMN notation and genuinely generic concepts retain their native semantic shapes; this rule does not force brand logos into notation that would reduce formal clarity.

### Publication boundary

- Publish only the product contract, public behavior, validation requirements, and provider or license attribution required to use the skill safely.
- Keep maintainer repository evidence, private reference mappings, detailed source challenge notes, and named third-party comparison or inspiration analysis in ignored local provenance artifacts.

### Source challenge summary

- Official draw.io [connector animation](https://www.drawio.com/docs/manual/connectors/connector-animate/), [adaptive-color](https://www.drawio.com/docs/manual/editor/appearance/adaptive-colours/), [shape-style](https://www.drawio.com/docs/manual/styles/shape-styles/), and [style-reference](https://www.drawio.com/docs/reference/diagram-generation/style-reference/) documentation grounds the public animation and profile contracts.
- Official [C4 notation](https://c4model.com/diagrams/notation), [Azure architecture-diagram guidance](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/design-diagrams), and [IBM technical-diagram guidance](https://www.ibm.com/design/language/infographics/technical-diagrams/design/) ground the content, audience, and readability checks.
- Public [Lobe Icons](https://github.com/lobehub/lobe-icons) and [Simple Icons](https://github.com/simple-icons/simple-icons) provider repositories, including the Simple Icons [disclaimer](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md), ground provider routing and the user-responsibility notice.
- The official [`jgraph/drawio-mcp` shape index](https://github.com/jgraph/drawio-mcp/blob/main/shape-search/search-index.json) grounds the optional approval-gated local shape-search setup without becoming a bundled runtime asset.

### ADR gate

[ADR-0022](../adrs/0022-allow-task-specific-python-skill-helpers.short.md) ([Long, canonical](../adrs/0022-allow-task-specific-python-skill-helpers.long.md) · [Guide](../adrs/0022-allow-task-specific-python-skill-helpers.guide.md)) governs dependency-free Python validator changes. [ADR-0030](../adrs/0030-separate-public-contracts-from-private-provenance.short.md) ([Long, canonical](../adrs/0030-separate-public-contracts-from-private-provenance.long.md) · [Guide](../adrs/0030-separate-public-contracts-from-private-provenance.guide.md)) governs the public-contract and private-provenance split. [ADR-0031](../adrs/0031-use-approved-bounded-fixed-theme-rasterization.short.md) ([Long, canonical](../adrs/0031-use-approved-bounded-fixed-theme-rasterization.long.md) · [Guide](../adrs/0031-use-approved-bounded-fixed-theme-rasterization.guide.md)) governs explicit approval, bounded recursive inspection, and local browser isolation for fixed-theme rasterization. [ADR-0040](../adrs/0040-route-drawio-exports-through-capability-aware-fallbacks.short.md) ([Long, canonical](../adrs/0040-route-drawio-exports-through-capability-aware-fallbacks.long.md) · [Guide](../adrs/0040-route-drawio-exports-through-capability-aware-fallbacks.guide.md)) governs the capability preflight, fallback ladder, independent approvals, canonical naming, and delivery receipts; it does not rewrite accepted ADR-0027 or ADR-0031.

### User verification

The maintainer approved this public product contract and the ADR-0030 publication boundary on 2026-07-17. Named comparison and inspiration provenance remains in ignored local artifacts.

### Acceptance criteria

- `SKILL.md` stays concise and routes detailed architecture, style, animation, discovery, and review behavior into references.
- Eval cases cover animation-on, explicit animation-off, architecture content selection, conditional discovery, modern readable design, all four optional design profiles, icon-first coverage, external SVG embedding, and the single rights notice for any third-party logo or icon.
- Each profile eval requires the requested profile to be named and applied consistently, keeps `adaptiveColors` plus `light-dark(...)`, binds a representative `profile-<name>` cell to profile-specific styles, exercises the composition/effect guardrails in light PNG and dark SVG exports, and still runs deterministic validation.
- The profile-comparison eval applies all five profiles to one synthetic semantic manifest, preserves exact component and group/boundary names, component-to-boundary membership, directed edge IDs/endpoints/roles, stable built-in icon cell IDs, and embedded icon bytes, compares every profile pair in both themes, and verifies fixed light/dark SVG declarations plus real static gallery previews and artifact links.
- Standard adaptive SVG refreshes use `--svg-theme auto`. Viewer-independent light/dark PNGs are rasterized from validated fixed-theme SVGs with the bounded local helper and an explicitly selected local browser executable; comparison instructions reuse the same path for a batch, the helper recursively inspects bounded embedded SVG image data, rejects active or remote-loading content, and the skill does not claim that direct draw.io Desktop PNG export applies a dark theme.
- Per-artifact wildcard checks for PNG dimensions/nonblank content and SVG validity/theme/animation/self-containment evaluate every match. PNG comparisons use canonical canvas-order RGBA pixels rather than encoding details, fixed SVG/PNG pairs require identical explicit pixel dimensions, profile pairs require a nontrivial changed-pixel floor, relative gallery references resolve to real artifacts, and exact graph assertions reject extra or duplicate semantic cells and listed component-to-group memberships.
- The external SVG eval names LangSmith and requires editable `.drawio` plus rendered SVG artifacts, embedded image data without a provider URL, fixed aspect ratio, provider/version reporting, and the single rights notice.
- Icon coverage evals require official organization/product/service assets whenever available, generic semantic icons only as per-node fallbacks for named entities, preserved source artwork/brand colors, and an explicit disclosure for any user-requested or accessibility-exception recoloring.
- Deterministic checks catch mixed or missing directed-flow animation without penalizing structural or decorative edges, and avoid false orphan warnings for component-card children or declared annotations.
- Diagram-rule checks warn when a `dataRole=component` card has neither an icon-like shape nor a `dataRole=icon` child. Shape-search regressions cover JSON output, fuzzy and partial matching, type filtering, gzip input, and standard-cache discovery.
- Desktop CLI is an export/render tool, not an assumed Mermaid importer or layout engine. For `input.drawio`, the standard renderer stages and validates fresh `input.drawio.png` and `input.dark.svg` artifacts before no-clobber installation, including when Desktop exits zero without output; `--page-index` does not rename them. A commit-time collision never deletes the raced destination. Interrupted commits retain partial outputs plus staged files and backups, while successful replacements also retain and report the staging recovery directory because an open writer can still update a renamed backup inode. Fresh installs without prior outputs remove their staging directory after validation.
- Renderer PNG validation is bounded to non-interlaced output and checks legal IHDR fields, critical chunks, CRCs, the complete concatenated IDAT zlib stream, scanline length, and row filters. Legal interlaced PNG remains outside this renderer-validation subset and fails with an explicit unsupported-mode error.
- Eval validation rejects suspicious escaped wildcard regexes and keeps at least 20 natural-language positive prompts that do not name the skill, alongside explicit-invocation cases.
- Tracked public examples are updated with animation, clearer content hierarchy, and modern readable styling where applicable.
- Capability-aware preflight, route selection, independent approvals, canonical/fallback naming, and the eight receipt fields are covered by focused documentation and eval cases; unavailable capabilities remain explicit rather than becoming unsupported completion claims.
- The full repository validation required below passes without staging or changing unrelated worktree state.
- The benchmark protocol uses identical prompts and fixtures, three trials per case, blind visual grading, neutral artifact checks, pinned skill/tool versions, published failures, and an explicit claim threshold.

## Runtime Payload

Required files:

```text
skills/engineering-workflows/drawio-diagrams/
  SKILL.md
  agents/openai.yaml
  references/
    delivery.md
    design-profiles.md
    diagram-type-playbook.md
    icon-catalog.md
    layout-readability.md
    routing-and-simplification.md
    theming-dark-mode.md
    toolset-setup.md
    verification-checklist.md
    workflow-details.md
    xml-authoring.md
    examples/*.drawio
  scripts/
    lib/
      transactional-render-output.mjs
    probe-drawio-toolset.mjs
    open-drawio-url.mjs
    preflight-drawio-xml.mjs
    rasterize-themed-svg.mjs
    render-drawio.mjs
    search-shapes.mjs
    validate-drawio-diagram-rules.mjs
    validate_drawio.py
```

Do not add `README.md`, package metadata, copied third-party folders, remote icon snapshots, or bundled shape-search indexes to the runtime skill.

## Review Result

Final review compared the public skill against the prior consolidated decisions. The requested separate decisions file was already absent from the working tree, so no additional decisions text remained to preserve.

Resolved mismatches:

- Replaced stale pre-release planning notes with this public-release spec.
- Deleted the handover artifact after implementation.
- Added ADR-0022 so the public Python validator has an explicit repo-level exception to ADR-0014.
- Kept only public-safe runtime examples, references, helper scripts, docs, and eval proof.

## Validation

Required before release:

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" skills/engineering-workflows/drawio-diagrams
python3 skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py skills/engineering-workflows/drawio-diagrams/references/examples/example-clean.drawio --animation on
python3 skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py skills/engineering-workflows/drawio-diagrams/references/examples/animation-on.drawio --animation on
python3 skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py skills/engineering-workflows/drawio-diagrams/references/examples/animation-off.drawio --animation off
python3 skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py skills/engineering-workflows/drawio-diagrams/references/examples/example-broken.drawio; test $? -eq 1
python3 skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py skills/engineering-workflows/drawio-diagrams/references/examples/example-contrast-broken.drawio; test $? -eq 1
pnpm format:check
pnpm lint
npm run validate:drawio
npm run validate
npm run smoke:install
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs --base-ref origin/main
git diff --check
```

## Done When

- Public installer lists `drawio-diagrams`.
- `npm run validate` builds `/skills/drawio-diagrams/`.
- Positive `.drawio` examples validate without errors.
- Negative fixtures fail with expected errors.
- Release notes include promotion, public payload cleanup, validation coverage, and release metadata.
- No stale private-path, third-party licensing, or draft-package instructions remain in public skill docs.
