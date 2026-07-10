# drawio-diagrams Eval Proof

This folder contains initial promotion proof for `drawio-diagrams`.

## Promotion Rationale

- Clear routing: activates for editable draw.io / diagrams.net `.drawio` diagrams, technical flows, architecture diagrams, sequence/ER/class/state/network diagrams, repair, validation, and export.
- High utility: gives agents a deterministic XML path when draw.io Desktop, MCP tools, or network access are unavailable.
- Safe defaults: avoids installs, MCP config writes, hosted previews, remote icon fetches, and external indexes without explicit approval.
- Maintenance fit: public runtime payload is original guidance, deterministic helper scripts, and small regression fixtures; copied third-party reference packs and icon/index assets are not shipped in the public skill.

## Eval Set

Cases live under `cases/` and follow the SkillOpt markdown schema:

- `## Prompt`
- `## Should Trigger`
- optional `## Fixtures`
- `## Expected Behavior`
- `## Deterministic Assertions`
- optional `## Visual Assertions`

`## Visual Assertions` is for SkillOpt or local post-run checks that inspect generated PNG/SVG artifacts. Cases with this section require a render-capable eval worker with local draw.io Desktop export available; no-CLI fallback behavior is covered by non-visual cases.

Supported deterministic visual checks are:

- `artifact_exists: <glob>`
- `png_dimensions: <glob> min_width=<px> min_height=<px>`
- `png_nonblank: <glob> [min_size=<bytes>]`
- `svg_valid: <glob>`
- `svg_contains: <glob> <text>`
- `svg_not_contains: <glob> <text>`

Cases:

- `cases/architecture-readability-review.md`
- `cases/artistic-image-request-negative.md`
- `cases/backup-before-overwrite.md`
- `cases/browser-url-delivery.md`
- `cases/c4-container-diagram.md`
- `cases/chart-request-negative.md`
- `cases/compressed-drawio-edit.md`
- `cases/create-architecture-diagram.md`
- `cases/dark-mode-theme-export.md`
- `cases/dark-svg-contrast.md`
- `cases/direct-xml-no-cli.md`
- `cases/edit-existing-diagram.md`
- `cases/er-diagram-crowded-labels.md`
- `cases/export-visual-inspection.md`
- `cases/hosted-preview-approval.md`
- `cases/icon-catalog-native-stencils.md`
- `cases/infographic-poster-negative.md`
- `cases/kubernetes-cluster-diagram.md`
- `cases/mcp-unavailable-fallback.md`
- `cases/multi-page-diagram.md`
- `cases/multi-page-preserve-edit.md`
- `cases/network-zone-diagram.md`
- `cases/no-private-hostnames.md`
- `cases/orthogonal-waypoint-routing.md`
- `cases/remote-icon-fetch-approval.md`
- `cases/repair-invalid-drawio-xml.md`
- `cases/routing-simplification-crowded.md`
- `cases/sequence-diagram-editable.md`
- `cases/shape-search-local-index.md`
- `cases/side-port-routing.md`
- `cases/screenshot-annotation-negative.md`
- `cases/swimlane-process-diagram.md`
- `cases/timeline-roadmap-diagram.md`
- `cases/transparent-callout-obstacle.md`
- `cases/validate-and-export.md`
- `cases/visual-compressed-page-png-export.md`
- `cases/visual-crowded-routing-export.md`
- `cases/visual-dark-svg-readability.md`
- `cases/visual-existing-edit-png-export.md`
- `cases/visual-light-png-nonblank.md`
- `cases/visual-multi-page-dark-svg-export.md`

Use `rubric.md` to grade outputs. `runs/` stores promotion review summaries and future run evidence.

Passing outputs must create or edit editable `.drawio` XML, run deterministic validation when `python3` is available, preserve existing diagram structure during edits, report visual/export limitations honestly, keep dense architecture diagrams readable in light and dark mode, and avoid external services or remote assets without approval.
