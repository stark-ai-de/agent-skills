---
title: "drawio-diagrams public release spec"
slug: "drawio-diagrams-public-release-spec"
artifact_path: "docs/specs/drawio-diagrams-public-release-spec.md"
status: "final-public-release"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-07-07"
updated: "2026-07-07"
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
- Use native draw.io stencils first, then explicitly configured local shape/icon caches only after user approval.
- Document optional theSVG lookup by approved local cache or live registry, but do not maintain a static slug catalog or bundle SVG assets.
- Keep the dependency-free Python validator as a public helper under ADR-0022.

## Skill Contract

The skill must:

- Trigger on editable draw.io / diagrams.net diagram creation, editing, repair, validation, and export.
- Exclude charts, data plots, artistic images, photo edits, and non-editable illustrations unless the user explicitly asks for draw.io output.
- Detect `python3`, Node >= 18, draw.io Desktop CLI, available draw.io MCP tools, and approved local caches.
- Never install tools, write MCP config, use hosted draw.io MCP, fetch remote icons, or download indexes without explicit approval.
- Verify third-party icon slugs, variants, and license/trademark notes at lookup time instead of trusting a frozen catalog.
- Preserve existing pages, IDs, cells, layers, metadata, and manual coordinates during edits.
- Create a backup or alternate output before overwriting an existing `.drawio` file.
- Validate every generated or edited diagram with `scripts/validate_drawio.py` when `python3` is available.
- Report visual and dark-mode verification honestly, including skipped checks.

## Runtime Payload

Required files:

```text
skills/engineering-workflows/drawio-diagrams/
  SKILL.md
  agents/openai.yaml
  references/
    delivery.md
    diagram-type-playbook.md
    icon-catalog.md
    theming-dark-mode.md
    toolset-setup.md
    verification-checklist.md
    xml-authoring.md
    examples/*.drawio
  scripts/
    render-drawio.mjs
    search-shapes.mjs
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
python3 skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py skills/engineering-workflows/drawio-diagrams/references/examples/example-clean.drawio
python3 skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py skills/engineering-workflows/drawio-diagrams/references/examples/example-broken.drawio; test $? -eq 1
python3 skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py skills/engineering-workflows/drawio-diagrams/references/examples/example-contrast-broken.drawio; test $? -eq 1
pnpm format:check
pnpm lint
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
