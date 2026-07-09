# 2026-07-07 Promotion Review

## Scope

Static promotion review for moving `drawio-diagrams` from incubator to the public Engineering Workflows catalog.

## Evidence

- Skill has a focused trigger description for editable draw.io / diagrams.net creation, editing, verification, repair, and export.
- Runtime guidance has explicit negative scope for charts, data plots, photo editing, artistic images, and non-editable illustrations.
- Safety rules require approval before installs, MCP config writes, hosted draw.io MCP, remote icon fetches, or index downloads.
- Public runtime payload omits pre-release reference packs, copied example galleries, bundled shape indexes, and copied icon packs.
- Helper scripts are deterministic and scoped: validator is read-only, renderer writes named exports only, and shape search requires an existing local index or approved cache.
- Regression fixtures cover clean XML, architecture stencil/icon style, existing-file edit before/after, multi-page validation, broken XML, and contrast failure.
- Eval cases cover generation, existing-file edit, validation/export, multi-page output, chart negative activation, and remote icon approval boundary.

## Result

Promotion-ready after local validation passes.

Validation evidence captured during promotion review:

- `node scripts/validate-drawio-fixtures.mjs` passed for positive examples and validator scenarios.
- `example-broken.drawio` and `example-contrast-broken.drawio` returned validation errors as expected.
- `node scripts/search-shapes.mjs "postgres database" --type vertex --limit 5` works when `DRAWIO_SHAPE_INDEX` points at an approved local index.
- `npm run validate`, `pnpm format:check`, `pnpm lint`, public skill listing, clean-copy smoke install, and release validation are required before merge.
